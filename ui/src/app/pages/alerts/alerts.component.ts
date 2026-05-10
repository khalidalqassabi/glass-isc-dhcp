import { Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { GlassApiService, GlassConfig } from '../../core/services/glass-api.service';

@Component({
    selector: 'app-alerts',
    imports: [FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Alert Settings</h1>
        <p class="page-sub">Configure thresholds and notification destinations</p>
      </div>

      @if (loading()) {
        <div class="skeleton-block"></div>
      } @else {
        <form (ngSubmit)="save()">
          <div class="form-grid">
            <!-- Left column -->
            <div class="col">
              <div class="section-block">
                <span class="section-label">Subnet Utilization</span>
                <p class="section-desc">Checks every 60 seconds. Set to 0 to disable.</p>
                <div class="field-row">
                  <div class="field">
                    <label class="label">Warning Threshold %</label>
                    <input class="input" type="number" [(ngModel)]="form.shared_network_warning_threshold"
                           name="warn_thresh" min="0" max="100" />
                  </div>
                  <div class="field">
                    <label class="label">Critical Threshold %</label>
                    <input class="input" type="number" [(ngModel)]="form.shared_network_critical_threshold"
                           name="crit_thresh" min="0" max="100" />
                  </div>
                </div>
                <div class="threshold-preview">
                  <div class="preview-bar">
                    <div class="preview-segment warn"
                         [style.width]="form.shared_network_warning_threshold + '%'"></div>
                    <div class="preview-segment crit"
                         [style.width]="form.shared_network_critical_threshold + '%'"></div>
                  </div>
                  <span class="hint">Warning at {{ form.shared_network_warning_threshold }}%, Critical at {{ form.shared_network_critical_threshold }}%</span>
                </div>
              </div>

              <div class="section-block">
                <span class="section-label">Leases Per Minute</span>
                <p class="section-desc">Fires when leases/min drops below threshold. Checked every 5 seconds. Set to 0 to disable.</p>
                <div class="field">
                  <label class="label">Min Leases / Minute</label>
                  <input class="input" type="number" [(ngModel)]="form.leases_per_minute_threshold"
                         name="lpm_thresh" min="0" />
                </div>
              </div>

              <div class="section-block">
                <span class="section-label">Slack</span>
                <div class="field">
                  <label class="label">Webhook URL</label>
                  <input class="input" type="text" [(ngModel)]="form.slack_webhook_url"
                         name="slack_webhook" placeholder="https://hooks.slack.com/services/..." />
                </div>
                <div class="field">
                  <label class="label">Alert Channel</label>
                  <input class="input" type="text" [(ngModel)]="form.slack_alert_channel"
                         name="slack_channel" placeholder="#dhcp-alerts" />
                </div>
              </div>
            </div>

            <!-- Right column -->
            <div class="col">
              <div class="section-block">
                <span class="section-label">Email</span>
                <div class="field">
                  <label class="label">Alert To</label>
                  <input class="input" type="email" [(ngModel)]="form.email_alert_to"
                         name="email_to" placeholder="ops@example.com" />
                  <p class="hint">Uses sendmail. Separate multiple with commas.</p>
                </div>
              </div>

              <div class="section-block">
                <span class="section-label">SMS</span>
                <div class="field">
                  <label class="label">SMS Alert To</label>
                  <input class="input" type="text" [(ngModel)]="form.sms_alert_to"
                         name="sms_to" placeholder="1234567890@carrier.com" />
                  <p class="hint">SMS alerts are truncated to 140 characters. Use as a backup method.</p>
                </div>
              </div>

              <div class="alert-preview panel" style="padding:14px">
                <span class="section-label" style="display:block;margin-bottom:10px">Active alert methods</span>
                <div class="method-list">
                  <div class="method-row" [class.active]="!!form.slack_webhook_url">
                    <span class="method-dot" [class.on]="!!form.slack_webhook_url"></span>
                    Slack
                  </div>
                  <div class="method-row" [class.active]="!!form.email_alert_to">
                    <span class="method-dot" [class.on]="!!form.email_alert_to"></span>
                    Email
                  </div>
                  <div class="method-row" [class.active]="!!form.sms_alert_to">
                    <span class="method-dot" [class.on]="!!form.sms_alert_to"></span>
                    SMS
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-footer">
            @if (error()) {
              <span class="inline-error">{{ error() }}</span>
            }
            @if (saved()) {
              <span class="inline-success">Alert settings saved</span>
            }
            <button type="submit" class="btn-primary btn" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save Alert Settings' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
    styles: [`
    .page { padding: 28px 32px; max-width: 900px; }
    .page-header { margin-bottom: 28px; }
    .page-title { font-size: 1.125rem; font-weight: 600; color: var(--c-text-1); margin: 0 0 4px; }
    .page-sub { font-size: 0.8125rem; color: var(--c-text-3); margin: 0; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } }
    .col { display: flex; flex-direction: column; gap: 20px; }

    .section-block {
      background: var(--c-base-800); border: 1px solid var(--c-base-700);
      border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 14px;
    }
    .section-desc { font-size: 0.75rem; color: var(--c-text-3); margin: -6px 0 0; }

    .field { display: flex; flex-direction: column; gap: 5px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .label { font-size: 0.75rem; font-weight: 500; color: var(--c-text-2); }
    .hint { font-size: 0.6875rem; color: var(--c-text-3); margin: 2px 0 0; }

    .threshold-preview { display: flex; flex-direction: column; gap: 6px; }
    .preview-bar {
      height: 4px; background: var(--c-base-700); border-radius: 2px;
      overflow: hidden; position: relative;
    }
    .preview-segment { position: absolute; top: 0; left: 0; height: 100%; border-radius: 2px; }
    .preview-segment.warn { background: var(--c-warning); }
    .preview-segment.crit { background: var(--c-danger); }

    .alert-preview { background: var(--c-base-950); border: 1px solid var(--c-base-700); }
    .method-list { display: flex; flex-direction: column; gap: 8px; }
    .method-row {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.8125rem; color: var(--c-text-3);
    }
    .method-row.active { color: var(--c-text-2); }
    .method-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--c-base-600); flex-shrink: 0;
    }
    .method-dot.on { background: var(--c-accent); }

    .form-footer {
      display: flex; align-items: center; gap: 12px; justify-content: flex-end;
      margin-top: 24px; padding-top: 16px;
      border-top: 1px solid var(--c-base-700);
    }
    .inline-error { font-size: 0.8125rem; color: var(--c-danger); }
    .inline-success { font-size: 0.8125rem; color: var(--c-accent); }

    .skeleton-block {
      background: var(--c-base-800); border-radius: 8px; height: 400px;
      animation: shimmer 1.5s ease infinite;
    }
    @keyframes shimmer { 0%,100% { opacity:0.5; } 50% { opacity:0.8; } }
    .panel { background: var(--c-base-800); border: 1px solid var(--c-base-700); border-radius: 8px; }
  `]
})
export class AlertsComponent implements OnInit {
  private api = inject(GlassApiService);

  loading = signal(true);
  saving = signal(false);
  saved = signal(false);
  error = signal('');

  form: Partial<GlassConfig> = {
    shared_network_warning_threshold: '0',
    shared_network_critical_threshold: '95',
    leases_per_minute_threshold: '50',
    slack_webhook_url: '',
    slack_alert_channel: '',
    email_alert_to: '',
    sms_alert_to: '',
  };

  ngOnInit(): void {
    this.api.getGlassConfig().subscribe({
      next: (cfg) => {
        this.form = {
          shared_network_warning_threshold: cfg.shared_network_warning_threshold,
          shared_network_critical_threshold: cfg.shared_network_critical_threshold,
          leases_per_minute_threshold: cfg.leases_per_minute_threshold,
          slack_webhook_url: cfg.slack_webhook_url,
          slack_alert_channel: cfg.slack_alert_channel,
          email_alert_to: cfg.email_alert_to,
          sms_alert_to: cfg.sms_alert_to,
        };
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set('');
    this.saved.set(false);

    this.api.saveAlertSettings(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Save failed');
      }
    });
  }
}
