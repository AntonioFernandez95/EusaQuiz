# Arquitectura del Sistema

## Visión general

CampusQuiz sigue una arquitectura cliente-servidor con separación clara entre frontend y backend.

```
┌─────────────────┐     HTTP/WS     ┌─────────────────┐
│                 │ ◄──────────────► │                 │
│   Angular SPA   │                  │  Node.js API    │
│   (Frontend)    │                  │   (Backend)     │
│                 │                  │                 │
└─────────────────┘                  └────────┬────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │    MongoDB      │
                                     └─────────────────┘
```

## Frontend (Angular)

### Patrón MVVM

- **Model**: Interfaces TypeScript en `/models`
- **View**: Templates HTML de componentes
- **ViewModel**: Componentes TypeScript

### Estructura modular

```
app/
├── core/          → Servicios singleton, guards, interceptors
├── shared/        → Componentes reutilizables
├── features/      → Módulos lazy-loaded
└── models/        → Interfaces compartidas
```

### Comunicación

- **HTTP**: Via HttpClient de Angular
- **WebSocket**: Socket.io-client para tiempo real

## Backend (Node.js)

### Patrón MVC en capas

```
Request → Routes → Controllers → Services → Models → MongoDB
                       ↓
                 Middlewares
```

- **Routes**: Define endpoints y asocia controladores
- **Controllers**: Gestiona peticiones HTTP, valida input
- **Services**: Contiene la lógica de negocio
- **Models**: Esquemas Mongoose, acceso a datos

### Middlewares

1. **CORS**: Permite peticiones del frontend
2. **Auth**: Verifica tokens JWT
3. **Validators**: Valida datos de entrada
4. **Upload**: Gestiona subida de archivos

### WebSockets

Socket.io gestiona comunicación bidireccional:
- Partidas en tiempo real
- Notificaciones instantáneas
- Sincronización de estado

## Base de datos

MongoDB (NoSQL) con Mongoose como ODM.

### Colecciones principales

| Colección | Relaciones |
|-----------|------------|
| usuarios | → centro, cursos |
| cuestionarios | → usuario (autor), preguntas |
| preguntas | → cuestionario |
| partidas | → cuestionario, profesor |
| participaciones | → partida, usuario |

## Flujo de autenticación

1. Usuario envía credenciales
2. Backend verifica contra MongoDB
3. Se genera token JWT
4. Frontend almacena token
5. Peticiones incluyen token en header
6. Middleware valida token en cada request

## Flujo de partida

1. Profesor crea partida → genera código
2. Alumnos se unen con código
3. Profesor inicia partida
4. Backend emite preguntas via WebSocket
5. Alumnos responden en tiempo real
6. Backend calcula puntuaciones
7. Se muestran resultados finales
