import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { SocketService } from '../../../services/socket.service';
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-live-game',
  templateUrl: './live-game.component.html',
  styleUrls: ['./live-game.component.scss']
})
export class LiveGameComponent implements OnInit, OnDestroy {
  userName: string = '';
  userInitials: string = '';
  userProfileImg: string = '';
  private serverUrl = environment.serverUrl;
  userId: string = '';
  userPoints: number = 0;

  partidaId: string = '';
  pin: string = '';
  
  preguntaActual: any = null;
  numPregunta: number = 0;
  totalPreguntas: number = 0;
  
  timeLeft: number = 0;
  timerActive: boolean = false;
  
  respondido: boolean = false;
  opcionSeleccionada: any = null;
  resultadoFeedback: any = null; // Para mostrar si acertó o no
  
  private subs: Subscription = new Subscription();
  private timerSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private dashboardService: DashboardService,
    private socketService: SocketService
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

    // Intentar recuperar pregunta inicial si venimos del lobby
    const state = history.state;
    if (state && state.initialQuestion) {
        this.handleNewQuestion(state.initialQuestion);
    }

    if (this.partidaId) {
        this.loadInitialData();
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.subs.unsubscribe();
  }

  loadInitialData(): void {
    this.dashboardService.getDetallePartida(this.partidaId).subscribe(p => {
      if (p) {
        this.pin = p.pin;
        // Si ya hay una pregunta en curso, el backend dirá cuál es
        // En un flujo normal, vendrá del socket
        this.connectSocket();
      }
    });
  }

  connectSocket(): void {
    this.socketService.connect();
    this.socketService.emit('join_room', { pin: this.pin });

    // Escuchar nuevas preguntas
    this.subs.add(
        this.socketService.on('nueva_pregunta').subscribe(data => {
            console.log('Recibida pregunta:', data);
            this.handleNewQuestion(data);
        })
    );

    // Escuchar cuando el tiempo se agota (resultados de la pregunta)
    this.subs.add(
        this.socketService.on('tiempo_agotado').subscribe(data => {
            console.log('Tiempo agotado / Resultados:', data);
            this.handleTimeOut(data);
        })
    );
    
    // Escuchar fin de partida
    this.subs.add(
        this.socketService.on('fin_partida').subscribe(data => {
            console.log('Juego terminado:', data);
            this.router.navigate(['/dashboard/student/game-ranking', this.partidaId], {
                state: { ranking: data.ranking }
            });
        })
    );
  }

  handleNewQuestion(data: any): void {
    this.preguntaActual = data;
    this.numPregunta = data.numeroPregunta;
    this.totalPreguntas = data.totalPreguntas;
    this.timeLeft = data.tiempoLimite;
    this.respondido = false;
    this.opcionSeleccionada = null;
    this.resultadoFeedback = null;
    
    this.startTimer();
  }

  startTimer(): void {
    this.stopTimer();
    this.timerActive = true;
    this.timerSub = interval(1000)
        .pipe(takeWhile(() => this.timeLeft > 0 && this.timerActive))
        .subscribe(() => {
            this.timeLeft--;
            if (this.timeLeft === 0) {
                this.timerActive = false;
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

  seleccionarOpcion(option: any): void {
    if (this.respondido || !this.timerActive) return;

    this.respondido = true;
    this.opcionSeleccionada = option.idOpcion; // ID de la opción (p.ej. "idx_0")
    
    const payload = {
        idPartida: this.partidaId,
        idAlumno: this.userId,
        idPregunta: this.preguntaActual.idPregunta,
        opcionesMarcadas: [option.idOpcion], // Enviamos el string con prefijo
        tiempoEmpleado: this.preguntaActual.tiempoLimite - this.timeLeft
    };

    this.dashboardService.enviarRespuesta(payload).subscribe({
        next: (res) => {
            console.log('Respuesta enviada:', res);
        },
        error: (err) => {
            console.error('Error enviando respuesta:', err);
        }
    });
  }

  handleTimeOut(data: any): void {
    this.stopTimer();
    this.timeLeft = 0;
    
    if (data.rankingParcial) {
        const myScore = data.rankingParcial.find((r: any) => r.idAlumno === this.userId);
        if (myScore) {
            this.userPoints = myScore.puntos;
        }
    }

    // Feedback visual: data.correcta trae el índice original. Lo convertimos a nuestro ID prefijado.
    this.resultadoFeedback = {
        indiceCorrecto: `idx_${data.correcta}`
    };
  }

  getOptionColor(index: number): string {
    const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981']; // Orange, Pink, Blue, Green
    return colors[index % colors.length];
  }

  goBack(): void {
    this.router.navigate(['/dashboard/student']);
  }
}
