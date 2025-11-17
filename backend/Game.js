'use strict';

const fastify = require('fastify')({ logger: true });
const { handleNewConnection } = require('./controllers/GameController');

// Register websocket plugin
fastify.register(require('@fastify/websocket'));

// Websocket route
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    console.log('✅ New client connection');
    handleNewConnection(socket, req);
  });
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  const { getStats } = require('./controllers/GameController');
  return { status: 'ok', ...getStats() };
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('🛑 Shutting down gracefully...');
  const { cleanupAll } = require('./controllers/GameController');
  await cleanupAll();
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Server running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();