import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/services/admin.service';
import { environment } from 'src/environments/environment';
import { AlertService } from 'src/app/shared/services/alert.service';

interface Centro {
  _id: string;
  nombre: string;
  codigo: string;
}

interface Curso {
  _id: string;
  nombre: string;
  codigo: string;
  centro: string;
}

interface Asignatura {
  _id: string;
  nombre: string;
  curso: string;
}

@Component({
  selector: 'app-admin-data',
  templateUrl: './admin-data.component.html',
  styleUrls: ['./admin-data.component.scss']
})
export class AdminDataComponent implements OnInit {
  activeTab: 'centros' | 'cursos' | 'asignaturas' = 'centros';
  loading = true;

  // Datos
  centros: Centro[] = [];
  cursos: Curso[] = [];
  asignaturas: Asignatura[] = [];

  // Filtros Asignaturas
  subjectFilterName = '';
  subjectFilterCourse = '';

  // Formularios
  showCentroForm = false;
  showCursoForm = false;
  showAsignaturaForm = false;

  editingCentro: Centro | null = null;
  editingCurso: Curso | null = null;
  editingAsignatura: Asignatura | null = null;

  centroForm = { nombre: '', codigo: '' };
  cursoForm = { nombre: '', codigo: '', centro: '' };
  asignaturaForm = { nombre: '', curso: '' };

  saving = false;

  constructor(
    private adminService: AdminService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    console.log('[AdminData] Refrescando datos desde servidor...');
    this.loading = true;

    // Cargar datos en paralelo
    const requests = [
      this.adminService.getCentros(),
      this.adminService.getCursos(),
      this.adminService.getAsignaturas()
    ];

    Promise.all(requests.map(req => req.toPromise())).then(([centrosRes, cursosRes, asignaturasRes]) => {
      console.log('[AdminData] Datos recibidos:', {
        centros: centrosRes.data?.length || 0,
        cursos: cursosRes.data?.length || 0,
        asignaturas: asignaturasRes.data?.length || 0
      });
      console.log('[AdminData] Cursos detallados:', cursosRes.data);

      this.centros = [...(centrosRes.data || [])];
      this.cursos = [...(cursosRes.data || [])];
      this.asignaturas = [...(asignaturasRes.data || [])];
      this.loading = false;

      console.log('[AdminData] Datos actualizados en componente - cursos:', this.cursos.length);
      console.log('[AdminData] Primer curso de ejemplo:', this.cursos[0]);
    }).catch(err => {
      console.error('[AdminData] Error loading data:', err);
      this.loading = false;
    });
  }

  // Gestión de Centros
  createCentro(): void {
    this.editingCentro = null;
    this.centroForm = { nombre: '', codigo: '' };
    this.showCentroForm = true;
  }

  editCentro(centro: Centro): void {
    this.editingCentro = centro;
    this.centroForm = { nombre: centro.nombre, codigo: centro.codigo };
    this.showCentroForm = true;
  }

  saveCentro(): void {
    if (!this.centroForm.nombre || !this.centroForm.codigo) return;

    this.saving = true;

    const request = this.editingCentro
      ? this.adminService.updateCentro(this.editingCentro._id, this.centroForm)
      : this.adminService.createCentro(this.centroForm);

    request.subscribe({
      next: (res) => {
        if (this.editingCentro) {
          // Actualizar en la lista
          const index = this.centros.findIndex(c => c._id === this.editingCentro!._id);
          if (index !== -1) {
            this.centros[index] = res.data;
          }
        } else {
          // Agregar nuevo
          this.centros.push(res.data);
        }
        this.cancelCentroForm();
        this.saving = false;
        this.alertService.success('Centro Guardado', res.mensaje || 'Información actualizada correctamente');
      },
      error: (err) => {
        console.error('Error saving centro:', err);
        this.alertService.error('Error', 'Error al guardar centro: ' + (err.error?.mensaje || 'Error desconocido'));
        this.saving = false;
      }
    });
  }

