<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  
  <xsl:template match="/">
    <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <title>Informe de Evaluación - <xsl:value-of select="/reporte/branding/nombreApp"/></title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            background: #fff;
            color: #1a1a2e;
            font-size: 11pt;
            line-height: 1.4;
          }
          .document {
            max-width: 210mm;
            margin: 0 auto;
            padding: 0;
          }
          
          /* === HEADER INSTITUCIONAL === */
          .header-institucional {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 25px;
            border-bottom: 3px solid #0c3366;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          }
          .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .logo-img {
            width: 60px;
            height: 60px;
            object-fit: contain;
          }
          .institucion-info h1 {
            font-size: 1.4rem;
            color: #0c3366;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .institucion-info .subtitulo {
            font-size: 0.85rem;
            color: #64748b;
            margin-top: 2px;
          }
          .documento-info {
            text-align: right;
          }
          .documento-info .tipo-doc {
            font-size: 1.1rem;
            font-weight: 700;
            color: #0c3366;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .documento-info .fecha-generacion {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 4px;
          }
          
          /* === DATOS DEL EXAMEN === */
          .examen-header {
            background: #0c3366;
            color: white;
            padding: 20px 25px;
          }
          .examen-titulo {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 5px;
          }
          .examen-asignatura {
            font-size: 0.95rem;
            opacity: 0.9;
          }
          
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
          }
          .meta-item {
            padding: 12px 15px;
            text-align: center;
            border-right: 1px solid #e2e8f0;
          }
          .meta-item:last-child { border-right: none; }
          .meta-item .label {
            font-size: 0.65rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }
          .meta-item .value {
            font-size: 0.95rem;
            font-weight: 600;
            color: #0c3366;
          }
          
          /* === SECCIONES === */
          .section {
            padding: 20px 25px;
            border-bottom: 1px solid #e2e8f0;
          }
          .section:last-of-type { border-bottom: none; }
          .section-title {
            font-size: 1rem;
            font-weight: 700;
            color: #0c3366;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #0c3366;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .section-title .icon {
            font-size: 1.1rem;
          }
          
          /* === RESUMEN ESTUDIANTE === */
          .estudiante-resumen {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 2px solid #3b82f6;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .estudiante-nombre {
            font-size: 1.2rem;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 15px;
          }
          .stats-row {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
          }
          .stat-box {
            flex: 1;
            min-width: 100px;
            background: white;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .stat-box .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
          }
          .stat-box .stat-label {
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
          }
          .stat-box.aciertos .stat-value { color: #16a34a; }
          .stat-box.fallos .stat-value { color: #dc2626; }
          .stat-box.sin-responder .stat-value { color: #d97706; }
          .stat-box.nota .stat-value { color: #0c3366; }
          
          /* === TABLAS === */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
          }
          th, td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #0c3366;
            color: white;
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          tr:nth-child(even) { background: #f8fafc; }
          tr:hover { background: #f1f5f9; }
          
          /* Posiciones podio */
          .pos-1 { background: linear-gradient(90deg, #fef3c7 0%, #fef9c3 100%) !important; }
          .pos-2 { background: linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 100%) !important; }
          .pos-3 { background: linear-gradient(90deg, #fed7aa 0%, #ffedd5 100%) !important; }
          .mi-fila { 
            background: linear-gradient(90deg, #dbeafe 0%, #eff6ff 100%) !important;
            border-left: 4px solid #3b82f6;
          }
          
          .medal {
            font-size: 1.1rem;
            margin-right: 5px;
          }
          
          /* === BADGES === */
          .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
          }
          .badge-success { background: #dcfce7; color: #166534; }
          .badge-danger { background: #fee2e2; color: #991b1b; }
          .badge-warning { background: #fef3c7; color: #92400e; }
          .badge-gray { background: #f1f5f9; color: #475569; }
          
          /* === DETALLE RESPUESTAS === */
          .respuesta-row { vertical-align: top; }
          .respuesta-correcta { color: #166534; }
          .respuesta-incorrecta { color: #991b1b; }
          .respuesta-sin-responder { color: #92400e; font-style: italic; }
          
          .pregunta-texto {
            font-weight: 500;
            max-width: 250px;
          }
          .respuesta-alumno {
            max-width: 150px;
          }
          .respuesta-correcta-col {
            max-width: 150px;
            color: #64748b;
            font-size: 0.85rem;
          }
          
          /* === PREGUNTAS CARDS (PROFESOR) === */
          .pregunta-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 12px;
            border-left: 4px solid #0c3366;
          }
          .pregunta-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .pregunta-num {
            font-weight: 700;
            color: #0c3366;
            font-size: 0.9rem;
          }
          .pregunta-texto-card {
            font-size: 0.95rem;
            color: #1a1a2e;
            margin-bottom: 12px;
            line-height: 1.5;
          }
          .opciones-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .opcion {
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.85rem;
            background: white;
            border: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .opcion.correcta {
            background: #dcfce7;
            border-color: #16a34a;
            color: #166534;
          }
          .opcion .count {
            font-weight: 600;
            color: #64748b;
            font-size: 0.8rem;
          }
          
          /* === FOOTER === */
          .footer {
            background: #f1f5f9;
            padding: 15px 25px;
            border-top: 2px solid #0c3366;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8rem;
            color: #64748b;
          }
          .footer .legal {
            font-style: italic;
          }
          .footer .powered {
            font-weight: 500;
          }
          
          /* === FIRMA === */
          .firma-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px dashed #cbd5e1;
            display: flex;
            justify-content: space-between;
          }
          .firma-box {
            width: 200px;
            text-align: center;
          }
          .firma-linea {
            border-top: 1px solid #1a1a2e;
            margin-bottom: 5px;
            margin-top: 40px;
          }
          .firma-label {
            font-size: 0.8rem;
            color: #64748b;
          }
          
          /* === PRINT === */
          @media print {
            body { background: white; }
            .document { box-shadow: none; max-width: none; }
            .section { page-break-inside: avoid; }
            .pregunta-card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="document">
          <!-- Header Institucional -->
          <div class="header-institucional">
            <div class="logo-section">
              <img class="logo-img" src="data:image/png;base64,LOGO_BASE64_PLACEHOLDER" alt="Logo CampusQuiz"/>
              <div class="institucion-info">
                <h1><xsl:value-of select="/reporte/branding/nombreApp"/></h1>
                <div class="subtitulo">Plataforma de Evaluación Interactiva</div>
              </div>
            </div>
            <div class="documento-info">
              <div class="tipo-doc">Informe de Evaluación</div>
              <div class="fecha-generacion">
                <xsl:choose>
                  <xsl:when test="/reporte/idSolicitante">Informe Individual</xsl:when>
                  <xsl:otherwise>Informe de Grupo</xsl:otherwise>
                </xsl:choose>
              </div>
            </div>
          </div>
          
          <!-- Datos del Examen -->
          <div class="examen-header">
            <div class="examen-titulo"><xsl:value-of select="/reporte/partida/titulo"/></div>
            <div class="examen-asignatura">Evaluación mediante plataforma <xsl:value-of select="/reporte/branding/nombreApp"/></div>
          </div>
          
          <!-- Metadatos -->
          <div class="meta-grid">
            <div class="meta-item">
              <div class="label">Código PIN</div>
              <div class="value"><xsl:value-of select="/reporte/partida/pin"/></div>
            </div>
            <div class="meta-item">
              <div class="label">Modalidad</div>
              <div class="value"><xsl:value-of select="/reporte/partida/tipoPartida"/></div>
            </div>
            <div class="meta-item">
              <div class="label">Participantes</div>
              <div class="value"><xsl:value-of select="/reporte/partida/totalParticipantes"/></div>
            </div>
            <div class="meta-item">
              <div class="label">Preguntas</div>
              <div class="value"><xsl:value-of select="/reporte/partida/totalPreguntas"/></div>
            </div>
            <div class="meta-item">
              <div class="label">Fecha Inicio</div>
              <div class="value"><xsl:value-of select="/reporte/partida/fechaInicio"/></div>
            </div>
            <div class="meta-item">
              <div class="label">Fecha Fin</div>
              <div class="value"><xsl:value-of select="/reporte/partida/fechaFin"/></div>
            </div>
          </div>
          
          <!-- CONTENIDO PARA ALUMNO -->
          <xsl:if test="/reporte/idSolicitante">
            <!-- Resumen del Estudiante -->
            <div class="section">
              <xsl:variable name="misDatos" select="/reporte/jugadores/jugador[idAlumno = /reporte/idSolicitante]"/>
              <div class="estudiante-resumen">
                <div class="estudiante-nombre">
                  Estudiante: <xsl:value-of select="$misDatos/nombre"/>
                </div>
                <div class="stats-row">
                  <div class="stat-box nota">
                    <div class="stat-value"><xsl:value-of select="$misDatos/puntuacion"/></div>
                    <div class="stat-label">Puntuación</div>
                  </div>
                  <div class="stat-box aciertos">
                    <div class="stat-value"><xsl:value-of select="$misDatos/aciertos"/></div>
                    <div class="stat-label">Aciertos</div>
                  </div>
                  <div class="stat-box fallos">
                    <div class="stat-value"><xsl:value-of select="$misDatos/fallos"/></div>
                    <div class="stat-label">Errores</div>
                  </div>
                  <div class="stat-box sin-responder">
                    <div class="stat-value"><xsl:value-of select="$misDatos/sinResponder"/></div>
                    <div class="stat-label">Sin Responder</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-value">#<xsl:value-of select="$misDatos/posicion"/></div>
                    <div class="stat-label">Posición</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Posición en el Ranking -->
            <div class="section">
              <h2 class="section-title"><span class="icon">🏆</span> Posición en el Ranking</h2>
              <table>
                <thead>
                  <tr>
                    <th style="width: 60px;">Pos.</th>
                    <th>Estudiante</th>
                    <th style="width: 100px;">Puntuación</th>
                    <th style="width: 80px;">Aciertos</th>
                    <th style="width: 80px;">Errores</th>
                    <th style="width: 100px;">Sin Responder</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/reporte/jugadores/jugador">
                    <xsl:if test="posicion &lt;= 3 or idAlumno = /reporte/idSolicitante">
                      <tr>
                        <xsl:attribute name="class">
                          <xsl:choose>
                            <xsl:when test="idAlumno = /reporte/idSolicitante">mi-fila</xsl:when>
                            <xsl:when test="posicion = 1">pos-1</xsl:when>
                            <xsl:when test="posicion = 2">pos-2</xsl:when>
                            <xsl:when test="posicion = 3">pos-3</xsl:when>
                          </xsl:choose>
                        </xsl:attribute>
                        <td>
                          <xsl:choose>
                            <xsl:when test="posicion = 1"><span class="medal">🥇</span></xsl:when>
                            <xsl:when test="posicion = 2"><span class="medal">🥈</span></xsl:when>
                            <xsl:when test="posicion = 3"><span class="medal">🥉</span></xsl:when>
                            <xsl:otherwise><xsl:value-of select="posicion"/>º</xsl:otherwise>
                          </xsl:choose>
                        </td>
                        <td>
                          <strong><xsl:value-of select="nombre"/></strong>
                          <xsl:if test="idAlumno = /reporte/idSolicitante"> (Tú)</xsl:if>
                        </td>
                        <td><strong><xsl:value-of select="puntuacion"/></strong></td>
                        <td><span class="badge badge-success"><xsl:value-of select="aciertos"/></span></td>
                        <td><span class="badge badge-danger"><xsl:value-of select="fallos"/></span></td>
                        <td><span class="badge badge-warning"><xsl:value-of select="sinResponder"/></span></td>
                      </tr>
                    </xsl:if>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>
            
            <!-- Detalle de Respuestas del Alumno -->
            <div class="section">
              <h2 class="section-title"><span class="icon">📝</span> Detalle de Respuestas</h2>
              <table>
                <thead>
                  <tr>
                    <th style="width: 40px;">#</th>
                    <th>Pregunta</th>
                    <th>Tu Respuesta</th>
                    <th>Respuesta Correcta</th>
                    <th style="width: 100px;">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/reporte/respuestasSolicitante/respuesta">
                    <tr class="respuesta-row">
                      <td><strong><xsl:value-of select="numero"/></strong></td>
                      <td class="pregunta-texto"><xsl:value-of select="textoPregunta"/></td>
                      <td class="respuesta-alumno">
                        <xsl:choose>
                          <xsl:when test="textoSeleccionado = 'Sin responder'">
                            <span class="respuesta-sin-responder"><xsl:value-of select="textoSeleccionado"/></span>
                          </xsl:when>
                          <xsl:when test="esCorrecta = 'true'">
                            <span class="respuesta-correcta"><xsl:value-of select="textoSeleccionado"/></span>
                          </xsl:when>
                          <xsl:otherwise>
                            <span class="respuesta-incorrecta"><xsl:value-of select="textoSeleccionado"/></span>
                          </xsl:otherwise>
                        </xsl:choose>
                      </td>
                      <td class="respuesta-correcta-col"><xsl:value-of select="textoCorrecto"/></td>
                      <td>
                        <xsl:choose>
                          <xsl:when test="textoSeleccionado = 'Sin responder'">
                            <span class="badge badge-warning">Sin responder</span>
                          </xsl:when>
                          <xsl:when test="esCorrecta = 'true'">
                            <span class="badge badge-success">Correcto</span>
                          </xsl:when>
                          <xsl:otherwise>
                            <span class="badge badge-danger">Incorrecto</span>
                          </xsl:otherwise>
                        </xsl:choose>
                      </td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>
          </xsl:if>
          
          <!-- CONTENIDO PARA PROFESOR -->
          <xsl:if test="not(/reporte/idSolicitante)">
            <!-- Ranking Completo -->
            <div class="section">
              <h2 class="section-title"><span class="icon">🏆</span> Ranking de Participantes</h2>
              <table>
                <thead>
                  <tr>
                    <th style="width: 60px;">Pos.</th>
                    <th>Estudiante</th>
                    <th style="width: 100px;">Puntuación</th>
                    <th style="width: 80px;">Aciertos</th>
                    <th style="width: 80px;">Errores</th>
                    <th style="width: 100px;">Sin Responder</th>
                    <th style="width: 100px;">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/reporte/jugadores/jugador">
                    <tr>
                      <xsl:attribute name="class">
                        <xsl:choose>
                          <xsl:when test="posicion = 1">pos-1</xsl:when>
                          <xsl:when test="posicion = 2">pos-2</xsl:when>
                          <xsl:when test="posicion = 3">pos-3</xsl:when>
                        </xsl:choose>
                      </xsl:attribute>
                      <td>
                        <xsl:choose>
                          <xsl:when test="posicion = 1"><span class="medal">🥇</span></xsl:when>
                          <xsl:when test="posicion = 2"><span class="medal">🥈</span></xsl:when>
                          <xsl:when test="posicion = 3"><span class="medal">🥉</span></xsl:when>
                          <xsl:otherwise><xsl:value-of select="posicion"/>º</xsl:otherwise>
                        </xsl:choose>
                      </td>
                      <td><strong><xsl:value-of select="nombre"/></strong></td>
                      <td><strong><xsl:value-of select="puntuacion"/></strong></td>
                      <td><span class="badge badge-success"><xsl:value-of select="aciertos"/></span></td>
                      <td><span class="badge badge-danger"><xsl:value-of select="fallos"/></span></td>
                      <td><span class="badge badge-warning"><xsl:value-of select="sinResponder"/></span></td>
                      <td><span class="badge badge-gray"><xsl:value-of select="estado"/></span></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>
            
            <!-- Análisis por Pregunta -->
            <div class="section">
              <h2 class="section-title"><span class="icon">📊</span> Análisis por Pregunta</h2>
              <xsl:for-each select="/reporte/preguntas/pregunta">
                <div class="pregunta-card">
                  <div class="pregunta-header">
                    <span class="pregunta-num">Pregunta <xsl:value-of select="numero"/></span>
                    <span>
                      <xsl:attribute name="class">
                        badge <xsl:choose>
                          <xsl:when test="porcentajeAcierto >= 70">badge-success</xsl:when>
                          <xsl:when test="porcentajeAcierto >= 40">badge-warning</xsl:when>
                          <xsl:otherwise>badge-danger</xsl:otherwise>
                        </xsl:choose>
                      </xsl:attribute>
                      <xsl:value-of select="porcentajeAcierto"/>% acierto
                    </span>
                  </div>
                  <p class="pregunta-texto-card"><xsl:value-of select="texto"/></p>
                  <div class="opciones-grid">
                    <xsl:for-each select="opciones/opcion">
                      <div>
                        <xsl:attribute name="class">
                          opcion <xsl:if test="esCorrecta = 'true'">correcta</xsl:if>
                        </xsl:attribute>
                        <span>
                          <xsl:if test="esCorrecta = 'true'">✓ </xsl:if>
                          <xsl:value-of select="texto"/>
                        </span>
                        <span class="count"><xsl:value-of select="vecesSeleccionada"/></span>
                      </div>
                    </xsl:for-each>
                  </div>
                </div>
              </xsl:for-each>
            </div>
          </xsl:if>
          
          <!-- Sección de Firmas (solo para profesor) -->
          <xsl:if test="not(/reporte/idSolicitante)">
            <div class="section">
              <div class="firma-section">
                <div class="firma-box">
                  <div class="firma-linea"></div>
                  <div class="firma-label">Firma del Profesor</div>
                </div>
                <div class="firma-box">
                  <div class="firma-linea"></div>
                  <div class="firma-label">Sello del Centro</div>
                </div>
              </div>
            </div>
          </xsl:if>
          
          <!-- Footer -->
          <div class="footer">
            <div class="legal">
              Este documento es un informe generado automáticamente. 
              Los datos reflejan el estado al momento de la evaluación.
            </div>
            <div class="powered">
              <xsl:value-of select="/reporte/branding/nombreApp"/> © 2026
            </div>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
