# Glass — ISC DHCP Monitor

A modern web interface for ISC DHCP servers. Real-time lease tracking, log streaming, subnet utilization, config editing, and alerting — rebuilt with an Angular 21 frontend.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Dashboard** — live leases/sec, leases/min, CPU utilization, subnet utilization table
- **Active Leases** — searchable table with vendor lookup, expiry countdown, DHCP options
- **Statistics** — vendor breakdown bar chart, excessive DHCP request detection
- **Live Log** — real-time DHCP syslog stream with filtering and pause
- **Config Editor** — edit and save `dhcpd.conf` in-browser
- **Snapshots** — view historical config backups
- **Server Control** — start / stop / restart dhcpd
- **Alerts** — Slack, email, and SMS notifications for subnet utilization and lease rate thresholds
- **Settings** — manage all Glass config from the UI

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20 + Express 4 |
| Frontend | Angular 21 (standalone components) |
| Styling | Tailwind CSS v3 + OKLCH design tokens |
| Live data | WebSocket (ws) |

---

## Installation (Ubuntu)

### 1. Prerequisites

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20.x (required)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# ISC DHCP server (if not already installed)
sudo apt install -y isc-dhcp-server
```

### 2. Clone and install

```bash
git clone https://github.com/khalidalqassabi/glass-isc-dhcp.git /opt/glass-dhcp
cd /opt/glass-dhcp

# Install dependencies (frontend already pre-built)
npm install
```

### 3. Configure

```bash
cp config/glass_config.json.example config/glass_config.json
nano config/glass_config.json
```

Key fields:

```json
{
  "leases_file": "/var/lib/dhcp/dhcpd.leases",
  "log_file": "/var/log/syslog",
  "config_file": "/etc/dhcp/dhcpd.conf",
  "port": 3000,
  "ws_port": 8080,
  "admin_user": "admin",
  "admin_password": "changeme",
  "ip_ranges_to_allow": [""]
}
```

> Set `admin_user` to `""` to disable authentication. Set `ip_ranges_to_allow` to `[""]` to allow all IPs, or add CIDR ranges to restrict access.

### 4. Run

Glass must run as root to read DHCP system files:

```bash
sudo mkdir -p logs
sudo node ./bin/www
```

For production with auto-restart:

```bash
sudo npm install -g forever

sudo forever --minUptime 10000 --spinSleepTime 10000 \
  -a -o ./logs/glass-process.log -e ./logs/glass-error.log \
  start ./bin/www
```

### 5. Auto-start on boot (systemd)

```bash
sudo nano /etc/systemd/system/glass-dhcp.service
```

```ini
[Unit]
Description=Glass ISC DHCP Monitor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/glass-dhcp
ExecStart=/usr/bin/node /opt/glass-dhcp/bin/www
Restart=on-failure
RestartSec=10
StandardOutput=append:/opt/glass-dhcp/logs/glass-process.log
StandardError=append:/opt/glass-dhcp/logs/glass-error.log

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable glass-dhcp
sudo systemctl start glass-dhcp
```

### 6. Firewall

```bash
sudo ufw allow 3000/tcp   # web UI
sudo ufw allow 8080/tcp   # WebSocket
```

Open `http://<server-ip>:3000` in your browser.

---

## Development

```bash
# Start backend
npm start

# Start Angular dev server (proxies API to localhost:3000)
npm run dev:ui

# Build UI for production
npm run build:ui:prod
```

UI source lives in `ui/`. Built output goes to `public/dist/`.

---

## Alerting

Configure thresholds and delivery in the Alerts page or directly in `glass_config.json`:

| Field | Description |
|---|---|
| `leases_per_minute_threshold` | Alert when leases/min drops below this value |
| `shared_network_warning_threshold` | Subnet utilization % for warning alert |
| `shared_network_critical_threshold` | Subnet utilization % for critical alert |
| `slack_webhook_url` | Slack incoming webhook URL |
| `slack_alert_channel` | Slack channel (e.g. `#dhcp-alerts`) |
| `email_alert_to` | Email address(es), comma-separated |
| `sms_alert_to` | SMS gateway address (e.g. `1234567890@carrier.com`) |

---

## API

| Endpoint | Description |
|---|---|
| `GET /api/get_active_leases` | All active leases |
| `GET /api/get_server_info` | CPU, leases/sec, leases/min |
| `GET /api/get_subnet_details` | Subnet and shared network utilization |
| `GET /api/get_vendor_count` | Lease count by vendor |
| `GET /api/get_dhcp_requests` | DHCP request stats by MAC |
| `GET /api/get_glass_config` | Current Glass configuration |

WebSocket events (send `{"event_subscription": "<event>"}`):
- `dhcp_statistics` — pushed every 1s with live stats
- `dhcp_log_subscription` — raw syslog lines as they arrive

---

## Troubleshooting

| Problem | Fix |
|---|---|
| White page / 404 | Run `npm run build:ui:prod` first |
| No leases shown | Check `leases_file` path in config |
| No log stream | Check `log_file` path; verify DHCP logs to syslog |
| WebSocket errors | Open port 8080; check `ws_port` in config |
| Permission denied | Run as root — reads `/var/lib/dhcp` and `/etc/dhcp` |

```bash
sudo tail -f /opt/glass-dhcp/logs/glass-error.log
sudo journalctl -u glass-dhcp -f
```

---

## License

MIT — original project by [Chris Miles](mailto:chris.miles.e@gmail.com), Angular frontend rebuild by [Khalid Alqassabi](https://github.com/khalidalqassabi).
