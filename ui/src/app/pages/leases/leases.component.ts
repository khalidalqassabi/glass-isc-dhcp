import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlassApiService, Lease } from '../../core/services/glass-api.service';
import { debounceTime, distinctUntilChanged, Subject, switchMap, Subscription } from 'rxjs';

interface LeaseRow {
  ip: string;
  mac: string;
  vendor: string;
  host: string;
  expiresTs: number;
  options: Record<string, string>;
  optionCount: number;
  expanded: boolean;
}

@Component({
  selector: 'app-leases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; }

    .page-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .page-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--c-text-1);
      margin: 0;
      flex: 1;
    }

    /* Search */
    .search-bar {
      position: relative;
      margin-bottom: 16px;
    }
    .search-bar svg {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--c-text-3);
      pointer-events: none;
    }
    .search-input {
      background: var(--c-base-800);
      border: 1px solid var(--c-base-700);
      border-radius: 6px;
      color: var(--c-text-1);
      font-size: 0.8125rem;
      padding: 8px 12px 8px 34px;
      width: 100%;
      max-width: 420px;
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
      font-family: inherit;
    }
    .search-input::placeholder { color: var(--c-text-3); }
    .search-input:focus {
      border-color: var(--c-accent);
      box-shadow: 0 0 0 3px var(--c-accent-dim);
    }

    /* Summary row */
    .summary-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }
    .summary-stat {
      font-size: 0.75rem;
      color: var(--c-text-3);
    }
    .summary-stat strong {
      color: var(--c-text-1);
      font-weight: 600;
    }

    /* Table panel */
    .table-panel {
      background: var(--c-base-800);
      border: 1px solid var(--c-base-700);
      border-radius: 8px;
      overflow: hidden;
    }

    /* Mono override for IP/MAC */
    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
    }

    /* Expires */
    .expires-ok   { color: var(--c-text-2); }
    .expires-soon { color: var(--c-warning); }
    .expires-past { color: var(--c-danger); }

    /* Options badge — make it look clickable */
    .options-badge-btn {
      background: var(--c-accent-dim);
      color: var(--c-accent);
      border: none;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      cursor: pointer;
      transition: background 120ms ease;
    }
    .options-badge-btn:hover { background: oklch(0.66 0.26 285 / 0.28); }

    /* Expanded options row */
    .options-row td {
      background: var(--c-base-900) !important;
      border-bottom: 1px solid var(--c-base-700) !important;
      padding: 10px 16px !important;
      color: var(--c-text-2) !important;
      font-family: inherit !important;
      font-size: 0.8125rem !important;
    }
    .options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 4px 20px;
    }
    .option-item {
      display: flex;
      gap: 8px;
      font-size: 0.75rem;
    }
    .option-key {
      font-family: 'JetBrains Mono', monospace;
      color: var(--c-accent);
      flex-shrink: 0;
    }
    .option-val {
      color: var(--c-text-2);
      word-break: break-all;
    }

    /* Skeleton */
    .sk {
      height: 12px;
      border-radius: 4px;
      background: var(--c-base-700);
      animation: shimmer 1.5s ease infinite;
    }
    .skeleton-row td { padding: 12px; border-bottom: 1px solid var(--c-base-700); }
    @keyframes shimmer {
      0%, 100% { opacity: 0.5; }
      50%       { opacity: 0.85; }
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 56px 24px;
      gap: 10px;
      color: var(--c-text-3);
    }
    .empty-icon {
      width: 36px;
      height: 36px;
      opacity: 0.4;
    }
    .empty-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--c-text-2);
    }
    .empty-sub {
      font-size: 0.75rem;
    }

    .text-secondary { color: var(--c-text-2); }
  `],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">Active Leases</h1>
      </div>

      <!-- Search -->
      <div class="search-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          class="search-input"
          type="text"
          placeholder="Search IP, MAC, hostname, vendor..."
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearch($event)"
        />
      </div>

      <!-- Summary -->
      @if (!loading()) {
        <div class="summary-row">
          <span class="summary-stat"><strong>{{ rows().length }}</strong> active lease{{ rows().length !== 1 ? 's' : '' }}</span>
          @if (uniqueVendors() > 0) {
            <span class="summary-stat"><strong>{{ uniqueVendors() }}</strong> unique vendor{{ uniqueVendors() !== 1 ? 's' : '' }}</span>
          }
        </div>
      }

      <!-- Table panel -->
      <div class="table-panel">

        <!-- Loading skeleton -->
        @if (loading()) {
          <table class="data-table">
            <tbody>
              @for (_ of skeletonRows; track $index) {
                <tr class="skeleton-row">
                  <td><div class="sk" style="width:110px;"></div></td>
                  <td><div class="sk" style="width:130px;"></div></td>
                  <td><div class="sk" style="width:100px;"></div></td>
                  <td><div class="sk" style="width:80px;"></div></td>
                  <td><div class="sk" style="width:70px;"></div></td>
                  <td><div class="sk" style="width:30px;"></div></td>
                </tr>
              }
            </tbody>
          </table>
        } @else if (rows().length === 0) {
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
            <div class="empty-title">No active leases found</div>
            @if (searchQuery) {
              <div class="empty-sub">No results for "{{ searchQuery }}" — try a different search</div>
            }
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>MAC</th>
                <th>Vendor</th>
                <th>Hostname</th>
                <th>Expires</th>
                <th>Opts</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.ip) {
                <tr style="cursor:default;">
                  <td class="mono">{{ row.ip }}</td>
                  <td class="mono text-secondary">{{ row.mac }}</td>
                  <td class="text-secondary">{{ row.vendor || '—' }}</td>
                  <td class="text-secondary">{{ row.host || '—' }}</td>
                  <td>
                    <span [class]="expiresClass(row.expiresTs)">{{ formatExpires(row.expiresTs) }}</span>
                  </td>
                  <td>
                    @if (row.optionCount > 0) {
                      <button class="options-badge-btn" (click)="toggleExpand(row)">
                        {{ row.optionCount }}
                      </button>
                    } @else {
                      <span class="text-secondary" style="font-size:0.75rem;">—</span>
                    }
                  </td>
                </tr>
                @if (row.expanded) {
                  <tr class="options-row">
                    <td colspan="6">
                      <div class="options-grid">
                        @for (entry of optionEntries(row.options); track entry[0]) {
                          <div class="option-item">
                            <span class="option-key">{{ entry[0] }}</span>
                            <span class="option-val">{{ entry[1] }}</span>
                          </div>
                        }
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
export class LeasesComponent implements OnInit, OnDestroy {
  private api = inject(GlassApiService);

  rows = signal<LeaseRow[]>([]);
  loading = signal(true);
  searchQuery = '';

  uniqueVendors = (): number => {
    const vendors = new Set(this.rows().map(r => r.vendor).filter(Boolean));
    return vendors.size;
  };

  skeletonRows = Array(3).fill(null);

  private search$ = new Subject<string>();
  private searchSub?: Subscription;

  ngOnInit(): void {
    this.searchSub = this.search$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(q => {
        this.loading.set(true);
        return this.api.getActiveLeases(q || undefined);
      }),
    ).subscribe(leases => {
      this.rows.set(this.toRows(leases));
      this.loading.set(false);
    });

    // Initial load
    this.search$.next('');
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearch(val: string): void {
    this.search$.next(val);
  }

  toggleExpand(row: LeaseRow): void {
    row.expanded = !row.expanded;
  }

  formatExpires(ts: number): string {
    const now = Date.now() / 1000;
    const diff = ts - now;
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    if (h > 0) return `in ${h}h ${m}m`;
    if (m > 0) return `in ${m}m`;
    return 'expiring soon';
  }

  expiresClass(ts: number): string {
    const diff = ts - Date.now() / 1000;
    if (diff <= 0) return 'expires-past';
    if (diff < 1800) return 'expires-soon';
    return 'expires-ok';
  }

  optionEntries(options: Record<string, string> = {}): [string, string][] {
    return Object.entries(options);
  }

  private toRows(raw: Record<string, Lease>): LeaseRow[] {
    return Object.entries(raw).map(([ip, lease]) => ({
      ip,
      mac: lease.mac,
      vendor: lease.mac_oui_vendor || '',
      host: lease.host || '',
      expiresTs: lease.end,
      options: lease.options || {},
      optionCount: lease.options ? Object.keys(lease.options).length : 0,
      expanded: false,
    }));
  }
}
