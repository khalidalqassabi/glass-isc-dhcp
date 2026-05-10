import { Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { GlassApiService } from '../../core/services/glass-api.service';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

@Component({
    selector: 'app-config',
    imports: [FormsModule],
    template: `
    <div class="config-page">
      <!-- Toolbar -->
      <div class="toolbar">
        <h1 class="page-title">DHCP Configuration</h1>

        <div class="status-indicator">
          @if (saveStatus() === 'saving') {
            <span class="status-saving">
              <svg class="spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Saving...
            </span>
          } @else if (saveStatus() === 'saved') {
            <span class="status-saved">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Saved
            </span>
          } @else if (isDirty()) {
            <span class="status-dirty">Unsaved changes</span>
          }
        </div>

        <button class="btn-primary btn" (click)="saveConfig()"
                [disabled]="saveStatus() === 'saving' || loading()">
          Save Config
        </button>
      </div>

      <!-- Error banner -->
      @if (saveStatus() === 'error') {
        <div class="error-banner">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>{{ errorMessage() }}</span>
          <button class="dismiss-btn" (click)="dismissError()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }

      @if (loading()) {
        <div class="skeleton editor-skeleton"></div>
      } @else {
        <textarea
          class="editor"
          [(ngModel)]="currentContent"
          (ngModelChange)="onContentChange()"
          (keydown)="onKeyDown($event)"
          spellcheck="false"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
        ></textarea>
      }
    </div>
  `,
    styles: [`
    .config-page {
      padding: 24px;
      display: flex;
      flex-direction: column;
      height: 100vh;
      box-sizing: border-box;
      gap: 12px;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .page-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--c-text-1);
      flex: 1;
    }

    .status-indicator {
      display: flex;
      align-items: center;
    }
    .status-saving {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.8125rem; color: var(--c-text-2);
    }
    .status-saving svg { width: 14px; height: 14px; }
    .status-saved {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.8125rem; font-weight: 500; color: var(--c-accent);
    }
    .status-saved svg { width: 14px; height: 14px; }
    .status-dirty { font-size: 0.8125rem; color: var(--c-warning); }

    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: oklch(0.15 0.04 22);
      border: 1px solid oklch(0.35 0.12 22);
      border-radius: 8px;
      padding: 12px 16px;
      flex-shrink: 0;
    }
    .error-banner svg { width: 16px; height: 16px; color: var(--c-danger); flex-shrink: 0; margin-top: 1px; }
    .error-banner span { flex: 1; color: oklch(0.75 0.12 22); font-size: 0.8125rem; }
    .dismiss-btn {
      background: none; border: none; cursor: pointer;
      color: var(--c-text-3); padding: 0; line-height: 1;
    }
    .dismiss-btn svg { width: 14px; height: 14px; display: block; }

    .editor {
      flex: 1;
      width: 100%;
      background: var(--c-base-950);
      color: var(--c-text-1);
      border: 1px solid var(--c-base-700);
      border-radius: 8px;
      padding: 16px 20px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 13px;
      line-height: 1.65;
      resize: none;
      box-sizing: border-box;
      outline: none;
      caret-color: var(--c-accent);
      tab-size: 2;
      white-space: pre;
      overflow-wrap: normal;
      overflow-x: auto;
      transition: border-color 150ms ease;
    }
    .editor:focus { border-color: var(--c-accent); }

    .editor-skeleton { flex: 1; border-radius: 8px; }

    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }

    button[disabled] { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class ConfigComponent implements OnInit {
  private api = inject(GlassApiService);

  loading = signal(true);
  saveStatus = signal<SaveStatus>('idle');
  errorMessage = signal('');
  currentContent = '';
  private originalContent = '';
  isDirty = signal(false);
  private savedTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.api.getDhcpConfig().subscribe({
      next: (config) => {
        this.originalContent = config;
        this.currentContent = config;
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.saveStatus.set('error');
        this.errorMessage.set('Failed to load configuration: ' + (err?.message ?? 'Unknown error'));
      },
    });
  }

  onContentChange(): void {
    this.isDirty.set(this.currentContent !== this.originalContent);
    if (this.saveStatus() === 'error') this.saveStatus.set('idle');
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const ta = event.target as HTMLTextAreaElement;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const spaces = '  ';
      this.currentContent =
        this.currentContent.substring(0, start) + spaces + this.currentContent.substring(end);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + spaces.length;
      });
      this.onContentChange();
    }
  }

  saveConfig(): void {
    if (this.saveStatus() === 'saving') return;
    this.saveStatus.set('saving');
    this.errorMessage.set('');
    clearTimeout(this.savedTimer);

    this.api.saveDhcpConfig(this.currentContent).subscribe({
      next: () => {
        this.originalContent = this.currentContent;
        this.isDirty.set(false);
        this.saveStatus.set('saved');
        this.savedTimer = setTimeout(() => this.saveStatus.set('idle'), 3000);
      },
      error: (err) => {
        this.saveStatus.set('error');
        this.errorMessage.set(err?.error?.message ?? err?.message ?? 'An unexpected error occurred.');
      },
    });
  }

  dismissError(): void {
    this.saveStatus.set('idle');
    this.errorMessage.set('');
  }
}
