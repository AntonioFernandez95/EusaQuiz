const Usuario = require('../models/usuario');
const bcrypt = require('bcryptjs');
const { ROLES, CENTROS } = require('../utils/constants');

/**
 * Función para inicializar datos básicos en la BD (Seeding)
 */
const seedAdmin = async () => {
    try {
        // Verificar si ya existe un admin
        const adminExists = await Usuario.findOne({ rol: ROLES.ADMIN });

        if (adminExists) {
            console.log('ℹ️ Seeder: El usuario administrador ya existe.');
            return;
        }

        console.log('🚀 Seeder: Creando usuario administrador inicial...');

        const adminEmail = process.env.ADMIN_EMAIL || 'adminQuizz@gmail.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
        const adminNombre = process.env.ADMIN_NOMBRE || 'Administrador Quizz';

        // Haishear password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const newAdmin = new Usuario({
            idPortal: 'ADMIN_ROOT',
            nombre: adminNombre,
            email: adminEmail,
            password: hashedPassword,
            rol: ROLES.ADMIN,
            centro: 'NEGOCIOS',
            curso: null // El admin no suele tener curso asignado
        });

        await newAdmin.save();
        console.log(`✅ Seeder: Usuario administrador creado con éxito (${adminEmail})`);

    } catch (error) {
        console.error('❌ Error en el Seeder:', error);
    }
};

module.exports = seedAdmin;
