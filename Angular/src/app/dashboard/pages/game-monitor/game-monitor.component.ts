import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../../auth/services/auth.service';
import { SocketService } from '../../../services/socket.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BrandingService } from 'src/app/services/branding.service';

@Component({
  selector: 'app-game-monitor',
  templateUrl: './game-monitor.component.html',
  styleUrls: ['./game-monitor.component.scss']
})
export class GameMonitorComponent implements OnInit, OnDestroy {
  userName: string = '';
  userInitials: string = '';
  userProfileImg: string = '';
  private serverUrl = environment.serverUrl;

  partidaId: string = '';
  partida: any = null;
  
  preguntaActual: any = null;
  respondidos: number = 0;
  totalAlumnos: number = 0;
  
  resultadosVisible: boolean = false;
  stats: any = null; // [c1, c2, c3, c4]
  correctaIndex: number = -1;
  aciertosPorcentaje: number = 0;
  
  private subs: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dashboardService: DashboardService,
    private authService: AuthService,
    private socketService: SocketService,
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

    // Intentar recuperar pregunta inicial si venimos del lobby
    const state = history.state;
    if (state && state.initialQuestion) {
      this.handleNewQuestion(state.initialQuestion);
    }

    if (this.partidaId) {
      this.loadPartida();
    }
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
    this.subs.unsubscribe();
  }

  loadPartida(): void {
    this.dashboardService.getDetallePartida(this.partidaId).subscribe(p => {
      if (p) {
        this.partida = p;
        this.totalAlumnos = p.numParticipantes || 0;
        this.connectSocket();
      }
    });
  }

  connectSocket(): void {
    this.socketService.connect();
    this.socketService.emit('join_room', { pin: this.partida.pin });

    // Escuchar nueva pregunta
    this.subs.add(
      this.socketService.on('nueva_pregunta').subscribe(data => {
        console.log('Nueva pregunta:', data);
        this.handleNewQuestion(data);
      })
    );

    // Escuchar votos en tiempo real
    this.subs.add(
      this.socketService.on('voto_recibido').subscribe(data => {
        console.log('Voto recibido:', data);
        this.respondidos = data.respondidos;
        this.totalAlumnos = data.total;
      })
    );

    // Escuchar cierre de pregunta (resultados)
    this.subs.add(
      this.socketService.on('tiempo_agotado').subscribe(data => {
        console.log('Resultados pregunta:', data);
        this.handleResults(data);
      })
    );

    // Escuchar fin de partida
    this.subs.add(
      this.socketService.on('fin_partida').subscribe(data => {
        console.log('Partida finalizada:', data);
        this.router.navigate(['/dashboard/professor/game-ranking', this.partidaId], {
          state: { ranking: data.ranking }
        });
      })
    );
  }

  handleNewQuestion(data: any): void {
    this.preguntaActual = data;
    this.respondidos = 0;
    this.resultadosVisible = false;
    this.stats = null;
    this.correctaIndex = -1;
  }

  handleResults(data: any): void {
    this.resultadosVisible = true;
    this.stats = data.stats;
    this.correctaIndex = data.correcta;
    
    // Calcular porcentaje de aciertos
    const totalVotos = this.stats.reduce((a: number, b: number) => a + b, 0);
    if (totalVotos > 0) {
        this.aciertosPorcentaje = Math.round((this.stats[this.correctaIndex] / totalVotos) * 100);
    } else {
        this.aciertosPorcentaje = 0;
    }
  }

  getOptionPercentage(count: number): number {
    const totalVotos = this.stats ? this.stats.reduce((a: number, b: number) => a + b, 0) : 0;
    return totalVotos > 0 ? Math.round((count / totalVotos) * 100) : 0;
  }

  getOptionLabel(index: number): string {
    return this.correctaIndex === index ? 'Respuesta correcta' : 'Respuesta errónea';
  }

  getOptionColor(index: number): string {
    const colors = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981']; // Amber, Blue, Pink, Green
    return colors[index % colors.length];
  }

  getOptionBg(index: number): string {
    if (!this.resultadosVisible) return 'white';
    const colors = ['#fef3c7', '#e0f2fe', '#fce7f3', '#dcfce7']; // Light Amber, Light Blue, Light Pink, Light Green
    return colors[index % colors.length];
  }

  // Acciones de los botones
  mostrarRespuesta(): void {
    this.resultadosVisible = true;
    // Esto es solo visual en el monitor, los alumnos verán el suyo cuando el timer acabe
  }

  siguiente(): void {
    // Si queremos manual, necesitaríamos un endpoint. Pero por ahora el backend es automático.
    console.log('Siguiente (Automático por el backend actualmente)');
  }

  pausar(): void {
    console.log('Pausar');
  }

  goBack(): void {
    this.router.navigate(['/dashboard/professor']);
  }
}
