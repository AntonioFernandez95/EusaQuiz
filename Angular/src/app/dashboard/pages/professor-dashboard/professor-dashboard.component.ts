import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { AlertService } from '../../../shared/services/alert.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-professor-dashboard',
  templateUrl: './professor-dashboard.component.html',
  styleUrls: ['./professor-dashboard.component.scss']
})
export class ProfessorDashboardComponent implements OnInit {
  userName: string = '';
  userInitials: string = '';
  
  recentGames: any[] = [];
  scheduledGames: any[] = [];
  
  filteredRecentGames: any[] = [];
  filteredScheduledGames: any[] = [];

  stats = {
    participationRate: 0,
    averageAccuracy: 0
  };
  
  searchQuery: string = '';
  isLoading = true;
  currentUserId: string = '';
  userProfileImg: string = '';
  private serverUrl = environment.serverUrl;

  // Modal de reporte
  showReportModal: boolean = false;
  reportData: any[] = [];
  isLoadingReport: boolean = false;
  isDownloadingPDF: boolean = false;
  selectedGameId: string = '';
  expandedIndex: number = -1;
  selectedGameName: string = '';

  // Notificacion de asignaturas pendientes
  showSubjectsWarning: boolean = false;

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
        
        // Verificar si el profesor tiene asignaturas asignadas
        this.showSubjectsWarning = !user.asignaturas || user.asignaturas.length === 0;
        
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

    // Cargar partidas programadas
    this.dashboardService.getScheduledGamesProfessor(idProfesor).subscribe(games => {
      this.scheduledGames = games.map((game: any) => ({
        ...game,
        numAlumnos: game.jugadores?.length || 0
      }));
      this.filteredScheduledGames = [...this.scheduledGames];
      this.isLoading = false;
    });
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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
      this.filteredScheduledGames = this.scheduledGames;
      return;
    }

    const words = query.split(/\s+/);

    const filterFn = (game: any) => {
      const title = (game.nombrePartida || game.idCuestionario?.titulo || '').toLowerCase();
      const asignatura = (game.asignatura || game.idCuestionario?.asignatura || '').toLowerCase();
      const cursoStr = (game.curso || game.idCuestionario?.curso || '').toString().toLowerCase();
      
      // Inteligencia para "curso 1" o "curso 2"
      if (query === 'curso 1' || query === '1') {
        if (cursoStr === '1' || cursoStr.includes('primero') || cursoStr.includes('1')) return true;
      }
      if (query === 'curso 2' || query === '2') {
        if (cursoStr === '2' || cursoStr.includes('segundo') || cursoStr.includes('2')) return true;
      }

      const combined = `${title} ${asignatura} ${cursoStr}`;
      return words.every(word => combined.includes(word));
    };

    this.filteredRecentGames = this.recentGames.filter(filterFn);
    this.filteredScheduledGames = this.scheduledGames.filter(filterFn);
  }

  filterByCourse(course: string): void {
    // Si el curso es el mismo que ya está en el buscador, lo limpiamos
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
}
