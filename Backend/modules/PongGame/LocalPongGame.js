const PongGame = require('./PongGame')
const Player = require('../player')

class LocalPongGame extends PongGame {
    constructor(data, WebsocketHandler) {
        super(data, WebsocketHandler)

        this.player1 = new Player('player1', 'down', this.fieldWidth, this.fieldDepth);
        this.player2 = new Player('player2', 'up', this.fieldWidth, this.fieldDepth);

        this.WebsocketHandler.send('gameCreated', {
            initialState: this.getState()
        });
    }

    update() {
        if (!this.isRunning) return;

        this.ball.update();
        this.checkCollisions();
        this.checkScoring();
        this.broadcastState();
    }

    markPlayerReady() { this.start() }

    broadcastState() {
        const state = this.getState();
        this.WebsocketHandler.send('update', state);
    }

    broadcastGameEnd() {
        const endData = {
            winner: this.winner,
            finalScore: {
                player1: this.player1.score,
                player2: this.player2.score
            }
        };

        if (this.WebsocketHandler.socket && this.WebsocketHandler.socket.readyState === 1) {
            this.WebsocketHandler.socket.send(JSON.stringify({
                type: 'gameEnd',
                data: endData
            }));
        }
    }
}

module.exports = LocalPongGame;