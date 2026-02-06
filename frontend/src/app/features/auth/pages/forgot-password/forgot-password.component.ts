import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotForm!: FormGroup;
  resetPasswordForm!: FormGroup;

  isLoading = false;
  showPassword = false;
  emailSent = false;
  isResetting = false;
  errorMessage = '';
  successMessage = '';
  submittedEmail = '';

  private resetToken = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.checkResetToken();
  }

  private initForms(): void {
    // Formulario para solicitar recuperación
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    // Formulario para restablecer la contraseña
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  /**
   * Verifica si hay un token de reset en la URL
   */
  private checkResetToken(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.resetToken = token;
        this.isResetting = true;
      }
    });
  }

  /**
   * Validador personalizado para verificar que las contraseñas coinciden
   */
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Envía la solicitud de recuperación de contraseña
   */
  onSubmitForgot(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const email = this.forgotForm.value.email;

    this.authService.forgotPassword({ email }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.ok) {
          this.emailSent = true;
          this.submittedEmail = email;
        } else {
          this.errorMessage = response.mensaje || 'Error al enviar el correo';
        }
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 404) {
          // No revelamos si el email existe o no por seguridad
          this.emailSent = true;
          this.submittedEmail = email;
        } else if (error.status === 0) {
          this.errorMessage = 'No se puede conectar con el servidor';
        } else {
          this.errorMessage = error.error?.mensaje || 'Error al procesar la solicitud';
        }
        console.error('Forgot password error:', error);
      }
    });
  }

  /**
   * Restablece la contraseña con el token
   */
  onSubmitReset(): void {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const data = {
      token: this.resetToken,
      password: this.resetPasswordForm.value.password
    };

    this.authService.resetPassword(data).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.ok) {
          this.successMessage = '¡Contraseña cambiada correctamente! Redirigiendo...';
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        } else {
          this.errorMessage = response.mensaje || 'Error al cambiar la contraseña';
        }
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 400) {
          this.errorMessage = 'El enlace ha expirado o es inválido';
        } else if (error.status === 0) {
          this.errorMessage = 'No se puede conectar con el servidor';
        } else {
          this.errorMessage = error.error?.mensaje || 'Error al cambiar la contraseña';
        }
        console.error('Reset password error:', error);
      }
    });
  }

  /**
   * Resetea el formulario para enviar otro correo
   */
  resetForm(): void {
    this.emailSent = false;
    this.forgotForm.reset();
    this.errorMessage = '';
  }
}
