const cors = require('cors');

const corsOptions = {
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
};

module.exports = cors(corsOptions);