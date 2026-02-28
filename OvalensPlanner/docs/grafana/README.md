# Grafana dashboards for Ovalens API

For **where metrics are stored** and **how to configure production** (Prometheus scrape, Grafana data source, env vars), see **[METRICS-PRODUCTION.md](../METRICS-PRODUCTION.md)** in the docs root.

## Baseline dashboard

**File:** `ovalens-api-baseline.json`

Panels:

- **HTTP request rate** — `ovalens_http_requests_total` by method and status class
- **HTTP latency (p50, p99)** — `ovalens_http_request_duration_seconds`
- **HTTP status distribution** — request count by 2xx / 3xx / 4xx / 5xx
- **Chat stream starts / completions / errors** — chat lifecycle counters
- **Chat time to first token** — `ovalens_chat_time_to_first_token_seconds` (p50, p99)
- **LLM request duration** — `ovalens_llm_request_duration_seconds` (p50, p99)
- **LLM tokens in / out** — token rate by model
- **LLM failure rate** — `ovalens_llm_failures_total` / (requests + failures)

## Setup (summary)

1. **Prometheus** scrapes the API `GET /metrics` (see [METRICS-PRODUCTION.md](../METRICS-PRODUCTION.md) for scrape config and where data is stored).
2. **Grafana**: Add a Prometheus data source → URL of your Prometheus server (or Grafana Cloud Prometheus).
3. **Import dashboard**: Create → Import → Upload `ovalens-api-baseline.json`; select that data source.
4. **Smoke test**: Send traffic to the API; refresh the dashboard to see live data.
