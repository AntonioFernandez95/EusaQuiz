<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  
  <xsl:template match="/">
    <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <title>Reporte de Partida - EusaQuiz</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 { font-size: 2rem; margin-bottom: 10px; }
          .header .subtitle { opacity: 0.8; font-size: 1rem; }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            padding: 20px 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
          }
          .meta-item { text-align: center; }
          .meta-item .label { font-size: 0.75rem; color: #6c757d; text-transform: uppercase; }
          .meta-item .value { font-size: 1.1rem; font-weight: 600; color: #1a1a2e; }
          .section { padding: 25px 30px; }
          .section-title {
            font-size: 1.3rem;
            color: #1a1a2e;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e9ecef; }
          th { background: #1a1a2e; color: white; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; }
          tr:hover { background: #f8f9fa; }
          .pos-1 { background: linear-gradient(90deg, #ffd700 0%, #fff9c4 100%) !important; }
          .pos-2 { background: linear-gradient(90deg, #c0c0c0 0%, #e8e8e8 100%) !important; }
          .pos-3 { background: linear-gradient(90deg, #cd7f32 0%, #deb887 100%) !important; }
          .medal { font-size: 1.3rem; margin-right: 8px; }
          .badge { 
            display: inline-block; 
            padding: 4px 10px; 
            border-radius: 20px; 
            font-size: 0.75rem; 
            font-weight: 600;
          }
          .badge-success { background: #d4edda; color: #155724; }
          .badge-danger { background: #f8d7da; color: #721c24; }
          .badge-warning { background: #fff3cd; color: #856404; }
          .pregunta-card {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
          }
          .pregunta-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .pregunta-num { font-weight: 700; color: #667eea; }
          .pregunta-texto { font-size: 1rem; color: #1a1a2e; margin-bottom: 10px; }
          .opciones-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .opcion { 
            padding: 8px 12px; 
            border-radius: 6px; 
            font-size: 0.85rem;
            background: white;
            border: 1px solid #e9ecef;
          }
          .opcion.correcta { background: #d4edda; border-color: #28a745; }
          .opcion .count { float: right; font-weight: 600; color: #6c757d; }
          .footer {
            background: #1a1a2e;
            color: white;
            text-align: center;
            padding: 15px;
            font-size: 0.85rem;
            opacity: 0.8;
          }
          @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Reporte de Partida</h1>
            <p class="subtitle"><xsl:value-of select="/reporte/partida/titulo"/></p>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item">
              <div class="label">PIN</div>
              <div class="value"><xsl:value-of select="/reporte/partida/pin"/></div>
            </div>
            <div class="meta-item">
              <div class="label">Tipo</div>
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
              <div class="label">Inicio</div>
              <div class="value"><xsl:value-of select="/reporte/partida/fechaInicio"/></div>
            </div>
            <div class="meta-item">
              <div class="label">Fin</div>
              <div class="value"><xsl:value-of select="/reporte/partida/fechaFin"/></div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">🏆 Ranking de Jugadores</h2>
            <table>
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Nombre</th>
                  <th>Puntuación</th>
                  <th>Aciertos</th>
                  <th>Fallos</th>
                  <th>Sin responder</th>
                  <th>Estado</th>
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
                        <xsl:otherwise><xsl:value-of select="posicion"/></xsl:otherwise>
                      </xsl:choose>
                    </td>
                    <td><strong><xsl:value-of select="nombre"/></strong></td>
                    <td><strong><xsl:value-of select="puntuacion"/></strong></td>
                    <td><span class="badge badge-success"><xsl:value-of select="aciertos"/></span></td>
                    <td><span class="badge badge-danger"><xsl:value-of select="fallos"/></span></td>
                    <td><span class="badge badge-warning"><xsl:value-of select="sinResponder"/></span></td>
                    <td><xsl:value-of select="estado"/></td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2 class="section-title">📝 Resumen por Pregunta</h2>
            <xsl:for-each select="/reporte/preguntas/pregunta">
              <div class="pregunta-card">
                <div class="pregunta-header">
                  <span class="pregunta-num">Pregunta <xsl:value-of select="numero"/></span>
                  <span class="badge badge-success"><xsl:value-of select="porcentajeAcierto"/>% acierto</span>
                </div>
                <p class="pregunta-texto"><xsl:value-of select="texto"/></p>
                <div class="opciones-grid">
                  <xsl:for-each select="opciones/opcion">
                    <div>
                      <xsl:attribute name="class">
                        opcion <xsl:if test="esCorrecta = 'true'">correcta</xsl:if>
                      </xsl:attribute>
                      <xsl:if test="esCorrecta = 'true'">✓ </xsl:if>
                      <xsl:value-of select="texto"/>
                      <span class="count"><xsl:value-of select="vecesSeleccionada"/></span>
                    </div>
                  </xsl:for-each>
                </div>
              </div>
            </xsl:for-each>
          </div>
          
          <div class="footer">
            Generado por EusaQuiz | © 2026 EUSA - Campus Cámara de Comercio
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
