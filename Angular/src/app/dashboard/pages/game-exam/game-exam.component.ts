import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { AlertService } from '../../../shared/services/alert.service';
import { DashboardService } from '../../services/dashboard.service';
import { SocketService } from '../../../services/socket.service';
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { BrandingService } from 'src/app/services/branding.service';

@Component({
  selector: 'app-game-exam',
  templateUrl: './game-exam.component.html',
  styleUrls: ['./game-exam.component.scss']
})
export class GameExamComponent implements OnInit, OnDestroy {
  userName: string = '';
  userInitials: string = '';
  userProfileImg: string = '';
  private serverUrl = environment.serverUrl;
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
    private alertService: AlertService,
    public brandingService: BrandingService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.nombre;
        this.userProfileImg = user.fotoPerfil ? `${this.serverUrl}/${user.fotoPerfil}` : 'assets/img/default-avatar.png';
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
    this.dashboardService.getDetallePartida(this.partidaId).subscribe({
      next: (p) => {
        if (!p) {
          this.alertService.error('Error', 'No se pudo encontrar la partida.');
          this.router.navigate(['/dashboard/student']);
          return;
        }

        this.pin = p.pin;

        // REGISTRO AUTOMÁTICO: Asegurar que el alumno está unido a la partida
        this.dashboardService.unirseAPartida(this.pin, this.userId).subscribe({
          next: () => this.loadExamContent(p),
          error: (err) => {
            console.error('Error uniéndose a la partida:', err);
            // Si ya estaba unido o hay otro error, intentamos cargar igual
            this.loadExamContent(p);
          }
        });
      },
      error: (err) => {
          console.error('Error cargando detalle de partida:', err);
          this.alertService.error('Error', 'No se pudo cargar la información del examen.');
          this.router.navigate(['/dashboard/student']);
      }
    });
  }

  private loadExamContent(p: any): void {
    // Cargar preguntas
    this.dashboardService.getExamQuestions(this.partidaId, this.userId).subscribe({
      next: (preguntas) => {
        this.preguntas = preguntas;

        // Configurar timer
        if (p.configuracionExamen) {
          const programadaPara = new Date(p.configuracionExamen.programadaPara).getTime();
          const tiempoTotalMs = (p.configuracionExamen.tiempoTotalMin || 60) * 60 * 1000;
          const now = Date.now();
          const finExamen = programadaPara + tiempoTotalMs;
          this.timeLeftSeconds = Math.max(0, Math.floor((finExamen - now) / 1000));

          if (this.timeLeftSeconds > 0) {
            this.startTimer();
          } else {
            this.alertService.error('Examen expirado', 'El tiempo para realizar este examen ha terminado.');
            this.router.navigate(['/dashboard/student']);
            return;
          }
        }

        // Cargar progreso previo si existe
        this.dashboardService.getMiProgreso(this.partidaId, this.userId).subscribe({
          next: (prog) => {
            if (prog && prog.respuestas) {
              prog.respuestas.forEach((r: any) => {
                // Asegurar que el ID de pregunta sea string
                const qId = String(r.idPregunta._id || r.idPregunta);
                // Guardamos los IDs de opción con el prefijo 'idx_'
                this.respuestasLocales[qId] = (r.opcionesMarcadas || []).map((idx: any) => `idx_${idx}`);
              });
            }
            this.isLoading = false;
          },
          error: (err) => {
            console.warn('No se pudo cargar el progreso previo:', err);
            this.isLoading = false; // Igual permitimos entrar aunque no cargue progreso previo
          }
        });

        this.connectSocket();
      },
      error: (err) => {
        console.error('Error cargando preguntas:', err);
        this.alertService.error('Error', 'No se pudieron cargar las preguntas del examen.');
        this.isLoading = false;
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

  seleccionarOpcion(option: any): void {
    if (!this.timerActive || this.isSaving) return;

    const qId = String(this.currentQuestion._id);
    const optId = String(option.idOpcion); // "idx_N"
    
    // Guardamos la selección localmente usando el idOpcion como string
    this.respuestasLocales[qId] = [optId];

    // Envío automático al servidor para guardar progreso
    this.isSaving = true;
    const payload = {
        idPartida: this.partidaId,
        idAlumno: this.userId,
        idPregunta: qId,
        opcionesMarcadas: [optId], // Enviamos "idx_N", el backend lo convertirá
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

  isOptionSelected(optionId: any): boolean {
    if (!this.currentQuestion || !this.respuestasLocales) return false;
    const qId = String(this.currentQuestion._id);
    const selected = this.respuestasLocales[qId];
    if (!selected || !Array.isArray(selected)) return false;
    return selected.includes(String(optionId));
  }

  goBack(): void {
    this.router.navigate(['/dashboard/student']);
  }
}
