const express = require('express');
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Error: La variable MONGO_URI no está definida en el archivo .env.");
  process.exit(1);
}

console.log("📡 Intentando conectar a MongoDB Atlas...");

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB Atlas con éxito');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error conectando a Mongo:', err.message);
    console.log('💡 Consejo: Revisa que la URI en tu archivo .env sea correcta (usuario, contraseña y nombre de la base de datos).');
  });

// Ruta de prueba simple (opcional)
app.get('/', (req, res) => {
  res.send('Servidor Express funcionando y conectado a MongoDB.');
});