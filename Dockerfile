# Usar imagen oficial de Node.js ligera
FROM node:20-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de dependencias del backend (layer cacheable)
COPY backend/package*.json ./backend/

# Instalar dependencias de producción (limpias)
RUN cd backend && npm ci --only=production

# Copiar el codigo fuente del backend y el frontend estatico,
# preservando la misma estructura de carpetas que en local
# (backend/src/app.js sirve ../../frontend como estaticos).
COPY backend/ ./backend/
COPY frontend/ ./frontend/

WORKDIR /app/backend

# Exponer el puerto estándar que Cloud Run asigna (por defecto 8080)
EXPOSE 8080

# Comando para iniciar la aplicación
CMD ["node", "src/server.js"]
