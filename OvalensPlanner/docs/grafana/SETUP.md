# Setting up Grafana for Prometheus (Ovalens API)

Use this guide to get **Grafana** talking to **Prometheus** and viewing your Ovalens API metrics.

---

## Prerequisites

- **Prometheus** is scraping your API’s `/metrics` endpoint (see [METRICS-PRODUCTION.md](../METRICS-PRODUCTION.md) for scrape config).
- If you don’t have Prometheus yet, use the [Docker Compose option](#option-a-local-stack-with-docker-compose) below to run both Prometheus and Grafana.

---

## 1. Run Grafana

Pick one:

### Option A: Local stack with Docker Compose (easiest for dev)

From this directory (`docs/grafana`):

```bash
docker compose up -d
```

This starts:

- **Prometheus** at **http://localhost:9090** (scrapes `http://host.docker.internal:8000/metrics` every 15s).
- **Grafana** at **http://localhost:3001** (default login: `admin` / `admin`; you’ll be asked to set a new password).

Your API must be running on **port 8000** on the host (e.g. `uvicorn` for the Ovalens API). On Linux, if `host.docker.internal` doesn’t work, use `network_mode: host` or set the scrape target to your host IP.

To scrape a **remote** API (e.g. production) instead of localhost, edit `prometheus.yml`: set `targets` to e.g. `['https://your-api.vercel.app']` and `scheme: https`.

### Option B: Install Grafana on your machine

1. Install: [Grafana install docs](https://grafana.com/docs/grafana/latest/setup-grafana/installation/).
2. Start the service and open **http://localhost:3000** (or the port Grafana uses).
3. Log in (default `admin` / `admin`).

You still need Prometheus running and scraping your API (e.g. same `prometheus.yml` as in Option A, or your own config).

### Option C: Grafana Cloud

1. Sign up at [grafana.com/products/cloud](https://grafana.com/products/cloud/).
2. Create a stack and use the hosted **Grafana** + **Prometheus** (or Grafana Agent) they provide.
3. In the Grafana Cloud UI, add your API’s `https://your-api.example.com/metrics` as a scrape target (and token if you use `METRICS_TOKEN`).
4. Your Grafana instance will already have a Prometheus data source pointing at that Prometheus.

---

## 2. Add Prometheus as a data source in Grafana

1. In Grafana: **Connections** (or **Configuration**) → **Data sources** → **Add data source**.
2. Choose **Prometheus**.
3. Set **URL**:
   - **Docker Compose (Option A):** `http://prometheus:9090`
   - **Grafana and Prometheus on same host:** `http://localhost:9090`
   - **Grafana Cloud:** use the Prometheus URL they give you (often pre-configured).
4. Click **Save & test**. You should see “Data source is working”.

---

## 3. Import the Ovalens dashboard

1. In Grafana: **Create** (➕) → **Import**.
2. **Upload JSON file** and choose **`ovalens-api-baseline.json`** from this folder (`docs/grafana/`), or paste the JSON contents.
3. Select the **Prometheus** data source you added (dashboard variable “datasource”).
4. Click **Import**.

You should see panels for HTTP rate, latency, chat streams, LLM tokens, etc. If the API has no traffic yet, panels may be empty; send some requests and refresh.

---

## 4. Quick reference

| Step              | Action |
|-------------------|--------|
| Run Grafana       | Docker: `docker compose up -d` in `docs/grafana`; or install Grafana; or use Grafana Cloud. |
| Prometheus URL    | Local Docker: `http://prometheus:9090`. Same machine: `http://localhost:9090`. |
| Add data source   | Connections → Data sources → Prometheus → set URL → Save & test. |
| Import dashboard  | Create → Import → upload `ovalens-api-baseline.json` → choose Prometheus data source. |

For production scrape config, env vars, and where metrics are stored, see **[METRICS-PRODUCTION.md](../METRICS-PRODUCTION.md)**.
