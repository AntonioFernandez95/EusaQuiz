import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { User, Curso } from '../../../auth/models/user.model';

interface SubjectGroup {
  name: string;
  subjects: string[];
}

@Component({
  selector: 'app-assign-subjects',
  templateUrl: './assign-subjects.component.html',
  styleUrls: ['./assign-subjects.component.scss']
})
export class AssignSubjectsComponent implements OnInit {
  userName: string = '';
  userInitials: string = '';
  userProfileImg: string = '';
  userId: string = '';
  userCursoId: string = '';       // ObjectId del curso
  userCursoCodigo: string = '';   // Código del curso del profesor (ej: DAM1, DAM2)
  userCursoNombre: string = '';   // Nombre del curso para mostrar
  private serverUrl = environment.serverUrl;
  
  availableSubjects: SubjectGroup[] = [];
  selectedSubjects: Set<string> = new Set();
  
  isLoading = true;
  isSaving = false;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.nombre;
        this.userId = user._id;
        this.userProfileImg = user.fotoPerfil ? `${this.serverUrl}/${user.fotoPerfil}` : 'assets/img/default-avatar.png';
        this.userInitials = this.userName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        
        // Obtener el código del curso del profesor
        this.extractUserCurso(user);
        
        // Cargar asignaturas seleccionadas si existen
        if (user.asignaturas) {
          user.asignaturas.forEach((s) => {
            // s puede ser un objeto Asignatura o un string (ObjectId)
            const nombre = typeof s === 'object' && s !== null ? s.nombre : s;
            if (nombre) this.selectedSubjects.add(nombre);
          });
        }
        
        this.loadAvailableSubjects();
      }
    });
  }

  /**
   * Extrae el código y nombre del curso del usuario
   */
  private extractUserCurso(user: User): void {
    if (user.curso) {
      if (typeof user.curso === 'object' && user.curso !== null) {
        // Curso está poblado como objeto
        const curso = user.curso as Curso;
        this.userCursoId = curso._id || '';
        this.userCursoCodigo = curso.codigo || '';
        this.userCursoNombre = curso.nombre || '';
      } else {
        // Curso es un string (ObjectId) - guardamos el ID para buscarlo después
        this.userCursoId = user.curso as string;
        this.userCursoCodigo = '';
        this.userCursoNombre = '';
      }
    }
    console.log('[AssignSubjects] extractUserCurso - Usuario curso:', { 
      id: this.userCursoId, 
      codigo: this.userCursoCodigo, 
      nombre: this.userCursoNombre,
      rawCurso: user.curso
    });
  }

  loadAvailableSubjects(): void {
    this.isLoading = true;
    this.dashboardService.getConfigOptions().subscribe(config => {
      console.log('[AssignSubjects] Config recibida:', config);
      
      if (config) {
        // Si tenemos el ID del curso pero no el código, buscarlo en la lista de cursos
        if (this.userCursoId && !this.userCursoCodigo && config.cursos) {
          console.log('[AssignSubjects] Buscando curso por ID:', this.userCursoId);
          console.log('[AssignSubjects] Cursos disponibles:', config.cursos);
          
          // Comparar como strings para evitar problemas de tipo
          const cursoEncontrado = config.cursos.find((c: any) => 
            String(c._id) === String(this.userCursoId)
          );
          
          if (cursoEncontrado) {
            this.userCursoCodigo = cursoEncontrado.codigo;
            this.userCursoNombre = cursoEncontrado.nombre;
            console.log('[AssignSubjects] Curso encontrado en config:', cursoEncontrado);
          } else {
            console.log('[AssignSubjects] Curso NO encontrado en config.cursos');
          }
        }

        if (config.asignaturas) {
          // Si el profesor tiene un curso asignado, solo mostrar las asignaturas de ese curso
          if (this.userCursoCodigo) {
            const subjects = config.asignaturas[this.userCursoCodigo] || [];
            this.availableSubjects = [
              { name: this.userCursoNombre || this.userCursoCodigo, subjects }
            ];
            console.log('[AssignSubjects] Mostrando asignaturas de:', this.userCursoCodigo, subjects);
          } else {
            // Si no tiene curso asignado, mostrar todas las asignaturas
            console.log('[AssignSubjects] Sin curso asignado, mostrando todas las asignaturas');
            this.availableSubjects = [
              { name: '1 DAM', subjects: config.asignaturas.DAM1 || [] },
              { name: '2 DAM', subjects: config.asignaturas.DAM2 || [] },
              { name: '1 DAW', subjects: config.asignaturas.DAW1 || [] },
              { name: '2 DAW', subjects: config.asignaturas.DAW2 || [] },
              { name: '1 ASIR', subjects: config.asignaturas.ASIR1 || [] },
              { name: '2 ASIR', subjects: config.asignaturas.ASIR2 || [] }
            ];
          }
        }
      }
      this.isLoading = false;
    });
  }

  toggleSubject(subject: string): void {
    if (this.selectedSubjects.has(subject)) {
      this.selectedSubjects.delete(subject);
    } else {
      this.selectedSubjects.add(subject);
    }
  }

  isSelected(subject: string): boolean {
    return this.selectedSubjects.has(subject);
  }

  saveSubjects(): void {
    this.isSaving = true;
    const subjectsArray = Array.from(this.selectedSubjects);
    
    this.dashboardService.updateUserSubjects(this.userId, subjectsArray).subscribe({
      next: (res) => {
        if (res) {
          // Actualizamos el usuario en el servicio de autenticación para que el dashboard lo vea
          this.authService.updateUserInSession(res);
          this.router.navigate(['/dashboard/professor']);
        }
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error saving subjects:', err);
        this.isSaving = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/professor']);
  }
}
