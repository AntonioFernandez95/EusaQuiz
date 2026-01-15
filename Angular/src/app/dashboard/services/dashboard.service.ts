import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ScheduledGame, QuizResult, SubjectProgress } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las partidas pendientes para un alumno
   */
  getScheduledGames(idAlumno: string): Observable<ScheduledGame[]> {
    return this.http.get<{ok: boolean, data: ScheduledGame[]}>(`${this.apiUrl}/partidas/pendientes/${idAlumno}`)
      .pipe(map(res => res.ok ? res.data : []));
  }

  /**
   * Obtiene el historial de participaciones del alumno
   */
  getResultsHistory(idAlumno: string): Observable<QuizResult[]> {
    return this.http.get<{ok: boolean, data: any[]}>(`${this.apiUrl}/participaciones/historial/${idAlumno}`)
      .pipe(
        map(res => {
          if (!res.ok) return [];
          return res.data.map(item => ({
            ...item,
            porcentaje: (item.respuestasCorrectas / item.totalPreguntas) * 100 || 0
          }));
        })
      );
  }

  /**
   * Calcula el progreso por asignatura basado en el historial
   */
  getSubjectProgress(history: QuizResult[]): SubjectProgress[] {
    const subjects: Record<string, { total: number, count: number }> = {};
    
    history.forEach(res => {
      const subject = res.idPartida.idCuestionario.categoria || 'General';
      if (!subjects[subject]) {
        subjects[subject] = { total: 0, count: 0 };
      }
      subjects[subject].total += res.porcentaje;
      subjects[subject].count += 1;
    });

    return Object.keys(subjects).map(key => ({
      subject: key,
      percentage: Math.round(subjects[key].total / subjects[key].count)
    }));
  }

  /**
   * Obtiene las partidas recientes creadas por un profesor
   */
  getRecentGames(idProfesor: string): Observable<any[]> {
    return this.http.get<{ok: boolean, data: any[]}>(`${this.apiUrl}/partidas?idProfesor=${idProfesor}&estado=finalizada`)
      .pipe(map(res => res.ok ? res.data : []));
  }

  /**
   * Obtiene las partidas programadas creadas por un profesor
   */
  getScheduledGamesProfessor(idProfesor: string): Observable<any[]> {
    return this.http.get<{ok: boolean, data: any[]}>(`${this.apiUrl}/partidas?idProfesor=${idProfesor}&estado=espera`)
      .pipe(map(res => res.ok ? res.data : []));
  }

  /**
   * Obtiene las estadísticas globales para un profesor
   */
  getProfessorStats(idProfesor: string): Observable<any> {
    return this.getRecentGames(idProfesor).pipe(
      map(games => {
        if (games.length === 0) return { participationRate: 0, averageAccuracy: 0 };
        return {
          participationRate: 0,
          averageAccuracy: 0
        };
      })
    );
  }

  /**
   * Obtiene la configuración global con las asignaturas disponibles
   */
  getConfigOptions(): Observable<any> {
    return this.http.get<{ok: boolean, data: any}>(`${this.apiUrl}/partidas/config/opciones`)
      .pipe(map(res => res.ok ? res.data : null));
  }

  /**
   * Actualiza las asignaturas de un profesor
   */
  updateUserSubjects(userId: string, subjects: string[]): Observable<any> {
    return this.http.put<{ok: boolean, data: any}>(`${this.apiUrl}/usuarios/${userId}`, { asignaturas: subjects })
      .pipe(map(res => res.ok ? res.data : null));
  }
  /**
   * Importa un examen completo (Cuestionario + Preguntas)
   */
  importExamen(data: any): Observable<any> {
    return this.http.post<{ok: boolean, data: any}>(`${this.apiUrl}/import/examen`, data)
      .pipe(map(res => res.ok ? res.data : null));
  }
  /**
   * Obtiene los cuestionarios de un profesor
   */
  getProfessorQuizzes(idProfesor: string): Observable<any[]> {
    return this.http.get<{ok: boolean, data: any[]}>(`${this.apiUrl}/cuestionarios/profesor/${idProfesor}`)
      .pipe(map(res => res.ok ? res.data : []));
  }

  /**
   * Crea una nueva partida
   */
  createGame(gameData: any): Observable<any> {
    return this.http.post<{ok: boolean, data: any}>(`${this.apiUrl}/partidas`, gameData)
      .pipe(map(res => res.ok ? res.data : null));
  }

  /**
   * Obtiene el detalle de una partida
   */
  getDetallePartida(id: string): Observable<any> {
    return this.http.get<{ok: boolean, data: any}>(`${this.apiUrl}/partidas/${id}`)
      .pipe(map(res => res.ok ? res.data : null));
  }

  /**
   * Actualiza una partida existente
   */
  actualizarPartida(id: string, gameData: any): Observable<any> {
    return this.http.put<{ok: boolean, data: any}>(`${this.apiUrl}/partidas/${id}`, gameData)
      .pipe(map(res => res.ok ? res.data : null));
  }

  /**
   * Inicia una partida manualmente (solo En Vivo)
   */
  iniciarPartida(id: string): Observable<any> {
    return this.http.put<{ok: boolean, data: any}>(`${this.apiUrl}/partidas/iniciar/${id}`, {})
      .pipe(map(res => res.ok ? res.data : null));
  }

  /**
   * Finaliza una partida manualmente
   */
  finalizarPartida(id: string): Observable<any> {
    return this.http.put<{ok: boolean}>(`${this.apiUrl}/partidas/finalizar/${id}`, {})
      .pipe(map(res => res.ok));
  }

  /**
   * Une a un alumno a una partida mediante PIN
   */
  unirseAPartida(pin: string, idAlumno: string): Observable<any> {
    return this.http.post<{ok: boolean, data: any}>(`${this.apiUrl}/partidas/unirse/${pin}`, { idAlumno })
      .pipe(map(res => res.ok ? res.data : null));
  }

  /**
   * Envía una respuesta de un alumno
   */
  enviarRespuesta(payload: any): Observable<any> {
    return this.http.post<{ok: boolean, data: any}>(`${this.apiUrl}/partidas/responder`, payload)
      .pipe(map(res => res.ok ? res.data : null));
  }

  /**
   * Elimina una partida
   */
  deleteGame(id: string): Observable<any> {
    return this.http.delete<{ok: boolean, data: any}>(`${this.apiUrl}/partidas/${id}`)
      .pipe(map(res => res.ok ? res.data : null));
  }

  /**
   * Obtiene la lista de todos los alumnos
   */
  getStudents(): Observable<any[]> {
    return this.http.get<{ok: boolean, data: any[]}>(`${this.apiUrl}/usuarios?rol=alumno`)
      .pipe(map(res => res.ok ? res.data : []));
  }

  /**
   * Descarga el reporte de partida en formato PDF
   */
  downloadReportPDF(idPartida: string, idAlumno?: string): Observable<Blob> {
    let url = `${this.apiUrl}/partidas/${idPartida}/reporte?formato=pdf`;
    if (idAlumno) {
      url += `&idAlumno=${idAlumno}`;
    }
    return this.http.get(url, { responseType: 'blob' });
  }

  /**
   * Obtiene las preguntas de un examen (modo programado/examen)
   */
  getExamQuestions(idPartida: string): Observable<any[]> {
    return this.http.get<{ok: boolean, data: any[]}>(`${this.apiUrl}/partidas/examen/${idPartida}/preguntas`)
      .pipe(map(res => res.ok ? res.data : []));
  }

  /**
   * Obtiene el progreso de un alumno en una partida
   */
  getMiProgreso(idPartida: string, idAlumno: string): Observable<any> {
    return this.http.get<{ok: boolean, data: any}>(`${this.apiUrl}/participaciones/progreso/${idPartida}/${idAlumno}`)
      .pipe(map(res => res.ok ? res.data : null));
  }

  /**
   * Finaliza el examen para el alumno
   */
  finalizarExamen(idPartida: string, idAlumno: string): Observable<any> {
    return this.http.post<{ok: boolean, data: any}>(`${this.apiUrl}/partidas/finalizar-examen`, { idPartida, idAlumno })
      .pipe(map(res => res.ok ? res.data : null));
  }
}
