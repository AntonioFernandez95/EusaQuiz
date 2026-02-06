# Guía de Despliegue

## Requisitos del servidor

- Node.js 18 o superior
- MongoDB 6 o superior
- 2GB RAM mínimo
- Puerto 3000 (backend) y 4200 (frontend dev)

## Opción 1: Despliegue local

### Backend

```bash
cd backend
npm install
npm run start
```

Variables de entorno necesarias en `.env`:
```
MONGO_URI=mongodb://localhost:27017/campusquiz
JWT_SECRET=clave_secreta_larga_y_segura
PORT=3000
```

### Frontend

```bash
cd frontend
npm install
npm run build
```

Los archivos de producción quedan en `dist/`.

## Opción 2: Docker

Crear `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - MONGO_URI=mongodb://mongodb:27017/campusquiz
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongo_data:
```

Ejecutar:
```bash
docker-compose up -d
```

## Opción 3: Servicios cloud

### MongoDB Atlas
1. Crear cluster en atlas.mongodb.com
2. Configurar IP whitelist
3. Obtener connection string
4. Usar en MONGO_URI

### Backend (Render, Railway, Heroku)
1. Conectar repositorio
2. Configurar variables de entorno
3. Deploy automático

### Frontend (Vercel, Netlify)
1. Conectar repositorio
2. Build command: `npm run build`
3. Output directory: `dist/campus-quiz`

## Configuración de producción

### Angular
Modificar `src/environments/environment.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://tu-api.com/api'
};
```

### CORS
En backend, actualizar `corsConfig.js`:
```javascript
const allowedOrigins = [
  'https://tu-dominio.com'
];
```

## Checklist pre-despliegue

- [ ] Variables de entorno configuradas
- [ ] URLs de producción actualizadas
- [ ] CORS configurado correctamente
- [ ] JWT_SECRET seguro (mínimo 32 caracteres)
- [ ] MongoDB con autenticación habilitada
- [ ] HTTPS habilitado
