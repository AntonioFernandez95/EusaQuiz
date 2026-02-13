import { Centro, Asignatura, Curso } from './user.model';

export interface Cuestionario {
    _id: string;
    titulo: string;
    descripcion?: string;
    idProfesor?: string;
    centro?: Centro | string;
    asignatura?: Asignatura | string;
    curso?: Curso | string;
    categoria?: string; // Legacy support
    preguntas?: any[]; // Identificamos que a veces viene populated
}
