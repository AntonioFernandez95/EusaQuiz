const Centro = require('../models/centro');
const Curso = require('../models/curso');
const Asignatura = require('../models/asignatura');

const datosAcademicosController = {
    // ==================== CENTROS ====================
    
    /**
     * Obtener todos los centros
     */
    getCentros: async (req, res) => {
        try {
            const centros = await Centro.find().sort({ nombre: 1 });
            res.json({ ok: true, data: centros });
        } catch (error) {
            console.error('Error en getCentros:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al obtener centros', error: error.message });
        }
    },

    /**
     * Crear un nuevo centro
     */
    createCentro: async (req, res) => {
        try {
            const { nombre, codigo } = req.body;
            
            if (!nombre || !codigo) {
                return res.status(400).json({ ok: false, mensaje: 'Nombre y código son requeridos' });
            }

            const centro = await Centro.create({ nombre, codigo });
            res.status(201).json({ ok: true, data: centro, mensaje: 'Centro creado correctamente' });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ ok: false, mensaje: 'Ya existe un centro con ese código' });
            }
            console.error('Error en createCentro:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al crear centro', error: error.message });
        }
    },

    /**
     * Actualizar un centro
     */
    updateCentro: async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, codigo } = req.body;

            const centro = await Centro.findByIdAndUpdate(
                id,
                { nombre, codigo },
                { new: true, runValidators: true }
            );

            if (!centro) {
                return res.status(404).json({ ok: false, mensaje: 'Centro no encontrado' });
            }

            res.json({ ok: true, data: centro, mensaje: 'Centro actualizado correctamente' });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ ok: false, mensaje: 'Ya existe un centro con ese código' });
            }
            console.error('Error en updateCentro:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al actualizar centro', error: error.message });
        }
    },

    /**
     * Eliminar un centro (con eliminación en cascada)
     */
    deleteCentro: async (req, res) => {
        try {
            const { id } = req.params;

            // Verificar que el centro existe
            const centro = await Centro.findById(id);
            if (!centro) {
                return res.status(404).json({ ok: false, mensaje: 'Centro no encontrado' });
            }

            // 1. Encontrar todos los cursos asociados al centro
            const cursosAsociados = await Curso.find({ centro: id });

            // 2. Para cada curso, eliminar todas las asignaturas asociadas
            for (const curso of cursosAsociados) {
                await Asignatura.deleteMany({ curso: curso._id });
            }

            // 3. Eliminar todos los cursos del centro
            await Curso.deleteMany({ centro: id });

            // 4. Finalmente, eliminar el centro
            await Centro.findByIdAndDelete(id);

            res.json({
                ok: true,
                mensaje: `Centro eliminado correctamente. Se eliminaron ${cursosAsociados.length} cursos y todas sus asignaturas asociadas.`
            });
        } catch (error) {
            console.error('Error en deleteCentro:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al eliminar centro', error: error.message });
        }
    },

    // ==================== CURSOS ====================

    /**
     * Obtener todos los cursos (opcionalmente filtrar por centro)
     */
    getCursos: async (req, res) => {
        try {
            const { centro } = req.query;
            const filtro = centro ? { centro } : {};
            
            const cursos = await Curso.find(filtro)
                .populate('centro', 'nombre codigo')
                .sort({ nombre: 1 });
            
            res.json({ ok: true, data: cursos });
        } catch (error) {
            console.error('Error en getCursos:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al obtener cursos', error: error.message });
        }
    },

    /**
     * Crear un nuevo curso
     */
    createCurso: async (req, res) => {
        try {
            const { nombre, codigo, centro } = req.body;
            
            if (!nombre || !codigo || !centro) {
                return res.status(400).json({ ok: false, mensaje: 'Nombre, código y centro son requeridos' });
            }

            // Verificar que el centro existe
            const centroExiste = await Centro.findById(centro);
            if (!centroExiste) {
                return res.status(400).json({ ok: false, mensaje: 'El centro especificado no existe' });
            }

            const curso = await Curso.create({ nombre, codigo, centro });
            const cursoPopulado = await Curso.findById(curso._id).populate('centro', 'nombre codigo');
            
            res.status(201).json({ ok: true, data: cursoPopulado, mensaje: 'Curso creado correctamente' });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ ok: false, mensaje: 'Ya existe un curso con ese código' });
            }
            console.error('Error en createCurso:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al crear curso', error: error.message });
        }
    },

    /**
     * Actualizar un curso
     */
    updateCurso: async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, codigo, centro } = req.body;

            if (centro) {
                const centroExiste = await Centro.findById(centro);
                if (!centroExiste) {
                    return res.status(400).json({ ok: false, mensaje: 'El centro especificado no existe' });
                }
            }

            const curso = await Curso.findByIdAndUpdate(
                id,
                { nombre, codigo, centro },
                { new: true, runValidators: true }
            ).populate('centro', 'nombre codigo');

            if (!curso) {
                return res.status(404).json({ ok: false, mensaje: 'Curso no encontrado' });
            }

            res.json({ ok: true, data: curso, mensaje: 'Curso actualizado correctamente' });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ ok: false, mensaje: 'Ya existe un curso con ese código' });
            }
            console.error('Error en updateCurso:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al actualizar curso', error: error.message });
        }
    },

    /**
     * Eliminar un curso (con eliminación en cascada)
     */
    deleteCurso: async (req, res) => {
        try {
            const { id } = req.params;

            // Verificar que el curso existe
            const curso = await Curso.findById(id);
            if (!curso) {
                return res.status(404).json({ ok: false, mensaje: 'Curso no encontrado' });
            }

            // 1. Contar asignaturas antes de eliminar
            const asignaturasCount = await Asignatura.countDocuments({ curso: id });

            // 2. Eliminar todas las asignaturas asociadas al curso
            await Asignatura.deleteMany({ curso: id });

            // 3. Eliminar el curso
            await Curso.findByIdAndDelete(id);

            res.json({
                ok: true,
                mensaje: `Curso eliminado correctamente. Se eliminaron ${asignaturasCount} asignaturas asociadas.`
            });
        } catch (error) {
            console.error('Error en deleteCurso:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al eliminar curso', error: error.message });
        }
    },

    // ==================== ASIGNATURAS ====================

    /**
     * Obtener todas las asignaturas (opcionalmente filtrar por curso)
     */
    getAsignaturas: async (req, res) => {
        try {
            const { curso } = req.query;
            const filtro = curso ? { curso } : {};
            
            const asignaturas = await Asignatura.find(filtro)
                .populate({
                    path: 'curso',
                    populate: { path: 'centro', select: 'nombre codigo' }
                })
                .sort({ nombre: 1 });
            
            res.json({ ok: true, data: asignaturas });
        } catch (error) {
            console.error('Error en getAsignaturas:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al obtener asignaturas', error: error.message });
        }
    },

    /**
     * Crear una nueva asignatura
     */
    createAsignatura: async (req, res) => {
        try {
            const { nombre, curso } = req.body;
            
            if (!nombre || !curso) {
                return res.status(400).json({ ok: false, mensaje: 'Nombre y curso son requeridos' });
            }

            // Verificar que el curso existe
            const cursoExiste = await Curso.findById(curso);
            if (!cursoExiste) {
                return res.status(400).json({ ok: false, mensaje: 'El curso especificado no existe' });
            }

            const asignatura = await Asignatura.create({ nombre, curso });
            const asignaturaPopulada = await Asignatura.findById(asignatura._id)
                .populate({
                    path: 'curso',
                    populate: { path: 'centro', select: 'nombre codigo' }
                });
            
            res.status(201).json({ ok: true, data: asignaturaPopulada, mensaje: 'Asignatura creada correctamente' });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ ok: false, mensaje: 'Ya existe esa asignatura en el curso' });
            }
            console.error('Error en createAsignatura:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al crear asignatura', error: error.message });
        }
    },

    /**
     * Actualizar una asignatura
     */
    updateAsignatura: async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, curso } = req.body;

            if (curso) {
                const cursoExiste = await Curso.findById(curso);
                if (!cursoExiste) {
                    return res.status(400).json({ ok: false, mensaje: 'El curso especificado no existe' });
                }
            }

            const asignatura = await Asignatura.findByIdAndUpdate(
                id,
                { nombre, curso },
                { new: true, runValidators: true }
            ).populate({
                path: 'curso',
                populate: { path: 'centro', select: 'nombre codigo' }
            });

            if (!asignatura) {
                return res.status(404).json({ ok: false, mensaje: 'Asignatura no encontrada' });
            }

            res.json({ ok: true, data: asignatura, mensaje: 'Asignatura actualizada correctamente' });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ ok: false, mensaje: 'Ya existe esa asignatura en el curso' });
            }
            console.error('Error en updateAsignatura:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al actualizar asignatura', error: error.message });
        }
    },

    /**
     * Eliminar una asignatura
     */
    deleteAsignatura: async (req, res) => {
        try {
            const { id } = req.params;

            const asignatura = await Asignatura.findByIdAndDelete(id);
            if (!asignatura) {
                return res.status(404).json({ ok: false, mensaje: 'Asignatura no encontrada' });
            }

            res.json({ ok: true, mensaje: 'Asignatura eliminada correctamente' });
        } catch (error) {
            console.error('Error en deleteAsignatura:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al eliminar asignatura', error: error.message });
        }
    },

    // ==================== UTILIDADES ====================

    /**
     * Obtener todos los datos académicos (para dropdowns en frontend)
     */
    getAllDatosAcademicos: async (req, res) => {
        try {
            const [centros, cursos, asignaturas] = await Promise.all([
                Centro.find().sort({ nombre: 1 }),
                Curso.find().populate('centro', 'nombre codigo').sort({ nombre: 1 }),
                Asignatura.find().populate({
                    path: 'curso',
                    populate: { path: 'centro', select: 'nombre codigo' }
                }).sort({ nombre: 1 })
            ]);

            res.json({ 
                ok: true, 
                data: { centros, cursos, asignaturas } 
            });
        } catch (error) {
            console.error('Error en getAllDatosAcademicos:', error);
            res.status(500).json({ ok: false, mensaje: 'Error al obtener datos académicos', error: error.message });
        }
    }
};

module.exports = datosAcademicosController;
