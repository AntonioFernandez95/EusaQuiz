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
