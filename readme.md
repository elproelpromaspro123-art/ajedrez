# Ajedrez Lab (Personal)

Webapp personal para:
- Jugar contra bots con niveles ELO predefinidos y ELO personalizado.
- Analizar partidas PGN con clasificacion de jugadas.
- Estudiar ideas de ajedrez en secciones rapidas con posiciones de referencia.

No requiere login.

## Stack
- Node.js + Express
- TypeScript (backend)
- Frontend vanilla JS/CSS
- Stockfish en navegador (worker)

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
- `npm test`: genera reportes de prueba para validar clasificaciones.

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
