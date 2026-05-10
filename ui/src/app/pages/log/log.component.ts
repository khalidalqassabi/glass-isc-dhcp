import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsocketService } from '../../core/services/websocket.service';
import { Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="log-page">
      <!-- Toolbar -->
      <div class="toolbar">
        <h1 class="page-title">Live DHCP Log</h1>

        <div class="search-wrap">
          <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input class="input" type="text" placeholder="Filter log lines..."
                 [(ngModel)]="rawFilter" (ngModelChange)="onFilterChange($event)" />
        </div>

        <span class="line-count">{{ filteredLines().length }} lines</span>

        <button class="btn-ghost btn" (click)="togglePause()">
          @if (paused()) { Resume } @else { Pause }
        </button>
        <button class="btn-ghost btn" (click)="clearLog()">Clear</button>

        @if (paused()) {
          <span class="badge-warn">Paused</span>
        } @else {
          <span class="live-indicator">
            <span class="live-dot"></span>
            <span class="live-label">Live</span>
          </span>
        }
      </div>

      <!-- Log viewport -->
      <div #logContainer class="log-viewport">
        @if (filteredLines().length === 0) {
          <div class="empty-log">
            <span class="live-dot" style="width:10px;height:10px"></span>
            <span class="empty-text">Waiting for log events...</span>
          </div>
        } @else {
          @for (line of filteredLines(); track $index) {
            <div class="log-line" [style.color]="getLineColor(line)">{{ line }}</div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .log-page {
      padding: 24px;
      display: flex;
      flex-direction: column;
      height: 100vh;
      box-sizing: border-box;
      gap: 14px;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      flex-wrap: wrap;
    }

    .page-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--c-text-1);
      white-space: nowrap;
    }

    .search-wrap {
      position: relative;
      flex: 1;
      max-width: 340px;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      color: var(--c-text-3);
      pointer-events: none;
    }
    .search-wrap .input { padding-left: 32px; width: 100%; }

    .line-count {
      background: var(--c-base-700);
      color: var(--c-text-2);
      font-size: 0.75rem;
      font-weight: 500;
      padding: 3px 10px;
      border-radius: 999px;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .live-label { font-size: 0.75rem; color: var(--c-text-2); }

    .log-viewport {
      flex: 1;
      overflow-y: auto;
      background: var(--c-base-950);
      border: 1px solid var(--c-base-700);
      border-radius: 8px;
      padding: 12px 16px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 12.5px;
      line-height: 1.7;
    }

    .log-line {
      white-space: pre-wrap;
      word-break: break-all;
      padding: 1px 0;
    }

    .empty-log {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 14px;
      color: var(--c-text-3);
      font-family: Inter, sans-serif;
    }
    .empty-text { font-size: 0.875rem; }
  `],
})
export class LogComponent implements OnInit, OnDestroy, AfterViewChecked {
  private ws = inject(WebsocketService);

  @ViewChild('logContainer') logContainer!: ElementRef<HTMLDivElement>;

  private allLines = signal<string[]>([]);
  paused = signal(false);
  rawFilter = '';
  private filterSignal = signal('');
  private shouldScrollToBottom = true;
  private subscription: Subscription | null = null;
  private filterSub: Subscription | null = null;
  private filterSubject = new Subject<string>();
  private pendingLines: string[] = [];

  readonly MAX_LINES = 500;

  filteredLines = computed(() => {
    const filter = this.filterSignal().toLowerCase().trim();
    const lines = this.allLines();
    if (!filter) return lines;
    return lines.filter(line => line.toLowerCase().includes(filter));
  });

  ngOnInit(): void {
    this.filterSub = this.filterSubject.pipe(
      debounceTime(150),
      distinctUntilChanged(),
    ).subscribe(val => this.filterSignal.set(val));

    this.ws.subscribeLog();

    this.subscription = this.ws.log$.subscribe(line => {
      if (this.paused()) {
        this.pendingLines.push(line);
        return;
      }
      this.appendLine(line);
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom && !this.paused()) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy(): void {
    this.ws.unsubscribeLog();
    this.subscription?.unsubscribe();
    this.filterSub?.unsubscribe();
  }

  onFilterChange(value: string): void {
    this.filterSubject.next(value);
  }

  togglePause(): void {
    const wasPaused = this.paused();
    this.paused.set(!wasPaused);
    if (wasPaused) {
      for (const line of this.pendingLines) {
        this.appendLine(line);
      }
      this.pendingLines = [];
      this.shouldScrollToBottom = true;
    }
  }

  clearLog(): void {
    this.allLines.set([]);
    this.pendingLines = [];
    this.shouldScrollToBottom = true;
  }

  private appendLine(line: string): void {
    this.allLines.update(lines => {
      const updated = [...lines, line];
      return updated.length > this.MAX_LINES
        ? updated.slice(updated.length - this.MAX_LINES)
        : updated;
    });
    this.shouldScrollToBottom = true;
  }

  private scrollToBottom(): void {
    if (this.logContainer?.nativeElement) {
      const el = this.logContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
    this.shouldScrollToBottom = false;
  }

  getLineColor(line: string): string {
    if (line.includes('DHCPACK')) return 'oklch(0.66 0.26 285)';
    if (line.includes('DHCPREQUEST')) return 'oklch(0.70 0.005 30)';
    if (line.includes('DHCPDISCOVER')) return 'oklch(0.55 0.005 30)';
    if (line.includes('DHCPNAK') || line.toLowerCase().includes('error') || line.toLowerCase().includes('denied'))
      return 'oklch(0.65 0.22 22)';
    if (line.toLowerCase().includes('warning') || line.includes('DHCPINFORM'))
      return 'oklch(0.81 0.18 55)';
    return 'oklch(0.55 0.005 30)';
  }
}
