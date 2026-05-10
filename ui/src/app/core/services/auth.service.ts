import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _credentials = signal<string | null>(
    sessionStorage.getItem('glass_auth')
  );

  readonly credentials = this._credentials.asReadonly();
  readonly isAuthenticated = () => this._credentials() !== null;

  login(user: string, pass: string): void {
    const encoded = btoa(`${user}:${pass}`);
    sessionStorage.setItem('glass_auth', encoded);
    this._credentials.set(encoded);
  }

  logout(): void {
    sessionStorage.removeItem('glass_auth');
    this._credentials.set(null);
  }

  getHeader(): string {
    return `Basic ${this._credentials()}`;
  }
}
