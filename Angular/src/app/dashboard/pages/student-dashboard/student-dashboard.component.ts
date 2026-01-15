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
        this.userProfileImg = user.fotoPerfil ? `${this.serverUrl}/${user.fotoPerfil}` : 'assets/img/default-avatar.png';
        this.userInitials = this.userName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        
        this.loadDashboardData(user.idPortal);
      }
    });
  }

  loadDashboardData(idAlumno: string): void {
    this.isLoading = true;
    
    this.dashboardService.getScheduledGames(idAlumno).subscribe(games => {
      this.scheduledGames = games;
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
    const twoMinutes = 2 * 60 * 1000;

    // Se puede unir si faltan menos de 2 minutos o si ya pasó la hora
    return (gameTime - now) <= twoMinutes;
  }

  joinGame(game: ScheduledGame): void {
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
        a.download = `Reporte_${this.selectedGameName.replace(/\s+/g, '_')}.pdf`;
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
}
