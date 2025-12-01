// src/sockets/socketStore.js

let io;

/**
 * Almacena la instancia de Socket.io Server (llamado desde server.js)
 */
const setIoInstance = (ioInstance) => {
    io = ioInstance;
};

/**
 * Obtiene la instancia de Socket.io Server (llamado desde Controllers o Handlers)
 */
const getIoInstance = () => {
    if (!io) {
        throw new Error("Socket.io no ha sido inicializado. Llama a setIoInstance() primero.");
    }
    return io;
};

module.exports = {
    setIoInstance,
    getIoInstance
};