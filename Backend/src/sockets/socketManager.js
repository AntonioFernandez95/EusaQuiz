module.exports = (io) => {
    
    io.on('connection', (socket) => {
        console.log(`⚡ Nuevo cliente conectado: ${socket.id}`);

        // --- ESTO ES LO QUE TE FALTABA ---
        // Escuchar cuando un cliente (Profe o Alumno) quiere unirse a una sala
        socket.on('join_room', (room) => {
            // El método .join() es nativo de Socket.io y mete al socket en ese canal
            socket.join(room); 
            
            console.log(`✅ Socket ${socket.id} se ha unido a la sala: ${room}`);
            
            // Opcional: Responder al cliente confirmando que entró
            socket.emit('joined_room', { room });
        });
        // ---------------------------------

        socket.on('disconnect', () => {
            console.log(`❌ Cliente desconectado: ${socket.id}`);
        });
    });
};