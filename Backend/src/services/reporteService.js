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
const puppeteer = require('puppeteer');
const Ajustes = require('../models/ajustes');

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
 * @param {String} idSolicitante - ID del alumno que solicita el reporte (opcional)
 * @returns {String} XML como string
 */
async function generarXMLPartida(idPartida, idSolicitante = null) {
  // Obtener datos
  const partida = await Partida.findById(idPartida);
  if (!partida) throw new Error('Partida no encontrada');

  const cuestionario = await Cuestionario.findById(partida.idCuestionario);
  const preguntas = await Pregunta.find({ idCuestionario: partida.idCuestionario }).sort({ ordenPregunta: 1 });
  const participaciones = await Participacion.find({ idPartida: partida._id });

  // Obtener Ajustes de Branding
  const ajustes = await Ajustes.findOne() || { nombreApp: 'CampusQuiz' };

  // Construir XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<reporte>\n';

  if (idSolicitante) {
    xml += `  <idSolicitante>${escapeXml(idSolicitante)}</idSolicitante>\n`;
  }

  // Branding centralizado
  xml += '  <branding>\n';
  xml += `    <nombreApp>${escapeXml(ajustes.nombreApp)}</nombreApp>\n`;
  xml += '  </branding>\n';

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
    // Calcular aciertos, fallos y sinResponder basándose en las participaciones reales
    const participacionJugador = participaciones.find(p => p.idAlumno === jugador.idAlumno);
    let aciertosCalculados = 0;
    let fallosCalculados = 0;
    let sinResponderCalculados = 0;

    if (participacionJugador) {
      preguntas.forEach(pregunta => {
        const resp = participacionJugador.respuestas.find(r => r.idPregunta.toString() === pregunta._id.toString());
        if (!resp || !resp.opcionesMarcadas || resp.opcionesMarcadas.length === 0) {
          sinResponderCalculados++;
        } else if (resp.esCorrecta) {
          aciertosCalculados++;
        } else {
          fallosCalculados++;
        }
      });
    } else {
      // Si no hay participación, todas son sin responder
      sinResponderCalculados = preguntas.length;
    }

    xml += '    <jugador>\n';
    xml += `      <posicion>${idx + 1}</posicion>\n`;
    xml += `      <idAlumno>${escapeXml(jugador.idAlumno)}</idAlumno>\n`;
    xml += `      <nombre>${escapeXml(jugador.nombreAlumno || 'Anónimo')}</nombre>\n`;
    const pts = Number(jugador.puntuacionTotal);
    const finalPts = isNaN(pts) ? 0 : pts;
    console.log(`[ReporteXML] Jugador ${jugador.nombreAlumno} - Aciertos: ${aciertosCalculados}, Fallos: ${fallosCalculados}, SinResponder: ${sinResponderCalculados}`);
    xml += `      <puntuacion>${finalPts}</puntuacion>\n`;
    xml += `      <aciertos>${aciertosCalculados}</aciertos>\n`;
    xml += `      <fallos>${fallosCalculados}</fallos>\n`;
    xml += `      <sinResponder>${sinResponderCalculados}</sinResponder>\n`;
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
      if (respuesta && respuesta.opcionesMarcadas.length > 0) {
        totalRespuestas++;
        respuesta.opcionesMarcadas.forEach(opIdx => {
          if (statsOpciones[opIdx] !== undefined) statsOpciones[opIdx]++;
        });
        if (respuesta.esCorrecta) aciertosGlobales++;
      }
    });

    const porcentajeAcierto = totalRespuestas > 0 ? Math.round((aciertosGlobales / totalRespuestas) * 100) : 0;

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

  // Si hay un solicitante, añadir sus respuestas detalladas
  if (idSolicitante) {
    const participacionSolo = participaciones.find(p => p.idAlumno === idSolicitante);

    if (participacionSolo) {
      xml += '  <respuestasSolicitante>\n';
      preguntas.forEach((pregunta, idx) => {
        const res = participacionSolo.respuestas.find(r => r.idPregunta.toString() === pregunta._id.toString());

        xml += '    <respuesta>\n';
        xml += `      <numero>${idx + 1}</numero>\n`;
        xml += `      <textoPregunta>${escapeXml(pregunta.textoPregunta)}</textoPregunta>\n`;
        xml += `      <esCorrecta>${res ? res.esCorrecta : 'false'}</esCorrecta>\n`;

        // Texto de respuesta seleccionada
        let seleccionado = 'Sin responder';
        if (res && res.opcionesMarcadas && res.opcionesMarcadas.length > 0) {
          seleccionado = res.opcionesMarcadas.map(opIdx => {
            return pregunta.opciones[opIdx] ? pregunta.opciones[opIdx].textoOpcion : null;
          }).filter(t => t).join(', ');
        }
        xml += `      <textoSeleccionado>${escapeXml(seleccionado)}</textoSeleccionado>\n`;

        // Texto de respuesta correcta
        const correcta = pregunta.opciones.filter(o => o.esCorrecta).map(o => o.textoOpcion).join(', ');
        xml += `      <textoCorrecto>${escapeXml(correcta)}</textoCorrecto>\n`;
        xml += '    </respuesta>\n';
      });
      xml += '  </respuestasSolicitante>\n';
    }
  }

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

  let htmlResult = await xslt.xsltProcess(xmlDoc, xsltDoc);
  let htmlString = htmlResult.toString();

  // Resolve Branding Logo Dynamic
  let logoBase64 = '';
  const ajustes = await Ajustes.findOne();

  if (ajustes && ajustes.logoAppUrl && ajustes.logoAppUrl.startsWith('uploads/')) {
    // Es un logo personalizado
    const customLogoPath = path.join(__dirname, '../../', ajustes.logoAppUrl);
    if (fs.existsSync(customLogoPath)) {
      const bitmap = fs.readFileSync(customLogoPath);
      logoBase64 = Buffer.from(bitmap).toString('base64');
    }
  }

  // Fallback to default logo if no custom or file not found
  if (!logoBase64) {
    const logoPath = path.join(__dirname, '../templates/logo-base64.txt');
    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath, 'utf-8').trim();
    }
  }

  if (htmlString.includes('LOGO_BASE64_PLACEHOLDER')) {
    htmlString = htmlString.replace('LOGO_BASE64_PLACEHOLDER', logoBase64);
  }

  return htmlString;
}

