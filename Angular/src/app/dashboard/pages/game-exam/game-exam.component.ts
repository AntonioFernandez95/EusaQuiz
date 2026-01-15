import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { AlertService } from '../../../shared/services/alert.service';
import { DashboardService } from '../../services/dashboard.service';
import { SocketService } from '../../../services/socket.service';
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-game-exam',
  templateUrl: './game-exam.component.html',
  styleUrls: ['./game-exam.component.scss']
})
export class GameExamComponent implements OnInit, OnDestroy {
  userName: string = '';
  userInitials: string = '';
  userId: string = '';

  partidaId: string = '';
  pin: string = '';
  
  preguntas: any[] = [];
  respuestasLocales: any = {}; // idPregunta -> indicesSeleccionados
  currentIndex: number = 0;
  
  timeLeftSeconds: number = 0;
  timerActive: boolean = false;
  
  isLoading: boolean = true;
  isSaving: boolean = false;

  private subs: Subscription = new Subscription();
  private timerSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private dashboardService: DashboardService,
    private socketService: SocketService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.nombre;
        this.userInitials = this.userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        this.userId = user.idPortal;
      }
    });

    this.partidaId = this.route.snapshot.paramMap.get('id') || '';
    if (this.partidaId) {
        this.loadInitialData();
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.subs.unsubscribe();
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.dashboardService.getDetallePartida(this.partidaId).subscribe(p => {
      if (p) {
        this.pin = p.pin;
        
        // Calcular tiempo restante basado en programadaPara + tiempoTotalMin
        const programadaPara = new Date(p.configuracionExamen.programadaPara).getTime();
        const tiempoTotalMs = p.configuracionExamen.tiempoTotalMin * 60 * 1000;
        const now = Date.now();
        const finExamen = programadaPara + tiempoTotalMs;
        
        this.timeLeftSeconds = Math.max(0, Math.floor((finExamen - now) / 1000));
        
        if (this.timeLeftSeconds > 0) {
            this.startTimer();
        } else {
            // Tiempo agotado antes de empezar? 
            this.alertService.error('Examen expirado', 'El tiempo para realizar este examen ha terminado.');
            this.router.navigate(['/dashboard/student']);
            return;
        }

        // Cargar preguntas
        this.dashboardService.getExamQuestions(this.partidaId).subscribe(preguntas => {
            this.preguntas = preguntas;
            
            // Cargar progreso previo si existe
            this.dashboardService.getMiProgreso(this.partidaId, this.userId).subscribe(prog => {
                if (prog && prog.respuestas) {
                    prog.respuestas.forEach((r: any) => {
                        this.respuestasLocales[r.idPregunta._id || r.idPregunta] = r.opcionesMarcadas;
                    });
                }
                this.isLoading = false;
            });
        });

        this.connectSocket();
      }
    });
  }

  connectSocket(): void {
    this.socketService.connect();
    this.socketService.emit('join_room', { pin: this.pin });

    // En examen, si el profesor lo detiene o finaliza globalmente
    this.subs.add(
        this.socketService.on('fin_partida').subscribe(() => {
            this.finalizarExamen();
        })
    );
  }

  startTimer(): void {
    this.stopTimer();
    this.timerActive = true;
    this.timerSub = interval(1000)
        .pipe(takeWhile(() => this.timeLeftSeconds > 0 && this.timerActive))
        .subscribe(() => {
            this.timeLeftSeconds--;
            if (this.timeLeftSeconds === 0) {
                this.timerActive = false;
                this.finalizarExamen(true); // Finalizar por tiempo
            }
        });
  }

  stopTimer(): void {
    if (this.timerSub) {
        this.timerSub.unsubscribe();
        this.timerSub = null;
    }
    this.timerActive = false;
  }

  get formatTime(): string {
    const mins = Math.floor(this.timeLeftSeconds / 60);
    const secs = this.timeLeftSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  get currentQuestion(): any {
    return this.preguntas[this.currentIndex];
  }

  seleccionarOpcion(index: number): void {
    if (!this.timerActive || this.isSaving) return;

    const qId = this.currentQuestion._id;
    // Para simplificar, asumimos selección única por ahora o adaptamos a multiple si fuera necesario
    this.respuestasLocales[qId] = [index];

    // Envío automático al servidor para guardar progreso
    this.isSaving = true;
    const payload = {
        idPartida: this.partidaId,
        idAlumno: this.userId,
        idPregunta: qId,
        opcionesMarcadas: [index],
        tiempoEmpleado: 0 // En examen libre no calculamos tiempo por pregunta
    };

    this.dashboardService.enviarRespuesta(payload).subscribe({
        next: () => {
            this.isSaving = false;
        },
        error: (err) => {
            console.error('Error guardando respuesta:', err);
            this.isSaving = false;
        }
    });
  }

  anterior(): void {
    if (this.currentIndex > 0) {
        this.currentIndex--;
    }
  }

  siguiente(): void {
    if (this.currentIndex < this.preguntas.length - 1) {
        this.currentIndex++;
    }
  }

  async finalizarExamen(porTiempo = false): Promise<void> {
    if (!porTiempo) {
      const result = await this.alertService.confirm(
        '¿Finalizar examen?',
        'Una vez entregado no podrás modificar tus respuestas. ¿Deseas continuar?',
        'Sí, entregar',
        'Seguir revisando'
      );
      if (!result.isConfirmed) return;
    }

    if (porTiempo) {
      this.alertService.warning('Tiempo agotado', 'Se ha alcanzado el tiempo límite. Tu examen será entregado automáticamente.');
    }

    this.stopTimer();
    this.isLoading = true;

    this.dashboardService.finalizarExamen(this.partidaId, this.userId).subscribe({
        next: (res) => {
            console.log('Examen finalizado:', res);
            this.router.navigate(['/dashboard/student/game-ranking', this.partidaId]);
        },
        error: (err) => {
            console.error('Error finalizando examen:', err);
            this.alertService.error('Error de entrega', 'Ocurrió un error al entregar el examen. Por favor, informa a tu profesor.');
            this.isLoading = false;
        }
    });
  }

  getOptionColor(index: number): string {
    const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981']; // Orange, Pink, Blue, Green
    return colors[index % colors.length];
  }
}
