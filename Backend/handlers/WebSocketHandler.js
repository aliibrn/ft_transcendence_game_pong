const GameController = require('../controllers/GameController');

class WebSocketHandler {
    constructor(socket, connectionId, req) {
        this.socket = socket;
        this.connectionId = connectionId;
        this.req = req;
    }

    handleMessage(message) {
        try {
            const data = JSON.parse(message.toString());
            console.log(`[${this.connectionId}] Received:`, data.type);

            switch (data.type) {
                case 'game':
                    GameController(data.data, {
                        connectionId: this.connectionId, 
                        socket: this.socket});
                    break;
                        
                default:
                    console.warn(`[${this.connectionId}] Unknown message type:`, data.type);
            }
        } catch (err) {
            console.error(`[${this.connectionId}] Message error:`, err);
            this.send('error', { message: 'Invalid message format' });
        }
    }

    send(type, data) {
        if (this.socket.readyState === 1) {
            try {
                this.socket.send(JSON.stringify({ type, data }));
            } catch (err) {
                console.error(`[${this.connectionId}] Error sending message:`, err);
            }
        }
    }

    cleanup() {
        console.log("cleanup");
    }
}

module.exports = WebSocketHandler;