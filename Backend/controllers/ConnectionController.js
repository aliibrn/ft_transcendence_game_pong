const colors = require('../utils/colors')

const WebSocketHandler = require('../handlers/WebSocketHandler');

let connectionCounter = 0;
const activeConnections = new Map();

function ConnectionController(socket, req) {

    const connectionId = `conn_${++connectionCounter}_${Date.now()}`;
    try {
        const handler = new WebSocketHandler(socket, connectionId, req);
        activeConnections.set(connectionId, handler);
        logStats('New connection', connectionId);
        socket_init(socket, connectionId, handler);
    }
    catch (err) {
        console.error(`[Controller] Error creating handler for ${connectionId}:`, err);
        socket.close();
    }
}

function socket_init(socket, connectionId, handler) {

    socket.on('message', (msg) => handler.handleMessage(msg));

    socket.on('close', () => handleDisconnection(connectionId, handler));

    socket.on('error', (err) => {
        console.error(`[Controller] Socket error for ${connectionId}:`, err.message);
        handleDisconnection(connectionId, handler);
    });

    handler.send('connected', {
        connectionId: this.connectionId,
        timestamp: Date.now()
    });
}

function handleDisconnection(connectionId, handler) {
    try {
        handler.cleanup();
        activeConnections.delete(connectionId);
        logStats('Connection closed', connectionId);
    } catch (err) {
        console.error(`[Controller] Error during disconnection cleanup:`, err);
    }
}

function logStats(event, connectionId) {
    const color = (event === 'New connection' ? colors.green : colors.red);

    console.log(`[Controller] ${color} ${event}: ${colors.reset} ${connectionId}`);
    console.log(`[Controller] Active connections: ${activeConnections.size}`);
}

module.exports = ConnectionController;
