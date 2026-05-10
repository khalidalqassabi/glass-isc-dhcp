import { Component, OnInit, inject, signal } from '@angular/core';

import { GlassApiService } from '../../core/services/glass-api.service';
import { catchError, of } from 'rxjs';

interface Snapshot {
  filename?: string;
  name?: string;
  date?: string;
  created_at?: string;
  content?: string;
  [key: string]: unknown;
}

@Component({
    selector: 'app-snapshots',
    imports: [],
    template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Config Snapshots</h1>
        <p class="page-sub">Historical DHCP configuration backups</p>
      </div>

      @if (htmlFallback()) {
        <div class="panel fallback-panel">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p>Snapshots are served as HTML by the Glass server.</p>
          <a href="/dhcp_config_snapshots" target="_blank" class="btn-outline btn">
            Open Snapshots Page
          </a>
        </div>
      }

      @if (loading() && !htmlFallback()) {
        <div class="panel" style="padding:20px">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton" style="height:48px;border-radius:6px;margin-bottom:8px"></div>
          }
        </div>
      }

      @if (loadError()) {
        <div class="error-banner">{{ loadError() }}</div>
      }

      @if (!loading() && !htmlFallback() && !loadError()) {
        @if (snapshots().length === 0) {
          <div class="panel empty-panel">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p>No snapshots found. Save a config through the editor to create one.</p>
          </div>
        } @else {
          <div class="panel" style="overflow:hidden;padding:0">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Created</th>
                  <th style="text-align:right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (snap of snapshots(); track $index) {
                  <tr>
                    <td>{{ getFilename(snap) }}</td>
                    <td>{{ getDate(snap) }}</td>
                    <td style="text-align:right">
                      <button class="btn-ghost btn" (click)="toggleView($index)" style="font-size:0.75rem">
                        {{ selectedIndex() === $index ? 'Hide' : 'View' }}
                      </button>
                    </td>
                  </tr>
                  @if (selectedIndex() === $index) {
                    <tr class="expand-row">
                      <td colspan="3" style="padding:0">
                        <div class="expand-content">
                          <pre class="snap-content">{{ getContent(snap) }}</pre>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
    styles: [`
    .page { padding: 28px 32px; max-width: 900px; }
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 1.125rem; font-weight: 600; color: var(--c-text-1); margin: 0 0 4px; }
    .page-sub { font-size: 0.8125rem; color: var(--c-text-3); margin: 0; }

    .panel { background: var(--c-base-800); border: 1px solid var(--c-base-700); border-radius: 8px; }

    .fallback-panel {
      padding: 40px 24px;
      display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center;
    }
    .fallback-panel svg { width: 40px; height: 40px; color: var(--c-text-3); }
    .fallback-panel p { color: var(--c-text-2); margin: 0; font-size: 0.875rem; }

    .empty-panel {
      padding: 48px 24px;
      display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center;
    }
    .empty-panel svg { width: 36px; height: 36px; color: var(--c-text-3); }
    .empty-panel p { color: var(--c-text-2); margin: 0; font-size: 0.875rem; }

    .error-banner {
      background: oklch(0.15 0.04 22); border: 1px solid oklch(0.35 0.12 22);
      border-radius: 8px; padding: 14px 18px; color: oklch(0.75 0.12 22); font-size: 0.8125rem;
    }

    .expand-row td { background: var(--c-base-950); }
    .expand-content { padding: 16px 20px; border-top: 1px solid var(--c-base-700); }
    .snap-content {
      margin: 0; padding: 14px;
      background: var(--c-base-950); border: 1px solid var(--c-base-700);
      border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;
      line-height: 1.65; color: var(--c-text-1); overflow-x: auto;
      max-height: 400px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;
    }
  `]
})
export class SnapshotsComponent implements OnInit {
  private api = inject(GlassApiService);

  loading = signal(true);
  htmlFallback = signal(false);
  loadError = signal('');
  snapshots = signal<Snapshot[]>([]);
  selectedIndex = signal<number | null>(null);

  ngOnInit(): void {
    this.api.getConfigSnapshots().pipe(
      catchError(err => {
        const body = err?.error;
        if (typeof body === 'string' && body.trim().startsWith('<')) {
          this.htmlFallback.set(true);
        } else {
          this.loadError.set('Failed to load snapshots: ' + (err?.message ?? 'Unknown error'));
        }
        this.loading.set(false);
        return of([]);
      }),
    ).subscribe(data => {
      if (Array.isArray(data)) {
        this.snapshots.set(data as Snapshot[]);
      } else if (typeof data === 'string' && (data as string).trim().startsWith('<')) {
        this.htmlFallback.set(true);
      }
      this.loading.set(false);
    });
  }

  getFilename(snap: Snapshot): string {
    return String(snap.filename ?? snap.name ?? 'snapshot');
  }

  getDate(snap: Snapshot): string {
    const raw = snap.date ?? snap.created_at;
    if (!raw) return '—';
    const d = new Date(String(raw));
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleString();
  }

  getContent(snap: Snapshot): string {
    return String(snap.content ?? JSON.stringify(snap, null, 2));
  }

  toggleView(index: number): void {
    this.selectedIndex.set(this.selectedIndex() === index ? null : index);
  }
}
