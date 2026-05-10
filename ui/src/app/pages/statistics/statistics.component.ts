import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlassApiService, DhcpRequest } from '../../core/services/glass-api.service';

interface VendorBar {
  name: string;
  count: number;
  pct: number; // 0–100 relative to max
}

interface RequestRow {
  mac: string;
  vendor: string;
  count: number;
  requestFor: string;
  requestVia: string;
}

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; }

    .page-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--c-text-1);
      margin: 0 0 24px;
    }

    /* Two-column layout */
    .cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 800px) {
      .cols { grid-template-columns: 1fr; }
    }

    /* Panel */
    .panel-box {
      background: var(--c-base-800);
      border: 1px solid var(--c-base-700);
      border-radius: 8px;
      overflow: hidden;
    }
    .panel-header {
      padding: 14px 16px;
      border-bottom: 1px solid var(--c-base-700);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .panel-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--c-text-1);
    }
    .panel-sub {
      font-size: 0.6875rem;
      color: var(--c-text-3);
      margin-left: auto;
    }
    .panel-body { padding: 12px 16px; }

    /* Vendor bar chart */
    .vendor-list { display: flex; flex-direction: column; gap: 8px; }
    .vendor-row { display: flex; flex-direction: column; gap: 3px; }
    .vendor-meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .vendor-name {
      font-size: 0.75rem;
      color: var(--c-text-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 70%;
    }
    .vendor-count {
      font-size: 0.6875rem;
      color: var(--c-text-3);
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
    }
    .bar-track {
      height: 6px;
      background: var(--c-base-700);
      border-radius: 3px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: var(--c-accent);
      border-radius: 3px;
      transition: width 500ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Empty state */
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 40px 16px;
      color: var(--c-text-3);
      font-size: 0.8125rem;
    }

    /* Skeleton bars */
    .sk-vendor { display: flex; flex-direction: column; gap: 6px; }
    .sk { border-radius: 4px; background: var(--c-base-700); animation: shimmer 1.5s ease infinite; }
    @keyframes shimmer {
      0%, 100% { opacity: 0.5; }
      50%       { opacity: 0.85; }
    }

    /* Mono for MACs / IPs */
    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
    }
    .text-secondary { color: var(--c-text-2); }
    .text-muted { color: var(--c-text-3); }

    /* Request count badge */
    .count-pill {
      display: inline-block;
      background: var(--c-danger-dim);
      color: var(--c-danger);
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 0.6875rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  `],
  template: `
    <div class="page">
      <h1 class="page-title">Statistics</h1>

      <div class="cols">

        <!-- Vendor breakdown -->
        <div class="panel-box">
          <div class="panel-header">
            <span class="section-label">Vendor Breakdown</span>
            @if (!loadingVendors() && vendorBars().length > 0) {
              <span class="panel-sub">Top {{ vendorBars().length }}</span>
            }
          </div>
          <div class="panel-body">
            @if (loadingVendors()) {
              <div class="vendor-list">
                @for (_ of skeletonRows; track $index) {
                  <div class="sk-vendor">
                    <div class="sk" [style.height.px]="10" [style.width.%]="70 - $index * 4"></div>
                    <div class="sk" [style.height.px]="6" style="width:100%;"></div>
                  </div>
                }
              </div>
            } @else if (vendorBars().length === 0) {
              <div class="empty">No vendor data available</div>
            } @else {
              <div class="vendor-list">
                @for (v of vendorBars(); track v.name) {
                  <div class="vendor-row">
                    <div class="vendor-meta">
                      <span class="vendor-name" [title]="v.name">{{ v.name }}</span>
                      <span class="vendor-count">{{ v.count | number }}</span>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" [style.width.%]="v.pct"></div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Excessive DHCP requests -->
        <div class="panel-box">
          <div class="panel-header">
            <span class="section-label">Excessive DHCP Requests</span>
            @if (!loadingRequests()) {
              <span class="panel-sub">&gt;20 requests</span>
            }
          </div>

          @if (loadingRequests()) {
            <table class="data-table">
              <tbody>
                @for (_ of skeletonRows; track $index) {
                  <tr>
                    <td><div class="sk" style="height:10px; width:120px;"></div></td>
                    <td><div class="sk" style="height:10px; width:80px;"></div></td>
                    <td><div class="sk" style="height:10px; width:36px;"></div></td>
                  </tr>
                }
              </tbody>
            </table>
          } @else if (requestRows().length === 0) {
            <div class="empty">No excessive DHCP requests detected</div>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>MAC</th>
                  <th>Vendor</th>
                  <th>Count</th>
                  <th>Request For</th>
                  <th>Via Relay</th>
                </tr>
              </thead>
              <tbody>
                @for (row of requestRows(); track row.mac) {
                  <tr>
                    <td class="mono">{{ row.mac }}</td>
                    <td class="text-secondary">{{ row.vendor || '—' }}</td>
                    <td>
                      <span class="count-pill">{{ row.count }}</span>
                    </td>
                    <td class="mono text-secondary" style="font-family:'JetBrains Mono',monospace; font-size:0.75rem; color:var(--c-text-2);">{{ row.requestFor || '—' }}</td>
                    <td class="mono text-secondary" style="font-family:'JetBrains Mono',monospace; font-size:0.75rem; color:var(--c-text-2);">{{ row.requestVia || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

      </div>
    </div>
  `,
})
export class StatisticsComponent implements OnInit {
  private api = inject(GlassApiService);

  vendorBars = signal<VendorBar[]>([]);
  loadingVendors = signal(true);

  requestRows = signal<RequestRow[]>([]);
  loadingRequests = signal(true);

  skeletonRows = Array(5).fill(null);

  ngOnInit(): void {
    // Vendor breakdown
    this.api.getVendorCount().subscribe(data => {
      const entries = Object.entries(data)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      const max = entries[0]?.count ?? 1;

      this.vendorBars.set(
        entries.map(e => ({
          name: e.name,
          count: e.count,
          pct: Math.round((e.count / max) * 100),
        })),
      );
      this.loadingVendors.set(false);
    });

    // Excessive DHCP requests
    this.api.getDhcpRequests().subscribe(data => {
      const rows: RequestRow[] = Object.entries(data)
        .filter(([, req]) => req.request_count > 20)
        .sort((a, b) => b[1].request_count - a[1].request_count)
        .map(([mac, req]) => ({
          mac,
          vendor: req.request_vendor,
          count: req.request_count,
          requestFor: req.request_for,
          requestVia: req.request_via,
        }));

      this.requestRows.set(rows);
      this.loadingRequests.set(false);
    });
  }
}
