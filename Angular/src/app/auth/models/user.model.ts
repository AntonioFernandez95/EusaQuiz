// Interfaces para datos académicos (desde MongoDB)
export interface Centro {
  _id: string;
  nombre: string;
  codigo: string;
}

export interface Curso {
  _id: string;
  nombre: string;
  codigo: string;
  centro?: Centro | string;
}

export interface Asignatura {
  _id: string;
  nombre: string;
  curso?: Curso | string;
}

export interface User {
  _id: string;
  idPortal: string;
  nombre: string;
  email: string;
  rol: 'profesor' | 'alumno' | 'admin';
  curso: Curso | string | null;  // Puede ser objeto populado o ObjectId string
  centro: Centro | string;       // Puede ser objeto populado o ObjectId string
  asignaturas?: (Asignatura | string)[];
  activo?: boolean;
  ultimoAcceso?: Date;
  creadoEn?: Date;
  actualizadoEn?: Date;
  fotoPerfil?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  idPortal?: string;
  nombre: string;
  email: string;
  password: string;
  rol: 'profesor' | 'alumno';
  curso: string | null;  // ObjectId
  centro: string;        // ObjectId
}

export interface AuthResponse {
  ok: boolean;
  token?: string;
  user?: User;
  mensaje?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}
