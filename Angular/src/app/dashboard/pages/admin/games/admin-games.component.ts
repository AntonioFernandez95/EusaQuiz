import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/services/admin.service';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
    selector: 'app-admin-games',
    templateUrl: './admin-games.component.html',
    styleUrls: ['./admin-games.component.scss']
})
export class AdminGamesComponent implements OnInit {
    games: any[] = [];
    filteredGames: any[] = [];
    loading: boolean = true;
    isSaving: boolean = false;

    // Modales y Edición
    showConfigModal: boolean = false;
    selectedGame: any = null;

    // Filtros
    statusFilter: string = '';
    searchQuery: string = '';
    dateFilter: string = '';

    constructor(
        private adminService: AdminService,
        private alertService: AlertService
    ) { }

    ngOnInit(): void {
        this.loadGames();
    }

    loadGames(): void {
        this.loading = true;
        this.adminService.getGames().subscribe({
            next: (res) => {
                this.games = res.data;
                this.applyFilters();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading games:', err);
                this.loading = false;
            }
        });
    }

    applyFilters(): void {
        const query = (this.searchQuery || '').toLowerCase().trim();

        this.filteredGames = this.games.filter(g => {
            // Filtro de estado
            const matchesStatus = !this.statusFilter || g.estadoPartida === this.statusFilter;

            // Filtro de búsqueda (Cuestionario o Profesor)
            const matchesSearch = !query ||
                (g.idCuestionario?.titulo || '').toLowerCase().includes(query) ||
                (g.profesor?.nombre || '').toLowerCase().includes(query);

            // Filtro de fecha
            let matchesDate = true;
            if (this.dateFilter && g.fechas?.creadaEn) {
                const gameDate = new Date(g.fechas.creadaEn).toISOString().split('T')[0];
                matchesDate = gameDate === this.dateFilter;
            }

            return matchesStatus && matchesSearch && matchesDate;
        });
    }

    // Acciones
    openConfig(game: any): void {
        this.selectedGame = JSON.parse(JSON.stringify(game)); // Clonar para editar
        this.showConfigModal = true;
    }

    closeConfigModal(): void {
        this.showConfigModal = false;
        this.selectedGame = null;
    }

    saveConfig(): void {
        if (!this.selectedGame) return;

        this.isSaving = true;
        const updateData = {
            nombrePartida: this.selectedGame.nombrePartida,
            asignatura: this.selectedGame.asignatura,
            curso: this.selectedGame.curso,
            configuracionEnvivo: this.selectedGame.configuracionEnvivo,
            configuracionExamen: this.selectedGame.configuracionExamen
        };

        this.adminService.updateGame(this.selectedGame._id, updateData).subscribe({
            next: (res) => {
                this.alertService.success('Actualizado', 'Configuración actualizada correctamente');
                this.loadGames(); // Recargar lista
                this.closeConfigModal();
                this.isSaving = false;
            },
            error: (err) => {
                console.error('Error updating game:', err);
                this.alertService.error('Error', 'Error al actualizar la configuración');
                this.isSaving = false;
            }
        });
    }

    deleteGame(id: string): void {
        this.alertService.confirm(
            '¿Eliminar partida?',
            '¿Estás seguro de que deseas eliminar esta partida? Esta acción no se puede deshacer.',
            'Eliminar',
            'Cancelar',
            'warning'
        ).then(result => {
            if (result.isConfirmed) {
                this.adminService.deleteGame(id).subscribe({
                    next: () => {
                        this.alertService.success('Eliminado', 'Partida eliminada con éxito');
                        this.loadGames();
                    },
                    error: (err) => {
                        console.error('Error deleting game:', err);
                        this.alertService.error('Error', 'Error al eliminar la partida');
                    }
                });
            }
        });
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'activa': return 'bg-success';
            case 'espera': return 'bg-warning text-dark';
            case 'finalizada': return 'bg-secondary';
            default: return 'bg-info';
        }
    }
}
