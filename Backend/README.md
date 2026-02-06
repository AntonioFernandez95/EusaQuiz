# Backend - CampusQuiz

API REST desarrollada con Node.js y Express. Gestiona toda la lógica de negocio y comunicación en tiempo real.

## Arquitectura

El proyecto implementa una arquitectura MVC en capas:

```
src/
├── config/             # Configuración
│   ├── db.js           # Conexión MongoDB
│   ├── seeder.js       # Datos iniciales
│   └── swagger.js      # Documentación API
│
├── controllers/        # Controladores HTTP
│   ├── authController.js
│   ├── cuestionarioController.js
│   ├── partidaController.js
│   └── ...
│
├── services/           # Lógica de negocio
│   ├── cuestionarioService.js
│   ├── partidaService.js
│   ├── emailService.js
│   └── ...
│
├── models/             # Esquemas Mongoose
│   ├── usuario.js
│   ├── cuestionario.js
│   ├── partida.js
│   └── ...
│
├── routes/             # Definición de rutas
│   ├── authRoutes.js
│   ├── cuestionarioRoutes.js
│   └── ...
│
├── middlewares/        # Middlewares
│   ├── authMiddleware.js    # Verificación JWT
│   ├── corsConfig.js        # Configuración CORS
│   ├── uploadMiddleware.js  # Multer para archivos
│   └── validators/          # Validación de datos
│
├── sockets/            # WebSocket handlers
│   ├── socketManager.js     # Gestión de conexiones
│   └── socketStore.js       # Estado de sockets
│
├── utils/              # Utilidades
│   └── constants.js
│
├── templates/          # Plantillas
│   └── reportePartida.xslt  # Informes PDF
│
└── scripts/            # Scripts de mantenimiento
    ├── migrarDatos.js
    └── seedDatos.js
```

## Endpoints principales

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/forgot-password` - Recuperar contraseña

### Cuestionarios
- `GET /api/cuestionarios` - Listar cuestionarios
- `POST /api/cuestionarios` - Crear cuestionario
- `PUT /api/cuestionarios/:id` - Actualizar cuestionario

### Partidas
- `POST /api/partidas` - Crear partida
- `GET /api/partidas/:codigo` - Obtener por código
- `POST /api/partidas/:id/iniciar` - Iniciar partida

La documentación completa está disponible en `/api-docs` (Swagger).

## Modelos de datos

| Modelo | Descripción |
|--------|-------------|
| `Usuario` | Profesores, alumnos y administradores |
| `Cuestionario` | Conjunto de preguntas |
| `Pregunta` | Pregunta con opciones |
| `Partida` | Sesión de juego |
| `Participacion` | Respuestas de cada alumno |
| `Centro` | Centro educativo |
| `Curso` | Curso académico |
| `Asignatura` | Asignatura del curso |

## WebSockets

El sistema usa Socket.io para comunicación en tiempo real:

- **Profesor**: emite preguntas, controla tiempos, ve respuestas
- **Alumnos**: reciben preguntas, envían respuestas
- **Lobby**: gestiona sala de espera antes de partida

## Ejecución

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm run start
```

El servidor arranca en `http://localhost:3000`.

## Variables de entorno

```
MONGO_URI=mongodb://localhost:27017/campusquiz
JWT_SECRET=clave_secreta_para_tokens
PORT=3000
EMAIL_USER=correo@gmail.com
EMAIL_PASS=contraseña_app
```

## Dependencias principales

- Express 5.1
- Mongoose 9.0
- Socket.io 4.8
- JWT (jsonwebtoken)
- bcryptjs
- Nodemailer
- Puppeteer (para PDFs)
