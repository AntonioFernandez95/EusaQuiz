const cors = require('cors');

const corsOptions = {
    // Aquí definimos QUIÉN tiene permiso para hablar con el servidor.
    // 4200: Es tu futuro Frontend en Angular.
    // 5500: Es el puerto por defecto de "Live Server" en VS Code (para los HTML de prueba).
    origin: [
        "http://localhost:4200", 
        "http://127.0.0.1:5500", 
        "http://localhost:5500"
    ], 
    methods: ["GET", "POST", "PUT", "DELETE"],
};

module.exports = cors(corsOptions);