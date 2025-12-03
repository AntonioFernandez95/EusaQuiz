require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const socketStore = require('./src/sockets/socketStore');
const authFromParent = require('./src/middlewares/authFromParent');
const path = require('path');

// --- IMPORTAR MIDDLEWARES ---
const corsMiddleware = require('./src/middlewares/corsConfig'); // <--- NUEVO IMPORT

// Inicialización
const app = express();
const server = http.createServer(app);

// --- USAR MIDDLEWARES ---
app.use(corsMiddleware); // <--- MUCHO MÁS LIMPIO
app.use(express.json());

// --- Conexión a Base de Datos ---
connectDB();

// --- Configuración de Socket.io ---
// Nota: Socket.io necesita su propia config de CORS aparte de Express
const io = new Server(server, {
  cors: {
    // Aceptamos Angular Y el Live Server de VS Code (donde están tus HTML)
    origin: [
      "http://localhost:4200",
      "http://127.0.0.1:5500",
      "http://localhost:5500"
    ],
    methods: ["GET", "POST"]
  }
});

socketStore.setIoInstance(io);
require('./src/sockets/socketManager')(io);
app.set('socketio', io);

// --- Rutas API REST ---
app.use('/api/cuestionarios', require('./src/routes/cuestionarioRoutes'));
app.use('/api/preguntas', require('./src/routes/preguntaRoutes'));
app.use('/api/partidas', require('./src/routes/partidaRoutes'));
app.use('/api/usuarios', require('./src/routes/usuarioRoutes'));
app.use(authFromParent);
//Importar FRONT 
app.use(express.static(path.join(__dirname, '/Frontend/Pruebas_Backend/')));
// --- Arrancar Servidor ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});