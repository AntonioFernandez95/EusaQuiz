import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/services/admin.service';
import { environment } from 'src/environments/environment';
import { DashboardService } from 'src/app/dashboard/services/dashboard.service';

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
    loading: boolean = true;
    selectedUser: any = null;
    serverUrl = environment.serverUrl;

    constructor(private adminService: AdminService) { }

    ngOnInit(): void {
        this.loadUsers();
        this.loadAvailableCourses();
    }

    loadAvailableCourses(): void {
        this.adminService.getStats().subscribe({
            next: (res) => {
                if (res.config && res.config.cursos) {
                    this.availableCourses = res.config.cursos.sort();
                    this.extractAvailableCourses(); // Merge in case some are manually assigned but not in constants
                }
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
        const foundCourses = this.users
            .map(u => u.curso)
            .filter((c, index, self) => c && self.indexOf(c) === index);

        // Combinar con los existentes y quitar duplicados
        const combined = Array.from(new Set([...this.availableCourses, ...foundCourses]));
        this.availableCourses = combined.sort();
    }

    filterUsers(): void {
        const query = (this.searchTerm || '').toLowerCase().trim();

        this.filteredUsers = this.users.filter(u => {
            const matchesSearch = !query ||
                u.nombre.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query);
            const matchesCourse = this.courseFilter === '' || u.curso === this.courseFilter;
            return matchesSearch && matchesCourse;
        });
    }

    viewDetail(user: any): void {
        this.adminService.getUserDetail(user._id).subscribe({
            next: (res) => {
                this.selectedUser = res.data;
            },
            error: (err) => console.error('Error loading user detail:', err)
        });
    }

    deleteUser(user: any): void {
        if (confirm(`¿Estás seguro de eliminar a ${user.nombre}? Esta acción no se puede deshacer.`)) {
            this.adminService.deleteUser(user._id).subscribe({
                next: () => {
                    this.users = this.users.filter(u => u._id !== user._id);
                    this.filterUsers();
                },
                error: (err) => alert('Error al eliminar usuario: ' + err.error?.mensaje)
            });
        }
    }

    closeDetail(): void {
        this.selectedUser = null;
    }
}
