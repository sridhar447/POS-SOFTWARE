# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /app

# Install root dependencies (for the orchestration script)
COPY package.json ./
RUN npm install

# Install backend dependencies
COPY backend/package.json ./backend/package.json
RUN cd backend && npm install

# Install frontend dependencies
COPY frontend/package.json ./frontend/package.json
RUN cd frontend && npm install

# Copy the project source
COPY . .

ENV NODE_ENV=development \
    PORT=5000 \
    VITE_API_URL=http://localhost:5000

EXPOSE 5000 5173

CMD ["npm", "run", "dev"]
