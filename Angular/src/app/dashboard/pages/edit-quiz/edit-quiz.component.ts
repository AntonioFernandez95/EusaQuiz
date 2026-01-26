import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { AlertService } from '../../../shared/services/alert.service';
import { environment } from '../../../../environments/environment';

interface QuestionEdit {
  _id?: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: string;
  temas: string[];
  dificultad: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

@Component({
  selector: 'app-edit-quiz',
  templateUrl: './edit-quiz.component.html',
  styleUrls: ['./edit-quiz.component.scss']
})
export class EditQuizComponent implements OnInit {
  userName: string = '';
  userInitials: string = '';
  userProfileImg: string = '';
  userId: string = '';
  private serverUrl = environment.serverUrl;

  // Datos del cuestionario (para visualización)
  quizId: string = '';
  quizTitle: string = '';
  quizSubject: string = '';
  quizDescription: string = '';
  quizCourse: string = '';

  // IDs internos (para guardado seguro)
  private quizSubjectId: string = '';
  private quizCourseId: string = '';
  private quizCentroId: string = '';

  // Preguntas
  questions: QuestionEdit[] = [];
  isLoading: boolean = true;
  isSaving: boolean = false;
  isGlobalEditing: boolean = false;

  // Modal para nueva pregunta
  showAddModal: boolean = false;
  newQuestion: QuestionEdit = {
    pregunta: '',
    opciones: ['', '', '', ''],
    respuesta_correcta: '',
    temas: [],
    dificultad: 1
  };

