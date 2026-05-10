import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'leases', loadComponent: () => import('./pages/leases/leases.component').then(m => m.LeasesComponent) },
      { path: 'statistics', loadComponent: () => import('./pages/statistics/statistics.component').then(m => m.StatisticsComponent) },
      { path: 'log', loadComponent: () => import('./pages/log/log.component').then(m => m.LogComponent) },
      { path: 'config', loadComponent: () => import('./pages/config/config.component').then(m => m.ConfigComponent) },
      { path: 'snapshots', loadComponent: () => import('./pages/snapshots/snapshots.component').then(m => m.SnapshotsComponent) },
      { path: 'control', loadComponent: () => import('./pages/control/control.component').then(m => m.ControlComponent) },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'alerts', loadComponent: () => import('./pages/alerts/alerts.component').then(m => m.AlertsComponent) },
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
