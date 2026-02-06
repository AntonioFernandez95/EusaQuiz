# EusaQuiz

Aplicación web tipo Kahoot diseñada para el entorno universitario. Permite digitalizar exámenes, fomentar la participación del alumnado y facilitar la evaluación.

## Estructura del Proyecto

```
EusaQuiz/
├── frontend/          # Angular 16 - Interfaz de usuario
├── backend/           # Node.js + Express - API REST
└── docs/              # Documentación del proyecto
```

## Tecnologías

**Frontend**
- Angular 16
- RxJS
- Socket.io-client
- SweetAlert2

**Backend**
- Node.js + Express 5
- MongoDB + Mongoose
- Socket.io
- JWT para autenticación
- Swagger para documentación API

## Instalación

### Requisitos previos
- Node.js 18+
- MongoDB 6+

### Frontend
```bash
cd frontend
npm install
npm run start
```

### Backend
```bash
cd backend
npm install
npm run dev
```

## Configuración

Crear archivo `.env` en `/backend`:
```
MONGO_URI=mongodb://localhost:27017/campusquiz
JWT_SECRET=tu_clave_secreta
PORT=3000
```

## Características principales

- **Profesores**: Crean cuestionarios, importan preguntas, monitorizan partidas en tiempo real
- **Alumnos**: Acceden con correo institucional, participan en partidas y consultan resultados
- **Administradores**: Gestionan usuarios, centros y configuración global

## Autores

Cristina Román Salvatierra
Marco Antonio Ochavo Fernández
Francisco Mejías González
Antonio Manuel Fernández Jímenez 
