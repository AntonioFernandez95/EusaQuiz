import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../../auth/services/auth.service';
import { AlertService } from '../../../../core/services/alert.service';
import { SocketService } from '../../../../core/services/socket.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BrandingService } from 'src/app/core/services/branding.service';
import { PlayerLobby } from 'src/app/models';

@Component({
    selector: 'app-game-lobby',
    templateUrl: './game-lobby.component.html',
    styleUrls: ['./game-lobby.component.scss']
})
export class GameLobbyComponent implements OnInit, OnDestroy {
    userName: string = '';
    userInitials: string = '';
    userProfileImg: string = '';
    userId: string = '';
    private serverUrl = environment.serverUrl;

    partidaId: string = '';
    partida: any = null;
    players: PlayerLobby[] = [];

    // Stats
    connectedCount: number = 0;
    totalExpected: number = 0;
    percentage: number = 0;

    private subs: Subscription = new Subscription();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private dashboardService: DashboardService,
        private authService: AuthService,
        private socketService: SocketService,
        private alertService: AlertService,
        public brandingService: BrandingService
    ) { }

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
            this.loadPartida();
        }
    }

    ngOnDestroy(): void {
        this.socketService.disconnect();
        this.subs.unsubscribe();
    }

    loadPartida(): void {
        console.log('[GameLobby] Cargando partida con ID:', this.partidaId);
        // Necesitamos un método en dashboardService para obtener el detalle de una partida
        this.dashboardService.getDetallePartida(this.partidaId).subscribe({
            next: (p) => {
                console.log('[GameLobby] Partida recibida:', p);
                if (p) {
                    this.partida = p;

                    // Si la partida ya está activa, redirigir al profesor a la pantalla correspondiente
                    if (p.estadoPartida === 'activa' || p.estadoPartida === 'finalizada') {
                        if (p.tipoPartida === 'examen') {
                            this.router.navigate(['/dashboard/professor/game-ranking', this.partidaId]);
                            return;
                        } else {
                            this.router.navigate(['/dashboard/professor/game-monitor', this.partidaId]);
                            return;
                        }
                    }

                    this.setupLobby();
                    this.connectSocket();
                } else {
                    console.error('[GameLobby] Partida no encontrada (null)');
                    this.alertService.error('Error', 'No se encontró la partida.');
                    this.router.navigate(['/dashboard/professor']);
                }
            },
            error: (err) => {
                console.error('[GameLobby] Error al cargar partida:', err);
                this.alertService.error('Error', 'No se pudo cargar la partida.');
                this.router.navigate(['/dashboard/professor']);
            }
        });
    }

    setupLobby(): void {
        const isPrivate = this.partida.modoAcceso === 'privada';

        if (isPrivate) {
            // En modo privado, usar la lista de alumnos permitidos del backend
            if (this.partida.alumnosCurso && this.partida.alumnosCurso.length > 0) {
                this.players = this.partida.alumnosCurso.map((a: any) => {
                    const yaConectado = this.partida.jugadores?.some((j: any) => j.idAlumno === a.idAlumno);
                    return {
                        idAlumno: a.idAlumno,
                        nombre: a.nombre,
                        status: yaConectado ? 'conectado' : 'no_conectado'
                    };
                });
                this.totalExpected = this.partida.alumnosCurso.length;
            } else {
                // Fallback: usar participantesPermitidos si no hay alumnosCurso
                this.totalExpected = this.partida.participantesPermitidos?.length || 0;
                this.players = (this.partida.participantesPermitidos || []).map((id: string) => {
                    const joined = this.partida.jugadores?.find((j: any) => j.idAlumno === id);
                    return {
                        idAlumno: id,
                        nombre: joined ? joined.nombreAlumno : `Alumno ${id.substring(0, 5)}`,
                        status: joined ? 'conectado' : 'no_conectado'
                    };
                });
            }
        } else {
            // En modo público, inicializar con todos los alumnos del curso
            if (this.partida.alumnosCurso && this.partida.alumnosCurso.length > 0) {
                this.players = this.partida.alumnosCurso.map((a: any) => {
                    const yaConectado = this.partida.jugadores?.some((j: any) => j.idAlumno === a.idAlumno);
                    return {
                        idAlumno: a.idAlumno,
                        nombre: a.nombre,
                        status: yaConectado ? 'conectado' : 'no_conectado'
                    };
                });
                this.totalExpected = this.partida.alumnosCurso.length;
            } else {
                // Fallback: solo mostrar conectados si no hay lista de curso
                this.players = (this.partida.jugadores || []).map((j: any) => ({
                    idAlumno: j.idAlumno,
                    nombre: j.nombreAlumno,
                    status: 'conectado'
                }));
                this.totalExpected = this.partida.totalAlumnosCurso || Math.max(this.players.length, 1);
            }
        }

        this.updateStats();
    }

    connectSocket(): void {
        this.socketService.connect();
        this.socketService.emit('join_room', { pin: this.partida.pin });

        // Cargar estado inicial del lobby desde el socket
        this.subs.add(
            this.socketService.on('estado_lobby').subscribe(data => {
                console.log('Estado inicial del lobby:', data);
                if (data.jugadores) {
                    data.jugadores.forEach((j: any) => {
                        this.handlePlayerJoin({
                            idAlumno: j.idAlumno,
                            nombre: j.nombre
                        });
                    });
                }
            })
        );

        // Escuchar nuevos jugadores
        this.subs.add(
            this.socketService.on('nuevo_jugador').subscribe(data => {
                console.log('Nuevo jugador conectado:', data);
                this.handlePlayerJoin(data);
            })
        );

        // Escuchar desconexión de jugadores
        this.subs.add(
            this.socketService.on('usuario_desconectado').subscribe(data => {
                console.log('Jugador desconectado:', data);
                this.handlePlayerLeave(data);
            })
        );

        // ESCUCHAR INICIO DE PARTIDA (por si se inicia desde otro sitio o re-conecta)
        this.subs.add(
            this.socketService.on('nueva_pregunta').subscribe(data => {
                console.log('Partida iniciada (en vivo):', data);
                this.router.navigate(['/dashboard/professor/game-monitor', this.partidaId], {
                    state: { initialQuestion: data }
                });
            })
        );

        this.subs.add(
            this.socketService.on('inicio_examen').subscribe(data => {
                console.log('Examen iniciado:', data);
                this.router.navigate(['/dashboard/professor/game-ranking', this.partidaId]);
            })
        );
    }

    handlePlayerJoin(data: any): void {
        // data: { nombre, idAlumno, total }
        const index = this.players.findIndex(p => p.idAlumno === data.idAlumno);
        if (index !== -1) {
            this.players[index].status = 'conectado';
            this.players[index].nombre = data.nombre;
        } else {
            this.players.push({
                idAlumno: data.idAlumno,
                nombre: data.nombre,
                status: 'conectado'
            });
        }
        this.updateStats();
    }

    handlePlayerLeave(data: any): void {
        // data: { idAlumno, modo, totalParticipantes }
        const index = this.players.findIndex(p => p.idAlumno === data.idAlumno);
        if (index !== -1) {
            // En ambos modos (privada y pública) se queda en la lista pero como "no conectado"
            this.players[index].status = 'no_conectado';
        }
        this.updateStats();
    }

    updateStats(): void {
        const connected = this.players.filter(p => p.status === 'conectado');
        this.connectedCount = connected.length;
        if (this.partida.modoAcceso === 'publica') {
            this.totalExpected = this.partida.totalAlumnosCurso || this.connectedCount; // En pública, el total es el del curso o el que hay conectado
        }
        this.percentage = this.totalExpected > 0 ? Math.round((this.connectedCount / this.totalExpected) * 100) : 0;
    }

    copyUrl(): void {
        const url = `${window.location.origin}/join/${this.partida.pin}`;
        navigator.clipboard.writeText(url).then(() => {
            this.alertService.success('Copiado', 'Enlace de la sala copiado al portapapeles.');
        });
    }

    iniciarPartida(): void {
        console.log('Iniciando partida...', this.partidaId);
        // Llamar al backend para iniciar
        this.dashboardService.iniciarPartida(this.partidaId).subscribe({
            next: (res) => {
                console.log('Partida iniciada con éxito:', res);
                if (this.partida.tipoPartida === 'examen') {
                    // En examen no hay monitor de preguntas, vamos directo al ranking/seguimiento
                    this.router.navigate(['/dashboard/professor/game-ranking', this.partidaId]);
                } else {
                    this.router.navigate(['/dashboard/professor/game-monitor', this.partidaId], {
                        state: { initialQuestion: res.primeraPregunta }
                    });
                }
            },
            error: (err) => {
                console.error('Error al iniciar partida:', err);
                this.alertService.error('Error', 'No se pudo iniciar la partida. Inténtalo de nuevo.');
            }
        });
    }

    cancel(): void {
        this.cancelar();
    }

    cancelar(): void {
        this.router.navigate(['/dashboard/professor']);
    }
}
