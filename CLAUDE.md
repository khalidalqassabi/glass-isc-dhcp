# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npm start            # run dev server (node ./bin/www) on port 3000
```

Production (must run as root on Linux — reads system DHCP files):
```bash
mkdir -p logs
sudo forever --minUptime 10000 --spinSleepTime 10000 -a \
  -o ./logs/glass-process.log -e ./logs/glass-error.log ./bin/www
```

There are no tests and no linter configured.

## Configuration

All config lives in `config/glass_config.json`. Key fields:
- `leases_file` — path to `dhcpd.leases` (default `/var/lib/dhcp/dhcpd.leases`)
- `log_file` — path to DHCP syslog (default `/var/log/dhcp.log`)
- `config_file` — path to `dhcpd.conf` (default `/etc/dhcp/dhcpd.conf`)
- `port` / `ws_port` — HTTP port (default 3000) and WebSocket port (default 8080)
- `admin_user` / `admin_password` — HTTP Basic Auth credentials; empty `admin_user` disables auth
- `ip_ranges_to_allow` — IP allowlist; first element `""` disables filtering

## Architecture

### Global State (no database)

All real-time data is stored in Node.js globals, initialized in `app.js`:

| Global | Purpose |
|---|---|
| `dhcp_lease_data` | Map of `IP → lease object` (parsed from leases file) |
| `dhcp_requests` | Map of `MAC → request stats` (parsed from log) |
| `oui_data` | Map of `OUI prefix → vendor string` |
| `leases_per_second` / `leases_per_minute` | Rolling counters |
| `cpu_utilization` | Polled every 15s via `top` |
| `wss` | WebSocket server instance |

Routes and API handlers read these globals directly — there is no DB layer.

### Entry Points

- `bin/www` — HTTP server; reads `port` and `host` from `glass_config`, loads `app.js`
- `app.js` — Express setup **and** runtime orchestrator: registers all routes, starts core modules, launches WebSocket server, runs alert loops

### Directory Layout

- `core/` — background workers loaded once at startup:
  - `dhcp-leases.js` — reads leases file on boot; tails it for incremental updates; prunes expired leases every 60s
  - `lease-parser.js` — regex-based parser for ISC DHCP leases file format; writes directly to `global.dhcp_lease_data`
  - `dhcp-log-watcher.js` — tails the DHCP syslog; broadcasts lines to WebSocket subscribers; accumulates `DHCPREQUEST` stats into `global.dhcp_requests`
  - `app-timers.js` — recurring timers (leases/min calculator, dashboard staleness, CPU poll, stale WS connections, request data purge)
  - `oui-reader.js` — loads `bin/oui_table.txt` into `global.oui_data` at startup
  - `glass-config-watcher.js` — watches `config/glass_config.json` for live reloads
  - `authorize.js` — HTTP Basic Auth middleware using credentials from config
  - `render-template.js` — loads `.html` files from `public/templates/` and does bracket-placeholder substitution (`[variable_name]` → value); Jade is listed as a dependency but templates are plain HTML
- `routes/` — Express handlers for web UI pages; use `render-template.js` to compose responses
- `api/` — Express handlers for REST API endpoints; return JSON from globals
- `public/templates/` — HTML files; `index.html` is the shell; other templates inject into `[body_content]`
- `bin/dhcpd-pools` — pre-built binary (Ubuntu/Debian) for subnet/shared-network utilization; called synchronously via `execSync` in alert loops and API handlers

### Alert System

Alert loops start in `app.js` with a 60-second initial delay, then run every 5 seconds. State is tracked in `alert_status[]` / `alert_status_networks_warning[]` / `alert_status_networks_critical[]` arrays (in-memory — restarts reset alert state). Two alert types:
1. **Leases per minute** — fires when `leases_per_minute` drops below `leases_per_minute_threshold`
2. **Shared network utilization** — calls `bin/dhcpd-pools` synchronously; fires per-network warning/critical thresholds

Delivery: Slack webhook (`slack-node`), email/SMS via `nodemailer` with `sendmail` transport.

### WebSocket Events

Clients subscribe by sending `{"event_subscription": "<event>"}`. Known events:
- `dhcp_statistics` — pushed every 1s with CPU/leases-per-second/leases-per-minute
- `dhcp_log_subscription` — raw log lines streamed from syslog tail
