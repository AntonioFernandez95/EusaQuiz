import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';

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

    updateUser(id: string, data: any): Observable<any> {
        return this.http.put(`${environment.apiUrl}/usuarios/${id}`, data, { headers: this.getHeaders() });
    }

    deleteGame(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/partidas/${id}`, { headers: this.getHeaders() });
    }

    updateGame(id: string, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/partidas/${id}`, data, { headers: this.getHeaders() });
    }

    // Gestión de datos académicos
    getCentros(): Observable<any> {
        return this.http.get(`${environment.apiUrl}/datos-academicos/centros`, { headers: this.getHeaders() });
    }

    createCentro(data: any): Observable<any> {
        return this.http.post(`${environment.apiUrl}/datos-academicos/centros`, data, { headers: this.getHeaders() });
    }

    updateCentro(id: string, data: any): Observable<any> {
        return this.http.put(`${environment.apiUrl}/datos-academicos/centros/${id}`, data, { headers: this.getHeaders() });
    }

    deleteCentro(id: string): Observable<any> {
        return this.http.delete(`${environment.apiUrl}/datos-academicos/centros/${id}`, { headers: this.getHeaders() });
    }

    getCursos(centro?: string): Observable<any> {
        const params = centro ? `?centro=${centro}` : '';
        return this.http.get(`${environment.apiUrl}/datos-academicos/cursos${params}`, { headers: this.getHeaders() });
    }

    createCurso(data: any): Observable<any> {
        return this.http.post(`${environment.apiUrl}/datos-academicos/cursos`, data, { headers: this.getHeaders() });
    }

    updateCurso(id: string, data: any): Observable<any> {
        return this.http.put(`${environment.apiUrl}/datos-academicos/cursos/${id}`, data, { headers: this.getHeaders() });
    }

    deleteCurso(id: string): Observable<any> {
        return this.http.delete(`${environment.apiUrl}/datos-academicos/cursos/${id}`, { headers: this.getHeaders() });
    }

    getAsignaturas(curso?: string): Observable<any> {
        const params = curso ? `?curso=${curso}` : '';
        return this.http.get(`${environment.apiUrl}/datos-academicos/asignaturas${params}`, { headers: this.getHeaders() });
    }

    createAsignatura(data: any): Observable<any> {
        return this.http.post(`${environment.apiUrl}/datos-academicos/asignaturas`, data, { headers: this.getHeaders() });
    }

    updateAsignatura(id: string, data: any): Observable<any> {
        return this.http.put(`${environment.apiUrl}/datos-academicos/asignaturas/${id}`, data, { headers: this.getHeaders() });
    }

    deleteAsignatura(id: string): Observable<any> {
        return this.http.delete(`${environment.apiUrl}/datos-academicos/asignaturas/${id}`, { headers: this.getHeaders() });
    }

    getBranding(): Observable<any> {
        return this.http.get(`${this.apiUrl}/branding`, { headers: this.getHeaders() });
    }

    updateBranding(nombreApp: string, logoFile?: File): Observable<any> {
        const formData = new FormData();
        formData.append('nombreApp', nombreApp);
        if (logoFile) {
            formData.append('logo', logoFile);
        }
        return this.http.put(`${this.apiUrl}/branding`, formData, { headers: this.getHeaders() });
    }
}
