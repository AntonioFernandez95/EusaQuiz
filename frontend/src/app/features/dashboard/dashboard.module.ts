import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { StudentDashboardComponent } from './pages/student-dashboard/student-dashboard.component';
import { ProfessorDashboardComponent } from './pages/professor-dashboard/professor-dashboard.component';
import { FormsModule } from '@angular/forms';
import { AssignSubjectsComponent } from './pages/assign-subjects/assign-subjects.component';
import { ImportQuestionsComponent } from './pages/import-questions/import-questions.component';
import { CreateGameComponent } from './pages/create-game/create-game.component';
import { EditQuizComponent } from './pages/edit-quiz/edit-quiz.component';
import { GameLobbyComponent } from './pages/game-lobby/game-lobby.component';
import { JoinGameComponent } from './pages/join-game/join-game.component';
import { StudentLobbyComponent } from './pages/student-lobby/student-lobby.component';
import { LiveGameComponent } from './pages/live-game/live-game.component';
import { GameMonitorComponent } from './pages/game-monitor/game-monitor.component';
import { GameRankingComponent } from './pages/game-ranking/game-ranking.component';
import { GameExamComponent } from './pages/game-exam/game-exam.component';
import { ProfessorReportsComponent } from './pages/professor-reports/professor-reports.component';
import { StudentReportsComponent } from './pages/student-reports/student-reports.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { AdminUsersComponent } from './pages/admin/users/admin-users.component';
import { AdminGamesComponent } from './pages/admin/games/admin-games.component';
import { AdminDataComponent } from './pages/admin/data/admin-data.component';

@NgModule({
  declarations: [
    StudentDashboardComponent,
    ProfessorDashboardComponent,
    AssignSubjectsComponent,
    ImportQuestionsComponent,
    CreateGameComponent,
    EditQuizComponent,
    GameLobbyComponent,
    JoinGameComponent,
    StudentLobbyComponent,
    LiveGameComponent,
    GameMonitorComponent,
    GameRankingComponent,
    GameExamComponent,
    ProfessorReportsComponent,
    StudentReportsComponent,
    AdminDashboardComponent,
    AdminUsersComponent,
    AdminGamesComponent,
    AdminDataComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    FormsModule
  ]
})
export class DashboardModule { }
