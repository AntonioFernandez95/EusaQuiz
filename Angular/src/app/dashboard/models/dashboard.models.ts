export interface ScheduledGame {
  _id: string;
  nombrePartida?: string;
  pin: string;
  idCuestionario: {
    _id: string;
    titulo: string;
    descripcion: string;
    curso?: string;
    asignatura?: string;
  };
  curso?: string;
  asignatura?: string;
  fechaProgramada?: string;
  tipoPartida?: string;
  estado: 'espera' | 'jugando' | 'finalizada';
}

export interface QuizResult {
  _id: string;
  idPartida: {
    _id: string;
    nombrePartida?: string;
    idCuestionario: {
      titulo: string;
      categoria?: string;
      curso?: string;
      asignatura?: string;
    };
    curso?: string;
    asignatura?: string;
    finalizadaEn?: string;
  };
  puntuacionTotal: number;
  totalPreguntas: number;
  respuestasCorrectas: number;
  porcentaje: number;
}

export interface SubjectProgress {
  subject: string;
  percentage: number;
  color?: string;
}

export interface ProfessorStats {
  participationRate: number;
  averageAccuracy: number;
}

export interface RecentGame {
  _id: string;
  nombrePartida?: string;
  idCuestionario: {
    titulo: string;
    asignatura?: string;
    curso?: string;
  };
  curso?: string;
  asignatura?: string;
  numAlumnos: number;
  aciertosPorcentaje: number;
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
