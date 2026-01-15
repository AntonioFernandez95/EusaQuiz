export interface User {
  _id: string;
  idPortal: string;
  nombre: string;
  email: string;
  rol: 'profesor' | 'alumno';
  curso: '1 DAM' | '2 DAM' | null;
  centro: 'Campus Camara' | 'EUSA';
  asignaturas?: string[];
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
  idPortal: string;
  nombre: string;
  email: string;
  password: string;
  rol: 'profesor' | 'alumno';
  curso: '1 DAM' | '2 DAM' | null;
  centro: 'Campus Camara' | 'EUSA';
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
