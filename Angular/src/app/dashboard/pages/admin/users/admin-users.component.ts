import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/services/admin.service';
import { environment } from 'src/environments/environment';
import { DashboardService } from 'src/app/dashboard/services/dashboard.service';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
    selector: 'app-admin-users',
    templateUrl: './admin-users.component.html',
    styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
    users: any[] = [];
    filteredUsers: any[] = [];
    searchTerm: string = '';
    courseFilter: string = '';
    availableCourses: string[] = [];
    availableCoursesObj: any[] = [];
    availableCenters: any[] = [];
    loading: boolean = true;
    selectedUser: any = null;
    editingUser: any = null;
    editFormData: any = {};
    saving: boolean = false;
    serverUrl = environment.serverUrl;

    constructor(
        private adminService: AdminService,
        private alertService: AlertService
    ) { }

    ngOnInit(): void {
        this.loadUsers();
        this.loadAvailableCourses();
        this.loadAvailableCenters();
    }

    loadAvailableCourses(): void {
        this.adminService.getStats().subscribe({
            next: (res) => {
                if (res.config && res.config.cursos) {
                    this.availableCoursesObj = res.config.cursos.sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
                    this.availableCourses = this.availableCoursesObj.map(c => c.nombre);
                    this.extractAvailableCourses(); // Merge in case some are manually assigned but not in constants
                }
            }
        });
    }

    loadAvailableCenters(): void {
        this.adminService.getStats().subscribe({
            next: (res) => {
                if (res.config && res.config.centros) {
                    this.availableCenters = res.config.centros.sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
                }
            },
            error: (err) => {
                console.error('Error cargando centros:', err);
            }
        });
    }

    loadUsers(): void {
        this.loading = true;
        this.adminService.getUsers().subscribe({
            next: (res) => {
                this.users = res.data;
                this.extractAvailableCourses();
                this.filterUsers();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading users:', err);
                this.loading = false;
            }
        });
    }

    extractAvailableCourses(): void {
        // Extraer nombres únicos de cursos de los usuarios
        const foundCourses = this.users
            .map(u => this.getCourseName(u.curso))
            .filter((c, index, self) => c && self.indexOf(c) === index);

        // Combinar con los existentes y quitar duplicados
        const combined = Array.from(new Set([...this.availableCourses, ...foundCourses]));
        this.availableCourses = combined.filter(c => c).sort();
    }

    getCourseName(curso: any): string {
        if (!curso) return '';
        if (typeof curso === 'string') return curso;
        if (typeof curso === 'object' && curso.nombre) return curso.nombre;
        return '';
    }

    filterUsers(): void {
        const query = (this.searchTerm || '').toLowerCase().trim();
        const courseFilter = (this.courseFilter || '').toLowerCase().trim();

        this.filteredUsers = this.users.filter(u => {
            const matchesSearch = !query ||
                u.nombre.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query);

            // Comparar nombres de cursos (no objetos completos)
            const userCourseName = this.getCourseName(u.curso).toLowerCase().trim();
            const matchesCourse = !courseFilter || userCourseName === courseFilter;

            return matchesSearch && matchesCourse;
        });
    }

    viewDetail(user: any): void {
        this.editingUser = null; // Cerrar edición al ver detalle
        this.adminService.getUserDetail(user._id).subscribe({
            next: (res) => {
                this.selectedUser = res.data;
            },
            error: (err) => console.error('Error loading user detail:', err)
        });
    }

    deleteUser(user: any): void {
        this.alertService.confirm(
            'Eliminar Usuario',
            `¿Estás seguro de eliminar a ${user.nombre}? Esta acción no se puede deshacer.`,
            'Eliminar',
            'Cancelar',
            'warning'
        ).then(result => {
            if (result.isConfirmed) {
                this.adminService.deleteUser(user._id).subscribe({
                    next: () => {
                        this.alertService.success('Eliminado', 'Usuario eliminado correctamente');
                        this.users = this.users.filter(u => u._id !== user._id);
                        this.filterUsers();
                    },
                    error: (err) => this.alertService.error('Error', 'No se pudo eliminar al usuario: ' + (err.error?.mensaje || 'Error del servidor'))
                });
            }
        });
    }

    closeDetail(): void {
        this.selectedUser = null;
    }

    editUser(user: any): void {
        // Preparar datos para edición
        this.editFormData = {
            _id: user._id,
            nombre: user.nombre,
            email: user.email,
            idPortal: user.idPortal,
            rol: user.rol,
            centro: user.centro?._id || user.centro,
            curso: user.curso?._id || user.curso,
            asignaturas: user.asignaturas || [],
            activo: user.activo !== false // Default true si no está definido
        };
        this.editingUser = user;
    }

    cancelEdit(): void {
        this.editingUser = null;
        this.editFormData = {};
        this.saving = false;
    }

    saveUser(): void {
        if (!this.editFormData._id) return;

        this.saving = true;

        // Preparar datos para enviar (solo campos modificables)
        const updateData = {
            nombre: this.editFormData.nombre,
            email: this.editFormData.email,
            idPortal: this.editFormData.idPortal,
            rol: this.editFormData.rol,
            centro: this.editFormData.centro,
            curso: this.editFormData.curso,
            activo: this.editFormData.activo
        };

        this.adminService.updateUser(this.editFormData._id, updateData).subscribe({
            next: (res) => {
                this.loadUsers();
                this.cancelEdit();
                this.alertService.success('Actualizado', 'Usuario actualizado correctamente');
            },
            error: (err) => {
                console.error('Error updating user:', err);
                this.alertService.error('Error', 'No se pudo actualizar el usuario: ' + (err.error?.mensaje || 'Error del servidor'));
                this.saving = false;
            }
        });
    }

    getSubjectName(subj: any): string {
        return typeof subj === 'object' && subj !== null ? subj.nombre : subj;
    }
}
