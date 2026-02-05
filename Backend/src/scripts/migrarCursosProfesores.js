/**
 * Script de migración: Convertir campo 'curso' a 'cursos' (array) para profesores
 * 
 * Ejecutar con: node src/scripts/migrarCursosProfesores.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const db = require('../config/db');

async function migrarCursosProfesores() {
    try {
        console.log('🔄 Iniciando migración de cursos de profesores...\n');

        // Conectar a la base de datos
        await db();
        console.log('✅ Conectado a la base de datos\n');

        // Acceso directo a la colección para evitar validación de Mongoose
        const usuariosCollection = mongoose.connection.db.collection('usuarios');

        // Buscar todos los profesores
        const profesores = await usuariosCollection.find({ rol: 'profesor' }).toArray();
        console.log(`📋 Encontrados ${profesores.length} profesores\n`);

        let migrados = 0;
        let yaConCursos = 0;
        let sinCurso = 0;

        for (const profesor of profesores) {
            // Si ya tiene cursos (array) con contenido, saltar
            if (profesor.cursos && profesor.cursos.length > 0) {
                yaConCursos++;
                console.log(`⏭️  ${profesor.nombre}: Ya tiene cursos asignados`);
                continue;
            }

            // Si tiene curso (singular), migrarlo a cursos (array)
            if (profesor.curso) {
                await usuariosCollection.updateOne(
                    { _id: profesor._id },
                    {
                        $set: { cursos: [profesor.curso] },
                        $unset: { curso: '' }
                    }
                );
                migrados++;
                console.log(`✅ ${profesor.nombre}: Migrado curso a cursos[]`);
            } else {
                sinCurso++;
                console.log(`⚠️  ${profesor.nombre}: Sin curso asignado`);
            }
        }

        console.log('\n========== RESUMEN ==========');
        console.log(`✅ Migrados: ${migrados}`);
        console.log(`⏭️  Ya tenían cursos[]: ${yaConCursos}`);
        console.log(`⚠️  Sin curso: ${sinCurso}`);
        console.log(`📊 Total profesores: ${profesores.length}`);
        console.log('==============================\n');

        console.log('🎉 Migración completada exitosamente!');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexión cerrada');
        process.exit(0);
    }
}

migrarCursosProfesores();