  // Modal confirmar eliminacion
  showDeleteModal: boolean = false;
  questionToDelete: QuestionEdit | null = null;
  questionToDeleteIndex: number = -1;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.nombre;
        // Consistente con el resto del sistema: usar avatar por defecto si no hay foto
        const hasValidPhoto = user.fotoPerfil && user.fotoPerfil !== 'null' && user.fotoPerfil !== 'undefined';
        this.userProfileImg = hasValidPhoto 
          ? `${this.serverUrl}/${user.fotoPerfil}` 
          : 'assets/img/default-avatar.png';
        this.userInitials = this.userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        this.userId = user.idPortal;
      }
    });

    this.quizId = this.route.snapshot.paramMap.get('id') || '';
    if (this.quizId) {
      this.loadQuizData();
    } else {
      this.alertService.error('Error', 'No se especificó el cuestionario a editar.');
      this.router.navigate(['/dashboard/professor']);
    }
  }

  loadQuizData(): void {
    this.isLoading = true;
    
    // Cargar datos del cuestionario
    this.dashboardService.getCuestionario(this.quizId).subscribe({
      next: (quiz) => {
        if (quiz) {
          this.quizTitle = quiz.titulo || '';
          this.quizDescription = quiz.descripcion || '';
          
          // Extraer nombre para los inputs del HTML y ID para el guardado
          this.quizSubject = quiz.asignatura?.nombre || (typeof quiz.asignatura === 'string' ? quiz.asignatura : '');
          this.quizSubjectId = quiz.asignatura?._id || (typeof quiz.asignatura === 'string' ? quiz.asignatura : '');
          
          this.quizCourse = quiz.curso?.nombre || (typeof quiz.curso === 'string' ? quiz.curso : '');
          this.quizCourseId = quiz.curso?._id || (typeof quiz.curso === 'string' ? quiz.curso : '');

          this.quizCentroId = quiz.centro?._id || (typeof quiz.centro === 'string' ? quiz.centro : '');

          this.loadQuestions();
        } else {
          this.alertService.error('Error', 'Cuestionario no encontrado.');
          this.router.navigate(['/dashboard/professor']);
        }
      },
      error: (err) => {
        console.error('Error cargando cuestionario:', err);
        this.alertService.error('Error', 'No se pudo cargar el cuestionario.');
        this.isLoading = false;
      }
    });
  }

  loadQuestions(): void {
    this.dashboardService.getQuestionsByCuestionario(this.quizId).subscribe({
      next: (preguntas) => {
        this.questions = preguntas.map((p: any) => {
          // Encontrar la respuesta correcta
          const correctOption = p.opciones?.find((o: any) => o.esCorrecta);
          const respuestaCorrecta = correctOption ? correctOption.textoOpcion : '';
          
          return {
            _id: p._id,
            pregunta: p.textoPregunta || '',
            opciones: p.opciones?.map((o: any) => o.textoOpcion) || ['', '', '', ''],
            respuesta_correcta: respuestaCorrecta,
            temas: p.temas || [],
            dificultad: p.dificultad || 1,
            isNew: false,
            isDeleted: false
          };
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando preguntas:', err);
        this.alertService.error('Error', 'No se pudieron cargar las preguntas.');
        this.isLoading = false;
      }
    });
  }

  toggleGlobalEdit(): void {
    this.isGlobalEditing = !this.isGlobalEditing;
  }

  // ========== Guardar cambios ==========
  saveAllChanges(): void {
    if (!this.quizTitle.trim()) {
      this.alertService.warning('Titulo requerido', 'El cuestionario debe tener un titulo.');
      return;
    }

    this.isSaving = true;

    // 1. Actualizar datos del cuestionario
    // Asegurar esquema estricto: idProfesor requerido, IDs opcionales como null si vacíos
    const quizData: any = {
      titulo: this.quizTitle,
      descripcion: this.quizDescription,
      idProfesor: this.userId, // Requerido por el schema
      centro: this.quizCentroId || null,
      asignatura: this.quizSubjectId || null,
      curso: this.quizCourseId || null
    };

    console.log('[EditQuiz] Guardando cuestionario payload:', quizData);

    this.dashboardService.updateCuestionario(this.quizId, quizData).subscribe({
      next: () => {
        // 2. Procesar preguntas (actualizar existentes, crear nuevas, eliminar marcadas)
        this.processQuestions();
      },
      error: (err) => {
        console.error('Error actualizando cuestionario:', err);
        this.alertService.error('Error', 'No se pudo actualizar el cuestionario.');
        this.isSaving = false;
      }
    });
  }

  processQuestions(): void {
    const promises: Promise<any>[] = [];

    this.questions.forEach((q, index) => {
      if (q.isDeleted && q._id) {
        // Eliminar pregunta existente
        promises.push(this.dashboardService.deleteQuestion(q._id).toPromise());
      } else if (q.isNew && !q.isDeleted) {
        // Crear nueva pregunta
        const newQ = this.formatQuestionForBackend(q, index);
        promises.push(this.dashboardService.createQuestion(newQ).toPromise());
      } else if (q._id && !q.isDeleted) {
        // Actualizar pregunta existente
        const updateQ = this.formatQuestionForBackend(q, index);
        promises.push(this.dashboardService.updateQuestion(q._id, updateQ).toPromise());
      }
    });

    Promise.all(promises)
      .then(() => {
        this.alertService.success('Guardado', 'Cuestionario actualizado correctamente.');
        this.isSaving = false;
        this.isGlobalEditing = false;
        
        // Redirigir automáticamente si hay un estado de retorno (estamos en flujo de creación de partida)
        const returnState = this.route.snapshot.queryParamMap.get('returnState');
        if (returnState) {
            this.router.navigate(['/dashboard/professor/create-game'], {
                queryParams: { returnState }
            });
        } else {
            // Comportamiento estándar: recargar para ver cambios
            this.loadQuizData();
        }
      })
      .catch((err) => {
        console.error('Error procesando preguntas:', err);
        this.alertService.error('Error', 'Hubo un problema al guardar algunas preguntas.');
        this.isSaving = false;
      });
  }

  formatQuestionForBackend(q: QuestionEdit, index: number): any {
    return {
      idCuestionario: this.quizId,
      textoPregunta: q.pregunta,
      tipoPregunta: 'unica',
      opciones: q.opciones.map((opt, i) => ({
        textoOpcion: opt,
        esCorrecta: opt === q.respuesta_correcta,
        orden: i + 1
      })),
      puntuacionMax: 1000,
      ordenPregunta: index + 1,
      temas: q.temas,
      dificultad: q.dificultad
    };
  }

  // ========== Agregar pregunta ==========
  openAddModal(): void {
    this.newQuestion = {
      pregunta: '',
      opciones: ['', '', '', ''],
      respuesta_correcta: '',
      temas: [],
      dificultad: 1
    };
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  addQuestion(): void {
    if (!this.newQuestion.pregunta.trim()) {
      this.alertService.warning('Pregunta requerida', 'Debes escribir el texto de la pregunta.');
      return;
    }

    const validOptions = this.newQuestion.opciones.filter(o => o.trim() !== '');
    if (validOptions.length < 2) {
      this.alertService.warning('Opciones requeridas', 'Debes escribir al menos 2 opciones de respuesta.');
      return;
    }

    if (!this.newQuestion.respuesta_correcta.trim()) {
      this.alertService.warning('Respuesta requerida', 'Debes indicar cual es la respuesta correcta.');
      return;
    }

    this.questions.push({
      ...this.newQuestion,
      opciones: validOptions,
      isNew: true,
      isDeleted: false
    });

    this.closeAddModal();
    this.alertService.success('Agregada', 'Pregunta agregada. Recuerda guardar los cambios.');
  }

  // ========== Eliminar pregunta ==========
  confirmDeleteQuestion(q: QuestionEdit, index: number): void {
    this.alertService.confirm(
        '¿Eliminar pregunta?',
        '¿Estás seguro de que quieres eliminar esta pregunta? Esta acción se aplicará al guardar los cambios.',
        'Eliminar',
        'Cancelar',
        'warning'
    ).then((result) => {
        if (result.isConfirmed) {
            this.questionToDelete = q;
            this.questionToDeleteIndex = index;
            this.deleteQuestion();
        }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.questionToDelete = null;
    this.questionToDeleteIndex = -1;
  }

  deleteQuestion(): void {
    if (this.questionToDeleteIndex >= 0) {
      const q = this.questions[this.questionToDeleteIndex];
      if (q.isNew) {
        // Si es nueva, simplemente la quitamos del array
        this.questions.splice(this.questionToDeleteIndex, 1);
      } else {
        // Si existe en BD, la marcamos para eliminar
        q.isDeleted = true;
      }
      this.alertService.success('Marcada', 'Pregunta marcada para eliminar. Guarda los cambios para confirmar.');
    }
    this.closeDeleteModal();
  }

  // ========== Utilidades ==========
  get visibleQuestions(): QuestionEdit[] {
    return this.questions.filter(q => !q.isDeleted);
  }

  trackByIndex(index: number, item: any): any {
    return index;
  }

  goBack(): void {
    const returnState = this.route.snapshot.queryParamMap.get('returnState');
    if (returnState) {
        this.router.navigate(['/dashboard/professor/create-game'], {
            queryParams: { returnState }
        });
    } else {
        this.router.navigate(['/dashboard/professor/create-game']);
    }
  }

  cancel(): void {
    this.router.navigate(['/dashboard/professor']);
  }
}
