require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const socketStore = require('./src/sockets/socketStore');
const authFromParent = require('./src/middlewares/authFromParent');
const path = require('path');

// --- IMPORTAR MIDDLEWARES ---
const corsMiddleware = require('./src/middlewares/corsConfig');

// Inicialización
const app = express();
const server = http.createServer(app);

// --- USAR MIDDLEWARES ---
app.use(corsMiddleware);
app.use(express.json());

// --- Conexión a Base de Datos ---
connectDB();

// --- Configuración de Socket.io ---
// Nota: Socket.io necesita su propia config de CORS aparte de Express
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "/\. devtunnels\. ms$/"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],

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
app.use(express.static(path.join(__dirname, '../Frontend/Pruebas_Backend/')));
// --- Arrancar Servidor ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});