import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertService } from '../../../shared/services/alert.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.checkParentToken();
  }

  private initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });
  }

  /**
   * Verifica si hay un token del portal padre en la URL
   */
  private checkParentToken(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'] || params['jwt'];
      if (token) {
        this.processParentToken(token);
      }
    });
  }

  /**
   * Procesa el token del portal padre
   */
  private processParentToken(token: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.processParentToken(token).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.ok) {
          this.redirectBasedOnRole(response.user!.rol);
        } else {
          this.errorMessage = response.mensaje || 'Error al procesar el token del portal';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al conectar con el servidor';
        console.error('Parent token error:', error);
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.ok) {
          this.redirectBasedOnRole(response.user!.rol);
        } else {
          this.errorMessage = response.mensaje || 'Credenciales incorrectas';
        }
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.errorMessage = 'Credenciales incorrectas';
        } else if (error.status === 0) {
          this.errorMessage = 'No se puede conectar con el servidor';
        } else {
          this.errorMessage = error.error?.mensaje || 'Error al iniciar sesión';
        }
        console.error('Login error:', error);
      }
    });
  }

  /**
   * Redirige al usuario según su rol
   */
  private redirectBasedOnRole(rol: string): void {
    if (rol === 'profesor') {
      this.router.navigate(['/dashboard/professor']);
    } else {
      this.router.navigate(['/dashboard/student']);
    }
  }

  /**
   * Simula la redirección al portal padre para login
   */
  loginFromPortal(): void {
    // En producción, esto redirigiría al portal EUSA
    // Por ahora mostramos un mensaje informativo
    this.errorMessage = '';
    this.alertService.info(
      'Autenticación Externa',
      'Esta funcionalidad te redirigirá al portal oficial EUSA para una autenticación centralizada y segura.'
    );
    // window.location.href = 'https://portal.eusa.es/auth?redirect=' + encodeURIComponent(window.location.origin + '/auth/login');
  }
}
