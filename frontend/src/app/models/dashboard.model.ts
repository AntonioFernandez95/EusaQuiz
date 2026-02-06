import { ScheduledGame, RecentGame } from './partida.model';
import { QuizResult } from './resultado.model';

export interface SubjectProgress {
    subject: string;
    percentage: number;
    color?: string;
}

export interface ProfessorStats {
    participationRate: number;
    averageAccuracy: number;
}

export interface ProfessorDashboardData {
    recentGames: RecentGame[];
    scheduledGames: ScheduledGame[];
    stats: ProfessorStats;
}

export interface StudentDashboardData {
    scheduledGames: ScheduledGame[];
    resultsHistory: QuizResult[];
    subjectProgress: SubjectProgress[];
}

export interface SubjectGroup {
    curso: string;
    asignaturas: { id: string; name: string; }[];
}
