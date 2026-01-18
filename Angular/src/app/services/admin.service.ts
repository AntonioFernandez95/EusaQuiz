import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = `${environment.apiUrl}/admin`;

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    getStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/stats`, { headers: this.getHeaders() });
    }

    getUsers(): Observable<any> {
        // Usamos el endpoint normal de usuarios pero el interceptor debería poner el token de admin
        return this.http.get(`${environment.apiUrl}/usuarios`, { headers: this.getHeaders() });
    }

    getUserDetail(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/usuarios/${id}`, { headers: this.getHeaders() });
    }

    getGames(): Observable<any> {
        return this.http.get(`${this.apiUrl}/partidas`, { headers: this.getHeaders() });
    }

    deleteUser(id: string): Observable<any> {
        return this.http.delete(`${environment.apiUrl}/usuarios/${id}`, { headers: this.getHeaders() });
    }

    deleteGame(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/partidas/${id}`, { headers: this.getHeaders() });
    }

    updateGame(id: string, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/partidas/${id}`, data, { headers: this.getHeaders() });
    }
}
