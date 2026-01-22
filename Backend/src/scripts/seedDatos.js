/**
 * Script de seed para poblar la base de datos con centros, cursos y asignaturas
 * Ejecutar con: node src/scripts/seedDatos.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Centro = require('../models/centro');
const Curso = require('../models/curso');
const Asignatura = require('../models/asignatura');

const MONGO_URI = process.env.MONGO_URI;

// Datos de los centros
const centrosData = [
    { nombre: 'Campus Cámara FP', codigo: 'CAMPUS_CAMARA' },
    { nombre: 'EUSA', codigo: 'EUSA' }
];

// Datos de los cursos (se asignarán a ambos centros)
const cursosData = [
    { nombre: '1 DAM', codigo: 'DAM1' },
    { nombre: '2 DAM', codigo: 'DAM2' },
    { nombre: '1 DAW', codigo: 'DAW1' },
    { nombre: '2 DAW', codigo: 'DAW2' },
    { nombre: '1 ASIR', codigo: 'ASIR1' },
    { nombre: '2 ASIR', codigo: 'ASIR2' }
];

// Asignaturas por curso
const asignaturasPorCurso = {
    DAM1: [
        'Sistemas Informáticos',
        'Bases de Datos',
        'Programación',
        'Lenguajes de Marcas',
        'Entornos de Desarrollo',
        'Formación y Orientación Laboral',
        'Digitalización Aplicada',
        'Sostenibilidad Aplicada'
    ],
    DAM2: [
        'Acceso a Datos',
        'Desarrollo de Interfaces',
        'Programación Multimedia y Dispositivos Móviles',
        'Programación de Servicios y Procesos',
        'Sistemas de Gestión Empresarial',
        'Empresa e Iniciativa Emprendedora',
        'Proyecto de Desarrollo de Aplicaciones Multiplataforma',
        'Formación en Centros de Trabajo'
    ],
    DAW1: [
        'Sistemas Informáticos',
        'Bases de Datos',
        'Programación',
        'Lenguajes de Marcas',
        'Entornos de Desarrollo',
        'Formación y Orientación Laboral',
        'Digitalización Aplicada',
        'Sostenibilidad Aplicada'
    ],
    DAW2: [
        'Desarrollo Web en Entorno Cliente',
        'Desarrollo Web en Entorno Servidor',
        'Despliegue de Aplicaciones Web',
        'Diseño de Interfaces Web',
        'Empresa e Iniciativa Emprendedora',
        'Proyecto de Desarrollo de Aplicaciones Web',
        'Formación en Centros de Trabajo'
    ],
    ASIR1: [
        'Implantación de Sistemas Operativos',
        'Planificación y Administración de Redes',
        'Fundamentos de Hardware',
        'Gestión de Bases de Datos',
        'Lenguajes de Marcas',
        'Formación y Orientación Laboral',
        'Digitalización Aplicada',
        'Sostenibilidad Aplicada'
    ],
    ASIR2: [
        'Administración de Sistemas Operativos',
        'Servicios de Red e Internet',
        'Implantación de Aplicaciones Web',
        'Administración de Sistemas Gestores de Bases de Datos',
        'Seguridad y Alta Disponibilidad',
        'Empresa e Iniciativa Emprendedora',
        'Proyecto de Administración de Sistemas Informáticos en Red',
        'Formación en Centros de Trabajo'
    ]
};

async function seed() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado a MongoDB');

        // Preguntar si se quiere limpiar datos existentes
        const args = process.argv.slice(2);
        const limpiar = args.includes('--clean');

        if (limpiar) {
            console.log('🧹 Limpiando colecciones existentes...');
            await Asignatura.deleteMany({});
            await Curso.deleteMany({});
            await Centro.deleteMany({});
            console.log('✅ Colecciones limpiadas');
        }

        // 1. Crear centros
        console.log('\n📍 Creando centros...');
        const centrosCreados = {};
        for (const centroData of centrosData) {
            let centro = await Centro.findOne({ codigo: centroData.codigo });
            if (!centro) {
                centro = await Centro.create(centroData);
                console.log(`  ✅ Centro creado: ${centro.nombre}`);
            } else {
                console.log(`  ⏭️  Centro ya existe: ${centro.nombre}`);
            }
            centrosCreados[centroData.codigo] = centro;
        }

        // 2. Crear cursos (para el centro Campus Cámara por defecto)
        // Puedes modificar esto para crear cursos en ambos centros si es necesario
        console.log('\n📚 Creando cursos...');
        const centroDefault = centrosCreados['CAMPUS_CAMARA'];
        const cursosCreados = {};
        
        for (const cursoData of cursosData) {
            let curso = await Curso.findOne({ codigo: cursoData.codigo });
            if (!curso) {
                curso = await Curso.create({
                    ...cursoData,
                    centro: centroDefault._id
                });
                console.log(`  ✅ Curso creado: ${curso.nombre}`);
            } else {
                console.log(`  ⏭️  Curso ya existe: ${curso.nombre}`);
            }
            cursosCreados[cursoData.codigo] = curso;
        }

        // 3. Crear asignaturas
        console.log('\n📖 Creando asignaturas...');
        let asignaturasCreadas = 0;
        let asignaturasExistentes = 0;

        for (const [codigoCurso, asignaturas] of Object.entries(asignaturasPorCurso)) {
            const curso = cursosCreados[codigoCurso];
            if (!curso) {
                console.log(`  ⚠️  Curso ${codigoCurso} no encontrado, saltando asignaturas`);
                continue;
            }

            for (const nombreAsignatura of asignaturas) {
                const existe = await Asignatura.findOne({ 
                    nombre: nombreAsignatura, 
                    curso: curso._id 
                });
                
                if (!existe) {
                    await Asignatura.create({
                        nombre: nombreAsignatura,
                        curso: curso._id
                    });
                    asignaturasCreadas++;
                } else {
                    asignaturasExistentes++;
                }
            }
            console.log(`  ✅ Asignaturas de ${codigoCurso} procesadas`);
        }

        console.log(`\n📊 Resumen de asignaturas:`);
        console.log(`  - Creadas: ${asignaturasCreadas}`);
        console.log(`  - Ya existían: ${asignaturasExistentes}`);

        // Resumen final
        console.log('\n✅ Seed completado exitosamente!');
        console.log('\n📊 Totales en base de datos:');
        console.log(`  - Centros: ${await Centro.countDocuments()}`);
        console.log(`  - Cursos: ${await Curso.countDocuments()}`);
        console.log(`  - Asignaturas: ${await Asignatura.countDocuments()}`);

    } catch (error) {
        console.error('❌ Error durante el seed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

seed();
