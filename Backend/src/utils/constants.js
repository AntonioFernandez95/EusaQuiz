/**
 * Constantes de la aplicación
 * 
 * NOTA: Los datos de CENTROS, CURSOS y ASIGNATURAS ahora están en MongoDB
 * Ver: /api/datos-academicos para obtenerlos dinámicamente
 */
module.exports = {
    ROLES: {
        PROFESOR: 'profesor',
        ALUMNO: 'alumno',
        ADMIN: 'admin',
    },
    ESTADOS_PARTIDA: {
        ESPERA: 'espera',
        ACTIVA: 'activa',
        FINALIZADA: 'finalizada',
        PAUSADA: 'pausada'
    },
    TIPO_LOBBY: {
        PUBLICA: 'publica',
        PRIVADA: 'privada'
    },
    MODOS_JUEGO: {
        EN_VIVO: 'en_vivo',
        EXAMEN: 'examen'
    },
    TIPOS_PREGUNTA: {
        UNICA: 'unica',
        MULTIPLE: 'multiple',
        VF: 'V/F'
    },
    ESTADO_PREGUNTA: {
        VISIBLE: 'visible',
        OCULTA: 'oculta',
    },
    EXTENSIONES: {
        PDF: 'pdf',
        XML: 'xml',
        MD: 'md',
        DOCX: 'docx',
    },
    ORIGEN: {
        IMPORTADO: 'importado',
        MANUAL: 'manual',
    },
    ESTADO_CUESTIONARIO: {
        BORRADOR: 'borrador',
        ACTIVO: 'activo',
        ARCHIVADO: 'archivado',
    },
    ESTADO_USER: {
        ACTIVO: 'activo',
        INACTIVO: 'inactivo',
        ABANDONADO: 'abandonado'
    },
    DEFAULTS: {
        EN_VIVO: {
            tiempoPorPreguntaSeg: 20,
            mostrarRanking: true,
            mezclarPreguntas: true,
            mezclarRespuestas: true,
            modoCalificacion: 'velocidad_precision'
        },
        PROGRAMADA: {
            tiempoTotalMin: 60,
            permitirNavegacion: true,
            envioAutomatico: true
        }
    },
    OPCIONES_CALIFICACION: ['velocidad_precision']
};
