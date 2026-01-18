import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../../auth/services/auth.service';
import { AlertService } from '../../../shared/services/alert.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-create-game',
  templateUrl: './create-game.component.html',
  styleUrls: ['./create-game.component.scss']
})
export class CreateGameComponent implements OnInit {
  userName: string = '';
  userInitials: string = '';
  userProfileImg: string = '';
  private serverUrl = environment.serverUrl;
  userId: string = '';

  // Form data
  gameName: string = '';
  selectedSubject: string = '';
  timePerQuestion: number = 30;
  selectedQuizId: string = '';
  gameMode: string = 'en_vivo'; // en_vivo, examen
  totalExamTime: number = 60; // En minutos para modo examen
  accessType: string = 'publica'; // publica, privada
  qualificationMode: string = 'velocidad_precision';

  // Extra options for Live
  showRanking: boolean = true;
  shuffleQuestions: boolean = false;
  shuffleAnswers: boolean = false;

  // Extra options for Scheduled
  scheduledDate: string = '';
  scheduledTime: string = '';
  instantAccess: boolean = false;

  // Private mode
  allStudents: any[] = [];
  selectedStudentIds: string[] = [];
  searchTerm: string = '';

  isEditing: boolean = false;
  editId: string = '';

  // Data from backend
  availableSubjects: { name: string, course: string }[] = [];
  availableQuizzes: any[] = [];
  qualificationModes: string[] = [];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.nombre;
        this.userProfileImg = user.fotoPerfil ? `${this.serverUrl}/${user.fotoPerfil}` : 'assets/img/default-avatar.png';
        this.userInitials = this.userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        this.userId = user.idPortal;
        
        this.loadQuizzes();
        // Cargamos todos inicialmente o según lo que haya
        this.loadStudents();

