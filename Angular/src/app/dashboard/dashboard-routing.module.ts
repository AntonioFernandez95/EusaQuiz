import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentDashboardComponent } from './pages/student-dashboard/student-dashboard.component';
import { ProfessorDashboardComponent } from './pages/professor-dashboard/professor-dashboard.component';
import { AssignSubjectsComponent } from './pages/assign-subjects/assign-subjects.component';
import { ImportQuestionsComponent } from './pages/import-questions/import-questions.component';
import { CreateGameComponent } from './pages/create-game/create-game.component';
import { GameLobbyComponent } from './pages/game-lobby/game-lobby.component';
import { JoinGameComponent } from './pages/join-game/join-game.component';
import { StudentLobbyComponent } from './pages/student-lobby/student-lobby.component';
import { LiveGameComponent } from './pages/live-game/live-game.component';
import { GameRankingComponent } from './pages/game-ranking/game-ranking.component';
import { GameMonitorComponent } from './pages/game-monitor/game-monitor.component';
import { GameExamComponent } from './pages/game-exam/game-exam.component';
import { ProfessorReportsComponent } from './pages/professor-reports/professor-reports.component';
import { StudentReportsComponent } from './pages/student-reports/student-reports.component';

const routes: Routes = [
  {
    path: 'student',
    component: StudentDashboardComponent
  },
  {
    path: 'student/join-game',
    component: JoinGameComponent
  },
  {
    path: 'student/lobby/:id',
    component: StudentLobbyComponent
  },
  {
    path: 'student/game-live/:id',
    component: LiveGameComponent
  },
  {
    path: 'student/game-exam/:id',
    component: GameExamComponent
  },
  {
    path: 'student/game-ranking/:id',
    component: GameRankingComponent
  },
  {
    path: 'student/reports',
    component: StudentReportsComponent
  },
  {
    path: 'professor',
    component: ProfessorDashboardComponent
  },
  {
    path: 'professor/assign-subjects',
    component: AssignSubjectsComponent
  },
  {
    path: 'professor/import-questions',
    component: ImportQuestionsComponent
  },
  {
    path: 'professor/create-game',
    component: CreateGameComponent
  },
  {
    path: 'professor/edit-game/:id',
    component: CreateGameComponent
  },
  {
    path: 'professor/lobby/:id',
    component: GameLobbyComponent
  },
  {
    path: 'professor/game-monitor/:id',
    component: GameMonitorComponent
  },
  {
    path: 'professor/game-ranking/:id',
    component: GameRankingComponent
  },
  {
    path: 'professor/reports',
    component: ProfessorReportsComponent
  },
  {
    path: '',
    redirectTo: 'student',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
