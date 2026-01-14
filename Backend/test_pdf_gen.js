// test_pdf_gen.js
const reporteService = require('./src/services/reporteService');
const fs = require('fs');
const path = require('path');

// Mock dependencies to avoid DB connection
const Partida = require('./src/models/partida');
const Cuestionario = require('./src/models/cuestionario');
const Pregunta = require('./src/models/pregunta');
const Participacion = require('./src/models/participacion');

// Mock Data
const mockPartida = {
    _id: 'partida123',
    pin: '123456',
    idCuestionario: 'cuestionario123',
    tipoPartida: 'examen',
    estadoPartida: 'finalizada',
    idProfesor: 'profesor123',
    fechas: { creadaEn: new Date(), finalizadaEn: new Date() },
    jugadores: [
        { idAlumno: 'alumno1', nombreAlumno: 'Juan Pérez', puntuacionTotal: 100, aciertos: 10, fallos: 0, sinResponder: 0, estado: 'finalizado' },
        { idAlumno: 'alumno2', nombreAlumno: 'María Gómez', puntuacionTotal: 80, aciertos: 8, fallos: 2, sinResponder: 0, estado: 'finalizado' }
    ]
};

const mockCuestionario = { titulo: 'Examen de Prueba' };

const mockPreguntas = [
    { _id: 'p1', textoPregunta: '¿Cuánto es 2+2?', tipoPregunta: 'opciones', opciones: [{ textoOpcion: '3', esCorrecta: false }, { textoOpcion: '4', esCorrecta: true }] },
    { _id: 'p2', textoPregunta: 'Capital de Francia', tipoPregunta: 'opciones', opciones: [{ textoOpcion: 'París', esCorrecta: true }, { textoOpcion: 'Madrid', esCorrecta: false }] }
];

const mockParticipaciones = [
    { idAlumno: 'alumno1', idPartida: 'partida123', respuestas: [{ idPregunta: 'p1', esCorrecta: true, opcionesMarcadas: [1] }, { idPregunta: 'p2', esCorrecta: true, opcionesMarcadas: [0] }] },
    { idAlumno: 'alumno2', idPartida: 'partida123', respuestas: [{ idPregunta: 'p1', esCorrecta: true, opcionesMarcadas: [1] }, { idPregunta: 'p2', esCorrecta: false, opcionesMarcadas: [1] }] }
];

// Mock Mongoose methods
Partida.findById = async () => mockPartida;
Cuestionario.findById = async () => mockCuestionario;
Pregunta.find = () => ({ sort: async () => mockPreguntas });
Participacion.find = async () => mockParticipaciones;

async function runTest() {
    console.log('Iniciando prueba de generación de PDF...');
    try {
        const { contenido, contentType } = await reporteService.generarReporteCompleto('partida123', 'pdf');

        if (contentType !== 'application/pdf') {
            throw new Error(`Content type incorrecto: ${contentType}`);
        }

        const outputPath = path.join(__dirname, 'reporte_test.pdf');
        fs.writeFileSync(outputPath, contenido);
        console.log(`PDF generado exitosamente en: ${outputPath}`);
        console.log(`Tamaño: ${contenido.length} bytes`);
    } catch (error) {
        console.error('Error generando PDF:', error);
    }
}

runTest();
