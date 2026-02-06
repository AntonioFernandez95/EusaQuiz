import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/core/services/admin.service';
import { AuthService } from 'src/app/features/auth/services/auth.service';
import { BrandingService } from 'src/app/core/services/branding.service';
import { environment } from 'src/environments/environment';
import { AlertService } from 'src/app/core/services/alert.service';

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
    activeView: 'overview' | 'users' | 'games' | 'data' | 'branding' = 'overview';
    serverUrl = environment.serverUrl;

    // Branding Form
    brandingForm = {
        nombreApp: '',
        logoFile: null as File | null
    };
    savingBranding: boolean = false;

    userName: string = '';
    userInitials: string = '';
    userProfileImg: string = '';

    constructor(
        private adminService: AdminService,
        private authService: AuthService,
        private alertService: AlertService,
        public brandingService: BrandingService
    ) { }

    ngOnInit(): void {
        this.loadStats();
        this.loadUserInfo();
        this.initBrandingForm();
    }

    initBrandingForm(): void {
        this.brandingForm.nombreApp = this.brandingService.getAppName();
    }

    loadUserInfo(): void {
        const user = this.authService.getCurrentUser();
        if (user) {
            this.userName = user.nombre;
            this.userProfileImg = user.fotoPerfil ? `${this.serverUrl}/${user.fotoPerfil}` : 'assets/img/default-avatar.png';
            this.userInitials = this.userName
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
        }
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

    setTab(tab: 'overview' | 'users' | 'games' | 'data' | 'branding'): void {
        this.activeView = tab;
    }

    logout(): void {
        this.authService.logout();
    }

    onLogoSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.brandingForm.logoFile = file;
        }
    }

    saveBranding(): void {
        this.savingBranding = true;
        this.adminService.updateBranding(this.brandingForm.nombreApp, this.brandingForm.logoFile || undefined).subscribe({
            next: (res) => {
                this.alertService.success('Branding Actualizado', 'Los cambios se aplicarán en toda la aplicación.');
                this.brandingService.updateState(res.data);
                this.savingBranding = false;
            },
            error: (err) => {
                console.error('Error saving branding:', err);
                this.alertService.error('Error', 'No se pudo actualizar el branding');
                this.savingBranding = false;
            }
        });
    }
}
