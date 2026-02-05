import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../../auth/services/auth.service';
import { AlertService } from '../../../shared/services/alert.service';
import { environment } from '../../../../environments/environment';
import { BrandingService } from 'src/app/services/branding.service';

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
  shuffleQuestions: boolean = true;
  shuffleAnswers: boolean = true;

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

  // RAW Data for filtering
  private allConfigSubjects: { name: string, course: string }[] = [];
  private configCursos: any[] = [];
  private alertsShown = false;

  // Control de asignaturas del profesor
  userAssignedSubjects: string[] = [];
  userCourse: string = '';
  hasNoSubjectsAssigned: boolean = false;
  userRole: string = '';

  // Control del dropdown de cuestionarios y modales
  showQuizDropdown: boolean = false;
  showDeleteModal: boolean = false;
  quizToDelete: any = null;

  // HostListener para cerrar dropdown al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.showQuizDropdown) {
      const quizSelector = this.elementRef.nativeElement.querySelector('.quiz-selector');
      if (quizSelector && !quizSelector.contains(event.target)) {
        this.showQuizDropdown = false;
      }
    }
  }
  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private elementRef: ElementRef,
    public brandingService: BrandingService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.nombre;
        this.userProfileImg = user.fotoPerfil ? `${this.serverUrl}/${user.fotoPerfil}` : 'assets/img/default-avatar.png';
        this.userInitials = this.userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        this.userId = user.idPortal;
        this.userRole = user.rol;
        
        // Guardar asignaturas asignadas del profesor
        // Las asignaturas pueden ser objetos o strings
        this.userAssignedSubjects = (user.asignaturas || []).map(s => 
          typeof s === 'object' && s !== null ? s.nombre : s
        ).filter(s => !!s) as string[];
        this.hasNoSubjectsAssigned = this.userAssignedSubjects.length === 0;

        // Para profesores con múltiples cursos: usar el curso activo seleccionado
        const userAny = user as any;
        if (user.rol === 'profesor' && userAny.cursos && userAny.cursos.length > 0) {
          // Inicializar curso activo si no existe
          this.authService.initializeActiveCourse(user);
          const activeCourse = this.authService.getActiveCourse();
          if (activeCourse) {
            this.userCourse = typeof activeCourse === 'object' ? activeCourse.nombre : activeCourse;
          }
        } else {
          // Fallback al curso singular
          const cursoObj = user.curso as any;
          this.userCourse = (cursoObj && typeof cursoObj === 'object') ? cursoObj.nombre : (cursoObj || '');
        }
        
        this.refreshAvailableSubjects();
        
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
        const daw1 = (config.asignaturas.DAW1 || []).map((s: string) => ({ name: s, course: '1 DAW' }));
        const daw2 = (config.asignaturas.DAW2 || []).map((s: string) => ({ name: s, course: '2 DAW' }));
        const asir1 = (config.asignaturas.ASIR1 || []).map((s: string) => ({ name: s, course: '1 ASIR' }));
        const asir2 = (config.asignaturas.ASIR2 || []).map((s: string) => ({ name: s, course: '2 ASIR' }));
        
        this.allConfigSubjects = [...dam1, ...dam2, ...daw1, ...daw2, ...asir1, ...asir2];
        this.configCursos = config.cursos || [];
        this.qualificationModes = config.modosCalificacion || ['velocidad_precision'];

        this.refreshAvailableSubjects();

        // Restaurar estado si volvemos de edición
        const stateStr = this.route.snapshot.queryParamMap.get('returnState');
        if (stateStr) {
          try {
            const state = JSON.parse(stateStr);
            this.restoreFormState(state);
          } catch (e) {
            console.error('Error restaurando estado:', e);
          }
        }
      }
    });
  }

  refreshAvailableSubjects(): void {
    // 1. Si no tenemos los datos del config o del usuario aún, salir
    if (this.allConfigSubjects.length === 0 || !this.userId) return;

    // 2. Intentar resolver el nombre del curso si this.userCourse parece un ID
    if (this.userCourse && /^[0-9a-fA-F]{24}$/.test(this.userCourse)) {
      const cursoEncontrado = this.configCursos.find(c => c._id === this.userCourse);
      if (cursoEncontrado) {
        this.userCourse = cursoEncontrado.nombre;
        console.log('[CreateGame] Curso resuelto por ID:', this.userCourse);
      }
    }

    // 3. Filtrar por asignaturas asignadas al profesor Y por su curso actual
    if (this.userAssignedSubjects.length > 0) {
      this.availableSubjects = this.allConfigSubjects.filter(s => 
        this.userAssignedSubjects.includes(s.name) && 
        (!this.userCourse || s.course === this.userCourse)
      );
    } else {
      this.availableSubjects = [];
    }

    // 4. Lógica de Alertas (Solo si es profesor y no se han mostrado)
    if (this.userRole === 'profesor' && !this.alertsShown && !this.isEditing) {
      if (this.hasNoSubjectsAssigned) {
        this.alertService.warning(
          'Sin asignaturas asignadas',
          'Contacta con el administrador para que te asigne los módulos antes de crear una partida.'
        );
        this.alertsShown = true;
      } else if (this.availableSubjects.length === 0 && this.userAssignedSubjects.length > 0) {
        // Tiene asignaturas pero ninguna coincide con su curso
        this.alertService.warning(
          'Sin asignaturas para el curso actual',
          `Tienes asignaturas asignadas pero ninguna pertenece a tu curso actual: "${this.userCourse || 'Sin curso'}".`
        );
        this.alertsShown = true;
      }
    }
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
    // Validar que el profesor tenga asignaturas asignadas (solo para profesores)
    if (this.userRole === 'profesor' && this.hasNoSubjectsAssigned) {
      this.alertService.warning(
        'Sin asignaturas asignadas',
        'Contacta con el administrador para que te asigne los módulos antes de crear una partida.'
      );
      return;
    }

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

  // ========== Métodos para el dropdown de cuestionarios ==========

  toggleQuizDropdown(): void {
    this.showQuizDropdown = !this.showQuizDropdown;
  }

  selectQuiz(quizId: string): void {
    this.selectedQuizId = quizId;
    this.showQuizDropdown = false;
  }

  getSelectedQuizTitle(): string {
    const quiz = this.availableQuizzes.find(q => q._id === this.selectedQuizId);
    return quiz ? quiz.titulo : '';
  }

  // ========== Lógica de Persistencia de Estado ==========

  private getFormState(): any {
    return {
      gameName: this.gameName,
      selectedSubject: this.selectedSubject,
      timePerQuestion: this.timePerQuestion,
      selectedQuizId: this.selectedQuizId,
      gameMode: this.gameMode,
      totalExamTime: this.totalExamTime,
      accessType: this.accessType,
      qualificationMode: this.qualificationMode,
      showRanking: this.showRanking,
      shuffleQuestions: this.shuffleQuestions,
      shuffleAnswers: this.shuffleAnswers,
      scheduledDate: this.scheduledDate,
      scheduledTime: this.scheduledTime,
      instantAccess: this.instantAccess,
      selectedStudentIds: this.selectedStudentIds,
      editId: this.editId,
      isEditing: this.isEditing
    };
  }

  private restoreFormState(state: any): void {
    if (!state) return;
    this.gameName = state.gameName || '';
    this.selectedSubject = state.selectedSubject || '';
    this.timePerQuestion = state.timePerQuestion || 30;
    this.selectedQuizId = state.selectedQuizId || '';
    this.gameMode = state.gameMode || 'en_vivo';
    this.totalExamTime = state.totalExamTime || 60;
    this.accessType = state.accessType || 'publica';
    this.qualificationMode = state.qualificationMode || 'velocidad_precision';
    this.showRanking = state.showRanking !== undefined ? state.showRanking : true;
    this.shuffleQuestions = state.shuffleQuestions !== undefined ? state.shuffleQuestions : true;
    this.shuffleAnswers = state.shuffleAnswers !== undefined ? state.shuffleAnswers : true;
    this.scheduledDate = state.scheduledDate || '';
    this.scheduledTime = state.scheduledTime || '';
    this.instantAccess = state.instantAccess !== undefined ? state.instantAccess : false;
    this.selectedStudentIds = state.selectedStudentIds || [];
    this.editId = state.editId || '';
    this.isEditing = state.isEditing || false;

    if (this.selectedSubject) {
        this.onSubjectChange();
    }
  }

  // ========== Métodos para editar cuestionario ==========

  openEditQuizModal(quiz: any, event: Event): void {
    event.stopPropagation();
    this.showQuizDropdown = false;
    
    // Serializar estado actual
    const state = JSON.stringify(this.getFormState());
    
    // Navegar a la página de edición pasando el estado en queryParams
    this.router.navigate(['/dashboard/professor/edit-quiz', quiz._id], {
      queryParams: { returnState: state }
    });
  }

  // ========== Métodos para eliminar cuestionario ==========

  confirmDeleteQuiz(quiz: any, event: Event): void {
    event.stopPropagation();
    this.quizToDelete = quiz;
    this.showDeleteModal = true;
    this.showQuizDropdown = false;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.quizToDelete = null;
  }

  deleteQuiz(): void {
    if (!this.quizToDelete) return;

    this.dashboardService.deleteCuestionario(this.quizToDelete._id).subscribe({
      next: (res) => {
        if (res) {
          this.alertService.success('Eliminado', 'Cuestionario eliminado correctamente.');
          // Si el cuestionario eliminado era el seleccionado, limpiar selección
          if (this.selectedQuizId === this.quizToDelete._id) {
            this.selectedQuizId = '';
          }
          this.loadQuizzes(); // Recargar lista
          this.closeDeleteModal();
        }
      },
      error: (err) => {
        console.error('Error eliminando cuestionario:', err);
        this.alertService.error('Error', 'No se pudo eliminar el cuestionario.');
      }
    });
  }
}
