import { Component, OnInit } from '@angular/core';
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
  userId: string = '';
  
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
          { name: 'DAM 1', subjects: config.asignaturas.DAM1 },
          { name: 'DAM 2', subjects: config.asignaturas.DAM2 }
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
