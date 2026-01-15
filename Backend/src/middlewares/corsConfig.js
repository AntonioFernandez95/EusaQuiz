const cors = require('cors');

const corsOptions = {
    // Aquí definimos QUIÉN tiene permiso para hablar con el servidor.
    // 5500: Es el puerto por defecto de "Live Server" en VS Code (para los HTML de prueba).
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
};

module.exports = cors(corsOptions);