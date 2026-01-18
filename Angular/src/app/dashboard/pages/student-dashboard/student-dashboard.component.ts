import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { ScheduledGame, QuizResult, SubjectProgress } from '../../models/dashboard.models';
import { AlertService } from '../../../shared/services/alert.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit {
  userName: string = '';
  userInitials: string = '';
  
  scheduledGames: ScheduledGame[] = [];
  resultsHistory: QuizResult[] = [];
  subjectProgress: SubjectProgress[] = [];
  
  isLoading = true;
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
  // Modal Curso
  showCourseModal: boolean = false;
  allCourses: string[] = []; // Store all courses from constants
  availableCourses: string[] = []; // Filtered courses for the logged in user
  selectedCourse: string = '';
  currentCourse: string = '';
  isUpdatingCourse: boolean = false;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      console.log('StudentDashboard: Current user update', user);
      if (user) {
        this.userName = user.nombre;
        this.currentCourse = user.curso || '';
        // Add timestamp to force image refresh and avoid cache issues
        // Also check strictly against string 'null' or 'undefined' which might come from backend/storage issues
        const hasValidPhoto = user.fotoPerfil && user.fotoPerfil !== 'null' && user.fotoPerfil !== 'undefined';
        
        this.userProfileImg = hasValidPhoto 
          ? `${this.serverUrl}/${user.fotoPerfil}?t=${new Date().getTime()}` 
          : 'assets/img/default-avatar.png'; // Use default avatar if no custom photo
        
        // Debug info (optional, remove in prod)
        // console.log('StudentDashboard: Profile img URL', this.userProfileImg);
        
        this.userInitials = this.userName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        
        this.loadDashboardData(user.idPortal);
      }
    });

    // Cargar cursos disponibles
    this.authService.getConstants().subscribe({
      next: (res) => {
        if (res.ok && res.constants && res.constants.CURSOS) {
          // Store all valid courses in a separate array
          this.allCourses = (Object.values(res.constants.CURSOS) as string[]).filter((c: any) => !!c);
        }
      }
    });
  }

  loadDashboardData(idAlumno: string): void {
    this.isLoading = true;
    
    this.dashboardService.getScheduledGames(idAlumno).subscribe(games => {
      // Filter games: match current course or if game has no specific course
      this.scheduledGames = games.filter(g => {
        const gameCourse = g.curso || g.idCuestionario.curso;
        // If the game has a target course, it must match the student's current course
        if (gameCourse) {
            return gameCourse === this.currentCourse;
        }
        // If no course specified, assume it's visible to all
        return true;
      });
      this.isLoading = false;
    });

    this.dashboardService.getResultsHistory(idAlumno).subscribe(history => {
      this.resultsHistory = history;
      this.subjectProgress = this.dashboardService.getSubjectProgress(history);
    });
  }

  isJoinable(scheduledDate: string | undefined): boolean {
    if (!scheduledDate) return true; // Si no hay fecha, es acceso instantáneo
    
    const now = new Date().getTime();
    const gameTime = new Date(scheduledDate).getTime();

    // Se puede unir si ya llegó la hora (o faltan menos de 10 segundos por margen de red)
    return (gameTime - now) <= 10000;
  }

  joinGame(game: ScheduledGame): void {
    if (game.tipoPartida === 'examen') {
        const now = new Date().getTime();
        const gameTime = new Date(game.fechaProgramada!).getTime();
        
        // Si ya es la hora, entramos directo al examen
        if (now >= gameTime) {
            this.router.navigate(['/dashboard/student/game-exam', game._id]);
            return;
        }
    }
    this.router.navigate(['/dashboard/student/lobby', game._id]);
  }

  logout(): void {
    this.authService.logout();
  }

  joinWithCode(): void {
    this.router.navigate(['/dashboard/student/join-game']);
  }

  viewReports(): void {
    this.router.navigate(['/dashboard/student/reports']);
  }

  viewGameReport(result: QuizResult): void {
    const partidaId = result.idPartida._id;
    this.router.navigate(['/dashboard/student/reports'], { queryParams: { idPartida: partidaId } });
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
        a.download = `Reporte_${this.selectedGameId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isDownloadingPDF = false;
      },
      error: (err) => {
        console.error('Error descargando PDF:', err);
        alert('Error al generar el PDF. Por favor, inténtalo de nuevo.');
        this.isDownloadingPDF = false;
      }
    });
  }

  onImgError(): void {
    this.userProfileImg = 'assets/img/default-avatar.png';
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

  // --- Lógica de Cambio de Curso ---

  private extractSpecialty(courseName: string): string {
    if (!courseName) return '';
    // Removes numbers and trims/uppercases to normalized comparison
    // e.g. "1 DAM" -> "DAM", "2 DAW" -> "DAW"
    return courseName.replace(/[0-9]/g, '').trim().toUpperCase();
  }

  openCourseModal(): void {
    this.selectedCourse = this.currentCourse;
    
    if (this.currentCourse) {
      const mySpecialty = this.extractSpecialty(this.currentCourse);
      // Filter available courses to only show those of the same specialty (track)
      this.availableCourses = this.allCourses.filter(c => 
        this.extractSpecialty(c) === mySpecialty
      );
    } else {
      // Fallback if user somehow has no course
      this.availableCourses = [...this.allCourses];
    }

    this.showCourseModal = true;
  }

  closeCourseModal(): void {
    this.showCourseModal = false;
  }

  saveCourse(): void {
    if (!this.selectedCourse || this.selectedCourse === this.currentCourse) {
      this.closeCourseModal();
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.isUpdatingCourse = true;
    this.authService.updateUsuario(user._id, { curso: this.selectedCourse }).subscribe({
      next: (res) => {
        this.isUpdatingCourse = false;
        if (res.ok) {
          this.currentCourse = this.selectedCourse;
          this.alertService.success('Curso Actualizado', `Te has cambiado a ${this.selectedCourse}`);
          this.closeCourseModal();
          // Recargar datos dashboard se maneja en la suscripción a currentUser$
          // this.loadDashboardData(user.idPortal); 
        }
      },
      error: (err) => {
        this.isUpdatingCourse = false;
        console.error('Error actualizando curso:', err);
        this.alertService.error('Error', 'No se pudo actualizar el curso.');
      }
    });
  }

  refreshDashboard(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.loadDashboardData(user.idPortal);
      // Optional: Add a small toast or visual feedback
      // this.alertService.toast('Datos actualizados'); // Assuming toast method exists or just silent refresh
    }
  }
}
