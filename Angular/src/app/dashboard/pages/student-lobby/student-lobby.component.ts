import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { SocketService } from '../../../services/socket.service';
import { AlertService } from '../../../shared/services/alert.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BrandingService } from 'src/app/services/branding.service';

@Component({
  selector: 'app-student-lobby',
  templateUrl: './student-lobby.component.html',
  styleUrls: ['./student-lobby.component.scss']
})
export class StudentLobbyComponent implements OnInit, OnDestroy {
  userName: string = '';
  userInitials: string = '';
  userProfileImg: string = '';
  userId: string = '';
  private serverUrl = environment.serverUrl;
  
  partida: any = null;
  partidaId: string = '';
  
  private subs: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private dashboardService: DashboardService,
    private socketService: SocketService,
    private alertService: AlertService,
    public brandingService: BrandingService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.nombre;
        this.userProfileImg = user.fotoPerfil ? `${this.serverUrl}/${user.fotoPerfil}` : 'assets/img/default-avatar.png';
        this.userInitials = this.userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      }
    });

    this.partidaId = this.route.snapshot.paramMap.get('id') || '';
    if (this.partidaId) {
        this.loadPartida();
    }
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
    this.subs.unsubscribe();
  }

  loadPartida(): void {
    const user = this.authService.getCurrentUser();
    this.userId = user ? user.idPortal : '';

    this.dashboardService.getDetallePartida(this.partidaId).subscribe(p => {
      if (p) {
        this.partida = p;
        
        // Redirigir si ya está activa
        if (p.estadoPartida === 'activa') {
            if (p.tipoPartida === 'examen') {
                this.router.navigate(['/dashboard/student/game-exam', this.partidaId]);
                return;
            } else {
                this.router.navigate(['/dashboard/student/game-live', this.partidaId]);
                return;
            }
        }

        // REDIRECCIÓN DIRECTA: Si es examen programado y ya es la hora, entrar directamente
        if (p.tipoPartida === 'examen' && p.configuracionExamen?.programadaPara) {
          const now = new Date().getTime();
          const gameTime = new Date(p.configuracionExamen.programadaPara).getTime();
          if (now >= gameTime) {
            this.router.navigate(['/dashboard/student/game-exam', this.partidaId]);
            return;
          }
        }
        
        // REGISTRO AUTOMÁTICO: Forzar unión al entrar al lobby (necesario si entra desde dashboard)
        this.dashboardService.unirseAPartida(p.pin, this.userId).subscribe({
            next: () => {
                this.connectSocket();
            },
            error: (err) => {
                console.error('Error al registrarse en la partida:', err);
                // Si ya estaba unido o hay error, intentamos conectar socket igual para ver feedback
                this.connectSocket();
            }
        });
      }
    });
  }

  connectSocket(): void {
    const user = this.authService.getCurrentUser();
    this.userId = user ? user.idPortal : '';

    this.socketService.connect();
    this.socketService.emit('join_room', { 
        pin: this.partida.pin,
        idAlumno: this.userId,
        idPartida: this.partidaId
    });

    // Escuchar inicio de partida (En Vivo)
    this.subs.add(
        this.socketService.on('nueva_pregunta').subscribe(data => {
            console.log('¡La partida ha comenzado!', data);
            this.router.navigate(['/dashboard/student/game-live', this.partidaId], { 
                state: { initialQuestion: data } 
            });
        })
    );

    // Escuchar inicio de examen (Programado)
    this.subs.add(
        this.socketService.on('inicio_examen').subscribe(data => {
            console.log('El examen ha comenzado:', data);
            this.router.navigate(['/dashboard/student/game-exam', this.partidaId]);
        })
    );

    // ESCUCHAR ELIMINACIÓN DE PARTIDA (Seguridad/Cancelación)
    this.subs.add(
        this.socketService.on('partida_eliminada').subscribe(data => {
            console.log('La partida ha sido eliminada por el profesor');
            this.alertService.info('Partida Cancelada', 'El profesor ha eliminado o cancelado esta partida. Serás redirigido al dashboard.');
            this.router.navigate(['/dashboard/student']);
        })
    );
  }

  exit(): void {
    this.router.navigate(['/dashboard/student']);
  }
}
