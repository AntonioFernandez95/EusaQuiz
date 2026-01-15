import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';

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
  studentEvolution: any[] = [];
  
  isLoading = false;
  isDownloadingPDF = false;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.professorName = user.nombre;
      this.professorProfileImg = user.fotoPerfil ? `${this.serverUrl}/${user.fotoPerfil}` : 'assets/img/default-avatar.png';
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
    const questionStats: Record<number, number> = {}; // index -> failure count

    data.jugadores.forEach((j: any) => {
      const totalQ = data.preguntas?.length || data.idCuestionario?.numPreguntas || 0;
      if (totalQ > 0) {
        totalAccuracy += (j.aciertos / totalQ) * 100;
      }

      // Track failed questions
      (j.respuestas || []).forEach((resp: any, idx: number) => {
        if (!resp.esCorrecta) {
          questionStats[idx] = (questionStats[idx] || 0) + 1;
        }
      });
    });

    const avgAccuracy = actualStudents > 0 ? Math.round(totalAccuracy / actualStudents) : 0;
    
    // Most failed questions (top 5)
    const failedIndices = Object.keys(questionStats)
      .map(Number)
      .sort((a, b) => questionStats[b] - questionStats[a])
      .slice(0, 5)
      .map(i => i + 1);

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

      // Get failed questions text
      this.failedQuestions = (this.selectedGameDetails.preguntas || []).filter((q: any, idx: number) => {
        const resp = student.respuestas.find((r: any) => String(r.idPregunta) === String(q._id));
        return resp && !resp.esCorrecta;
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

  goBack(): void {
    this.router.navigate(['/dashboard/professor']);
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
}
