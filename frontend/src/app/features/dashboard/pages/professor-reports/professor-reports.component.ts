import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../../environments/environment';

import { AlertService } from '../../../../core/services/alert.service';
import { BrandingService } from 'src/app/core/services/branding.service';

@Component({
  selector: 'app-professor-reports',
  templateUrl: './professor-reports.component.html',
  styleUrls: ['./professor-reports.component.scss']
})
export class ProfessorReportsComponent implements OnInit {
  professorName: string = '';
  professorInitials: string = '';
  professorProfileImg: string = '';
  private serverUrl = environment.serverUrl;

  // Filtros
  allGames: any[] = [];
  subjects: string[] = [];
  selectedSubject: string = '';

  filteredGames: any[] = [];
  selectedGameId: string = '';

  selectedGameDetails: any = null;
  players: any[] = [];
  selectedStudentId: string = '';

  // Datos de rendimiento
  classPerformance: any = {
    subject: '',
    participation: '0/0',
    accuracy: 0,
    status: '',
    failedQuestionsIndices: []
  };

  studentPerformance: any = {
    accuracy: 0,
    status: ''
  };

  failedQuestions: any[] = [];
  unansweredQuestions: any[] = [];
  studentEvolution: any[] = [];

  isLoading = false;
  isDownloadingPDF = false;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    public brandingService: BrandingService
  ) { }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.professorName = user.nombre;

      const hasValidPhoto = user.fotoPerfil && user.fotoPerfil !== 'null' && user.fotoPerfil !== 'undefined';
      this.professorProfileImg = hasValidPhoto
        ? `${this.serverUrl}/${user.fotoPerfil}?t=${new Date().getTime()}`
        : 'assets/img/default-avatar.png';

      this.professorInitials = this.professorName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

      this.loadInitialData(user.idPortal);
    }
  }

  loadInitialData(idProfesor: string): void {
    this.isLoading = true;
    this.dashboardService.getRecentGames(idProfesor).subscribe(games => {
      this.allGames = games;
      this.extractSubjects();

      // Verificar si hay un ID en la URL
      this.route.queryParams.subscribe(params => {
        if (params['idPartida']) {
          const gameId = params['idPartida'];
          const gameFound = this.allGames.find(g => g._id === gameId);
          if (gameFound) {
            const subject = gameFound.asignatura || gameFound.idCuestionario?.asignatura;
            const curso = gameFound.curso || gameFound.idCuestionario?.curso;
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
    this.allGames.forEach(g => {
      const subject = g.asignatura || g.idCuestionario?.asignatura;
      const curso = g.curso || g.idCuestionario?.curso;
      if (subject) {
        subjectsSet.add(curso ? `${subject}/${curso}` : subject);
      }
    });
    this.subjects = Array.from(subjectsSet).sort();
  }

  onSubjectChange(): void {
    this.selectedGameId = '';
    this.selectedGameDetails = null;
    this.players = [];
    this.selectedStudentId = '';

    if (!this.selectedSubject) {
      this.filteredGames = [];
      return;
    }

    this.filteredGames = this.allGames.filter(g => {
      const subject = g.asignatura || g.idCuestionario?.asignatura;
      const curso = g.curso || g.idCuestionario?.curso;
      const key = curso ? `${subject}/${curso}` : subject;
      return key === this.selectedSubject;
    });
  }

  onGameChange(): void {
    this.selectedGameDetails = null;
    this.players = [];
    this.selectedStudentId = '';
    this.failedQuestions = [];
    this.unansweredQuestions = [];
    this.studentEvolution = [];

    if (!this.selectedGameId) return;

    this.isLoading = true;
    this.dashboardService.getDetallePartida(this.selectedGameId).subscribe(data => {
      this.selectedGameDetails = data;
      this.players = data.jugadores || [];
      this.calculateClassPerformance(data);
      this.isLoading = false;
    });
  }

  calculateClassPerformance(data: any): void {
    const totalStudents = data.participantesPermitidos?.length || data.jugadores?.length || 0;
    const actualStudents = data.jugadores?.length || 0;

    let totalAccuracy = 0;
    const questionFailures: Record<string, number> = {}; // questionId -> failure count (incorrect + unanswered)
    const preguntas = data.preguntas || [];

    data.jugadores.forEach((j: any) => {
      const totalQ = preguntas.length || data.idCuestionario?.numPreguntas || 0;
      if (totalQ > 0) {
        totalAccuracy += (j.aciertos / totalQ) * 100;
      }

      // Track failed and unanswered questions by question ID
      preguntas.forEach((q: any) => {
        const resp = (j.respuestas || []).find((r: any) => String(r.idPregunta) === String(q._id));
        // Count both unanswered (!resp) and incorrect (resp && !resp.esCorrecta) as failures
        if (!resp || !resp.esCorrecta) {
          questionFailures[q._id] = (questionFailures[q._id] || 0) + 1;
        }
      });
    });

    const avgAccuracy = actualStudents > 0 ? Math.round(totalAccuracy / actualStudents) : 0;

    // Most failed questions (top 5) - get question indices
    const sortedFailures = Object.entries(questionFailures)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const failedIndices = sortedFailures.map(([qId]) => {
      const idx = preguntas.findIndex((q: any) => String(q._id) === String(qId));
      return idx + 1; // 1-based index
    }).filter(i => i > 0);

    this.classPerformance = {
      subject: this.selectedSubject,
      participation: `${actualStudents}/${totalStudents} alumnos`,
      accuracy: avgAccuracy,
      status: this.getStatusText(avgAccuracy),
      failedQuestionsIndices: failedIndices
    };
  }

  onStudentChange(): void {
    this.failedQuestions = [];
    this.unansweredQuestions = [];
    this.studentEvolution = [];
    this.studentPerformance = { accuracy: 0, status: '' };

    if (!this.selectedStudentId || !this.selectedGameDetails) return;

    const student = this.selectedGameDetails.jugadores.find((j: any) => j.idAlumno === this.selectedStudentId);
    if (student) {
      const totalQ = this.selectedGameDetails.preguntas?.length || this.selectedGameDetails.idCuestionario?.numPreguntas || 0;
      const accuracy = totalQ > 0 ? Math.round((student.aciertos / totalQ) * 100) : 0;

      this.studentPerformance = {
        accuracy: accuracy,
        status: this.getStatusText(accuracy)
      };

      // Separate failed questions (answered incorrectly) from unanswered questions
      (this.selectedGameDetails.preguntas || []).forEach((q: any, idx: number) => {
        const resp = student.respuestas.find((r: any) => String(r.idPregunta) === String(q._id));
        if (!resp) {
          // Question was not answered
          this.unansweredQuestions.push({ ...q, questionIndex: idx + 1 });
        } else if (!resp.esCorrecta) {
          // Question was answered incorrectly
          this.failedQuestions.push({ ...q, questionIndex: idx + 1 });
        }
      });

      // Load evolution
      this.isLoading = true;
      this.dashboardService.getResultsHistory(this.selectedStudentId).subscribe(history => {
        this.studentEvolution = history.map(h => ({
          subject: h.idPartida.idCuestionario.titulo,
          accuracy: Math.round(h.porcentaje),
          status: this.getStatusText(h.porcentaje)
        }));
        this.isLoading = false;
      });
    }
  }

  getStatusText(accuracy: number): string {
    if (accuracy >= 90) return 'excelente';
    if (accuracy >= 70) return 'muy bien';
    if (accuracy >= 50) return 'mejorable';
    return 'necesita refuerzo';
  }

  getStudentSummary(): string {
    if (!this.selectedStudentId || !this.selectedGameDetails) return '';
    const student = this.players.find(p => p.idAlumno === this.selectedStudentId);
    if (!student) return '';

    const subjectName = this.selectedSubject.split('/')[0];
    return `${student.nombreAlumno} muestra un rendimiento ${this.studentPerformance.status} en la asignatura "${subjectName}". ${this.studentPerformance.accuracy < 60 ? 'Necesita refuerzo en la partida seleccionada.' : 'Sigue así.'}`;
  }

  exportPDF(): void {
    if (!this.selectedGameId) return;

    this.isDownloadingPDF = true;
    this.dashboardService.downloadReportPDF(this.selectedGameId, this.selectedStudentId || undefined).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = this.selectedStudentId ? `Reporte_Alumno_${this.selectedStudentId}` : `Reporte_Clase_${this.selectedGameId}`;
        a.download = `${name}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isDownloadingPDF = false;
      },
      error: (err) => {
        console.error('Error descargando PDF:', err);
        this.isDownloadingPDF = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/professor']);
  }

  onImgError(): void {
    this.professorProfileImg = 'assets/img/default-avatar.png';
  }

  triggerProfileUpload(): void {
    const fileInput = document.getElementById('profileInputProfReports') as HTMLInputElement;
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
          this.professorProfileImg = `${this.serverUrl}/${res.fotoPerfil}?t=${new Date().getTime()}`;
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
