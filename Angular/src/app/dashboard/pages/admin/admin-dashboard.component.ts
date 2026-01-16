import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/services/admin.service';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-admin-dashboard',
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
    stats: any = {
        totalUsuarios: 0,
        totalPartidas: 0,
        partidasActivas: 0
    };
    usuariosRecientes: any[] = [];
    loading: boolean = true;
    activeView: 'overview' | 'users' | 'games' = 'overview';
    serverUrl = environment.serverUrl;

    constructor(private adminService: AdminService) { }

    ngOnInit(): void {
        this.loadStats();
    }

    loadStats(): void {
        this.loading = true;
        this.adminService.getStats().subscribe({
            next: (res) => {
                this.stats = res.stats;
                this.usuariosRecientes = res.usuariosRecientes;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading stats:', err);
                this.loading = false;
            }
        });
    }

    setTab(tab: 'overview' | 'users' | 'games'): void {
        this.activeView = tab;
    }
}
