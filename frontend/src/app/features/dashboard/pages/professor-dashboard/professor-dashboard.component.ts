import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { AlertService } from '../../../../core/services/alert.service';
import { environment } from '../../../../../environments/environment';
import { BrandingService } from 'src/app/core/services/branding.service';

@Component({
  selector: 'app-professor-dashboard',
  templateUrl: './professor-dashboard.component.html',
  styleUrls: ['./professor-dashboard.component.scss']
})
export class ProfessorDashboardComponent implements OnInit, OnDestroy {
  userName: string = '';
  userInitials: string = '';

  recentGames: any[] = [];

  // Categorías de partidas no finalizadas
  activeGames: any[] = [];
  futureScheduledGames: any[] = [];

  filteredRecentGames: any[] = [];
  filteredActiveGames: any[] = [];
  filteredFutureScheduledGames: any[] = [];

  stats = {
    participationRate: 0,
    averageAccuracy: 0
  };

  searchQuery: string = '';
  isLoading = true;
  currentUserId: string = '';
  userProfileImg: string = '';
  private serverUrl = environment.serverUrl;
  private timerInterval: any;

  // Modal de reporte
  showReportModal: boolean = false;
  reportData: any[] = [];
  isLoadingReport: boolean = false;
  isDownloadingPDF: boolean = false;
  selectedGameId: string = '';
  expandedIndex: number = -1;
  selectedGameName: string = '';

  // Modales Historial Completo
  showFullRecentModal: boolean = false;
  showFullActiveModal: boolean = false;
  showFullScheduledModal: boolean = false;

  // Notificacion de asignaturas pendientes
  showSubjectsWarning: boolean = false;

  // Selector de curso activo (para profesores con múltiples cursos)
  userCourses: any[] = [];
  activeCourse: any = null;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router,
    private alertService: AlertService,
    public brandingService: BrandingService
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.nombre;
        this.currentUserId = user.idPortal;
        // Check strictly against string 'null' or 'undefined'
        const hasValidPhoto = user.fotoPerfil && user.fotoPerfil !== 'null' && user.fotoPerfil !== 'undefined';

        this.userProfileImg = hasValidPhoto
          ? `${this.serverUrl}/${user.fotoPerfil}?t=${new Date().getTime()}`
          : 'assets/img/default-avatar.png';

