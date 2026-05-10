import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlassApiService, ServerInfo, Subnet, SubnetDetails, SharedNetwork } from '../../core/services/glass-api.service';
import { WebsocketService } from '../../core/services/websocket.service';
import { Subscription } from 'rxjs';

interface SubnetRow {
  location: string;
  range: string;
  defined: number;
  used: number;
  free: number;
  pct: number;
  isNetwork?: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; }

    .page-header {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 24px;
    }
    .page-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--c-text-1);
      margin: 0;
    }
    .last-updated {
      font-size: 0.75rem;
      color: var(--c-text-3);
    }

    /* ── Stat row ─────────────────────────────────────── */
    .stat-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    @media (max-width: 700px) {
      .stat-row { grid-template-columns: repeat(2, 1fr); }
    }

    .stat-box {
      background: var(--c-base-800);
      border: 1px solid var(--c-base-700);
      border-radius: 8px;
      padding: 16px 20px;
    }
    .stat-box.danger-box {
      border-color: oklch(0.65 0.22 22 / 0.5);
      background: var(--c-base-800);
    }
    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
      color: var(--c-text-1);
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
    .stat-number.danger { color: var(--c-danger); }
    .stat-label {
      font-size: 0.6875rem;
      color: var(--c-text-3);
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 500;
    }

    /* ── Subnet panel ─────────────────────────────────── */
    .subnet-panel {
      background: var(--c-base-800);
      border: 1px solid var(--c-base-700);
      border-radius: 8px;
      overflow: hidden;
    }
    .subnet-panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--c-base-700);
    }
    .subnet-panel-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--c-text-1);
    }
    .subnet-count {
      font-size: 0.6875rem;
      color: var(--c-text-3);
      margin-left: auto;
    }

    /* Shared-network group header row */
    .network-group-row td {
      background: var(--c-base-900) !important;
      color: var(--c-accent) !important;
      font-size: 0.6875rem !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.07em !important;
      padding-top: 10px !important;
      padding-bottom: 10px !important;
      font-family: inherit !important;
      border-bottom: 1px solid var(--c-base-700) !important;
    }

    /* Utilization bar */
    .util-cell { min-width: 120px; }
    .util-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .util-bar-track {
      flex: 1;
      height: 4px;
      background: var(--c-base-700);
      border-radius: 2px;
      overflow: hidden;
    }
    .util-bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 400ms ease;
    }
    .util-pct {
      font-size: 0.6875rem;
      font-variant-numeric: tabular-nums;
      width: 34px;
      text-align: right;
      flex-shrink: 0;
    }
    .util-pct.ok   { color: var(--c-accent); }
    .util-pct.warn { color: var(--c-warning); }
    .util-pct.crit { color: var(--c-danger); }

    /* Skeleton */
    .skeleton-row td { border-bottom: none; }
    .sk {
      height: 12px;
      border-radius: 4px;
      background: var(--c-base-800);
      animation: shimmer 1.5s ease infinite;
    }
    @keyframes shimmer {
      0%, 100% { opacity: 0.5; }
      50%       { opacity: 0.85; }
    }

    /* Mono override for range column */
    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
    }
    .text-primary { color: var(--c-text-1); }
    .text-secondary { color: var(--c-text-2); }
  `],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <div style="display:flex; align-items:center; gap:6px;">
          <div class="live-dot"></div>
          <span class="last-updated">Updated {{ lastUpdated() }}</span>
        </div>
      </div>

      <!-- Stat row -->
      <div class="stat-row">
        <div class="stat-box">
          <div class="stat-number">{{ stats().leases_per_second | number:'1.1-2' }}</div>
          <div class="stat-label">Leases / sec</div>
        </div>

        <div class="stat-box" [class.danger-box]="stats().leases_per_minute < 50">
          <div class="stat-number" [class.danger]="stats().leases_per_minute < 50">
            {{ stats().leases_per_minute | number:'1.0-0' }}
          </div>
          <div class="stat-label">Leases / min</div>
        </div>

        <div class="stat-box">
          <div class="stat-number">{{ totalLeases() | number:'1.0-0' }}</div>
          <div class="stat-label">Total Active Leases</div>
        </div>

        <div class="stat-box">
          <div class="stat-number">{{ stats().cpu_utilization | number:'1.0-1' }}%</div>
          <div class="stat-label">CPU Utilization</div>
        </div>
      </div>

      <!-- Subnet table -->
      <div class="subnet-panel">
        <div class="subnet-panel-header">
          <span class="section-label">Subnet Utilization</span>
          @if (!loadingSubnets()) {
            <span class="subnet-count">{{ subnetRows().length }} subnet{{ subnetRows().length !== 1 ? 's' : '' }}</span>
          }
        </div>

        @if (loadingSubnets()) {
          <table class="data-table">
            <tbody>
              @for (_ of skeletonRows; track $index) {
                <tr class="skeleton-row">
                  <td><div class="sk" style="width:90px;"></div></td>
                  <td><div class="sk" style="width:130px;"></div></td>
                  <td><div class="sk" style="width:50px;"></div></td>
                  <td><div class="sk" style="width:40px;"></div></td>
                  <td><div class="sk" style="width:100px;"></div></td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Range</th>
                <th>Used / Defined</th>
                <th>Free</th>
                <th class="util-cell">Utilization</th>
              </tr>
            </thead>
            <tbody>
              @for (row of subnetRows(); track row.location + row.range) {
                @if (row.isNetwork) {
                  <tr class="network-group-row">
                    <td colspan="5">{{ row.location }}</td>
                  </tr>
                } @else {
                  <tr>
                    <td class="mono">{{ row.location }}</td>
                    <td class="mono text-secondary">{{ row.range }}</td>
                    <td class="text-secondary">{{ row.used }} / {{ row.defined }}</td>
                    <td class="text-secondary">{{ row.free }}</td>
                    <td class="util-cell">
                      <div class="util-wrap">
                        <div class="util-bar-track">
                          <div
                            class="util-bar-fill"
                            [style.width.%]="row.pct"
                            [style.background]="barColor(row.pct)">
                          </div>
                        </div>
                        <span class="util-pct" [class.ok]="row.pct < 70" [class.warn]="row.pct >= 70 && row.pct < 90" [class.crit]="row.pct >= 90">
                          {{ row.pct | number:'1.0-0' }}%
                        </span>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        }
      </div>

    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private api = inject(GlassApiService);
  private ws = inject(WebsocketService);

  stats = signal({ cpu_utilization: 0, leases_per_second: 0, leases_per_minute: 0 });
  totalLeases = signal(0);
  subnetRows = signal<SubnetRow[]>([]);
  loadingSubnets = signal(true);
  lastUpdated = signal('—');

  skeletonRows = Array(5).fill(null);

  private statsSub?: Subscription;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    // WebSocket live stats
    this.ws.connect();
    this.statsSub = this.ws.stats$.subscribe(s => {
      this.stats.set({
        cpu_utilization: s.cpu_utilization,
        leases_per_second: s.leases_per_second,
        leases_per_minute: s.leases_per_minute,
      });
      this.lastUpdated.set(this.now());
    });

    // Initial server info (fallback before WS fires)
    this.api.getServerInfo().subscribe(info => {
      this.stats.set({
        cpu_utilization: info.cpu_utilization,
        leases_per_second: info.leases_per_second,
        leases_per_minute: info.leases_per_minute,
      });
      this.lastUpdated.set(this.now());
    });

    // Active leases count
    this.api.getActiveLeases().subscribe(leases => {
      this.totalLeases.set(Object.keys(leases).length);
    });

    // Subnet table — initial load + 30s poll
    this.loadSubnets();
    this.pollInterval = setInterval(() => this.loadSubnets(), 30_000);
  }

  ngOnDestroy(): void {
    this.statsSub?.unsubscribe();
    clearInterval(this.pollInterval);
  }

  private loadSubnets(): void {
    this.api.getSubnetDetails().subscribe(details => {
      const rows: SubnetRow[] = [];

      if (details.shared_networks?.length) {
        // Group subnets under their shared network
        for (const net of details.shared_networks) {
          rows.push({ location: net.location, range: '', defined: net.defined, used: net.used, free: net.free, pct: 0, isNetwork: true });
          const subnetsInNet = details.subnets.filter(s => s.location.startsWith(net.location));
          for (const s of subnetsInNet) {
            rows.push(this.toRow(s));
          }
        }
        // Ungrouped subnets
        const grouped = new Set(details.shared_networks.flatMap(n => details.subnets.filter(s => s.location.startsWith(n.location)).map(s => s.location)));
        for (const s of details.subnets) {
          if (!grouped.has(s.location)) rows.push(this.toRow(s));
        }
      } else {
        for (const s of details.subnets) {
          rows.push(this.toRow(s));
        }
      }

      this.subnetRows.set(rows);
      this.loadingSubnets.set(false);
    });
  }

  private toRow(s: Subnet): SubnetRow {
    const pct = s.defined > 0 ? Math.round((s.used / s.defined) * 100) : 0;
    return { location: s.location, range: s.range, defined: s.defined, used: s.used, free: s.free, pct };
  }

  barColor(pct: number): string {
    if (pct >= 90) return 'oklch(0.65 0.22 22)';
    if (pct >= 70) return 'oklch(0.81 0.18 55)';
    return 'oklch(0.66 0.26 285)';
  }

  private now(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
