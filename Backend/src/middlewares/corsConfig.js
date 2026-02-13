const cors = require('cors');

const corsOptions = {
<<<<<<< HEAD
    // Aquí definimos QUIÉN tiene permiso para hablar con el servidor.
    // 5500: Es el puerto por defecto de "Live Server" en VS Code (para los HTML de prueba).
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
=======
    // Permitir cualquier origen para port forwarding de VS Code
    origin: function (origin, callback) {
        // Permitir requests sin origin (como mobile apps o curl)
        // y cualquier origen de VS Code port forwarding (*.devtunnels.ms)
        if (!origin || 
            origin.includes('localhost') || 
            origin.includes('127.0.0.1') ||
            origin.includes('.devtunnels.ms') ||  // VS Code port forwarding
            origin.includes('.github.dev')) {     // GitHub Codespaces
            callback(null, true);
        } else {
            callback(null, true); // Permitir todos los orígenes para desarrollo
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
>>>>>>> presentacion
};

module.exports = cors(corsOptions);