import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest
} from 'src/app/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'campusquiz_token';
  private readonly USER_KEY = 'campusquiz_user';
  private readonly ACTIVE_COURSE_KEY = 'campusquiz_active_course';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Curso activo seleccionado (para profesores con múltiples cursos)
  private activeCourseSubject = new BehaviorSubject<any>(null);
  public activeCourse$ = this.activeCourseSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.checkStoredAuth();
  }

  /**
   * Verifica si hay una sesión almacenada al iniciar
   */
  private checkStoredAuth(): void {
    const token = this.getToken();
    const userStr = localStorage.getItem(this.USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch {
        this.clearAuth();
      }
    }
  }

  /**
   * Procesa un JWT del portal padre (HUB)
   * El token viene decodificado sin verificar firma (según authFromParent)
   */
  processParentToken(token: string): Observable<AuthResponse> {
    // Decodificamos el JWT para extraer el payload
    try {
      const payload = this.decodeJwt(token);
      if (payload && payload.email) {
        // Guardamos el token y sincronizamos/creamos usuario
        return this.http.post<AuthResponse>(`${this.API_URL}/auth/sync-from-parent`, { token }).pipe(
          tap(response => {
            if (response.ok && response.user && response.token) {
              this.setAuth(response.token, response.user);
            }
          }),
          catchError(error => {
            console.error('Error syncing parent token:', error);
            return of({ ok: false, mensaje: 'Error al sincronizar usuario del portal' });
          })
        );
      }
    } catch (e) {
      console.error('Error decoding parent token:', e);
    }
    return of({ ok: false, mensaje: 'Token inválido' });
  }

  /**
   * Decodifica un JWT sin verificar firma
   */
  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  /**
   * Login con email y contraseña
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.ok && response.user && response.token) {
          this.setAuth(response.token, response.user);
        }
      })
    );
  }

  /**
   * Registro de nuevo usuario
   */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, userData).pipe(
      tap(response => {
        if (response.ok && response.user && response.token) {
          this.setAuth(response.token, response.user);
        }
      })
    );
  }

  /**
   * Solicitar recuperación de contraseña
   */
  forgotPassword(data: ForgotPasswordRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/forgot-password`, data);
  }

  /**
   * Restablecer contraseña con token
   */
  resetPassword(data: ResetPasswordRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/reset-password`, data);
  }

  /**
   * Obtiene constantes (Centros, Cursos, etc.)
   */
  getConstants(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/auth/get-constants`);
  }

  /**
   * Cerrar sesión
   */
  logout(): void {
    this.clearAuth();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Guarda token y usuario en localStorage
   */
  private setAuth(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Actualiza el usuario en la sesión sin cambiar el token
   */
  updateUserInSession(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Limpia la autenticación almacenada
   */
  private clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.ACTIVE_COURSE_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.activeCourseSubject.next(null);
  }

  /**
   * Obtiene el token almacenado
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(rol: 'profesor' | 'alumno'): boolean {
    const user = this.getCurrentUser();
    return user?.rol === rol;
  }

  /**
   * Establece el curso activo para profesores con múltiples cursos
   * Se almacena en sessionStorage para persistir durante la sesión del navegador
   */
  setActiveCourse(course: any): void {
    this.activeCourseSubject.next(course);
    if (course) {
      sessionStorage.setItem(this.ACTIVE_COURSE_KEY, JSON.stringify(course));
    } else {
      sessionStorage.removeItem(this.ACTIVE_COURSE_KEY);
    }
  }

  /**
   * Obtiene el curso activo seleccionado
   */
  getActiveCourse(): any {
    // Si hay uno en memoria, usarlo
    if (this.activeCourseSubject.value) {
      return this.activeCourseSubject.value;
    }
    // Si no, intentar restaurar de sessionStorage
    const stored = sessionStorage.getItem(this.ACTIVE_COURSE_KEY);
    if (stored) {
      try {
        const course = JSON.parse(stored);
        this.activeCourseSubject.next(course);
        return course;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Inicializa el curso activo (para profesores)
   * Si tiene múltiples cursos, selecciona el primero por defecto
   */
  initializeActiveCourse(user: any): void {
    if (user?.rol === 'profesor') {
      // Si ya hay un curso activo guardado, verificar que sigue siendo válido
      const currentActive = this.getActiveCourse();
      const userCursos = user.cursos || [];

      if (currentActive) {
        // Verificar que el curso activo está en la lista de cursos del usuario
        const isValid = userCursos.some((c: any) =>
          (c._id || c) === (currentActive._id || currentActive)
        );
        if (isValid) return; // Mantener el curso activo actual
      }

      // Si hay cursos disponibles, seleccionar el primero
      if (userCursos.length > 0) {
        this.setActiveCourse(userCursos[0]);
      } else if (user.curso) {
        // Fallback al curso singular si existe
        this.setActiveCourse(user.curso);
      }
    }
  }

  /**
   * Sube una nueva foto de perfil
   */
  uploadFotoPerfil(userId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('foto', file);

    return this.http.post<any>(`${this.API_URL}/usuarios/${userId}/foto`, formData).pipe(
      tap(response => {
        if (response.ok && response.fotoPerfil) {
          const user = this.getCurrentUser();
          if (user) {
            user.fotoPerfil = response.fotoPerfil;
            this.updateUserInSession(user);
          }
        }
      })
    );
  }
  /**
   * Actualiza datos del usuario (curso, nombre, etc.)
   */
  updateUsuario(userId: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/usuarios/${userId}`, data).pipe(
      tap(response => {
        if (response.ok && response.data) {
          // Si es el usuario actual, actualizamos la sesión local
          const currentUser = this.getCurrentUser();
          if (currentUser && currentUser._id === userId) {
            // Fusionar datos nuevos
            console.log('AuthService: Updating user. Current:', currentUser, 'New data:', response.data);
            const updatedUser = { ...currentUser, ...response.data };
            this.updateUserInSession(updatedUser);
          }
        }
      })
    );
  }
}
