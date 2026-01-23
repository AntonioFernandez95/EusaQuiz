const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CampusQuiz API',
      version: '1.0.0',
      description: 'API REST para la aplicación de quizzes interactivos CampusQuiz.  Permite gestionar cuestionarios, preguntas, partidas en tiempo real y usuarios.',
      contact: {
        name: 'Equipo CampusQuiz'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      }
    ],
    tags: [
      { name: 'Cuestionarios', description: 'Gestión de cuestionarios/quizzes' },
      { name: 'Preguntas', description: 'Gestión de preguntas de los cuestionarios' },
      { name: 'Partidas', description: 'Lógica de juego y partidas en vivo' },
      { name: 'Usuarios', description: 'Gestión de usuarios (profesores y alumnos)' },
      { name: 'Participaciones', description: 'Respuestas y rankings de alumnos' }
    ],
    components: {
      schemas: {
        // ========== USUARIO ==========
        Usuario: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID único del usuario' },
            idPortal: { type: 'string', description: 'Identificador externo del sistema de login del centro' },
            nombre: { type: 'string', description: 'Nombre completo del usuario' },
            email: { type: 'string', format: 'email', description: 'Correo electrónico' },
            rol: { type: 'string', enum: ['profesor', 'alumno'], description: 'Rol del usuario' },
            curso: { type: 'string', description: 'Curso del usuario' },
            centro: { type: 'string', description: 'Centro educativo' },
            activo: { type: 'boolean', default: true },
            ultimoAcceso: { type: 'string', format: 'date-time' },
            creadoEn: { type: 'string', format: 'date-time' },
            actualizadoEn: { type: 'string', format: 'date-time' }
          },
          example: {
            _id: '64a7b2c3d4e5f6789',
            idPortal: 'PROFE_01',
            nombre: 'Profesor Oak',
            email: 'oak@pokedex.com',
            rol: 'profesor',
            curso: '1 DAM',
            centro: 'NEGOCIOS',
            activo: true
          }
        },
        UsuarioInput: {
          type: 'object',
          required: ['idPortal', 'nombre', 'email', 'rol', 'curso', 'centro'],
          properties: {
            idPortal: { type: 'string' },
            nombre: { type: 'string' },
            email: { type: 'string', format: 'email' },
            rol: { type: 'string', enum: ['profesor', 'alumno'] },
            curso: { type: 'string' },
            centro: { type: 'string' }
          }
        },

        // ========== CUESTIONARIO ==========
        Cuestionario: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            titulo: { type: 'string', description: 'Título del cuestionario' },
            descripcion: { type: 'string', description: 'Descripción del cuestionario' },
            asignatura: { type: 'string', description: 'Asignatura asociada' },
            curso: { type: 'string' },
            centro: { type: 'string' },
            idProfesor: { type: 'string', description: 'ID del profesor creador' },
            origen: { type: 'string', enum: ['manual', 'importado'], description: 'Origen del cuestionario' },
            numPreguntas: { type: 'integer', default: 0 },
            numVecesJugado: { type: 'integer', default: 0 },
            creadoEn: { type: 'string', format: 'date-time' },
            actualizadoEn: { type: 'string', format: 'date-time' }
          },
          example: {
            _id: '64a7b2c3d4e5f6789',
            titulo: 'Examen Final JS',
            descripcion: 'Preguntas sobre Mongoose y Node',
            asignatura: 'Programación',
            curso: '1 DAM',
            centro: 'NEGOCIOS',
            idProfesor: 'PROFE_01',
            origen: 'manual',
            numPreguntas: 10,
            numVecesJugado: 5
          }
        },
        CuestionarioInput: {
          type: 'object',
          required: ['titulo', 'idProfesor'],
          properties: {
            titulo: { type: 'string' },
            descripcion: { type: 'string' },
            asignatura: { type: 'string' },
            curso: { type: 'string' },
            centro: { type: 'string' },
            idProfesor: { type: 'string' },
            origen: { type: 'string', enum: ['manual', 'importado'] }
          }
        },

        // ========== PREGUNTA ==========
        Opcion: {
          type: 'object',
          properties: {
            textoOpcion: { type: 'string', description: 'Texto de la opción' },
            esCorrecta: { type: 'boolean', default: false },
            orden: { type: 'integer', description: 'Orden de la opción' }
          }
        },
        Pregunta: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            idCuestionario: { type: 'string', description: 'ID del cuestionario padre' },
            textoPregunta: { type: 'string', description: 'Enunciado de la pregunta' },
            tipoPregunta: { type: 'string', enum: ['unica', 'multiple', 'V/F'], default: 'unica' },
            opciones: { type: 'array', items: { $ref: '#/components/schemas/Opcion' } },
            puntuacionMax: { type: 'integer', default: 1000 },
            ordenPregunta: { type: 'integer', description: 'Posición dentro del cuestionario' },
            tiempoLimiteSeg: { type: 'integer', description: 'Tiempo límite en segundos' },
            estado: { type: 'string', enum: ['visible', 'oculta'], default: 'visible' },
            creadoEn: { type: 'string', format: 'date-time' },
            actualizadoEn: { type: 'string', format: 'date-time' }
          },
          example: {
            _id: '64a7b2c3d4e5f6790',
            idCuestionario: '64a7b2c3d4e5f6789',
            textoPregunta: '¿Qué método usa Mongoose para guardar? ',
            tipoPregunta: 'unica',
            puntuacionMax: 1000,
            tiempoLimiteSeg: 20,
            ordenPregunta: 1,
            opciones: [
              { textoOpcion: '. save()', esCorrecta: true, orden: 1 },
              { textoOpcion: '. insert()', esCorrecta: false, orden: 2 }
            ]
          }
        },
        PreguntaInput: {
          type: 'object',
          required: ['idCuestionario', 'textoPregunta', 'ordenPregunta'],
          properties: {
            idCuestionario: { type: 'string' },
            textoPregunta: { type: 'string' },
            tipoPregunta: { type: 'string', enum: ['unica', 'multiple', 'V/F'] },
            opciones: { type: 'array', items: { $ref: '#/components/schemas/Opcion' } },
            puntuacionMax: { type: 'integer' },
            ordenPregunta: { type: 'integer' },
            tiempoLimiteSeg: { type: 'integer' }
          }
        },

        // ========== PARTIDA ==========
        Jugador: {
          type: 'object',
          properties: {
            idAlumno: { type: 'string' },
            nombreAlumno: { type: 'string' },
            estado: { type: 'string', enum: ['activo', 'inactivo', 'expulsado'] },
            aciertos: { type: 'integer', default: 0 },
            fallos: { type: 'integer', default: 0 },
            sinResponder: { type: 'integer', default: 0 },
            puntuacionTotal: { type: 'integer', default: 0 }
          }
        },
        ConfiguracionEnVivo: {
          type: 'object',
          properties: {
            tiempoPorPreguntaSeg: { type: 'integer', default: 20 },
            mostrarRanking: { type: 'boolean', default: true },
            mezclarPreguntas: { type: 'boolean', default: true },
            mezclarRespuestas: { type: 'boolean', default: true },
            modoCalificacion: { type: 'string', enum: ['velocidad_precision', 'solo_acierto', 'texto'] }
          }
        },
        Partida: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            idCuestionario: { type: 'string', description: 'ID del cuestionario asociado' },
            idProfesor: { type: 'string', description: 'ID del profesor que creó la partida' },
            pin: { type: 'string', description: 'PIN de 6 dígitos para unirse' },
            tipoPartida: { type: 'string', enum: ['en_vivo', 'examen'], default: 'en_vivo' },
            estadoPartida: { type: 'string', enum: ['espera', 'activa', 'finalizada', 'pausada'], default: 'espera' },
            modoAcceso: { type: 'string', enum: ['publica', 'privada'], default: 'publica' },
            configuracionEnvivo: { $ref: '#/components/schemas/ConfiguracionEnVivo' },
            jugadores: { type: 'array', items: { $ref: '#/components/schemas/Jugador' } },
            stats: {
              type: 'object',
              properties: {
                respuestasTotales: { type: 'integer' },
                aciertosGlobales: { type: 'integer' },
                fallosGlobales: { type: 'integer' },
                numParticipantes: { type: 'integer' },
                preguntaActual: { type: 'integer' }
              }
            }
          },
          example: {
            _id: '64a7b2c3d4e5f6791',
            idCuestionario: '64a7b2c3d4e5f6789',
            idProfesor: 'PROFE_01',
            pin: '123456',
            tipoPartida: 'en_vivo',
            estadoPartida: 'espera',
            modoAcceso: 'publica',
            jugadores: []
          }
        },
        PartidaInput: {
          type: 'object',
          required: ['idCuestionario', 'idProfesor'],
          properties: {
            idCuestionario: { type: 'string' },
            idProfesor: { type: 'string' },
            tipoPartida: { type: 'string', enum: ['en_vivo', 'examen'] },
            modoAcceso: { type: 'string', enum: ['publica', 'privada'] },
            configuracionEnvivo: { $ref: '#/components/schemas/ConfiguracionEnVivo' }
          }
        },

        // ========== PARTICIPACIÓN ==========
        Respuesta: {
          type: 'object',
          properties: {
            idPregunta: { type: 'string' },
            opcionesMarcadas: { type: 'array', items: { type: 'integer' } },
            esCorrecta: { type: 'boolean' },
            tiempoRespuestaSeg: { type: 'integer' },
            puntosObtenidos: { type: 'integer' },
            respondidaEn: { type: 'string', format: 'date-time' }
          }
        },
        RespuestaInput: {
          type: 'object',
          required: ['idPartida', 'idAlumno', 'idPregunta', 'opcionesMarcadas'],
          properties: {
            idPartida: { type: 'string' },
            idAlumno: { type: 'string' },
            idPregunta: { type: 'string' },
            opcionesMarcadas: { type: 'array', items: { type: 'integer' } },
            tiempoEmpleado: { type: 'integer' }
          }
        },

        // ========== RESPUESTAS API ==========
        ApiResponse: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            mensaje: { type: 'string' },
            data: { type: 'object' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: false },
            error: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*. js']
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
  // Swagger UI
  app. use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '. swagger-ui . topbar { display: none }',
    customSiteTitle: 'CampusQuiz API Docs'
  }));
  
  // Endpoint JSON para OpenAPI spec
  app.get('/api-docs. json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res. send(swaggerSpec);
  });

  console.log('📚 Swagger UI disponible en: http://localhost:3000/api-docs');
};

module.exports = setupSwagger;