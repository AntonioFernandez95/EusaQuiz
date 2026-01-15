import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';
  successMessage = '';
  currentStep = 1;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.registerForm = this.fb.group({
      // Paso 1: Datos personales
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      rol: ['', [Validators.required]],
      centro: ['', [Validators.required]],
      curso: [null],
      // Paso 2: Credenciales
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });

    // Escuchar cambios en la contraseña para calcular fuerza
    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.calculatePasswordStrength();
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

  /**
   * Verifica si el paso 1 es válido
   */
  isStep1Valid(): boolean {
    const nombre = this.registerForm.get('nombre');
    const rol = this.registerForm.get('rol');
    const centro = this.registerForm.get('centro');

    return !!(
      nombre?.valid &&
      rol?.valid &&
      centro?.valid
    );
  }

  /**
   * Avanza al siguiente paso
   */
  nextStep(): void {
    if (this.isStep1Valid()) {
      this.currentStep = 2;
    } else {
      // Marcar campos del paso 1 como tocados
      ['nombre', 'rol', 'centro'].forEach(field => {
        this.registerForm.get(field)?.markAsTouched();
      });
    }
  }

  /**
   * Retrocede al paso anterior
   */
  prevStep(): void {
    this.currentStep = 1;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Variables para la fuerza de contraseña
  passwordStrength = 0;
  passwordStrengthLabel = '';
  passwordStrengthClass = '';

  /**
   * Calcula la fuerza de la contraseña
   */
  private calculatePasswordStrength(): void {
    const password = this.registerForm.get('password')?.value || '';
    let strength = 0;

    if (password.length >= 6) strength += 20;
    if (password.length >= 8) strength += 10;
    if (password.length >= 12) strength += 10;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

    this.passwordStrength = Math.min(strength, 100);

    if (this.passwordStrength < 40) {
      this.passwordStrengthLabel = 'Débil';
      this.passwordStrengthClass = 'weak';
    } else if (this.passwordStrength < 70) {
      this.passwordStrengthLabel = 'Media';
      this.passwordStrengthClass = 'medium';
    } else {
      this.passwordStrengthLabel = 'Fuerte';
      this.passwordStrengthClass = 'strong';
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { idPortal, nombre, email, password, rol, curso, centro } = this.registerForm.value;
    const userData = { idPortal, nombre, email, password, rol, curso, centro };

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.ok) {
          this.successMessage = '¡Cuenta creada correctamente! Redirigiendo al inicio de sesión...';
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        } else {
          this.errorMessage = response.mensaje || 'Error al crear la cuenta';
        }
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 409) {
          this.errorMessage = 'El email o ID de portal ya está registrado';
        } else if (error.status === 0) {
          this.errorMessage = 'No se puede conectar con el servidor';
        } else {
          this.errorMessage = error.error?.mensaje || 'Error al crear la cuenta';
        }
        console.error('Register error:', error);
      }
    });
  }

  /**
   * Redirige al usuario según su rol
   */
  private redirectBasedOnRole(): void {
    const user = this.authService.getCurrentUser();
    if (user?.rol === 'profesor') {
      this.router.navigate(['/dashboard/profesor']);
    } else {
      this.router.navigate(['/dashboard/alumno']);
    }
  }
}
