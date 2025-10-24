FRONTEND (React + Babylon)
|  - UI
|  - Frontend Routing (/play, /login, /profile)
|  - WebSocket client (real-time)
|  - fetch() calls to backend APIs
|
|---- calls ---->   BACKEND (Fastify / Node)
                    |  - Backend Routing (/auth, /users, /matchmaking)
                    |  - Database
                    |  - WebSocket Server (real-time)


 ┌───────────────────────────┐
 │        Frontend           │
 │  Babylon.js / SPA / TS    │
 │   - listens to WS updates │
 │   - sends player input    │
 └───────▲───────────┬───────┘
         │           │  WebSocket Messages
         │           │
 ┌───────┴───────────▼───────┐
 │         Backend            │
 │ Node + WS or Fastify+WS    │
 │ - Rooms / matchmaking      │
 │ - Game loop (ball physics) │
 │ - Sync state 60fps/20fps   │
 └────────────────────────────┘

tsconfig.json (strict)
src/server.ts
src/routes/
src/websocket/
src/game/
src/services/
src/types/
src/utils/
aliases like @routes, @game, @services
.env support with validation
logger
error handler
npm scripts (dev, build, prod)

Back-end → maintains the authoritative game state (ball position, paddles, scores).

Front-end → renders the scene in Babylon.js using the state received from the server.

Front-end → server → sends player input (key presses).

Server → front-end → sends updated positions every tick/frame.

This is how multiplayer games are usually designed.