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
    CENTROS: {
        CAMPUS_CAMARA: 'Campus Camara',
        EUSA: 'EUSA',
    },
    CURSOS: {//!METER MAS CURSOS (TODOS XD)
        DAM1: '1 DAM',
        DAM2: '2 DAM',
        DAW1: '1 DAW',
        DAW2: '2 DAW',
        ASIR1: '1 ASIR',
        ASIR2: '2 ASIR',

        NULL: null,
    },
    ASIGNATURAS: {
        DAM1: [
            'Sistemas Informáticos',
            'Bases de Datos',
            'Programación',
            'Lenguajes de Marcas',
            'Entornos de Desarrollo',
            'Formación y Orientación Laboral',
            'Digitalización Aplicada',
            'Sostenibilidad Aplicada'

        ],
        DAM2: [
            'Acceso a Datos',
            'Desarrollo de Interfaces',
            'Programación Multimedia y Dispositivos Móviles',
            'Programación de Servicios y Procesos',
            'Sistemas de Gestión Empresarial',
            'Empresa e Iniciativa Emprendedora'
        ]
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