import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlassApiService, ServerInfo } from '../../core/services/glass-api.service';

type ConfirmAction = 'stop' | 'restart' | null;
type ActionStatus = 'idle' | 'pending' | 'success' | 'error';

@Component({
    selector: 'app-control',
    imports: [CommonModule],
    template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Server Control</h1>
        <p class="page-sub">Manage the ISC DHCP daemon</p>
      </div>

      <!-- Status card -->
      <div class="panel status-card">
        <div class="status-icon" [class.running]="isRunning()" [class.stopped]="!isRunning()">
          @if (isRunning()) {
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          } @else {
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"/>
            </svg>
          }
        </div>

        <div class="status-text">
          <span class="status-label" [class.running]="isRunning()" [class.stopped]="!isRunning()">
            {{ isRunning() ? 'Running' : 'Stopped' }}
          </span>
          <span class="status-desc">ISC DHCP Server (dhcpd)</span>
        </div>

        @if (serverInfo() && !infoLoading()) {
          <div class="stats-row">
            <div class="stat">
              <span class="stat-num">{{ serverInfo()!.leases_per_second }}</span>
              <span class="stat-label">Leases/sec</span>
            </div>
            <div class="stat">
              <span class="stat-num">{{ serverInfo()!.leases_per_minute }}</span>
              <span class="stat-label">Leases/min</span>
            </div>
            <div class="stat">
              <span class="stat-num">{{ serverInfo()!.cpu_utilization | number:'1.0-1' }}<span class="stat-unit">%</span></span>
              <span class="stat-label">CPU</span>
            </div>
          </div>
        }
      </div>

      <!-- Action feedback -->
      @if (actionStatus() === 'success') {
        <div class="feedback-success">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          {{ successMessage() }}
        </div>
      }
      @if (actionStatus() === 'error') {
        <div class="feedback-error">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ errorMessage() }}
        </div>
      }

      <!-- Inline confirmation -->
      @if (confirmAction()) {
        <div class="confirm-banner">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div class="confirm-body">
            <div class="confirm-title">Confirm {{ confirmAction() === 'stop' ? 'Stop' : 'Restart' }}</div>
            <div class="confirm-desc">
              @if (confirmAction() === 'stop') {
                This will stop DHCP service for all clients. No new leases will be issued until restarted.
              } @else {
                This will restart the DHCP service, causing a brief interruption for all clients.
              }
            </div>
            <div class="confirm-actions">
              <button [class]="confirmAction() === 'stop' ? 'btn-danger btn' : 'btn-warn btn'"
                      (click)="executeConfirmedAction()"
                      [disabled]="actionStatus() === 'pending'">
                @if (actionStatus() === 'pending') { <span class="spin-inline">⟳</span> }
                Confirm {{ confirmAction() === 'stop' ? 'Stop' : 'Restart' }}
              </button>
              <button class="btn-ghost btn" (click)="cancelAction()" [disabled]="actionStatus() === 'pending'">
                Cancel
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Action buttons -->
      <div class="panel actions-panel">
        <span class="section-label">Service Actions</span>
        <div class="action-btns">
          <button class="btn-primary btn action-btn" (click)="startServer()"
                  [disabled]="actionStatus() === 'pending' || !!confirmAction()">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Start
          </button>

          <button class="btn-outline btn action-btn" (click)="requestAction('restart')"
                  [disabled]="actionStatus() === 'pending' || !!confirmAction()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Restart
          </button>

          <button class="btn-danger btn action-btn" (click)="requestAction('stop')"
                  [disabled]="actionStatus() === 'pending' || !!confirmAction()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"/>
            </svg>
            Stop
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { padding: 28px 32px; max-width: 820px; display: flex; flex-direction: column; gap: 20px; }
    .page-header { margin: 0; }
    .page-title { font-size: 1.125rem; font-weight: 600; color: var(--c-text-1); margin: 0 0 4px; }
    .page-sub { font-size: 0.8125rem; color: var(--c-text-3); margin: 0; }

    .panel { background: var(--c-base-800); border: 1px solid var(--c-base-700); border-radius: 8px; }

    .status-card {
      display: flex; align-items: center; gap: 24px; padding: 24px;
    }
    .status-icon {
      width: 60px; height: 60px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .status-icon svg { width: 26px; height: 26px; }
    .status-icon.running { background: var(--c-accent-dim); border: 2px solid var(--c-accent); color: var(--c-accent); }
    .status-icon.stopped { background: var(--c-danger-dim); border: 2px solid var(--c-danger); color: var(--c-danger); }

    .status-text { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .status-label { font-size: 1.75rem; font-weight: 700; }
    .status-label.running { color: var(--c-accent); }
    .status-label.stopped { color: var(--c-danger); }
    .status-desc { font-size: 0.8125rem; color: var(--c-text-3); }

    .stats-row { display: flex; gap: 28px; flex-shrink: 0; }
    .stat { text-align: center; display: flex; flex-direction: column; gap: 3px; }
    .stat-num { font-size: 1.5rem; font-weight: 700; color: var(--c-text-1); font-variant-numeric: tabular-nums; }
    .stat-unit { font-size: 0.875rem; color: var(--c-text-3); }
    .stat-label { font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--c-text-3); }

    .feedback-success {
      display: flex; align-items: center; gap: 10px;
      background: oklch(0.14 0.04 285 / 0.25); border: 1px solid oklch(0.66 0.26 285 / 0.4);
      border-radius: 8px; padding: 12px 16px; color: var(--c-accent); font-size: 0.875rem;
    }
    .feedback-success svg { width: 16px; height: 16px; flex-shrink: 0; }
    .feedback-error {
      display: flex; align-items: center; gap: 10px;
      background: oklch(0.15 0.04 22); border: 1px solid oklch(0.35 0.12 22);
      border-radius: 8px; padding: 12px 16px; color: oklch(0.75 0.12 22); font-size: 0.875rem;
    }
    .feedback-error svg { width: 16px; height: 16px; flex-shrink: 0; }

    .confirm-banner {
      display: flex; align-items: flex-start; gap: 12px;
      background: oklch(0.14 0.04 55); border: 1px solid oklch(0.81 0.18 55 / 0.4);
      border-radius: 8px; padding: 16px 20px;
    }
    .confirm-banner > svg { width: 18px; height: 18px; color: var(--c-warning); flex-shrink: 0; margin-top: 2px; }
    .confirm-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .confirm-title { font-weight: 600; color: var(--c-warning); font-size: 0.875rem; }
    .confirm-desc { color: oklch(0.70 0.08 55); font-size: 0.8125rem; }
    .confirm-actions { display: flex; gap: 8px; margin-top: 4px; }

    .actions-panel { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
    .action-btns { display: flex; gap: 10px; flex-wrap: wrap; }
    .action-btn { padding: 10px 20px; font-size: 0.875rem; display: flex; align-items: center; gap: 7px; }
    .action-btn svg { width: 15px; height: 15px; }

    .btn-warn {
      background: var(--c-warning-dim); color: var(--c-warning);
      border: 1px solid oklch(0.81 0.18 55 / 0.4); border-radius: 6px;
      padding: 7px 14px; font-size: 0.8125rem; font-weight: 500;
      cursor: pointer; transition: background 150ms ease;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .btn-warn:hover:not([disabled]) { background: oklch(0.81 0.18 55 / 0.25); }

    button[disabled] { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

    .spin-inline { display: inline-block; animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class ControlComponent implements OnInit {
  private api = inject(GlassApiService);

  serverInfo = signal<ServerInfo | null>(null);
  infoLoading = signal(true);
  confirmAction = signal<ConfirmAction>(null);
  actionStatus = signal<ActionStatus>('idle');
  pendingAction = signal<string | null>(null);
  successMessage = signal('');
  errorMessage = signal('');

  isRunning = () => (this.serverInfo()?.leases_per_second ?? 0) > 0;

  ngOnInit(): void {
    this.loadServerInfo();
  }

  private loadServerInfo(): void {
    this.infoLoading.set(true);
    this.api.getServerInfo().subscribe({
      next: (info) => { this.serverInfo.set(info); this.infoLoading.set(false); },
      error: () => this.infoLoading.set(false),
    });
  }

  startServer(): void {
    this.clearFeedback();
    this.actionStatus.set('pending');
    this.pendingAction.set('start');
    this.api.dhcpStart().subscribe({
      next: () => {
        this.actionStatus.set('success');
        this.successMessage.set('DHCP service started successfully.');
        this.pendingAction.set(null);
        this.loadServerInfo();
        this.autoResetFeedback();
      },
      error: (err) => {
        this.actionStatus.set('error');
        this.errorMessage.set('Failed to start: ' + (err?.message ?? 'Unknown error'));
        this.pendingAction.set(null);
      },
    });
  }

  requestAction(action: 'stop' | 'restart'): void {
    this.clearFeedback();
    this.confirmAction.set(action);
  }

  cancelAction(): void {
    this.confirmAction.set(null);
  }

  executeConfirmedAction(): void {
    const action = this.confirmAction();
    if (!action) return;
    this.actionStatus.set('pending');
    this.pendingAction.set(action);
    this.confirmAction.set(null);

    const call$ = action === 'stop' ? this.api.dhcpStop() : this.api.dhcpRestart();
    call$.subscribe({
      next: () => {
        this.actionStatus.set('success');
        this.successMessage.set(`DHCP service ${action === 'stop' ? 'stopped' : 'restarted'} successfully.`);
        this.pendingAction.set(null);
        this.loadServerInfo();
        this.autoResetFeedback();
      },
      error: (err) => {
        this.actionStatus.set('error');
        this.errorMessage.set(`Failed to ${action}: ` + (err?.message ?? 'Unknown error'));
        this.pendingAction.set(null);
      },
    });
  }

  private clearFeedback(): void {
    this.actionStatus.set('idle');
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  private autoResetFeedback(): void {
    setTimeout(() => {
      if (this.actionStatus() === 'success') {
        this.actionStatus.set('idle');
        this.successMessage.set('');
      }
    }, 4000);
  }
}
