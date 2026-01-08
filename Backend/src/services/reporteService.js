// Servicio: reporteService.js
// Genera reportes de partidas en formato XML y los transforma a HTML mediante XSLT
const Partida = require('../models/partida');
const Participacion = require('../models/participacion');
const Pregunta = require('../models/pregunta');
const Cuestionario = require('../models/cuestionario');
// xslt-processor v3 usa clases XmlParser y Xslt
const { Xslt, XmlParser } = require('xslt-processor');
const fs = require('fs');
const path = require('path');

/**
 * Escapa caracteres especiales para XML
 */
function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formatea fecha a string legible
 */
function formatearFecha(fecha) {
  if (!fecha) return 'N/A';
  const d = new Date(fecha);
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Genera XML con los datos completos de una partida finalizada
 * @param {String} idPartida - ID de la partida
 * @returns {String} XML como string
 */
async function generarXMLPartida(idPartida) {
  // Obtener datos
  const partida = await Partida.findById(idPartida);
  if (!partida) throw new Error('Partida no encontrada');

  const cuestionario = await Cuestionario.findById(partida.idCuestionario);
  const preguntas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
  const participaciones = await Participacion.find({ idPartida: partida._id });

  console.log(`[Reporte] Generando reporte para partida ${idPartida}`);
  console.log(`[Reporte] Preguntas encontradas: ${preguntas.length}`);
  console.log(`[Reporte] Participaciones encontradas: ${participaciones.length}`);
  participaciones.forEach((p, idx) => {
    console.log(`[Reporte] Participación ${idx}: idAlumno=${p.idAlumno}, respuestas.length=${p.respuestas.length}`);
    p.respuestas.forEach((r, rIdx) => {
      console.log(`[Reporte]   Respuesta ${rIdx}: idPregunta=${r.idPregunta}, esCorrecta=${r.esCorrecta}, opciones=${JSON.stringify(r.opcionesMarcadas)}`);
    });
  });

  // Construir XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<reporte>\n';

  // Metadatos de la partida
  xml += '  <partida>\n';
  xml += `    <id>${escapeXml(partida._id.toString())}</id>\n`;
  xml += `    <pin>${escapeXml(partida.pin)}</pin>\n`;
  xml += `    <titulo>${escapeXml(cuestionario?.titulo || 'Sin título')}</titulo>\n`;
  xml += `    <tipoPartida>${escapeXml(partida.tipoPartida)}</tipoPartida>\n`;
  xml += `    <estado>${escapeXml(partida.estadoPartida)}</estado>\n`;
  xml += `    <idProfesor>${escapeXml(partida.idProfesor)}</idProfesor>\n`;
  xml += `    <fechaInicio>${escapeXml(formatearFecha(partida.fechas?.creadaEn))}</fechaInicio>\n`;
  xml += `    <fechaFin>${escapeXml(formatearFecha(partida.fechas?.finalizadaEn))}</fechaFin>\n`;
  xml += `    <totalParticipantes>${partida.jugadores?.length || 0}</totalParticipantes>\n`;
  xml += `    <totalPreguntas>${preguntas.length}</totalPreguntas>\n`;
  xml += '  </partida>\n';

  // Jugadores ordenados por puntuación (ranking)
  const jugadoresOrdenados = [...(partida.jugadores || [])].sort((a, b) => b.puntuacionTotal - a.puntuacionTotal);

  xml += '  <jugadores>\n';
  jugadoresOrdenados.forEach((jugador, idx) => {
    xml += '    <jugador>\n';
    xml += `      <posicion>${idx + 1}</posicion>\n`;
    xml += `      <idAlumno>${escapeXml(jugador.idAlumno)}</idAlumno>\n`;
    xml += `      <nombre>${escapeXml(jugador.nombreAlumno || 'Anónimo')}</nombre>\n`;
    xml += `      <puntuacion>${jugador.puntuacionTotal || 0}</puntuacion>\n`;
    xml += `      <aciertos>${jugador.aciertos || 0}</aciertos>\n`;
    xml += `      <fallos>${jugador.fallos || 0}</fallos>\n`;
    xml += `      <sinResponder>${jugador.sinResponder || 0}</sinResponder>\n`;
    xml += `      <estado>${escapeXml(jugador.estado || 'desconocido')}</estado>\n`;
    xml += '    </jugador>\n';
  });
  xml += '  </jugadores>\n';

  // Preguntas con estadísticas globales
  xml += '  <preguntas>\n';
  preguntas.forEach((pregunta, idx) => {
    // Calcular estadísticas de respuestas
    let totalRespuestas = 0;
    let aciertosGlobales = 0;
    const statsOpciones = pregunta.opciones.map(() => 0);

    participaciones.forEach((p, pIdx) => {
      const respuesta = p.respuestas.find(r => r.idPregunta.toString() === pregunta._id.toString());
      console.log(`[Reporte Debug] Participación ${pIdx} (${p.idAlumno}), Pregunta ${idx + 1} (${pregunta._id}): respuesta encontrada=${!!respuesta}, tiene opciones=${respuesta?.opcionesMarcadas?.length > 0}`);
      if (respuesta && respuesta.opcionesMarcadas.length > 0) {
        totalRespuestas++;
        respuesta.opcionesMarcadas.forEach(opIdx => {
          if (statsOpciones[opIdx] !== undefined) statsOpciones[opIdx]++;
        });
        if (respuesta.esCorrecta) aciertosGlobales++;
      }
    });

    const porcentajeAcierto = totalRespuestas > 0 ? Math.round((aciertosGlobales / totalRespuestas) * 100) : 0;

    console.log(`[Reporte] Pregunta ${idx + 1}: totalRespuestas=${totalRespuestas}, aciertos=${aciertosGlobales}, porcentaje=${porcentajeAcierto}%`);

    xml += '    <pregunta>\n';
    xml += `      <numero>${idx + 1}</numero>\n`;
    xml += `      <texto>${escapeXml(pregunta.textoPregunta)}</texto>\n`;
    xml += `      <tipo>${escapeXml(pregunta.tipoPregunta)}</tipo>\n`;
    xml += `      <totalRespuestas>${totalRespuestas}</totalRespuestas>\n`;
    xml += `      <aciertosGlobales>${aciertosGlobales}</aciertosGlobales>\n`;
    xml += `      <porcentajeAcierto>${porcentajeAcierto}</porcentajeAcierto>\n`;
    xml += '      <opciones>\n';
    pregunta.opciones.forEach((opcion, opIdx) => {
      xml += '        <opcion>\n';
      xml += `          <texto>${escapeXml(opcion.textoOpcion)}</texto>\n`;
      xml += `          <esCorrecta>${opcion.esCorrecta}</esCorrecta>\n`;
      xml += `          <vecesSeleccionada>${statsOpciones[opIdx]}</vecesSeleccionada>\n`;
      xml += '        </opcion>\n';
    });
    xml += '      </opciones>\n';
    xml += '    </pregunta>\n';
  });
  xml += '  </preguntas>\n';

  xml += '</reporte>';

  return xml;
}

/**
 * Transforma XML a HTML usando la plantilla XSLT
 * @param {String} xmlString - XML a transformar
 * @returns {Promise<String>} HTML resultante
 */
async function transformarXSLT(xmlString) {
  const xsltPath = path.join(__dirname, '../templates/reportePartida.xslt');
  const xsltString = fs.readFileSync(xsltPath, 'utf-8');

  // xslt-processor v3 API
  const xslt = new Xslt();
  const xmlParser = new XmlParser();

  const xmlDoc = await xmlParser.xmlParse(xmlString);
  const xsltDoc = await xmlParser.xmlParse(xsltString);

  const htmlResult = await xslt.xsltProcess(xmlDoc, xsltDoc);

  return htmlResult.toString();
}


/**
 * Genera reporte completo (entrada principal)
 * @param {String} idPartida - ID de la partida
 * @param {String} formato - 'xml' o 'html' (default: 'html')
 * @returns {Object} { contenido: String, contentType: String }
 */
async function generarReporteCompleto(idPartida, formato = 'html') {
  const xml = await generarXMLPartida(idPartida);

  if (formato === 'xml') {
    return {
      contenido: xml,
      contentType: 'application/xml'
    };
  }

  // Por defecto HTML
  const html = await transformarXSLT(xml);
  return {
    contenido: html,
    contentType: 'text/html'
  };
}

module.exports = {
  generarXMLPartida,
  transformarXSLT,
  generarReporteCompleto
};
