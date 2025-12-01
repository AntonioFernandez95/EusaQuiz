const cors = require('cors');

const corsOptions = {
    origin: "http://localhost:4200", // La URL de tu Frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Permitir cookies/headers de autorización
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Exportamos la ejecución de cors con las opciones ya configuradas
module.exports = cors(corsOptions);