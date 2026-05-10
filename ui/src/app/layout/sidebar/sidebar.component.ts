import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { WebsocketService, DhcpStats } from '../../core/services/websocket.service';
import { GlassApiService } from '../../core/services/glass-api.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive],
    template: `
    <aside class="sidebar">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-mark">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect width="18" height="18" rx="4" fill="oklch(0.66 0.26 285)"/>
            <path d="M4 9h10M4 6h6M4 12h8" stroke="oklch(0.09 0.009 30)" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="logo-text">Glass</span>
      </div>

      <!-- Server status -->
      <div class="server-status">
        <div class="flex items-center gap-2 min-w-0">
          <div class="live-dot" [class.warn]="statsState() === 'warn'" [class.danger]="statsState() === 'danger'"></div>
          <span class="status-hostname">{{ hostname() }}</span>
        </div>
        <span class="status-metric">{{ lpm() }} <span class="status-unit">lpm</span></span>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <div class="nav-section">
          <span class="nav-section-label">Monitor</span>
          @for (item of monitorNav; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="nav-link-active" class="nav-link">
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              {{ item.label }}
            </a>
          }
        </div>

        <div class="nav-section">
          <span class="nav-section-label">Manage</span>
          @for (item of manageNav; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="nav-link-active" class="nav-link">
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              {{ item.label }}
            </a>
          }
        </div>

        <div class="nav-section">
          <span class="nav-section-label">Configure</span>
          @for (item of configNav; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="nav-link-active" class="nav-link">
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              {{ item.label }}
            </a>
          }
        </div>
      </nav>

      <!-- CPU at bottom -->
      <div class="sidebar-footer">
        <div class="footer-metric">
          <span class="footer-label">CPU</span>
          <div class="cpu-bar-track">
            <div class="cpu-bar-fill" [style.width.%]="cpu()"></div>
          </div>
          <span class="footer-value">{{ cpu() }}%</span>
        </div>
      </div>
    </aside>
  `,
    styles: [`
    .sidebar {
      width: 220px;
      min-width: 220px;
      background: var(--c-base-950);
      border-right: 1px solid var(--c-base-700);
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
      overflow-y: auto;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 16px 14px;
      border-bottom: 1px solid var(--c-base-700);
    }
    .logo-mark { flex-shrink: 0; }
    .logo-text {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--c-text-1);
      letter-spacing: -0.01em;
    }

    .server-status {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid var(--c-base-700);
      gap: 8px;
    }
    .flex { display: flex; }
    .items-center { align-items: center; }
    .gap-2 { gap: 8px; }
    .min-w-0 { min-width: 0; }
    .status-hostname {
      font-size: 0.75rem;
      color: var(--c-text-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .status-metric {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--c-accent);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .status-unit {
      font-size: 0.625rem;
      font-weight: 400;
      color: var(--c-text-3);
    }

    .sidebar-nav {
      flex: 1;
      padding: 8px 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .nav-section { display: flex; flex-direction: column; gap: 1px; }

    .nav-section-label {
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--c-text-3);
      padding: 4px 8px 6px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 8px;
      border-radius: 6px;
      font-size: 0.8125rem;
      color: var(--c-text-2);
      text-decoration: none;
      transition: all 150ms ease;
    }
    .nav-link:hover {
      background: var(--c-base-800);
      color: var(--c-text-1);
    }
    .nav-link-active {
      background: var(--c-accent-dim) !important;
      color: var(--c-accent) !important;
    }
    .nav-icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      opacity: 0.7;
    }
    .nav-link-active .nav-icon { opacity: 1; }

    .sidebar-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--c-base-700);
    }
    .footer-metric {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .footer-label {
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--c-text-3);
      width: 24px;
    }
    .cpu-bar-track {
      flex: 1;
      height: 3px;
      background: var(--c-base-700);
      border-radius: 2px;
      overflow: hidden;
    }
    .cpu-bar-fill {
      height: 100%;
      background: var(--c-accent);
      border-radius: 2px;
      transition: width 1s ease;
    }
    .footer-value {
      font-size: 0.6875rem;
      color: var(--c-text-3);
      width: 28px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  `]
})
export class SidebarComponent implements OnInit {
  private ws = inject(WebsocketService);
  private api = inject(GlassApiService);

  hostname = signal('—');
  lpm = signal(0);
  cpu = signal(0);
  statsState = signal<'ok' | 'warn' | 'danger'>('ok');

  monitorNav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: svgIcon('dashboard') },
    { label: 'Active Leases', path: '/leases', icon: svgIcon('leases') },
    { label: 'Statistics', path: '/statistics', icon: svgIcon('stats') },
    { label: 'Live Log', path: '/log', icon: svgIcon('log') },
  ];

  manageNav: NavItem[] = [
    { label: 'DHCP Config', path: '/config', icon: svgIcon('config') },
    { label: 'Snapshots', path: '/snapshots', icon: svgIcon('snapshots') },
    { label: 'Server Control', path: '/control', icon: svgIcon('control') },
  ];

  configNav: NavItem[] = [
    { label: 'Settings', path: '/settings', icon: svgIcon('settings') },
    { label: 'Alerts', path: '/alerts', icon: svgIcon('alerts') },
  ];

  ngOnInit(): void {
    this.api.getServerInfo().subscribe(info => {
      this.hostname.set(info.host_name);
      this.lpm.set(info.leases_per_minute);
      this.cpu.set(Math.round(info.cpu_utilization));
    });

    this.ws.stats$.subscribe(stats => {
      this.lpm.set(stats.leases_per_minute);
      this.cpu.set(Math.round(stats.cpu_utilization));
    });
  }
}

function svgIcon(name: string): string {
  const icons: Record<string, string> = {
    dashboard: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>`,
    leases: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 3h10M2 7h7M2 11h5"/></svg>`,
    stats: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 11V7l2.5-3 3 2 4.5-5"/></svg>`,
    log: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="2" width="12" height="10" rx="1.5"/><path d="M4 5h6M4 7.5h4"/></svg>`,
    config: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="2"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.22 3.22l1.42 1.42M9.36 9.36l1.42 1.42M3.22 10.78l1.42-1.42M9.36 4.64l1.42-1.42"/></svg>`,
    snapshots: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1 4V2a1 1 0 011-1h2"/><path d="M13 4V2a1 1 0 00-1-1h-2"/><path d="M1 10v2a1 1 0 001 1h2"/><path d="M13 10v2a1 1 0 01-1 1h-2"/><rect x="3" y="4" width="8" height="6" rx="1"/></svg>`,
    control: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M5.5 5l3 2-3 2V5z" fill="currentColor" stroke="none"/></svg>`,
    settings: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="1.5"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"/></svg>`,
    alerts: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7 1L1 12h12L7 1z"/><path d="M7 5.5v3M7 10.5v.5"/></svg>`,
  };
  return icons[name] ?? '';
}
