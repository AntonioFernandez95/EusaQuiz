
/**En vivo
 * {
  "idCuestionario": "ID_DEL_CUESTIONARIO",
  "idProfesor": "ID_DEL_USUARIO_PROFE", 
  "tipoPartida": "en_vivo",
  "modoAcceso": "publica",
  "configuracionEnvivo": {
      "tiempoPorPreguntaSeg": 30,
      "mostrarRanking": true,
      "modoCalificacion": "velocidad_precision"
  }
} 
Examen
{
  "idCuestionario": "ID_DEL_CUESTIONARIO",
  "idProfesor": "ID_DEL_USUARIO_PROFE",
  "tipoPartida": "examen", 
  "modoAcceso": "privada",
  "fechas": {
      "fechaInicio": "2023-12-01T09:00:00.000Z",
      "fechaFin": "2023-12-01T11:00:00.000Z"
  },
  "configuracionProgramada": {
      "tiempoTotalMin": 60,
      "permitirNavegacion": true,
      "envioAutomatico": true
  }
}  
*/
const mongoose = require('mongoose');
const tipos = require('../utils/constants');
// --- 0. Sub-esquema para las Respuestas del Alumno (DEBE IR PRIMERO) ---
// Es necesario para registrar los resultados individuales, aunque la Partida solo referencie al Cuestionario.
const RespuestaAlumnoSchema = new mongoose.Schema({
    idPregunta: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    opcionesMarcadas: { type: [Number], default: [] },
    esCorrecta: { type: Boolean },
    tiempoRespuestaSeg: { type: Number },
    puntosObtenidos: { type: Number, default: 0 },
    respondidaEn: { type: Date, default: Date.now }
}, { _id: false });

// --- 1. Sub-esquema para cada Jugador (USA el esquema anterior) ---
const JugadorSchema = new mongoose.Schema({
    idAlumno: {
        type: String,
        ref: 'usuarios',
        required: true
    },
    
    nombreAlumno: { type: String },

    estado: {
        type: String,
        enum: Object.values(tipos.ESTADO_USER),
        default: tipos.ESTADO_USER.ACTIVO,
    },

    aciertos: { type: Number, default: 0 },
    fallos: { type: Number, default: 0 },
    sinResponder: { type: Number, default: 0 },

    puntuacionTotal: { type: Number, default: 0 },
    tiempoTotalSeg: { type: Number },
    inicioEn: { type: Date, default: Date.now },
    finEn: { type: Date },

    // REFERENCIA: Aquí es donde usa RespuestaAlumnoSchema
    respuestas: [RespuestaAlumnoSchema]
}, { _id: false });

// --- 2. Sub-esquema para Configuración (Para tipoCuestionario= "en_vivo") ---
const ConfiguracionEnVivoSchema = new mongoose.Schema({
    tiempoPorPreguntaSeg: { type: Number, default: 20 },
    mostrarRanking: { type: Boolean, default: true },
    mezclarPreguntas: { type: Boolean, default: true },
    mezclarRespuestas: { type: Boolean, default: true },
    modoCalificacion: {
        type: String,
        enum: ["velocidad_precision", "solo_acierto", "texto"],//!Algoritmo
        default: 'velocidad_precision'
    },

    tiempoTotalMin: { type: Number },//!Tendra un tiempo total?
    //envioAutomatico: { type: Boolean, default: true }//!Tendra envio automatico?
}, { _id: false });

// --- 2. Subdocumento Programacion (para tipoCuestionario = "examen") ---
const ConfiguracionExamenSchema = new mongoose.Schema({
    programadaPara: { type: Date },
    finEn: { type: Date },
    tiempoTotalMin: { type: Number },
    permitirNavegacion: { type: Boolean, default: true },
    envioAutomatico: { type: Boolean, default: true }
}, { _id: false });

// --- 3. Sub-esquema para Stats de Apoyo en Tiempo Real ---
const StatsSchema = new mongoose.Schema({
    respuestasTotales: { type: Number, default: 0 },
    aciertosGlobales: { type: Number, default: 0 },
    fallosGlobales: { type: Number, default: 0 },
    numParticipantes: { type: Number, default: 0 },
    preguntaActual: { type: Number, default: 0 }, //!Solo en_Vivo  
}, { _id: false });

// --- 4. Sub-esquema para Fechas de Apoyo a MODO EXAMEN U EN VIVO ---
const FechasSchema = new mongoose.Schema({
    creadaEn: { type: Date, default: Date.now },
    finalizadaEn: { type: Date },
}, { _id: false });

// --- 5. Esquema Principal de la Partida (USA todos los anteriores) ---
const PartidaSchema = new mongoose.Schema({
    // --- Referencia a Colección Padre (Cuestionario) ---
    idCuestionario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'cuestionarios',
        required: true
    },

    idProfesor: {
        type: String,
        ref: 'usuarios',
        required: true
    },

    pin: { type: String, required: true, unique: true },

    tipoPartida: {
        type: String,
        enum: Object.values(tipos.MODOS_JUEGO),
        default: tipos.MODOS_JUEGO.EN_VIVO,
        required: true
    },

    estadoPartida: {
        type: String,
        enum: Object.values(tipos.ESTADOS_PARTIDA),
        default: tipos.ESTADOS_PARTIDA.ESPERA,
    },

    modoAcceso: {
        type: String,
        enum: Object.values(tipos.TIPO_LOBBY),
        default: tipos.TIPO_LOBBY.PUBLICA,
    },
    fechas: { type: FechasSchema },
    configuracionEnvivo: {
        type: ConfiguracionEnVivoSchema,
        default: () => ({}) // Se inicializa con los valores por defecto del subesquema
    },

    configuracionExamen: { type: ConfiguracionExamenSchema },

    stats: { type: StatsSchema, default: {} }, // Inicializado como objeto vacío

    jugadores: [JugadorSchema], // ARRAY DE JUGADORES EMBEBIDOS

}, {
    collection: 'partida'
});

module.exports = mongoose.models.Partida || mongoose.model('Partida', PartidaSchema, 'partidas');