const Partida = require('../models/partida');
const Participacion = require('../models/participacion');
const Usuario = require('../models/usuario');
const tipos = require('../utils/constants');

module.exports = (io) => {

    io.on('connection', (socket) => {
        console.log(`⚡ Conexión entrante: ${socket.id}`);

        // UNIRSE A SALA
        socket.on('join_room', async (data) => {
            // data trae: { pin, idPartida, idAlumno } o solo { pin } si es profe
            const sala = data.pin;
            socket.join(sala);

            // Guardamos datos en el socket para saber quién es si se desconecta
            socket.data.sala = sala;

            if (data.idAlumno) {
                socket.data.idAlumno = data.idAlumno;
                socket.data.idPartida = data.idPartida;
                socket.data.esJugador = true;
                console.log(`✅ Alumno ${data.idAlumno} unido a sala ${sala}`);

                // Notificar a la sala que un jugador se ha conectado/reconectado
                try {
                    const usuario = await Usuario.findOne({ idPortal: data.idAlumno });
                    const partida = await Partida.findOne({ pin: sala });
                    if (usuario && partida) {
                        io.to(sala).emit('nuevo_jugador', {
                            nombre: usuario.nombre,
                            idAlumno: data.idAlumno,
                            total: partida.jugadores.length
                        });
                    }
                } catch (e) {
                    console.error("Error notificando nuevo_jugador en join_room:", e);
                }
            } else {
                console.log(`👨‍🏫 Profesor/Monitor unido a sala ${sala}`);
                // Recuperar estado actual si es lobby
                try {
                    const partida = await Partida.findOne({ pin: sala });
                    if (partida && partida.estadoPartida === tipos.ESTADOS_PARTIDA.ESPERA) {
                        const currentPlayers = partida.jugadores.map(j => ({
                            idAlumno: j.idAlumno,
                            nombre: j.nombreAlumno
                        }));

                        socket.emit('estado_lobby', {
                            jugadores: currentPlayers,
                            total: currentPlayers.length
                        });
                    }
                } catch (e) { console.error("Error enviando estado_lobby:", e); }
            }
        });

        // GESTIÓN DE DESCONEXIÓN
        socket.on('disconnect', async () => {
            console.log(`❌ Socket desconectado: ${socket.id}`);

            if (socket.data.esJugador && socket.data.idPartida) {
                const { idPartida, idAlumno, sala } = socket.data;

                try {
                    const partida = await Partida.findById(idPartida);
                    if (!partida) return;

                    // CASO 1: PARTIDA EN JUEGO (ACTIVA) -> Marcar como Abandonado
                    if (partida.estadoPartida === tipos.ESTADOS_PARTIDA.ACTIVA) {
                        const jugador = partida.jugadores.find(j => j.idAlumno === idAlumno);
                        if (jugador) jugador.estado = tipos.ESTADO_USER.ABANDONADO;

                        // Recalcular activos
                        const activos = partida.jugadores.filter(j => j.estado !== tipos.ESTADO_USER.ABANDONADO).length;
                        partida.numParticipantes = activos;
                        await partida.save();

                        console.log(`📉 (Juego) Jugador ${idAlumno} abandonó.`);

                        io.to(sala).emit('usuario_desconectado', {
                            modo: 'juego',
                            idAlumno,
                            totalParticipantes: activos
                        });
                    }

                    // CASO 2: PARTIDA EN LOBBY (ESPERA) -> Borrar totalmente
                    else if (partida.estadoPartida === tipos.ESTADOS_PARTIDA.ESPERA) {
                        // Borrar del array de jugadores
                        partida.jugadores = partida.jugadores.filter(j => j.idAlumno !== idAlumno);
                        partida.numParticipantes = partida.jugadores.length;
                        await partida.save();

                        // Borrar participación
                        await Participacion.deleteOne({ idPartida, idAlumno });

                        console.log(`👋 (Lobby) Jugador ${idAlumno} salió de la sala.`);

                        io.to(sala).emit('usuario_desconectado', {
                            modo: 'lobby',
                            idAlumno,
                            totalParticipantes: partida.numParticipantes
                        });
                    }

                } catch (error) {
                    console.error("Error gestionando desconexión:", error);
                }
            }
        });
    });
};