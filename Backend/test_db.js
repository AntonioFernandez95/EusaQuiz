require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
    console.log('Intentando conectar a MongoDB...');
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Conexión exitosa');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

test();
