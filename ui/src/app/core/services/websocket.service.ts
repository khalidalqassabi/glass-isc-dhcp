import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject, Observable, timer } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { GlassApiService } from './glass-api.service';

export interface WsMessage<T = any> {
  event: string;
  data: T;
}

export interface DhcpStats {
  cpu_utilization: number;
  leases_per_second: number;
  leases_per_minute: number;
}

@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {
  private api = inject(GlassApiService);
  private socket$?: WebSocketSubject<any>;

  private statsSubject = new Subject<DhcpStats>();
  private logSubject = new Subject<string>();

  stats$ = this.statsSubject.asObservable();
  log$ = this.logSubject.asObservable();

  connect(wsPort = 8080, host = window.location.hostname): void {
    if (this.socket$) return;

    const url = `ws://${host}:${wsPort}`;
    this.socket$ = webSocket({ url, deserializer: (e) => e.data });

    this.socket$.subscribe({
      next: (raw: string) => {
        if (!raw) return;
        try {
          const msg: WsMessage = JSON.parse(raw);
          if (msg.event === 'dhcp_statistics') {
            this.statsSubject.next(msg.data as DhcpStats);
          } else if (msg.event === 'dhcp_log_subscription') {
            this.logSubject.next(msg.data as string);
          }
        } catch {
          this.logSubject.next(raw);
        }
      },
      error: () => {
        this.socket$ = undefined;
        timer(3000).subscribe(() => this.connect(wsPort, host));
      },
      complete: () => { this.socket$ = undefined; }
    });

    this.socket$.next({ event_subscription: 'dhcp_statistics' });
  }

  subscribeLog(): void {
    this.socket$?.next({ event_subscription: 'dhcp_log_subscription' });
  }

  unsubscribeLog(): void {
    this.socket$?.next({ event_unsubscribe: 'dhcp_log_subscription' });
  }

  subscribeDashboard(): void {
    this.socket$?.next({ event_subscription: 'dhcp_statistics' });
  }

  ngOnDestroy(): void {
    this.socket$?.complete();
  }
}
