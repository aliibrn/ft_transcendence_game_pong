class WebSocketHandler {
    constructor(socket, connectionId, req) {
        this.socket = socket;
        this.connectionId = connectionId;
        this.req = req;

        this.initialize();
    }

    initialize() {
        this.socket.on('message', (msg) => this.handleMessage(msg));
        this.socket.on('close', () => this.handleClose());
        this.socket.on('error', (err) => this.handleError(err));

        this.send('connected', {
            connectionId: this.connectionId,
            timestamp: Date.now()
        });
    }

    handleMessage(msg) {
        console.log(msg);
    }

    handleClose() {
        console.log(`[WebSocketHandler] [${this.connectionId}] Client disconnected`);
    }

    handleError() {

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

    cleanup(){
        console.log("cleanup");
    }
}

module.exports = WebSocketHandler;