/**
 * Genera PDF desde HTML usando Puppeteer
 * @param {String} htmlString - HTML a convertir
 * @returns {Promise<Buffer>} Buffer del PDF
 */
async function generarPDFDesdeHTML(htmlString) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(htmlString, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
}

const Usuario = require('../models/usuario');

// ... (existing imports skipped in replacement if not targeted, but I will target the end of file for function update)

// ...

/**
 * Genera reporte completo (entrada principal)
 * @param {String} idPartida - ID de la partida
 * @param {String} formato - 'xml', 'html' o 'pdf' (default: 'html')
 * @param {String} idAlumno - Opcional: ID del alumno para personalizar el nombre
 * @returns {Object} { contenido: String|Buffer, contentType: String, filename: String }
 */
async function generarReporteCompleto(idPartida, formato = 'html', idAlumno = null) {
  // 1. Generar nombre de archivo personalizado
  // Hacemos una búsqueda rápida para obtener metadatos (aunque se repita en generarXML, es despreciable)
  const pMeta = await Partida.findById(idPartida).populate('idCuestionario');

  let nombreSujeto = "";
  if (idAlumno) {
    const u = await Usuario.findOne({ idPortal: idAlumno });
    nombreSujeto = u ? u.nombre : "Alumno";
  } else {
    nombreSujeto = pMeta?.tipoPartida || 'Reporte';
  }

  const asignatura = pMeta?.idCuestionario?.asignatura || 'General';
  const curso = pMeta?.idCuestionario?.curso || 'Curso';
  const titulo = pMeta?.idCuestionario?.titulo || 'Quiz';

  const sanitize = (s) => (s || '').toString().trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').replace(/\s+/g, '_');
  const ext = formato === 'pdf' ? 'pdf' : (formato === 'xml' ? 'xml' : 'html');
  const filename = `reporte_${sanitize(nombreSujeto)}_${sanitize(asignatura)}_${sanitize(curso)}_${sanitize(titulo)}.${ext}`;

  // 2. Generar contenido
  const xml = await generarXMLPartida(idPartida, idAlumno);

  if (formato === 'xml') {
    return {
      contenido: xml,
      contentType: 'application/xml',
      filename
    };
  }

  // Generar HTML base
  const html = await transformarXSLT(xml);

  if (formato === 'pdf') {
    const pdfBuffer = await generarPDFDesdeHTML(html);
    return {
      contenido: pdfBuffer,
      contentType: 'application/pdf',
      filename
    };
  }

  // Por defecto HTML
  return {
    contenido: html,
    contentType: 'text/html',
    filename
  };
}

module.exports = {
  generarXMLPartida,
  transformarXSLT,
  generarReporteCompleto
};
