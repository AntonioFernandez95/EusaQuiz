import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BrandingService {
  private _appName = new BehaviorSubject<string>('CampusQuiz');
  private _appLogo = new BehaviorSubject<string>('assets/img/logo-camera.png');

  appName$ = this._appName.asObservable();
  appLogo$ = this._appLogo.asObservable();

  constructor(private http: HttpClient) {
    this.loadBranding();
  }

  loadBranding() {
    this.http.get<any>(`${environment.apiUrl}/admin/branding`).subscribe({
      next: (res) => {
        if (res.ok && res.data) {
          this.updateState(res.data);
        }
      },
      error: (err) => {
        // Fallback to default if error or not found
        console.warn('Could not load custom branding, using defaults.');
      }
    });
  }

  updateState(data: any) {
    if (data.nombreApp) {
      this._appName.next(data.nombreApp);
      document.title = data.nombreApp; // Update browser tab title
    }
    if (data.logoAppUrl) {
      if (data.logoAppUrl.startsWith('assets/')) {
        this._appLogo.next(data.logoAppUrl);
      } else {
        this._appLogo.next(`${environment.serverUrl}/${data.logoAppUrl}`);
      }
    }
  }

  getAppName(): string {
    return this._appName.getValue();
  }

  getAppLogo(): string {
    return this._appLogo.getValue();
  }
}
