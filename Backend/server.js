require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const socketStore = require('./src/sockets/socketStore');
const authFromParent = require('./src/middlewares/authFromParent');
const path = require('path');
const setupSwagger = require('./src/config/swagger');
// --- IMPORTAR MIDDLEWARES ---
const corsMiddleware = require('./src/middlewares/corsConfig');

// Inicialización
const app = express();
const server = http.createServer(app);

// --- USAR MIDDLEWARES ---
app.use(corsMiddleware);
app.use(express.json());

// --- Conexión a Base de Datos ---
connectDB().then(() => {
  const seedAdmin = require('./src/config/seeder');
  seedAdmin();
});

// --- Configuración de Socket.io ---
// Nota: Socket.io necesita su propia config de CORS aparte de Express
const io = new Server(server, {
  cors: {
<<<<<<< HEAD
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],

=======
    origin: function (origin, callback) {
      // Mismo criterio que el middleware CORS
      if (!origin || 
          origin.includes('localhost') || 
          origin.includes('127.0.0.1') ||
          origin.includes('.devtunnels.ms') ||  // VS Code port forwarding
          origin.includes('.github.dev')) {     // GitHub Codespaces
        callback(null, true);
      } else {
        callback(null, true); // Permitir todos para desarrollo
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
>>>>>>> presentacion
  }
});

socketStore.setIoInstance(io);
require('./src/sockets/socketManager')(io);
app.set('socketio', io);

//SWAGGER
setupSwagger(app);

// --- Middlewares de Autenticación y Carga de Usuario ---
app.use(authFromParent);

// --- Rutas API REST ---
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/cuestionarios', require('./src/routes/cuestionarioRoutes'));
app.use('/api/preguntas', require('./src/routes/preguntaRoutes'));
app.use('/api/partidas', require('./src/routes/partidaRoutes'));
app.use('/api/usuarios', require('./src/routes/usuarioRoutes'));
app.use('/api/participaciones', require('./src/routes/participacionRoutes'));
app.use('/api/import', require('./src/routes/importRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/datos-academicos', require('./src/routes/datosAcademicosRoutes'));
//Servir archivos estáticos (Imágenes de perfil)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//Importar FRONT 
<<<<<<< HEAD
app.use(express.static(path.join(__dirname, '../Frontend/Pruebas_Backend/')));
=======
app.use(express.static(path.join(__dirname, '../frontend/dist/campus-quiz')));

// Ruta info del API
app.get('/api/info', (req, res) => {
  res.json({
    mensaje: '🎮 API de EusaQuiz funcionando',
    version: '1.0.0',
    docs: '/api-docs'
  });
});

// Catch-all: servir Angular para cualquier ruta que no sea API
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/campus-quiz/index.html'));
});

>>>>>>> presentacion
// --- Arrancar Servidor ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});