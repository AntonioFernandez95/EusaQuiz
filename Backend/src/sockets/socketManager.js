// src/sockets/socketManager.js

module.exports = (io) => {
    
    // Middleware de autenticación (Lo implementaremos más adelante)
    // io.use((socket, next) => { ... });

    io.on('connection', (socket) => {
        console.log(`⚡ Nuevo cliente conectado: ${socket.id}`);

        // Aquí importaremos los handlers específicos más adelante
        // gameHandler(io, socket);

        socket.on('disconnect', () => {
            console.log(`❌ Cliente desconectado: ${socket.id}`);
        });
    });
};