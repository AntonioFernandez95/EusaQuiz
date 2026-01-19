import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';

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
        
        // Cargar asignaturas seleccionadas si existen
        if (user.asignaturas) {
          user.asignaturas.forEach((s: string) => this.selectedSubjects.add(s));
        }
        
        this.loadAvailableSubjects();
      }
    });
  }

  loadAvailableSubjects(): void {
    this.isLoading = true;
    this.dashboardService.getConfigOptions().subscribe(config => {
      if (config && config.asignaturas) {
        this.availableSubjects = [
          { name: '1 DAM', subjects: config.asignaturas.DAM1 || [] },
          { name: '2 DAM', subjects: config.asignaturas.DAM2 || [] },
          { name: '1 DAW', subjects: config.asignaturas.DAW1 || [] },
          { name: '2 DAW', subjects: config.asignaturas.DAW2 || [] },
          { name: '1 ASIR', subjects: config.asignaturas.ASIR1 || [] },
          { name: '2 ASIR', subjects: config.asignaturas.ASIR2 || [] }
        ];
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
