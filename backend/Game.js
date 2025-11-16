'use strict';

const fastify = require('fastify')();

const { handleNewConnection } = require('./controllers/GameController');


fastify.register(require('@fastify/websocket'));

fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    console.log('✅ Client connected');
    handleNewConnection(socket);
  });
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log('🚀 Server running on http://localhost:3000');
});