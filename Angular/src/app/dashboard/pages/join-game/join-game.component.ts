import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { AlertService } from '../../../shared/services/alert.service';

@Component({
  selector: 'app-join-game',
  templateUrl: './join-game.component.html',
  styleUrls: ['./join-game.component.scss']
})
export class JoinGameComponent implements OnInit {
  userName: string = '';
  userInitials: string = '';
  gamePin: string = '';

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.nombre;
        this.userInitials = this.userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      }
    });
  }

  joinGame(): void {
    if (!this.gamePin) {
      this.alertService.warning('Campo vacío', 'Por favor, introduce el código de la sala para continuar.');
      return;
    }

    const pin = this.gamePin.trim().toUpperCase();

    // El backend espera: pin, idAlumno (idPortal)
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.dashboardService.unirseAPartida(pin, user.idPortal).subscribe({
      next: (res) => {
        if (res) {
          // Si tiene éxito, el backend nos devuelve información sobre la partida
          // y el alumno debería ser redirigido a la sala de espera del alumno
          console.log('Unido con éxito:', res);
          // Por ahora navegamos a una pantalla de lobby de alumno (que crearemos luego si es necesario)
          // o directamente a la monitorización si ya empezó.
          // Como lo más común es esperar en un lobby:
          this.router.navigate(['/dashboard/student/lobby', res.idPartida]);
        }
      },
      error: (err) => {
        console.error('Error al unirse:', err);
        this.alertService.error('PIN Inválido', err.error?.mensaje || 'No se pudo encontrar la partida o no tienes acceso.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/student']);
  }
}
