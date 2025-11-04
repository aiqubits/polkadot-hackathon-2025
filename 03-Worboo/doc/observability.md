# Worboo Observability Guide

## Relayer Health Endpoints

- HTTP: `http://<RELAYER_HEALTH_HOST>:<RELAYER_HEALTH_PORT>/healthz`
- CLI: `npm run status` (wraps the HTTP endpoint and prints JSON)

Example JSON payload:

```json
{
  "status": "idle",
  "queueDepth": 0,
  "totalMinted": 42,
  "failureCount": 0,
  "lastMintAt": 1761573282243,
  "cachePath": ".cache/processed-events.jsonl"
}
```

## Grafana / Prometheus Quickstart

1. Expose the health server publicly or via reverse proxy:
   ```bash
   RELAYER_HEALTH_HOST=0.0.0.0
   RELAYER_HEALTH_PORT=8787
   ```
2. Configure Prometheus to scrape the endpoint using the `json_exporter` pattern:
   ```yaml
   scrape_configs:
     - job_name: worboo-relayer
       metrics_path: /probe
       params:
         module: [http_2xx_json]
         target: ['http://relayer:8787/healthz']
       static_configs:
         - targets: ['json-exporter:7979']
   ```
   Example module mapping:
   ```yaml
   modules:
     http_2xx_json:
       prober: http
       http:
         method: GET
         valid_status_codes: [200]
         json_select:
           worboo_relayer_queue_depth: $.queueDepth
           worboo_relayer_total_minted: $.totalMinted
           worboo_relayer_last_mint_at: $.lastMintAt
           worboo_relayer_failure_count: $.failureCount
   ```
3. Import the sample Grafana panel from `doc/observability.grafana.json` (queue depth, last mint, failure count).

## Structured Log Files & Rotation

Enable file logging alongside stdout:
```env
RELAYER_LOG_FILE=.logs/worboo-relayer.log
RELAYER_LOG_MAX_BYTES=5242880   # 5 MB per file
RELAYER_LOG_BACKUPS=5           # keep 5 rotated files
```

Logs are JSONL entries; ship them to Loki/ELK for dashboards. Rotation occurs whenever the active file exceeds the size threshold.

## Log Shipping

- Set `RELAYER_LOG_HTTP_ENDPOINT` (or `logHttpEndpoint`) to POST each log line to an external collector such as Loki, Logflare, or Datadog.
- Endpoint receives the raw JSON record produced by the logger; add auth headers via reverse proxy if required.

## Processed Event Cache

- `RELAYER_CACHE_MAX_ENTRIES` (or `cacheMaxEntries` in JSON) caps the dedupe file; the relayer trims oldest entries automatically.
- Persist the `.cache/` directory if you run in containers so restarts keep their processed-event memory.


## Frontend Health Banner

The navbar consumes the `/healthz` endpoint (fallback to same-origin `/healthz` if no URL provided). When the relayer is down, the banner surfaces `Health check failed: <error>` to users. Configure `REACT_APP_RELAYER_HEALTH_URL` if the health endpoint lives on a different host.

## Pre-demo Checklist (Ops)

- `npm run status` and/or `curl http://localhost:8787/healthz` (expect `status: "idle"`).
- Tail `.logs/worboo-relayer.log` for recent events.
- Ensure Grafana panel shows queue depth = 0 and last mint timestamp < 5 min.
