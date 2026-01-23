/**
 * Script de migración para convertir strings a ObjectId en usuarios y cuestionarios
 * 
 * IMPORTANTE: Ejecutar DESPUÉS de seedDatos.js
 * Ejecutar con: node src/scripts/migrarDatos.js
 * 
 * Modo simulación (no hace cambios): node src/scripts/migrarDatos.js --dry-run
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Centro = require('../models/centro');
const Curso = require('../models/curso');
const Asignatura = require('../models/asignatura');

const MONGO_URI = process.env.MONGO_URI;

// Mapeo de nombres/códigos antiguos a los nuevos
const MAPEO_CENTROS = {
    'Campus Camara': 'CAMPUS_CAMARA',
    'Campus Cámara': 'CAMPUS_CAMARA',
    'Campus Cámara FP': 'CAMPUS_CAMARA',
    'CAMPUS_CAMARA': 'CAMPUS_CAMARA',
    'Facultad de Negocios': 'NEGOCIOS'
};

const MAPEO_CURSOS = {
    '1 DAM': 'DAM1',
    '2 DAM': 'DAM2',
    '1 DAW': 'DAW1',
    '2 DAW': 'DAW2',
    '1 ASIR': 'ASIR1',
    '2 ASIR': 'ASIR2',
    'DAM1': 'DAM1',
    'DAM2': 'DAM2',
    'DAW1': 'DAW1',
    'DAW2': 'DAW2',
    'ASIR1': 'ASIR1',
    'ASIR2': 'ASIR2'
};

async function migrar() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    if (dryRun) {
        console.log('🔍 MODO SIMULACIÓN - No se harán cambios reales\n');
    }

    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Cargar los datos de referencia
        const centros = await Centro.find();
        const cursos = await Curso.find();
        const asignaturas = await Asignatura.find();

        console.log(`📊 Datos de referencia cargados:`);
        console.log(`   - Centros: ${centros.length}`);
        console.log(`   - Cursos: ${cursos.length}`);
        console.log(`   - Asignaturas: ${asignaturas.length}\n`);

        if (centros.length === 0) {
            console.log('❌ No hay centros en la base de datos. Ejecuta primero seedDatos.js');
            return;
        }

        // Crear mapas para búsqueda rápida
        const centrosPorCodigo = {};
        centros.forEach(c => { centrosPorCodigo[c.codigo] = c._id; });

        const cursosPorCodigo = {};
        cursos.forEach(c => { cursosPorCodigo[c.codigo] = c._id; });

        const asignaturasPorNombreYCurso = {};
        asignaturas.forEach(a => {
            const key = `${a.nombre}|${a.curso.toString()}`;
            asignaturasPorNombreYCurso[key] = a._id;
        });

        // ==================== MIGRAR USUARIOS ====================
        console.log('👤 Migrando usuarios...');
        
        // Acceder directamente a la colección para evitar validaciones del schema
        const usuariosCollection = mongoose.connection.collection('usuarios');
        const usuarios = await usuariosCollection.find({}).toArray();
        
        let usuariosMigrados = 0;
        let usuariosErrores = 0;
        let usuariosOmitidos = 0;

        for (const usuario of usuarios) {
            try {
                // Si ya tiene ObjectId en centro, omitir
                if (usuario.centro && typeof usuario.centro === 'object') {
                    usuariosOmitidos++;
                    continue;
                }

                const updates = {};

                // Migrar centro
                if (usuario.centro && typeof usuario.centro === 'string') {
                    const codigoCentro = MAPEO_CENTROS[usuario.centro];
                    if (codigoCentro && centrosPorCodigo[codigoCentro]) {
                        updates.centro = centrosPorCodigo[codigoCentro];
                    } else {
                        console.log(`  ⚠️  Usuario ${usuario.idPortal}: Centro no encontrado: "${usuario.centro}"`);
                    }
                }

                // Migrar curso
                if (usuario.curso && typeof usuario.curso === 'string') {
                    const codigoCurso = MAPEO_CURSOS[usuario.curso];
                    if (codigoCurso && cursosPorCodigo[codigoCurso]) {
                        updates.curso = cursosPorCodigo[codigoCurso];
                    } else if (usuario.curso !== 'null' && usuario.curso !== null) {
                        console.log(`  ⚠️  Usuario ${usuario.idPortal}: Curso no encontrado: "${usuario.curso}"`);
                    }
                }

                // Migrar asignaturas (array de strings a array de ObjectId)
                if (usuario.asignaturas && Array.isArray(usuario.asignaturas) && usuario.asignaturas.length > 0) {
                    const cursoId = updates.curso || usuario.curso;
                    if (cursoId && typeof usuario.asignaturas[0] === 'string') {
                        const asignaturasIds = [];
                        for (const nombreAsig of usuario.asignaturas) {
                            const key = `${nombreAsig}|${cursoId.toString()}`;
                            if (asignaturasPorNombreYCurso[key]) {
                                asignaturasIds.push(asignaturasPorNombreYCurso[key]);
                            } else {
                                // Buscar en cualquier curso si no se encuentra en el específico
                                const asigFound = asignaturas.find(a => a.nombre === nombreAsig);
                                if (asigFound) {
                                    asignaturasIds.push(asigFound._id);
                                } else {
                                    console.log(`  ⚠️  Usuario ${usuario.idPortal}: Asignatura no encontrada: "${nombreAsig}"`);
                                }
                            }
                        }
                        if (asignaturasIds.length > 0) {
                            updates.asignaturas = asignaturasIds;
                        }
                    }
                }

                if (Object.keys(updates).length > 0) {
                    if (!dryRun) {
                        await usuariosCollection.updateOne(
                            { _id: usuario._id },
                            { $set: updates }
                        );
                    }
                    usuariosMigrados++;
                    console.log(`  ✅ Usuario migrado: ${usuario.idPortal}`);
                } else {
                    usuariosOmitidos++;
                }
            } catch (err) {
                usuariosErrores++;
                console.log(`  ❌ Error en usuario ${usuario.idPortal}: ${err.message}`);
            }
        }

        console.log(`\n📊 Resumen usuarios:`);
        console.log(`   - Migrados: ${usuariosMigrados}`);
        console.log(`   - Omitidos (ya migrados o sin cambios): ${usuariosOmitidos}`);
        console.log(`   - Errores: ${usuariosErrores}`);

        // ==================== MIGRAR CUESTIONARIOS ====================
        console.log('\n📝 Migrando cuestionarios...');
        
        const cuestionariosCollection = mongoose.connection.collection('cuestionarios');
        const cuestionarios = await cuestionariosCollection.find({}).toArray();
        
        let cuestionariosMigrados = 0;
        let cuestionariosErrores = 0;
        let cuestionariosOmitidos = 0;

        for (const cuestionario of cuestionarios) {
            try {
                // Si ya tiene ObjectId en centro, omitir
                if (cuestionario.centro && typeof cuestionario.centro === 'object') {
                    cuestionariosOmitidos++;
                    continue;
                }

                const updates = {};

                // Migrar centro
                if (cuestionario.centro && typeof cuestionario.centro === 'string') {
                    const codigoCentro = MAPEO_CENTROS[cuestionario.centro];
                    if (codigoCentro && centrosPorCodigo[codigoCentro]) {
                        updates.centro = centrosPorCodigo[codigoCentro];
                    } else {
                        console.log(`  ⚠️  Cuestionario "${cuestionario.titulo}": Centro no encontrado: "${cuestionario.centro}"`);
                    }
                }

                // Migrar curso
                if (cuestionario.curso && typeof cuestionario.curso === 'string') {
                    const codigoCurso = MAPEO_CURSOS[cuestionario.curso];
                    if (codigoCurso && cursosPorCodigo[codigoCurso]) {
                        updates.curso = cursosPorCodigo[codigoCurso];
                    } else if (cuestionario.curso !== 'null' && cuestionario.curso !== null) {
                        console.log(`  ⚠️  Cuestionario "${cuestionario.titulo}": Curso no encontrado: "${cuestionario.curso}"`);
                    }
                }

                // Migrar asignatura
                if (cuestionario.asignatura && typeof cuestionario.asignatura === 'string') {
                    const cursoId = updates.curso || cuestionario.curso;
                    if (cursoId && typeof cursoId === 'object') {
                        const key = `${cuestionario.asignatura}|${cursoId.toString()}`;
                        if (asignaturasPorNombreYCurso[key]) {
                            updates.asignatura = asignaturasPorNombreYCurso[key];
                        } else {
                            // Buscar en cualquier curso
                            const asigFound = asignaturas.find(a => a.nombre === cuestionario.asignatura);
                            if (asigFound) {
                                updates.asignatura = asigFound._id;
                            } else {
                                console.log(`  ⚠️  Cuestionario "${cuestionario.titulo}": Asignatura no encontrada: "${cuestionario.asignatura}"`);
                            }
                        }
                    }
                }

                if (Object.keys(updates).length > 0) {
                    if (!dryRun) {
                        await cuestionariosCollection.updateOne(
                            { _id: cuestionario._id },
                            { $set: updates }
                        );
                    }
                    cuestionariosMigrados++;
                    console.log(`  ✅ Cuestionario migrado: "${cuestionario.titulo}"`);
                } else {
                    cuestionariosOmitidos++;
                }
            } catch (err) {
                cuestionariosErrores++;
                console.log(`  ❌ Error en cuestionario "${cuestionario.titulo}": ${err.message}`);
            }
        }

        console.log(`\n📊 Resumen cuestionarios:`);
        console.log(`   - Migrados: ${cuestionariosMigrados}`);
        console.log(`   - Omitidos (ya migrados o sin cambios): ${cuestionariosOmitidos}`);
        console.log(`   - Errores: ${cuestionariosErrores}`);

        console.log('\n✅ Migración completada!');
        
        if (dryRun) {
            console.log('\n⚠️  MODO SIMULACIÓN - Ejecuta sin --dry-run para aplicar los cambios');
        }

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

migrar();
