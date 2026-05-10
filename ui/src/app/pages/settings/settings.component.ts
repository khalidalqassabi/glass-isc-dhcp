import { Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { GlassApiService, GlassConfig } from '../../core/services/glass-api.service';

@Component({
    selector: 'app-settings',
    imports: [FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-sub">Glass server configuration</p>
      </div>

      @if (loading()) {
        <div class="skeleton-block"></div>
      } @else {
        <form (ngSubmit)="save()" #f="ngForm">
          <div class="form-grid">
            <!-- Left column -->
            <div class="col">
              <div class="section-block">
                <span class="section-label">Authentication</span>
                <div class="field">
                  <label class="label">Admin Username</label>
                  <input class="input" type="text" [(ngModel)]="form.admin_user" name="admin_user" autocomplete="username" />
                </div>
                <div class="field">
                  <label class="label">Admin Password</label>
                  <div class="input-row">
                    <input class="input" [type]="showPass() ? 'text' : 'password'"
                           [(ngModel)]="form.admin_password" name="admin_password" autocomplete="current-password" />
                    <button type="button" class="btn-ghost btn" (click)="showPass.set(!showPass())">
                      {{ showPass() ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                  <p class="hint">Leave empty to disable authentication.</p>
                </div>
              </div>

              <div class="section-block">
                <span class="section-label">Network</span>
                <div class="field-row">
                  <div class="field">
                    <label class="label">HTTP Port</label>
                    <input class="input" type="number" [(ngModel)]="form.port" name="port" min="1" max="65535" />
                  </div>
                  <div class="field">
                    <label class="label">WebSocket Port</label>
                    <input class="input" type="number" [(ngModel)]="form.ws_port" name="ws_port" min="1" max="65535" />
                  </div>
                </div>
                <div class="field">
                  <label class="label">IP Ranges to Allow</label>
                  <textarea class="input" style="height:90px;resize:vertical;font-family:'JetBrains Mono',monospace;font-size:0.75rem;"
                            [(ngModel)]="ipRangesText" name="ip_ranges"
                            placeholder="Leave empty to allow all&#10;192.168.1.0/24&#10;10.0.0.0/8"></textarea>
                  <p class="hint">One CIDR range per line. Leave blank to allow all.</p>
                </div>
              </div>
            </div>

            <!-- Right column -->
            <div class="col">
              <div class="section-block">
                <span class="section-label">File Paths</span>
                <div class="field">
                  <label class="label">Leases File</label>
                  <input class="input mono" type="text" [(ngModel)]="form.leases_file" name="leases_file"
                         placeholder="/var/lib/dhcp/dhcpd.leases" />
                </div>
                <div class="field">
                  <label class="label">Log File</label>
                  <input class="input mono" type="text" [(ngModel)]="form.log_file" name="log_file"
                         placeholder="/var/log/dhcp.log" />
                </div>
                <div class="field">
                  <label class="label">DHCP Config File</label>
                  <input class="input mono" type="text" [(ngModel)]="form.config_file" name="config_file"
                         placeholder="/etc/dhcp/dhcpd.conf" />
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="form-footer">
            @if (error()) {
              <span class="inline-error">{{ error() }}</span>
            }
            @if (saved()) {
              <span class="inline-success">Settings saved</span>
            }
            <button type="submit" class="btn-primary btn" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save Settings' }}
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

    .section-label {
      font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; color: var(--c-text-3);
    }

    .field { display: flex; flex-direction: column; gap: 5px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .label { font-size: 0.75rem; font-weight: 500; color: var(--c-text-2); }
    .hint { font-size: 0.6875rem; color: var(--c-text-3); margin: 2px 0 0; }

    .input-row { display: flex; gap: 6px; }
    .input-row .input { flex: 1; }

    .input.mono { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }

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
  `]
})
export class SettingsComponent implements OnInit {
  private api = inject(GlassApiService);

  loading = signal(true);
  saving = signal(false);
  saved = signal(false);
  error = signal('');
  showPass = signal(false);

  form: Partial<GlassConfig> & { port?: number } = {
    admin_user: '',
    admin_password: '',
    leases_file: '',
    log_file: '',
    config_file: '',
    ws_port: 8080,
    port: 3000,
  };

  ipRangesText = '';

  ngOnInit(): void {
    this.api.getGlassConfig().subscribe({
      next: (cfg) => {
        this.form = { ...cfg };
        this.ipRangesText = (cfg.ip_ranges_to_allow || []).filter(r => r).join('\n');
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set('');
    this.saved.set(false);

    const payload: Partial<GlassConfig> = {
      ...this.form,
      ip_ranges_to_allow: this.ipRangesText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean),
    };

    this.api.saveGlassSettings(payload).subscribe({
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
