import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AlertService } from '../../../shared/services/alert.service';

@Component({
  selector: 'app-student-reports',
  templateUrl: './student-reports.component.html',
  styleUrls: ['./student-reports.component.scss']
})
export class StudentReportsComponent implements OnInit {
  userName: string = '';
  userInitials: string = '';
  currentUserId: string = '';
  userProfileImg: string = '';
  private serverUrl = environment.serverUrl;
  
  // Filtros
  history: any[] = [];
  subjects: string[] = [];
  selectedSubject: string = '';
  
  filteredGames: any[] = [];
  selectedGameId: string = '';
  
  selectedGameDetails: any = null;
  
  // Datos de rendimiento
  performance: any = {
    accuracy: 0,
    status: ''
  };
  
  failedQuestions: any[] = [];
  unansweredQuestions: any[] = [];
  subjectEvolution: any[] = [];
  
  isLoading = false;
  isDownloadingPDF = false;
  private routeSub!: Subscription;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService // Injected
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
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
      
      this.loadHistory(user.idPortal);
    }
  }

  loadHistory(idAlumno: string): void {
    this.isLoading = true;
    this.dashboardService.getResultsHistory(idAlumno).subscribe(data => {
      this.history = data;
      this.extractSubjects();
      
      // Verificar si hay un ID en la URL
      this.route.queryParams.subscribe(params => {
        if (params['idPartida']) {
          const gameId = params['idPartida'];
          const gameFound = this.history.find(h => h.idPartida._id === gameId);
          if (gameFound) {
            const subject = gameFound.idPartida.asignatura || gameFound.idPartida.idCuestionario.categoria || gameFound.idPartida.idCuestionario.asignatura;
            const curso = gameFound.idPartida.curso || gameFound.idPartida.idCuestionario.curso;
            this.selectedSubject = curso ? `${subject}/${curso}` : subject;
            this.onSubjectChange();
            this.selectedGameId = gameId;
            this.onGameChange();
          }
        }
      });
      
      this.isLoading = false;
    });
  }

  extractSubjects(): void {
    const subjectsSet = new Set<string>();
    this.history.forEach(h => {
      const subject = h.idPartida.asignatura || h.idPartida.idCuestionario.categoria || h.idPartida.idCuestionario.asignatura;
      const curso = h.idPartida.curso || h.idPartida.idCuestionario.curso;
      if (subject) {
        subjectsSet.add(curso ? `${subject}/${curso}` : subject);
      }
    });
    this.subjects = Array.from(subjectsSet).sort();
  }

  onSubjectChange(): void {
    this.selectedGameId = '';
    this.selectedGameDetails = null;
    this.failedQuestions = [];
    this.unansweredQuestions = [];
    this.subjectEvolution = [];
    
    if (!this.selectedSubject) {
      this.filteredGames = [];
      return;
    }

    this.filteredGames = this.history.filter(h => {
      const subject = h.idPartida.asignatura || h.idPartida.idCuestionario.categoria || h.idPartida.idCuestionario.asignatura;
      const curso = h.idPartida.curso || h.idPartida.idCuestionario.curso;
      const key = curso ? `${subject}/${curso}` : subject;
      return key === this.selectedSubject;
    });

    // Calcular evolución para esta asignatura
    this.subjectEvolution = this.filteredGames.map(h => ({
      subject: h.idPartida.nombrePartida || h.idPartida.idCuestionario.titulo,
      accuracy: Math.round(h.porcentaje),
      status: this.getStatusText(h.porcentaje)
    }));
  }

  onGameChange(): void {
    this.selectedGameDetails = null;
    this.failedQuestions = [];
    this.unansweredQuestions = [];
    this.performance = { accuracy: 0, status: '' };

    if (!this.selectedGameId) return;

    // Buscar en el historial local primero
    const historicalResult = this.history.find(h => h.idPartida._id === this.selectedGameId);
    if (historicalResult) {
      this.performance = {
        accuracy: Math.round(historicalResult.porcentaje),
        status: this.getStatusText(historicalResult.porcentaje)
      };
    }

    this.isLoading = true;
    this.dashboardService.getDetallePartida(this.selectedGameId).subscribe(data => {
      this.selectedGameDetails = data;
      
      // Obtener preguntas fallidas y sin responder para este alumno
      const student = data.jugadores.find((j: any) => j.idAlumno === this.currentUserId);
      if (student && data.preguntas) {
        // Separate failed questions (answered incorrectly) from unanswered questions
        (data.preguntas || []).forEach((q: any, idx: number) => {
          const resp = student.respuestas.find((r: any) => String(r.idPregunta) === String(q._id));
          if (!resp) {
            // Question was not answered
            this.unansweredQuestions.push({ ...q, questionIndex: idx + 1 });
          } else if (!resp.esCorrecta) {
            // Question was answered incorrectly
            this.failedQuestions.push({ ...q, questionIndex: idx + 1 });
          }
        });
      }
      this.isLoading = false;
    });
  }

  getStatusText(accuracy: number): string {
    if (accuracy >= 90) return 'excelente';
    if (accuracy >= 70) return 'muy bien';
    if (accuracy >= 50) return 'mejorable';
    return 'necesita refuerzo';
  }

  getSummary(): string {
    if (!this.selectedGameId) return '';
    const subjectName = this.selectedSubject.split('/')[0];
    const gameName = this.filteredGames.find(g => g.idPartida._id === this.selectedGameId)?.idPartida.nombrePartida || 'esta partida';
    
    let trend = 'mantiene un rendimiento estable';
    if (this.subjectEvolution.length > 1) {
      const last = this.subjectEvolution[this.subjectEvolution.length - 1].accuracy;
      const prev = this.subjectEvolution[this.subjectEvolution.length - 2].accuracy;
      if (last > prev) trend = 'muestra mejora constante';
    }

    return `${this.userName} ${trend} en la asignatura "${subjectName}". ${this.performance.accuracy < 60 ? `Necesita refuerzo en la partida de ${gameName}.` : 'Buen trabajo sigue así.'}`;
  }

  exportPDF(): void {
    if (!this.selectedGameId) return;
    
    this.isDownloadingPDF = true;
    this.dashboardService.downloadReportPDF(this.selectedGameId, this.currentUserId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = `Reporte_${this.userName.replace(/\s+/g, '_')}_${this.selectedGameId}`;
        a.download = `${name}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isDownloadingPDF = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/student']);
  }

  onImgError(): void {
    this.userProfileImg = 'assets/img/default-avatar.png';
  }

  triggerProfileUpload(): void {
    const fileInput = document.getElementById('profileInputReports') as HTMLInputElement;
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
          this.userProfileImg = `${this.serverUrl}/${res.fotoPerfil}?t=${new Date().getTime()}`;
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
