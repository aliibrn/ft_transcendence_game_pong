'use strict'

const fastify = require('fastify')()
fastify.register(require('@fastify/websocket'))

const ConnectionController = require('./controllers/ConnectionController')

fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket /* WebSocket */, req /* FastifyRequest */) => {
        ConnectionController(socket, req);
    })
})

fastify.listen({ port: 3000 }, err => {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    console.log('🚀 Server running on http://localhost:3000');
})