  deleteCentro(centro: Centro): void {
    this.alertService.confirm(
      '¿Eliminar centro?',
      `Esta acción eliminará el centro "${centro.nombre}" y TODOS sus cursos y asignaturas asociadas. Esta acción no se puede deshacer.`,
      'Eliminar',
      'Cancelar',
      'warning'
    ).then(result => {
      if (result.isConfirmed) {
        this.adminService.deleteCentro(centro._id).subscribe({
          next: (res) => {
            console.log('[AdminData] Centro eliminado:', res.mensaje);
            this.alertService.success('Eliminado', 'Centro y dependencias eliminados correctamente');
            // Eliminar del array local y refrescar para actualizar relaciones
            this.centros = this.centros.filter(c => c._id !== centro._id);
            this.loadAllData(); // Necesario porque afecta cursos y asignaturas
          },
          error: (err) => {
            console.error('[AdminData] Error deleting centro:', err);
            this.alertService.error('Error', 'Error al eliminar centro: ' + (err.error?.mensaje || 'Error desconocido'));
          }
        });
      }
    });
  }

  cancelCentroForm(): void {
    this.showCentroForm = false;
    this.editingCentro = null;
    this.centroForm = { nombre: '', codigo: '' };
  }

  // Gestión de Cursos
  createCurso(): void {
    this.editingCurso = null;
    this.cursoForm = { nombre: '', codigo: '', centro: '' };
    this.showCursoForm = true;
  }

  editCurso(curso: any): void {
    this.editingCurso = curso;
    this.cursoForm = {
      nombre: curso.nombre,
      codigo: curso.codigo,
      centro: curso.centro?._id || curso.centro
    };
    this.showCursoForm = true;
  }

  saveCurso(): void {
    if (!this.cursoForm.nombre || !this.cursoForm.codigo || !this.cursoForm.centro) return;

    this.saving = true;

    const request = this.editingCurso
      ? this.adminService.updateCurso(this.editingCurso._id, this.cursoForm)
      : this.adminService.createCurso(this.cursoForm);

    request.subscribe({
      next: (res) => {
        console.log('[AdminData] Curso guardado exitosamente:', res);

        // Actualizar el curso específico en el array local
        if (this.editingCurso) {
          // Actualización: reemplazar el curso editado
          const index = this.cursos.findIndex(c => c._id === this.editingCurso!._id);
          if (index !== -1) {
            this.cursos[index] = res.data;
            // Forzar detección de cambios
            this.cursos = [...this.cursos];
          }
        } else {
          // Creación: agregar el nuevo curso
          this.cursos = [...this.cursos, res.data];
        }

        this.cancelCursoForm();
        this.saving = false;
        this.alertService.success('Curso Guardado', res.mensaje || 'Información actualizada correctamente');
      },
      error: (err) => {
        console.error('[AdminData] Error saving curso:', err);
        this.alertService.error('Error', 'Error al guardar curso: ' + (err.error?.mensaje || 'Error desconocido'));
        this.saving = false;
      }
    });
  }

  deleteCurso(curso: Curso): void {
    this.alertService.confirm(
      '¿Eliminar curso?',
      `¿Deseas eliminar el curso "${curso.nombre}" y TODAS sus asignaturas asociadas? Esta acción no se puede deshacer.`,
      'Eliminar',
      'Cancelar',
      'warning'
    ).then(result => {
      if (result.isConfirmed) {
        this.adminService.deleteCurso(curso._id).subscribe({
          next: (res) => {
            console.log('[AdminData] Curso eliminado:', res.mensaje);
            this.alertService.success('Eliminado', 'Curso y asignaturas eliminados correctamente');
            // Eliminar del array local
            this.cursos = this.cursos.filter(c => c._id !== curso._id);
          },
          error: (err) => {
            console.error('Error deleting curso:', err);
            this.alertService.error('Error', 'Error al eliminar curso: ' + (err.error?.mensaje || 'Error desconocido'));
          }
        });
      }
    });
  }

  cancelCursoForm(): void {
    this.showCursoForm = false;
    this.editingCurso = null;
    this.cursoForm = { nombre: '', codigo: '', centro: '' };
  }

  // Gestión de Asignaturas
  createAsignatura(): void {
    this.editingAsignatura = null;
    this.asignaturaForm = { nombre: '', curso: '' };
    this.showAsignaturaForm = true;
  }

