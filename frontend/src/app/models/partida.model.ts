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
    timerText?: string;
    fechas?: {
        creadaEn?: string;
        finalizadaEn?: string;
    };
    configuracionExamen?: {
        tiempoTotalMin?: number;
    };
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

export interface PlayerLobby {
    socketId?: string;
    idAlumno: string;
    nombre: string;
    avatar?: string;
    correo?: string;
    status: 'conectado' | 'conectando' | 'no_conectado';
}
