// src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Error conectando a MongoDB: ${error.message}`);
        console.log('💡 Consejo: Revisa tu IP en la Whitelist de MongoDB Atlas o tu archivo .env');
        process.exit(1); // Detener la app si no hay base de datos
    }
};

module.exports = connectDB;