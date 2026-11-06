# Usar imagen oficial de Node.js ligera
FROM node:20-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de dependencias del backend
COPY backend/package*.json ./

# Instalar dependencias de producción (limpias)
RUN npm ci --only=production

# Copiar todo el código fuente del backend
COPY backend/ ./

# Exponer el puerto estándar que Cloud Run asigna (por defecto 8080)
EXPOSE 8080

# Comando para iniciar la aplicación
CMD ["node", "src/server.js"]