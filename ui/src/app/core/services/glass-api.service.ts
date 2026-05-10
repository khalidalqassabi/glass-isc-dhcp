import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Lease {
  start: number;
  end: number;
  mac: string;
  mac_oui_vendor: string;
  host?: string;
  options?: Record<string, string>;
}

export interface ServerInfo {
  cpu_utilization: number;
  leases_per_second: number;
  leases_per_minute: number;
  host_name: string;
}

export interface Subnet {
  location: string;
  range: string;
  defined: number;
  used: number;
  touched: number;
  free: number;
}

export interface SubnetDetails {
  subnets: Subnet[];
  shared_networks?: SharedNetwork[];
}

export interface SharedNetwork {
  location: string;
  defined: number;
  used: number;
  free: number;
}

export interface GlassConfig {
  admin_user: string;
  admin_password: string;
  leases_file: string;
  log_file: string;
  config_file: string;
  shared_network_critical_threshold: string;
  shared_network_warning_threshold: string;
  slack_webhook_url: string;
  slack_alert_channel: string;
  leases_per_minute_threshold: string;
  ip_ranges_to_allow: string[];
  email_alert_to: string;
  sms_alert_to: string;
  ws_port: number;
  port?: number;
  host?: string;
}

export interface WebsocketConfig {
  ws_port: number;
  host: string;
}

export interface VendorCount {
  [vendor: string]: number;
}

export interface OuiEntry {
  count: number;
  mac_prefix: string;
  vendor: string;
}

export interface DhcpRequest {
  request_for: string;
  request_via: string;
  request_count: number;
  request_vendor: string;
}

@Injectable({ providedIn: 'root' })
export class GlassApiService {
  private http = inject(HttpClient);
  private base = '';

  getActiveLeases(search?: string): Observable<Record<string, Lease>> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<Record<string, Lease>>('/api/get_active_leases', { params });
  }

  getServerInfo(): Observable<ServerInfo> {
    return this.http.get<ServerInfo>('/api/get_server_info');
  }

  getSubnetDetails(): Observable<SubnetDetails> {
    return this.http.get<SubnetDetails>('/api/get_subnet_details');
  }

  getVendorCount(): Observable<VendorCount> {
    return this.http.get<VendorCount>('/api/get_vendor_count');
  }

  getMacOuiCountByVendor(): Observable<Record<string, OuiEntry>> {
    return this.http.get<Record<string, OuiEntry>>('/api/get_mac_oui_count_by_vendor');
  }

  getDhcpRequests(): Observable<Record<string, DhcpRequest>> {
    return this.http.get<Record<string, DhcpRequest>>('/api/get_dhcp_requests');
  }

  getMacOuiList(): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>('/api/get_mac_oui_list');
  }

  getGlassConfig(): Observable<GlassConfig> {
    return this.http.get<GlassConfig>('/api/get_glass_config');
  }

  getWebsocketConfig(): Observable<WebsocketConfig> {
    return this.http.get<WebsocketConfig>('/api/get_websocket_config');
  }

  saveGlassSettings(settings: Partial<GlassConfig>): Observable<any> {
    return this.http.post('/glass_settings_save', settings);
  }

  saveAlertSettings(settings: Partial<GlassConfig>): Observable<any> {
    return this.http.post('/glass_alert_settings_save', settings);
  }

  getDhcpConfig(): Observable<string> {
    return this.http.get('/dhcp_config', { responseType: 'text' });
  }

  saveDhcpConfig(config: string): Observable<any> {
    return this.http.post('/dhcp_config_save', { config_content: config });
  }

  getDhcpLog(): Observable<string> {
    return this.http.get('/dhcp_log', { responseType: 'text' });
  }

  dhcpStart(): Observable<any> {
    return this.http.post('/dhcp_start_stop_restart', { action: 'start' });
  }

  dhcpStop(): Observable<any> {
    return this.http.post('/dhcp_start_stop_restart', { action: 'stop' });
  }

  dhcpRestart(): Observable<any> {
    return this.http.post('/dhcp_start_stop_restart', { action: 'restart' });
  }

  getConfigSnapshots(): Observable<any[]> {
    return this.http.get<any[]>('/dhcp_config_snapshots');
  }
}
