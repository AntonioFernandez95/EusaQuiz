# Documentación API

La API REST se documenta automáticamente con Swagger. Accede a `/api-docs` con el servidor en ejecución para ver la documentación interactiva.

## Endpoints principales

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/forgot-password` | Solicitar reset |
| POST | `/api/auth/reset-password` | Cambiar contraseña |

### Usuarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/usuarios` | Listar usuarios |
| GET | `/api/usuarios/:id` | Obtener usuario |
| PUT | `/api/usuarios/:id` | Actualizar usuario |
| DELETE | `/api/usuarios/:id` | Eliminar usuario |

### Cuestionarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/cuestionarios` | Listar cuestionarios |
| POST | `/api/cuestionarios` | Crear cuestionario |
| GET | `/api/cuestionarios/:id` | Obtener cuestionario |
| PUT | `/api/cuestionarios/:id` | Actualizar |
| DELETE | `/api/cuestionarios/:id` | Eliminar |

### Preguntas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/preguntas` | Crear pregunta |
| PUT | `/api/preguntas/:id` | Actualizar pregunta |
| DELETE | `/api/preguntas/:id` | Eliminar pregunta |

### Partidas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/partidas` | Crear partida |
| GET | `/api/partidas/:codigo` | Obtener por código |
| POST | `/api/partidas/:id/iniciar` | Iniciar partida |
| POST | `/api/partidas/:id/finalizar` | Finalizar partida |

### Datos Académicos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/centros` | Listar centros |
| GET | `/api/cursos` | Listar cursos |
| GET | `/api/asignaturas` | Listar asignaturas |

## Autenticación

Todas las rutas protegidas requieren token JWT:

```
Authorization: Bearer <token>
```

El token se obtiene en el login y tiene validez de 24 horas.

## Códigos de respuesta

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado |
| 400 | Error en petición |
| 401 | No autenticado |
| 403 | No autorizado |
| 404 | No encontrado |
| 500 | Error servidor |

## Ejemplo de uso

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@eusa.es","password":"123456"}'
```

Respuesta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": "...",
    "nombre": "Usuario",
    "rol": "profesor"
  }
}
```
