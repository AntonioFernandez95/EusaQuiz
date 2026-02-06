# Frontend - CampusQuiz

Aplicación Angular 16 que implementa la interfaz de usuario del sistema.

## Arquitectura

El proyecto sigue una arquitectura modular basada en features:

```
src/app/
├── core/               # Singleton - se carga una vez
│   ├── guards/         # Guards de rutas
│   ├── interceptors/   # HTTP interceptors
│   └── services/       # Servicios globales (auth, socket, alerts)
│
├── shared/             # Elementos reutilizables
│   ├── components/     # Componentes compartidos
│   ├── pipes/          # Pipes personalizados
│   └── directives/     # Directivas personalizadas
│
├── features/           # Módulos funcionales (lazy loading)
│   ├── auth/           # Autenticación (login, registro)
│   └── dashboard/      # Dashboard principal
│       └── pages/      # Páginas del dashboard
│           ├── admin/              # Panel administrador
│           ├── professor-dashboard/ # Panel profesor
│           ├── student-dashboard/   # Panel alumno
│           ├── live-game/          # Partida en vivo
│           ├── game-lobby/         # Sala de espera
│           └── ...
│
├── models/             # Interfaces y tipos
└── environments/       # Configuración por entorno
```

## Módulos principales

### Auth
Gestiona todo el flujo de autenticación:
- Login con correo institucional
- Registro de usuarios
- Recuperación de contraseña

### Dashboard
Panel principal adaptado por rol:
- **Admin**: gestión de usuarios, centros, configuración
- **Profesor**: crear cuestionarios, lanzar partidas, ver informes
- **Alumno**: unirse a partidas, ver historial, consultar resultados

## Servicios Core

| Servicio | Responsabilidad |
|----------|-----------------|
| `AuthService` | Autenticación y tokens JWT |
| `SocketService` | Comunicación en tiempo real |
| `AlertService` | Notificaciones con SweetAlert2 |
| `BrandingService` | Personalización visual |
| `AdminService` | Operaciones administrativas |

## Ejecución

```bash
# Desarrollo
npm run start

# Build producción
npm run build
```

La aplicación estará disponible en `http://localhost:4200`.

## Dependencias principales

- Angular 16.2
- RxJS 7.8
- Socket.io-client 4.8
- SweetAlert2 11.26