        this.userInitials = this.userName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);

        // Verificar si el profesor tiene asignaturas asignadas (solo para profesores)
        this.showSubjectsWarning = user.rol === 'profesor' && (!user.asignaturas || user.asignaturas.length === 0);

        // Cargar cursos del profesor para el selector
        if (user.rol === 'profesor') {
          this.userCourses = (user as any).cursos || [];
          // Inicializar curso activo
          this.authService.initializeActiveCourse(user);
          this.activeCourse = this.authService.getActiveCourse();
        }

        this.loadDashboardData(user.idPortal);
      }
    });
  }

  loadDashboardData(idProfesor: string): void {
    this.isLoading = true;

    // Cargar partidas recientes
    this.dashboardService.getRecentGames(idProfesor).subscribe(games => {
      // Procesar datos para mostrar métricas reales
      this.recentGames = games.map(game => {
        const totalAlumnos = game.jugadores?.length || 0;
        let avgAccuracy = 0;

        if (totalAlumnos > 0) {
          const totalAciertos = game.jugadores.reduce((acc: number, j: any) => acc + (j.aciertos || 0), 0);
          const totalFallos = game.jugadores.reduce((acc: number, j: any) => acc + (j.fallos || 0), 0);
          const totalRespondidas = totalAciertos + totalFallos;
          avgAccuracy = totalRespondidas > 0 ? Math.round((totalAciertos / totalRespondidas) * 100) : 0;
        }

        return {
          ...game,
          numAlumnos: totalAlumnos,
          aciertosPorcentaje: avgAccuracy
        };
      });
      this.filteredRecentGames = [...this.recentGames];

      // Calcular estadísticas globales basadas en estas partidas
      if (this.recentGames.length > 0) {
        const totalAcc = this.recentGames.reduce((acc, g) => acc + g.aciertosPorcentaje, 0);
        this.stats.averageAccuracy = Math.round(totalAcc / this.recentGames.length);
        this.stats.participationRate = 100; // Simplificado: 100% de las partidas cargadas son las que terminaron
      }
    });

    // Cargar partidas programadas/activas
    this.dashboardService.getScheduledGamesProfessor(idProfesor).subscribe(games => {
      const now = new Date().getTime();

      const processedGames = games.map((game: any) => {
        const startDate = game.configuracionExamen?.programadaPara || game.fechaProgramada || game.fechas?.creadaEn;
        const startTime = new Date(startDate).getTime();

        return {
          ...game,
          numAlumnos: game.jugadores?.length || 0,
          timerText: this.calculateTimer(game),
          displayDate: startDate,
          isFuture: game.tipoPartida === 'examen' && now < startTime
        };
      });

      // Dividir en listas: Activas vs Programadas Futuras
      this.activeGames = processedGames.filter(g => !g.isFuture);
      this.futureScheduledGames = processedGames.filter(g => g.isFuture);

      this.filteredActiveGames = [...this.activeGames];
      this.filteredFutureScheduledGames = [...this.futureScheduledGames];

      this.isLoading = false;
      this.startTimers();
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  startTimers(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.updateTimers();
    }, 1000);
  }

  updateTimers(): void {
    let updated = false;

    // Actualizar timers en ambas listas
    const updateList = (list: any[]) => {
      list.forEach(game => {
        const newTimer = this.calculateTimer(game);
        if (game.timerText !== newTimer) {
          game.timerText = newTimer;
          updated = true;
        }
      });
    };

    updateList(this.activeGames);
    updateList(this.futureScheduledGames);

    if (updated) {
      this.filteredActiveGames = [...this.activeGames];
      this.filteredFutureScheduledGames = [...this.futureScheduledGames];
      this.onSearch(); // Re-aplicar filtro si existe búsqueda
    }
  }

  calculateTimer(game: any): string {
    const startDateRaw =
      game.configuracionExamen?.programadaPara ||
      game.fechaProgramada ||
      (game.fechas && game.fechas.creadaEn);

    if (!startDateRaw || game.tipoPartida !== 'examen') return '';

    const now = new Date().getTime();
    const startTime = new Date(startDateRaw).getTime();
    const duracionMin = game.configuracionExamen?.tiempoTotalMin || 60;
    const endTime = startTime + (duracionMin * 60 * 1000);

    if (now < startTime) {
      return '';
    } else if (now < endTime) {
      const diff = endTime - now;
      return `Cierra en: ${this.formatDiff(diff)}`;
    } else {
      return 'Finalizado';
    }
  }

  formatDiff(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  get limitedRecentGames(): any[] {
    return this.filteredRecentGames.slice(0, 5);
  }

  get limitedActiveGames(): any[] {
    return this.filteredActiveGames.slice(0, 5);
  }

  get limitedScheduledGames(): any[] {
    return this.filteredFutureScheduledGames.slice(0, 5);
  }

  openFullRecentModal(): void {
    this.showFullRecentModal = true;
  }

  closeFullRecentModal(): void {
    this.showFullRecentModal = false;
  }

  openFullActiveModal(): void {
    this.showFullActiveModal = true;
  }

  closeFullActiveModal(): void {
    this.showFullActiveModal = false;
  }

  openFullScheduledModal(): void {
    this.showFullScheduledModal = true;
  }

  closeFullScheduledModal(): void {
    this.showFullScheduledModal = false;
  }

  createGame(): void {
    this.router.navigate(['/dashboard/professor/create-game']);
  }

  editGame(id: string): void {
    this.router.navigate(['/dashboard/professor/edit-game', id]);
  }

  viewGameRanking(id: string): void {
    this.router.navigate(['/dashboard/professor/game-ranking', id]);
  }

  async deleteGame(id: string): Promise<void> {
    const result = await this.alertService.confirm(
      '¿Eliminar partida?',
      'Esta acción no se puede deshacer y borrará todos los datos asociados.',
      'Sí, eliminar',
      'Cancelar'
    );

    if (result.isConfirmed) {
      this.dashboardService.deleteGame(id).subscribe({
        next: () => {
          this.alertService.success('Eliminada', 'La partida ha sido eliminada correctamente.');
          this.loadDashboardData(this.currentUserId);
        },
        error: () => {
          this.alertService.error('Error', 'No se pudo eliminar la partida. Inténtalo de nuevo.');
        }
      });
    }
  }

  assignSubjects(): void {
    this.router.navigate(['/dashboard/professor/assign-subjects']);
  }

  importQuestions(): void {
    this.router.navigate(['/dashboard/professor/import-questions']);
  }

  viewReports(): void {
    this.router.navigate(['/dashboard/professor/reports']);
  }

  downloadJSONTemplate(): void {
    const template = {
      meta: {
        titulo: "Nombre del Examen",
        asignatura: "Programación",
        autor: "Nombre del Autor",
        fecha: new Date().toISOString(),
        tipo: "PRACTICA"
      },
      preguntas: [
        {
          pregunta: "¿Ejemplo de pregunta?",
          opciones: [
            "Respuesta Correcta",
            "Opción Incorrecta 1",
            "Opción Incorrecta 2",
            "Opción Incorrecta 3"
          ],
          respuesta_correcta: "Respuesta Correcta",
          temas: ["Tema 1"],
          dificultad: 1
        },
        {
          pregunta: "¿Segunda pregunta de ejemplo?",
          opciones: [
            "Opción A",
            "Opción B",
            "Opción C",
            "Opción D"
          ],
          respuesta_correcta: "Opción A",
          temas: ["Tema 2"],
          dificultad: 2
        }
      ]
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "modelo_examen.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  viewGameReport(game: any): void {
    const partidaId = game._id;
    this.router.navigate(['/dashboard/professor/reports'], { queryParams: { idPartida: partidaId } });
  }

  closeReport(): void {
    this.showReportModal = false;
  }

  toggleDetails(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? -1 : index;
  }

  downloadPDF(): void {
    if (!this.selectedGameId) return;

    this.isDownloadingPDF = true;
    this.dashboardService.downloadReportPDF(this.selectedGameId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_${this.selectedGameName.replace(/\s+/g, '_')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isDownloadingPDF = false;
      },
      error: (err) => {
        console.error('Error descargando PDF:', err);
        this.alertService.error('Error', 'No se pudo generar el PDF. Por favor, inténtalo de nuevo.');
        this.isDownloadingPDF = false;
      }
    });
  }

  onSearch(): void {
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredRecentGames = this.recentGames;
      this.filteredActiveGames = this.activeGames;
      this.filteredFutureScheduledGames = this.futureScheduledGames;
      return;
    }

    // Dividir en palabras y filtrar las que son solo descriptivas como "curso"
    const words = query.split(/\s+/).filter(w => w !== 'curso' && w !== 'c');

    const filterFn = (game: any) => {
      const title = (game.nombrePartida || game.idCuestionario?.titulo || '').toLowerCase();
      const asignatura = (game.asignatura || game.idCuestionario?.asignatura || '').toLowerCase();
      const cursoStr = (game.curso || game.idCuestionario?.curso || '').toString().toLowerCase();

      const combined = `${title} ${asignatura} ${cursoStr}`;
      // El registro debe contener TODAS las palabras clave (ej. "1" y "Programación")
      return words.every(word => combined.includes(word));
    };

    this.filteredRecentGames = this.recentGames.filter(filterFn);
    this.filteredActiveGames = this.activeGames.filter(filterFn);
    this.filteredFutureScheduledGames = this.futureScheduledGames.filter(filterFn);
  }

  filterByCourse(course: string): void {
    if (this.searchQuery === course) {
      this.searchQuery = '';
    } else {
      this.searchQuery = course;
    }
    this.onSearch();
  }

  logout(): void {
    this.authService.logout();
  }

  triggerProfileUpload(): void {
    const fileInput = document.getElementById('profileInput') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onProfileFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.alertService.loading('Actualizando foto de perfil...');

    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.authService.uploadFotoPerfil(user._id, file).subscribe({
      next: (res) => {
        if (res.ok) {
          this.userProfileImg = `${this.serverUrl}/${res.fotoPerfil}`;
          this.alertService.success('¡Listo!', 'Tu foto de perfil ha sido actualizada.');
        }
      },
      error: (err) => {
        console.error('Error subiendo foto:', err);
        this.alertService.error('Error', err.error?.mensaje || 'No se pudo subir la imagen.');
      }
    });
  }

  refreshDashboard(): void {
    if (this.currentUserId) {
      this.loadDashboardData(this.currentUserId);
    }
  }

  /**
   * Cambia el curso activo del profesor
   */
  onActiveCourseChange(course: any): void {
    this.activeCourse = course;
    this.authService.setActiveCourse(course);
    // Mostrar notificación de cambio
    const courseName = course?.nombre || 'Sin curso';
    this.alertService.success('Curso cambiado', `Ahora estás trabajando en: ${courseName}`);
  }

  /**
   * Obtiene el ID del curso para comparación en el selector
   */
  getCourseId(course: any): string {
    return course?._id || course;
  }
}
