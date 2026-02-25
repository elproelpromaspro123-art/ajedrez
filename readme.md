# Ajedrez Lab (Personal)

Webapp personal para:
- Jugar contra bots con niveles ELO predefinidos y ELO personalizado.
- Jugar en modo `Clasificatoria` (sin ayudas, contra bot) para que las estadisticas del perfil sean realistas.
- Analizar partidas PGN con clasificacion de jugadas.
- Estudiar ideas de ajedrez en secciones rapidas con posiciones de referencia.

No requiere login.

## Stack
- Node.js + Express
- TypeScript (backend)
- Frontend vanilla JS/CSS
- Stockfish en navegador (worker)

## Variables de entorno
- `PORT` (opcional): puerto del servidor (default `3000`).
- `GROQ_API_KEY` (opcional): habilita el chat IA desde backend.
- `GROQ_MODEL` (opcional): modelo Groq para `/api/ai-chat` (default `groq/compound`).
- `DATA_BASE` (opcional): ruta de almacenamiento JSON compartido.  
  - La app guarda sus datos bajo namespace aislado `freechess_lab_v1` para no interferir con otros sitios.
  - Si el valor no es un JSON seguro (por ejemplo DB no JSON), crea un sidecar `*.freechess.json`.

## Ejecutar local
1. Instala dependencias:
   - `npm install`
2. Compila:
   - `npm run build`
3. Inicia servidor:
   - `npm start`
4. Abre `http://localhost:3000`

## Scripts
- `npm run build`: compila TypeScript.
- `npm start`: ejecuta backend compilado en `dist/index.js`.
- `npm run dev`: compila y arranca servidor con nodemon.
- `npm test`: genera reportes de prueba y ejecuta smoke tests de API.

## Healthcheck
- `GET /healthz`: estado basico del servidor (ok, uptime y timestamp).

## Deploy en Vercel
Este repo incluye `vercel.json` para enrutar todo al servidor Express.

Pasos recomendados:
1. Importar repo en Vercel.
2. En `Project Settings > Node.js Version`, seleccionar `24.x`.
   - Tambien funciona con `20.x`.
3. Build command: `npm run build`
4. Output/default con configuracion del proyecto.
5. Deploy.

## Nota de actualizacion
Interfaz y contenido pensados para uso individual, con fecha de actualizacion visible dentro de la app.
