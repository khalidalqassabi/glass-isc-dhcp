import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { WebsocketService } from '../../core/services/websocket.service';
import { GlassApiService } from '../../core/services/glass-api.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="app-shell">
      <app-sidebar />
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      min-height: 100vh;
    }
    .main-content {
      flex: 1;
      min-width: 0;
      background: oklch(0.12 0.007 240);
      overflow-y: auto;
    }
  `]
})
export class ShellComponent implements OnInit {
  private ws = inject(WebsocketService);
  private api = inject(GlassApiService);

  ngOnInit(): void {
    this.api.getWebsocketConfig().subscribe(cfg => {
      this.ws.connect(cfg.ws_port, cfg.host || window.location.hostname);
    });
  }
}
