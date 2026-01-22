const Partida = require('../models/partida');
const Participacion = require('../models/participacion');
const Usuario = require('../models/usuario');
const tipos = require('../utils/constants');

/**
 * global.disconnectTimeouts: Almacena los timers de desconexión para permitir reconexiones rápidas.
 */
if (!global.disconnectTimeouts) global.disconnectTimeouts = {};

module.exports = (io) => {

    io.on('connection', (socket) => {
        console.log(`⚡ Conexión entrante: ${socket.id}`);

        // UNIRSE A SALA
        socket.on('join_room', async (data) => {
            const sala = data.pin;
            socket.join(sala);
            socket.data.sala = sala;

            if (data.idAlumno) {
                // Si no viene idPartida en data, intentamos sacarlo de socket.data o buscarlo por PIN
                let idPartidaString = data.idPartida ? String(data.idPartida) : (socket.data.idPartida ? String(socket.data.idPartida) : null);

                socket.data.idAlumno = data.idAlumno;
                socket.data.esJugador = true;

                console.log(`✅ Alumno ${data.idAlumno} unido a sala ${sala}`);

                // Si aún no tenemos idPartida, lo buscamos en la DB por el PIN
                if (!idPartidaString) {
                    try {
                        const p = await Partida.findOne({ pin: sala, estadoPartida: { $ne: tipos.ESTADOS_PARTIDA.FINALIZADA } });
                        if (p) idPartidaString = String(p._id);
                    } catch (e) { console.error("Error buscando partida por PIN en join_room:", e); }
                }

                if (idPartidaString) {
                    socket.data.idPartida = idPartidaString;

                    // Cancelar timeout de abandono pendiente si existe
                    const timeoutKey = `disconnect_${idPartidaString}_${data.idAlumno}`;
                    if (global.disconnectTimeouts[timeoutKey]) {
                        clearTimeout(global.disconnectTimeouts[timeoutKey]);
                        delete global.disconnectTimeouts[timeoutKey];
                        console.log(`🔄 Timeout de abandono cancelado para ${data.idAlumno}`);
                    }
                }

                // Notificar a la sala
                try {
                    const usuario = await Usuario.findOne({ idPortal: data.idAlumno });
                    const partida = idPartidaString ? await Partida.findById(idPartidaString) : await Partida.findOne({ pin: sala });

                    if (usuario && partida) {
                        // Restaurar estado si el jugador estaba marcado como ABANDONADO
                        const jugador = partida.jugadores.find(j => j.idAlumno === data.idAlumno);
                        if (jugador && jugador.estado === tipos.ESTADO_USER.ABANDONADO) {
                            jugador.estado = tipos.ESTADO_USER.ACTIVO;
                            partida.numParticipantes = partida.jugadores.filter(j => j.estado !== tipos.ESTADO_USER.ABANDONADO).length;
                            await partida.save();
                            console.log(`🔄 Jugador ${data.idAlumno} reconectado. Estado restaurado a ACTIVO.`);
                        }

                        io.to(sala).emit('nuevo_jugador', {
                            nombre: usuario.nombre,
                            idAlumno: data.idAlumno,
                            total: partida.jugadores.length
                        });
                    }
                } catch (e) {
                    console.error("Error notificando nuevo_jugador:", e);
                }
            } else {
                console.log(`👨‍🏫 Profesor/Monitor unido a sala ${sala}`);

                // Si es profesor, también lo unimos a la sala de monitoreo privada para recibir notas
                if (data.esProfesor) {
                    socket.join(`monitor_${sala}`);
                    console.log(`👁️ Monitor unido a sala monitor_${sala}`);
                }

                try {
                    const partida = await Partida.findOne({ pin: sala });
                    if (partida && partida.estadoPartida === tipos.ESTADOS_PARTIDA.ESPERA) {
                        const currentPlayers = partida.jugadores.map(j => ({
                            idAlumno: j.idAlumno,
                            nombre: j.nombreAlumno
                        }));
                        socket.emit('estado_lobby', { jugadores: currentPlayers, total: currentPlayers.length });
                    }
                } catch (e) { console.error("Error enviando estado_lobby:", e); }
            }
        });

        // GESTIÓN DE DESCONEXIÓN
        socket.on('disconnect', async () => {
            console.log(`❌ Socket desconectado: ${socket.id}`);

            if (socket.data.esJugador && socket.data.idPartida && socket.data.idAlumno) {
                const idPartida = String(socket.data.idPartida);
                const idAlumno = String(socket.data.idAlumno);
                const sala = socket.data.sala;

                try {
                    const partida = await Partida.findById(idPartida);
                    if (!partida) return;

                    // CASO 1: PARTIDA ACTIVA -> Gracia de 8 segundos antes de marcar abandono
                    if (partida.estadoPartida === tipos.ESTADOS_PARTIDA.ACTIVA) {
                        const timeoutKey = `disconnect_${idPartida}_${idAlumno}`;
                        console.log(`⏳ Jugador ${idAlumno} desconectado de partida ACTIVA. Iniciando gracia de 8s...`);

                        if (global.disconnectTimeouts[timeoutKey]) clearTimeout(global.disconnectTimeouts[timeoutKey]);

                        global.disconnectTimeouts[timeoutKey] = setTimeout(async () => {
                            try {
                                const pActual = await Partida.findById(idPartida);
                                if (!pActual || pActual.estadoPartida !== tipos.ESTADOS_PARTIDA.ACTIVA) return;

                                const j = pActual.jugadores.find(jug => jug.idAlumno === idAlumno);
                                if (j && j.estado !== tipos.ESTADO_USER.ABANDONADO) {
                                    j.estado = tipos.ESTADO_USER.ABANDONADO;
                                    pActual.numParticipantes = pActual.jugadores.filter(jug => jug.estado !== tipos.ESTADO_USER.ABANDONADO).length;
                                    await pActual.save();

                                    console.log(`📉 Jugador ${idAlumno} abandonó definitivamente.`);
                                    io.to(sala).emit('usuario_desconectado', { modo: 'juego', idAlumno, totalParticipantes: pActual.numParticipantes });
                                }
                                delete global.disconnectTimeouts[timeoutKey];
                            } catch (err) { console.error("Error en grace timeout:", err); }
                        }, 8000); // Aumentado a 8 segundos por si acaso
                    }
                    // CASO 2: LOBBY -> Borrar inmediatamente
                    else if (partida.estadoPartida === tipos.ESTADOS_PARTIDA.ESPERA) {
                        partida.jugadores = partida.jugadores.filter(j => j.idAlumno !== idAlumno);
                        partida.numParticipantes = partida.jugadores.length;
                        await partida.save();
                        await Participacion.deleteOne({ idPartida, idAlumno });
                        console.log(`👋 Jugador ${idAlumno} salió del lobby.`);
                        io.to(sala).emit('usuario_desconectado', { modo: 'lobby', idAlumno, totalParticipantes: partida.numParticipantes });
                    }
                } catch (error) { console.error("Error en disconnect:", error); }
            }
        });
    });
};