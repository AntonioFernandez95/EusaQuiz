const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // Para leer el .env

const app = express();
const PORT = process.env.PORT || 3000;
const usuariosRoutes = require('./routes/usuariosRoutes');

// Middleware para JSON [cite: 5]
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB con Mongoose'))
  .catch((err) => console.error('❌ Error de conexión a MongoDB:', err));

// Rutas
app.use('/api/usuarios', usuariosRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});