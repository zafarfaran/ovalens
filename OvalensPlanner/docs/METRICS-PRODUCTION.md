# Production metrics: where they’re stored and how to get a dashboard

This doc explains how to get **production metrics into a dashboard**: where data comes from, where it’s stored, and how to configure Prometheus + Grafana (or Grafana Cloud).

---

## 1. Where do the metrics come from?

- The **Ovalens API** exposes a **Prometheus**-style endpoint: **`GET /metrics`**.
- That endpoint returns **live counters and histograms** (HTTP requests, chat streams, LLM tokens, etc.). It does **not** store anything; it’s a snapshot each time you scrape it.
- **`/metrics` is only registered when** `ENVIRONMENT` is `beta` or `production`, or when `METRICS_ENABLED=true`.

So in production, your API URL might be:

- `https://your-api.vercel.app/metrics`, or  
- `https://api.ovalens.com/metrics`, etc.

---

## 2. Where are the metrics stored?

- **By default, nowhere.** The API just serves the current values when scraped.
- To **keep history** and build dashboards, you need a **metrics backend** that:
  1. **Scrapes** `GET /metrics` on a schedule (e.g. every 15s).
  2. **Stores** the time-series in a database.
  3. **Serves** them to a dashboard (e.g. Grafana).

The standard way is:

| Component   | Role                         | Where it runs / where data lives |
|------------|------------------------------|-----------------------------------|
| **API**    | Exposes `/metrics`           | Your host (Vercel, Railway, etc.) |
| **Prometheus** | Scrapes `/metrics`, **stores** time-series in its **TSDB** | Your server, or Grafana Cloud |
| **Grafana**    | Queries Prometheus, draws dashboards | Your server, or Grafana Cloud |

So **“where are they stored?”** → in **Prometheus’ time-series database (TSDB)** (on the machine or cloud where Prometheus runs), or in **Grafana Cloud’s Prometheus** if you use that.

---

## 3. End-to-end: API → storage → dashboard

```
  [Ovalens API]  --(scrape GET /metrics every 15s)-->  [Prometheus]
       ↑                                                      ↑
  /metrics returns                                              stores in TSDB,
  current counters/histograms                                    queried by Grafana
                                                                      ↑
                                                              [Grafana] → dashboards
```

- **Scraper:** Prometheus (or Grafana Cloud Agent) calls your API’s `/metrics` URL on a schedule.
- **Storage:** Prometheus TSDB (on your Prometheus server or in Grafana Cloud).
- **Dashboard:** Grafana uses the Prometheus data source to run PromQL and render the panels.

---

## 4. Configuration

### 4.1 API (Ovalens)

Ensure the API exposes `/metrics` in the environment where you want production metrics:

| Variable           | Purpose |
|--------------------|--------|
| `ENVIRONMENT`      | Set to `beta` or `production` so `/metrics` is mounted. |
| `METRICS_ENABLED`  | Optional. Set to `true` to expose `/metrics` even when `ENVIRONMENT` is not beta/production. |
| `METRICS_TOKEN`    | Optional. If set, Prometheus must send header `X-Metrics-Token: <value>` when scraping; otherwise the API returns 401. |

Example for production:

```bash
ENVIRONMENT=production
# Optional: restrict who can scrape
METRICS_TOKEN=your-long-random-secret
```

**If you deploy the API on Vercel:** Vercel does **not** set these for you. You add them yourself:

1. Open the **ovalens-api** project in the Vercel dashboard.
2. Go to **Settings → Environment Variables**.
3. For **Production** (and Preview if you want metrics there too):
   - **ENVIRONMENT** — set to `production` (or `beta`). If you already use `production` for the live API, `/metrics` is already exposed; no extra step.
   - **METRICS_ENABLED** — optional. Only needed if you want `/metrics` in an env where `ENVIRONMENT` is not `beta`/`production` (e.g. a staging env named something else).
   - **METRICS_TOKEN** — optional. Set a long random secret if you want to lock down who can scrape `/metrics`; your Prometheus or Grafana Cloud scraper must send it (e.g. in a header).

