import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { AlertService } from '../../../shared/services/alert.service';
import { SocketService } from '../../../services/socket.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';

import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-game-ranking',
  templateUrl: './game-ranking.component.html',
  styleUrls: ['./game-ranking.component.scss']
})
export class GameRankingComponent implements OnInit, OnDestroy {
  userName: string = '';
  userInitials: string = '';
  userProfileImg: string = '';
  currentUserId: string = '';
  private serverUrl = environment.serverUrl;
  
  partidaId: string = '';
  ranking: any[] = [];
  ganador: any = null;
  partida: any = null;

  userRole: string = '';
  tipoPartida: string = 'en_vivo';
  
  showReportModal: boolean = false;
  reportData: any[] = [];
  isLoadingReport: boolean = false;
  expandedIndex: number = -1;
  isDownloadingPDF: boolean = false;
  partidaActiva: boolean = false;

  private subs: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private dashboardService: DashboardService,
    private socketService: SocketService,
    private alertService: AlertService
  ) {}

  showReport(): void {
    if (this.reportData.length > 0) {
      this.showReportModal = true;
      return;
    }

    this.isLoadingReport = true;
    this.dashboardService.getDetallePartida(this.partidaId).subscribe(data => {
      this.isLoadingReport = false;
      if (data && data.jugadores) {
        // Obtener total de preguntas del cuestionario
        const totalQuestions = data.idCuestionario?.numPreguntas || 0;

        // Procesar datos para la tabla de reporte
        this.reportData = data.jugadores.map((j: any) => {
           // Usar el total del cuestionario para el cálculo correcto
           // Si por error es 0, evitar division por cero
           const total = totalQuestions > 0 ? totalQuestions : (j.respuestas ? j.respuestas.length : 0);
           
           let percentage = 0;
           if (total > 0) {
               percentage = (j.aciertos / total) * 100;
           }
           
           return {
               nombre: j.nombreAlumno,
               puntos: j.puntuacionTotal,
               aciertos: j.aciertos,
               total: total,
               percentage: percentage,
               // Detalles de respuestas mapeados con las preguntas reales
               detailedAnswers: (data.preguntas || []).map((q: any) => {
                   // Función robusta para extraer ID como string
                   const cleanId = (id: any): string => {
                       if (!id) return '';
                       // Si es un ObjectId de MongoDB serializado como objeto
                       if (typeof id === 'object' && id.$oid) return String(id.$oid).trim();
                       // Si es un ObjectId con toString
                       if (typeof id === 'object' && id._id) return String(id._id).trim();
                       // Si es un string o tiene toString
                       return String(id).toString().trim();
                   };
                   
                   const questionId = cleanId(q._id);
                   
                   // Buscar la respuesta de forma robusta
                   const userRes = j.respuestas?.find((r: any) => {
                       const respuestaId = cleanId(r.idPregunta);
                       return respuestaId === questionId;
                   });

                   // Obtener índices marcados
                   let selectedIndices: any[] = [];
                   if (userRes && Array.isArray(userRes.opcionesMarcadas)) {
                       selectedIndices = userRes.opcionesMarcadas;
                   }

                   // Obtener texto de las opciones seleccionadas
                   let selectedText = 'Sin responder';
                   if (selectedIndices.length > 0 && q.opciones) {
                        const texts = selectedIndices.map((idx: any) => {
                            const i = Number(idx);
                            if (!isNaN(i) && q.opciones[i]) {
                                return q.opciones[i].textoOpcion;
                            }
                            return null;
                        }).filter(t => t);
                        
                        if (texts.length > 0) {
                            selectedText = texts.join(', ');
                        }
                   }
                   
                   // Texto correcto
                   const correctText = q.opciones 
                        ? q.opciones.filter((o: any) => o.esCorrecta).map((o: any) => o.textoOpcion).join(', ')
                        : 'No definido';

                   return {
                       questionText: q.textoPregunta,
                       isCorrect: userRes ? userRes.esCorrecta : false,
                       selectedText: selectedText,
                       correctText: correctText
                   };
               })
           };
        }).sort((a: any, b: any) => b.puntos - a.puntos);
        
        this.showReportModal = true;
      }
    });
  }

  closeReport(): void {
    this.showReportModal = false;
  }

  descargarPDF(): void {
    if (this.isDownloadingPDF) return;
    
    this.isDownloadingPDF = true;
    const idAlumno = this.userRole === 'alumno' ? this.authService.getCurrentUser()?.idPortal : undefined;

    this.dashboardService.downloadReportPDF(this.partidaId, idAlumno).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_CampusQuiz_${this.partidaId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.isDownloadingPDF = false;
      },
      error: (err) => {
        console.error('Error al descargar el PDF:', err);
        this.alertService.error('Error', 'No se pudo descargar el reporte PDF. Por favor, inténtalo de nuevo.');
        this.isDownloadingPDF = false;
      }
    });
  }

  toggleDetails(index: number): void {
    if (this.expandedIndex === index) {
      this.expandedIndex = -1;
    } else {
      this.expandedIndex = index;
    }
  }

  async terminarPartidaManual(): Promise<void> {
    const result = await this.alertService.confirm(
      '¿Finalizar examen?',
      '¿Estás seguro de que deseas finalizar el examen para todos los alumnos? Los que no hayan entregado serán finalizados automáticamente.',
      'Sí, finalizar todo',
      'Mantener activo'
    );

    if (result.isConfirmed) {
      this.dashboardService.finalizarPartida(this.partidaId).subscribe(ok => {
        if (ok) {
          this.alertService.success('Finalizado', 'El examen ha sido finalizado para todos los participantes.');
          this.partidaActiva = false;
        }
      });
    }
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.nombre;
        this.userProfileImg = user.fotoPerfil ? `${this.serverUrl}/${user.fotoPerfil}` : 'assets/img/default-avatar.png';
        this.userInitials = this.userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        this.userRole = user.rol; // 'profesor' o 'alumno'
        this.currentUserId = user.idPortal;
      }
    });

    this.partidaId = this.route.snapshot.paramMap.get('id') || '';
    
    // Recuperar el ranking del estado de navegación
    const state = history.state;
    if (state && state.ranking) {
      this.ranking = state.ranking;
      this.procesarRanking();
      this.cargarRanking(); // Igualmente cargamos para tener detalles del objeto partida
    } else if (this.partidaId) {
      // Si no hay ranking en el estado, lo cargamos del servidor
      this.cargarRanking();
    } else {
      // Si no hay nada, volvemos
      this.exit();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.socketService.disconnect();
  }

  connectSocket(): void {
    if (this.userRole !== 'profesor' && this.tipoPartida !== 'examen') return; // Solo seguimiento si es examen o profesor
    
    this.socketService.connect();
    this.socketService.emit('join_room', { pin: this.partida?.pin || this.partidaId });

    // Escuchar cuando un alumno termina (Modo Examen Seguimiento)
    this.subs.add(
        this.socketService.on('alumno_finalizado').subscribe((data: any) => {
            console.log('Alumno finalizó:', data);
            // Actualizar el ranking localmente
            const idx = this.ranking.findIndex(j => j.idAlumno === data.idAlumno);
            if (idx !== -1) {
                this.ranking[idx].puntos = data.nota;
                this.ranking[idx].finalizado = true;
            } else {
                this.ranking.push({
                    idAlumno: data.idAlumno,
                    nombre: data.nombre,
                    puntos: data.nota,
                    finalizado: true
                });
            }
            this.ranking.sort((a, b) => b.puntos - a.puntos);
            this.procesarRanking();
        })
    );

    // Escuchar fin total de partida
    this.subs.add(
        this.socketService.on('fin_partida').subscribe((data: any) => {
            console.log('Partida finalizada totalmente:', data);
            if (data.ranking) {
                this.ranking = data.ranking.map((j: any) => ({
                    idAlumno: j.idAlumno,
                    nombre: j.nombre,
                    puntos: j.puntos,
                    aciertos: j.aciertos
                }));
            }
            this.procesarRanking();
        })
    );
  }

  cargarRanking(): void {
    this.dashboardService.getDetallePartida(this.partidaId).subscribe(data => {
      if (data) {
        this.partida = data;
        this.tipoPartida = data.tipoPartida || 'en_vivo';
        this.partidaActiva = data.estadoPartida === 'activa';
        
        if (data.jugadores) {
          this.ranking = data.jugadores.map((j: any) => ({
            idAlumno: j.idAlumno,
            nombre: j.nombreAlumno,
            puntos: j.puntuacionTotal,
            aciertos: j.aciertos,
            fallos: j.fallos,
            finalizado: j.estado === 'inactivo' || j.estado === 'finalizada' || j.estado === 'finalizado'
          })).sort((a: any, b: any) => b.puntos - a.puntos);
          this.procesarRanking();
        }
        // Conectar socket para seguimiento en vivo si es profesor o examen
        this.connectSocket();
      }
    });
  }

  procesarRanking(): void {
    if (this.ranking && this.ranking.length > 0) {
      this.ganador = this.ranking[0];
    }
  }

  get miResultado(): any {
    return this.ranking.find(j => j.idAlumno === this.currentUserId);
  }

  getPosColor(index: number): string {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#1e293b', '#1e293b'];
    return colors[index] || '#1e293b';
  }

  goBack(): void {
    this.exit();
  }

  exit(): void {
    const target = this.userRole === 'profesor' ? '/dashboard/professor' : '/dashboard/student';
    this.router.navigate([target]);
  }
}
