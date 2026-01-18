import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { AlertService } from '../../../shared/services/alert.service';
import { environment } from '../../../../environments/environment';

interface QuestionImport {
  enunciado: string;
  opciones: string[];
  respuesta_correcta: string;
  isEditing?: boolean;
}

interface FileMetadata {
  name: string;
  questionsCount: number;
  size: string;
}

@Component({
  selector: 'app-import-questions',
  templateUrl: './import-questions.component.html',
  styleUrls: ['./import-questions.component.scss']
})
export class ImportQuestionsComponent implements OnInit {
  userName: string = '';
  userInitials: string = '';
  userProfileImg: string = '';
  userId: string = '';
  private serverUrl = environment.serverUrl;
  userCentro: string = '';
  
  fileLoaded: boolean = false;
  isGlobalEditing: boolean = false;
  isSaving: boolean = false;

  fileMetadata: FileMetadata | null = null;
  questions: QuestionImport[] = [];
  
  // Datos generales del examen
  examName: string = '';
  examSubject: string = '';

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
        this.userId = user.idPortal;
        this.userCentro = user.centro;
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  processFile(file: File): void {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      this.alertService.error('Archivo no válido', 'Por favor, selecciona un archivo JSON válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const content = JSON.parse(e.target.result);
        
        // El contenido puede ser un array o un objeto con propiedad 'preguntas'
        const rawQuestions = Array.isArray(content) ? content : (content.preguntas || []);
        
        if (rawQuestions.length === 0) {
          this.alertService.warning('Archivo vacío', 'No se detectaron preguntas en el archivo seleccionado.');
          return;
        }

        this.examName = content.nombre || file.name.replace('.json', '');
        this.examSubject = content.asignatura || 'General';

        this.fileLoaded = true;
        this.fileMetadata = {
          name: file.name,
          questionsCount: rawQuestions.length,
          size: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        };

        // Mapeamos TODAS las preguntas al formato interno
        this.questions = rawQuestions.map((q: any) => {
          let enunciado = q.enunciado || q.textoPregunta || q.texto || '';
          let opciones = Array.isArray(q.opciones) ? q.opciones : [];
          let respuesta_correcta = q.respuesta_correcta || '';

          // Fallback para respuesta correcta si viene en formato objeto antiguo
          if (!respuesta_correcta && opciones.length > 0 && typeof opciones[0] === 'object') {
            const correctOpt = opciones.find((o: any) => o.esCorrecta);
            respuesta_correcta = correctOpt ? (correctOpt.textoOpcion || correctOpt.texto) : '';
            opciones = opciones.map((o: any) => o.textoOpcion || o.texto);
          }

          return {
            enunciado,
            opciones,
            respuesta_correcta,
            isEditing: false
          };
        });
        
      } catch (err) {
        console.error('Error parseando el JSON:', err);
        this.alertService.error('Error de formato', 'No se pudo leer el archivo JSON. Asegúrate de que tenga una estructura correcta.');
      }
    };
    reader.readAsText(file);
  }

  toggleGlobalEdit(): void {
    this.isGlobalEditing = !this.isGlobalEditing;
  }

  importAll(): void {
    if (!this.examName) {
        this.alertService.warning('Nombre requerido', 'Por favor, asigna un nombre al cuestionario para su identificación.');
        return;
    }

    this.isSaving = true;
    const importData = {
      nombre: this.examName,
      asignatura: this.examSubject,
      centro: this.userCentro,
      idProfesor: this.userId,
      preguntas: this.questions
    };

    this.dashboardService.importExamen(importData).subscribe({
      next: (res) => {
        if (res) {
          this.alertService.success('¡Hecho!', 'Examen importado con éxito. Ya puedes crear una partida con él.');
          this.router.navigate(['/dashboard/professor']);
        }
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error importing exam:', err);
        this.alertService.error('Error', 'Hubo un problema al importar el examen en la base de datos.');
        this.isSaving = false;
      }
    });
  }

  cancel(): void {
    this.fileLoaded = false;
    this.fileMetadata = null;
    this.questions = [];
    this.isGlobalEditing = false;
  }

  trackByIndex(index: number, item: any): any {
    return index;
  }

  goBack(): void {
    this.router.navigate(['/dashboard/professor']);
  }
}
