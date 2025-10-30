'use strict';

const fastify = require('fastify')();
const PongGame = require('./game');

fastify.register(require('@fastify/websocket'));
fastify.register(require('@fastify/static'), {
  root: require('path').join(__dirname, 'public'),
  prefix: '/'
});

const games = new Map();

fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    console.log('✅ Client connected');

    const gameId = Date.now().toString();
    const game = new PongGame();
    games.set(gameId, { game, socket });

    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('📩 Received:', data);

        if (data.type === 'established') {
          socket.send(JSON.stringify({
            type: 'init',
            data: game.getState()
          }));
        } 
        else if (data.type === 'input') {
          game.updatePlayer(data.direction);
          socket.send(JSON.stringify({
            type: 'update',
            data: game.getState()
          }));
        }
      } catch (error) {
        console.error('❌ Error:', error);
      }
    });

    socket.on('close', () => {
      console.log('🔌 Client disconnected');
      games.delete(gameId);
    });

    socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      games.delete(gameId);
    });
  });
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log('🚀 Server running on http://localhost:3000');
});