  editAsignatura(asignatura: any): void {
    this.editingAsignatura = asignatura;
    this.asignaturaForm = {
      nombre: asignatura.nombre,
      curso: asignatura.curso?._id || asignatura.curso
    };
    this.showAsignaturaForm = true;
  }

  saveAsignatura(): void {
    if (!this.asignaturaForm.nombre || !this.asignaturaForm.curso) return;

    this.saving = true;

    const request = this.editingAsignatura
      ? this.adminService.updateAsignatura(this.editingAsignatura._id, this.asignaturaForm)
      : this.adminService.createAsignatura(this.asignaturaForm);

    request.subscribe({
      next: (res) => {
        console.log('[AdminData] Asignatura guardada exitosamente:', res);

        // Actualizar la asignatura específica en el array local
        if (this.editingAsignatura) {
          // Actualización: reemplazar la asignatura editada
          const index = this.asignaturas.findIndex(a => a._id === this.editingAsignatura!._id);
          if (index !== -1) {
            this.asignaturas[index] = res.data;
            // Forzar detección de cambios
            this.asignaturas = [...this.asignaturas];
          }
        } else {
          // Creación: agregar la nueva asignatura
          this.asignaturas = [...this.asignaturas, res.data];
        }

        this.cancelAsignaturaForm();
        this.saving = false;
        this.alertService.success('Asignatura Guardada', res.mensaje || 'Información actualizada correctamente');
      },
      error: (err) => {
        console.error('[AdminData] Error saving asignatura:', err);
        this.alertService.error('Error', 'Error al guardar asignatura: ' + (err.error?.mensaje || 'Error desconocido'));
        this.saving = false;
      }
    });
  }

  deleteAsignatura(asignatura: Asignatura): void {
    this.alertService.confirm(
      '¿Eliminar asignatura?',
      `¿Deseas eliminar la asignatura "${asignatura.nombre}"? Esta acción no se puede deshacer.`,
      'Eliminar',
      'Cancelar',
      'warning'
    ).then(result => {
      if (result.isConfirmed) {
        this.adminService.deleteAsignatura(asignatura._id).subscribe({
          next: (res) => {
            console.log('[AdminData] Asignatura eliminada');
            this.alertService.success('Eliminado', 'Asignatura eliminada correctamente');
            // Eliminar del array local
            this.asignaturas = this.asignaturas.filter(a => a._id !== asignatura._id);
          },
          error: (err) => {
            console.error('[AdminData] Error deleting asignatura:', err);
            this.alertService.error('Error', 'Error al eliminar asignatura: ' + (err.error?.mensaje || 'Error desconocido'));
          }
        });
      }
    });
  }

  cancelAsignaturaForm(): void {
    this.showAsignaturaForm = false;
    this.editingAsignatura = null;
    this.asignaturaForm = { nombre: '', curso: '' };
  }

  // Getters para filtrado
  get filteredAsignaturas(): Asignatura[] {
    return this.asignaturas.filter(a => {
      const matchName = a.nombre.toLowerCase().includes(this.subjectFilterName.toLowerCase());
      
      const courseId = typeof a.curso === 'object' ? (a.curso as any)._id : a.curso;
      const matchCourse = !this.subjectFilterCourse || courseId === this.subjectFilterCourse;
      
      return matchName && matchCourse;
    });
  }

  // Helpers
  getCentroNombre(centroId: any): string {
    if (!centroId) return 'N/A';
    // Si ya está populado y es un objeto
    if (typeof centroId === 'object' && centroId.nombre) return centroId.nombre;
    
    // Si es solo el ID, buscar en la lista local
    const centro = this.centros.find(c => c._id === centroId);
    return centro ? centro.nombre : 'Desconocido';
  }

  getCursoNombre(cursoId: any): string {
    if (!cursoId) return 'N/A';
    // Si ya está populado
    if (typeof cursoId === 'object' && cursoId.nombre) return cursoId.nombre;
    
    // Si es solo el ID
    const curso = this.cursos.find(c => c._id === cursoId);
    return curso ? curso.nombre : 'Desconocido';
  }
}