'use strict';

const fastify = require('fastify')();
const { PongGame, createGame, StartGame } = require("./Game_Utils/");

fastify.register(require('@fastify/websocket'));
fastify.register(require('@fastify/static'), {
  root: require('path').join(__dirname, 'public'),
  prefix: '/'
});

const games = new Map();
const players = [];

fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    console.log('✅ Client connected');

    // socket enter that means a game is occurred so even that game is a multiplayer local game
    // or remote multiplayer 
    // or solo vs ia 

    // so we should first of all create a base class of the game with the mode

    /* if connection get established  */ if (data.type === 'established') {
      if (data.mode === 'solo') {
        startSoloGame(socket); 
      } else if (data.mode === 'local') {
        startLocalGame(socket);
      } else if (data.mode === 'remote') {
        joinRemoteGame(socket);
      }
    }

  });
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log('🚀 Server running on http://localhost:3000');
});