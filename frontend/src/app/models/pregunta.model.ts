export interface QuestionImport {
    pregunta: string;
    opciones: string[];
    respuesta_correcta: string;
    temas?: string[];
    dificultad?: number;
    isEditing?: boolean;
}

export interface FileMetadata {
    name: string;
    questionsCount: number;
    size: string;
}

export interface QuestionEdit {
    _id?: string;
    pregunta: string;
    opciones: string[];
    respuesta_correcta: string;
    temas: string[];
    dificultad: number;
    isNew?: boolean;
    isDeleted?: boolean;
}

// Interfaz genérica base para preguntas si se necesita en el futuro
export interface Pregunta {
    _id?: string;
    textoPregunta: string;
    opciones: {
        textoOpcion: string;
        esCorrecta: boolean;
    }[];
    respuestaCorrecta?: string; // Helper para frontend si se usa simplificado
    temas?: string[];
    dificultad?: number;
}