        // Modo Edición
        this.editId = this.route.snapshot.paramMap.get('id') || '';
        if (this.editId) {
          this.isEditing = true;
          this.loadGameData();
        }
      }
    });

    // Cargar configuraciones (asignaturas, modos, etc)
    this.dashboardService.getConfigOptions().subscribe(config => {
      if (config && config.asignaturas) {
        const dam1 = (config.asignaturas.DAM1 || []).map((s: string) => ({ name: s, course: '1 DAM' }));
        const dam2 = (config.asignaturas.DAM2 || []).map((s: string) => ({ name: s, course: '2 DAM' }));
        this.availableSubjects = [...dam1, ...dam2];
        this.qualificationModes = config.modosCalificacion || ['velocidad_precision'];
      }
    });
  }

  loadGameData(): void {
    this.dashboardService.getDetallePartida(this.editId).subscribe(game => {
      if (game) {
        this.gameName = game.nombrePartida || '';
        this.selectedSubject = game.asignatura || game.idCuestionario?.asignatura || '';
        this.selectedQuizId = game.idCuestionario?._id || '';
        this.gameMode = game.tipoPartida;
        this.accessType = game.modoAcceso;
        this.selectedStudentIds = game.participantesPermitidos || [];

        if (this.gameMode === 'en_vivo') {
          const cfg = game.configuracionEnvivo;
          if (cfg) {
            this.timePerQuestion = cfg.tiempoPorPreguntaSeg;
            this.showRanking = cfg.mostrarRanking;
            this.shuffleQuestions = cfg.mezclarPreguntas;
            this.shuffleAnswers = cfg.mezclarRespuestas;
            this.qualificationMode = cfg.modoCalificacion;
          }
        } else {
          const cfg = game.configuracionExamen;
          if (cfg) {
            this.totalExamTime = cfg.tiempoTotalMin;
            this.shuffleQuestions = cfg.mezclarPreguntas;
            this.shuffleAnswers = cfg.mezclarRespuestas;
            if (cfg.programadaPara) {
              const date = new Date(cfg.programadaPara);
              this.scheduledDate = date.toISOString().split('T')[0];
              this.scheduledTime = date.toTimeString().split(' ')[0].substring(0, 5);
            }
          }
        }
      }
    });
  }

  loadQuizzes(): void {
    this.dashboardService.getProfessorQuizzes(this.userId).subscribe(quizzes => {
      this.availableQuizzes = quizzes;
    });
  }

  loadStudents(curso?: string): void {
    this.dashboardService.getStudents(curso).subscribe(students => {
      this.allStudents = students;
    });
  }

  onSubjectChange(): void {
    // Buscar el curso correspondiente a la asignatura seleccionada
    const subjectInfo = this.availableSubjects.find(s => s.name === this.selectedSubject);
    const selectedCourse = subjectInfo ? subjectInfo.course : undefined;
    
    // Al cambiar la asignatura/curso, limpiamos la selección previa para evitar inconsistencias
    this.selectedStudentIds = [];
    
    // Recargar la lista de alumnos filtrada por el curso de la asignatura
    this.loadStudents(selectedCourse);
  }

  toggleStudent(id: string): void {
    const index = this.selectedStudentIds.indexOf(id);
    if (index > -1) {
      this.selectedStudentIds.splice(index, 1);
    } else {
      this.selectedStudentIds.push(id);
    }
  }

  get filteredStudents(): any[] {
    if (!this.searchTerm) return this.allStudents;
    return this.allStudents.filter(s => 
      s.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      s.correo.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  createGame(): void {
    if (!this.gameName || !this.selectedQuizId || !this.selectedSubject) {
      this.alertService.warning('Datos incompletos', 'Por favor, rellena los campos obligatorios para continuar.');
      return;
    }

    if (this.accessType === 'privada' && this.selectedStudentIds.length === 0) {
        this.alertService.warning('Selección de alumnos', 'En modo privado debes seleccionar al menos un alumno de la lista.');
        return;
    }

    // Buscar el curso correspondiente a la asignatura seleccionada
    const subjectInfo = this.availableSubjects.find(s => s.name === this.selectedSubject);
    const selectedCourse = subjectInfo ? subjectInfo.course : '';

    const gameData: any = {
      nombrePartida: this.gameName,
      asignatura: this.selectedSubject,
      curso: selectedCourse,
      idCuestionario: this.selectedQuizId,
      idProfesor: this.userId,
      tipoPartida: this.gameMode,
      modoAcceso: this.accessType,
      participantesPermitidos: this.accessType === 'privada' ? this.selectedStudentIds : [],
      fechas: {
          creadaEn: new Date()
      }
    };

    if (this.gameMode === 'en_vivo') {
        gameData.configuracionEnvivo = {
            tiempoPorPreguntaSeg: this.timePerQuestion,
            mostrarRanking: this.showRanking,
            mezclarPreguntas: this.shuffleQuestions,
            mezclarRespuestas: this.shuffleAnswers,
            modoCalificacion: this.qualificationMode
        };
        gameData.estadoPartida = 'espera';
    } else { // examen
        if (!this.instantAccess && (!this.scheduledDate || !this.scheduledTime)) {
            this.alertService.warning('Fecha requerida', 'Por favor, selecciona una fecha y hora o marca la opción de acceso instantáneo.');
            return;
        }

        const scheduledDateTime = this.instantAccess ? new Date() : new Date(`${this.scheduledDate}T${this.scheduledTime}`);
        if (scheduledDateTime < new Date()) {
            this.alertService.warning('Fecha inválida', 'La fecha y hora programada no pueden ser en el pasado.');
            return;
        }

        gameData.configuracionExamen = {
            tiempoTotalMin: this.totalExamTime,
            programadaPara: scheduledDateTime,
            mezclarPreguntas: this.shuffleQuestions,
            mezclarRespuestas: this.shuffleAnswers
        };
        
        // Si es acceso inmediato, la marcamos como activa para que aparezca como iniciada
        gameData.estadoPartida = this.instantAccess ? 'activa' : 'espera';
        gameData.fechas.programadaPara = gameData.configuracionExamen.programadaPara;
        if (this.instantAccess) {
            gameData.inicioEn = scheduledDateTime;
        }
    }

    const action = this.isEditing 
        ? this.dashboardService.actualizarPartida(this.editId, gameData)
        : this.dashboardService.createGame(gameData);

    action.subscribe({
      next: (res) => {
        if (res) {
          const msg = this.isEditing ? '¡Partida actualizada con éxito!' : '¡Partida creada con éxito!';
          this.alertService.success('Completado', msg);
          
          if (this.gameMode === 'examen') {
            this.router.navigate(['/dashboard/professor']);
          } else {
            this.router.navigate([`/dashboard/professor/lobby/${res._id || this.editId}`]);
          }
        }
      },
      error: (err) => {
        console.error('Error al procesar partida:', err);
        this.alertService.error('Error del sistema', 'Hubo un problema al procesar la partida en el servidor.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard/professor']);
  }
}
