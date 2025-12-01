const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const usuarioRoutes = require('./routes/usuario.routes');

app.use(express.json());

console.log("📡 Intentando conectar a:", process.env.MONGO_URI ? "URL encontrada" : "URL NO ENCONTRADA (Undefined)");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ Error conectando a Mongo:', err);
    console.log('💡 Consejo: Revisa que tu usuario y contraseña en el .env sean correctos.');
  });

app.use('/api/usuarios', usuarioRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});