So for a typical Vercel production deploy: **just ensure `ENVIRONMENT=production`** on the API project; that’s enough for `/metrics` to be live at `https://your-api.vercel.app/metrics`.

### 4.2 Prometheus (scrape config)

Prometheus needs a **scrape config** that targets your API’s `/metrics` URL.

**Example `prometheus.yml`** (run Prometheus on a server that can reach your API):

```yaml
scrape_configs:
  - job_name: 'ovalens-api'
    scrape_interval: 15s
    metrics_path: /metrics
    static_configs:
      - targets: ['https://your-api.vercel.app']   # or your production API host
    scheme: https
    # If you set METRICS_TOKEN, add:
    # authorization:
    #   credentials: "your-long-random-secret"
    #   type: Bearer
    # Or use a custom header (Prometheus 2.26+):
    # honor_labels: false
    # Or use relabel_configs to add a header (see Grafana Cloud / your platform docs)
```

If you use **METRICS_TOKEN** with a **header** (`X-Metrics-Token`), you need a Prometheus version or sidecar that supports custom headers; otherwise use a reverse proxy that adds the header, or use **Bearer** and have the API accept `Authorization: Bearer <token>` (you’d add that in the API if needed).

For **Grafana Cloud**:

- Add a “Prometheus” or “Grafana Cloud” data source.
- Use “Grafana Agent” or “Remote Write” / “Scrape” to point at `https://your-api.example.com/metrics` and (if required) send your `METRICS_TOKEN` in the way their UI supports (e.g. custom headers or auth).

So: **metrics are stored** in whatever Prometheus (or Grafana Cloud Prometheus) you point at that URL.

### 4.3 Grafana

1. **Add data source:** Grafana → Connections → Data sources → Add data source → **Prometheus**.  
   - **URL:** `http://<your-prometheus-host>:9090` (if Prometheus is on your server), or the Grafana Cloud Prometheus URL if you use that.
2. **Import dashboard:** Create → Import → Upload the JSON from **`docs/grafana/ovalens-api-baseline.json`** (or paste its contents). Choose the Prometheus data source you added.
3. Dashboards then **query Prometheus** (where the metrics are stored) and display them.

---

## 5. Where to run Prometheus and Grafana (production)

You have two main options:

- **Self‑hosted:** Run Prometheus (and optionally Grafana) on a VPS/VM (e.g. same box as a worker, or a small dedicated instance). Metrics are stored on that server’s disk (Prometheus TSDB).
- **Grafana Cloud:** Use Grafana Cloud’s hosted Prometheus (and Grafana). They run the scraper and store the time-series for you; you just add your API’s `/metrics` URL (and token if any). Data is stored in Grafana’s infrastructure.

So:

- **Where are production metrics stored?**  
  - Self‑hosted: on the machine where Prometheus runs (TSDB).  
  - Grafana Cloud: in Grafana Cloud’s managed Prometheus.

- **How do I get a dashboard?**  
  - Point Grafana (self‑hosted or Grafana Cloud) at that Prometheus, then import **`docs/grafana/ovalens-api-baseline.json`**.

---

## 6. Quick reference

| Goal                         | Action |
|-----------------------------|--------|
| Expose metrics in production | Set `ENVIRONMENT=production` (or `beta`) or `METRICS_ENABLED=true`. |
| Restrict scrape access       | Set `METRICS_TOKEN`; configure scraper to send that token (e.g. header or Bearer). |
| Store metrics over time      | Run Prometheus (or use Grafana Cloud) and scrape `https://<your-api>/metrics`. |
| View in a dashboard          | Use Grafana with a Prometheus data source; import `docs/grafana/ovalens-api-baseline.json`. |

For the dashboard panels and metric names, see **`docs/grafana/README.md`**.
