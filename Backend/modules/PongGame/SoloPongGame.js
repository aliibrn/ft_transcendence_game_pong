const PongGame = require('./PongGame')
const Player = require('../player')

class SoloPongGame extends PongGame {
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

        this.updateAI()
        this.ball.update();
        this.checkCollisions();
        this.checkScoring();
        this.broadcastState();
    }

    updateAI() {
        const aiPlayer = this.player2;
        const aiSpeed = 0.2;

        if (this.ball.x < aiPlayer.x)
            aiPlayer.x -= aiSpeed;
        else if (this.ball.x > aiPlayer.x)
            aiPlayer.x += aiSpeed;

        aiPlayer.x = Math.max(-this.fieldWidth / 2 + 2, Math.min(this.fieldWidth / 2 - 2, aiPlayer.x));
    }

    markPlayerReady() { this.start() }


    handleInput(direction) {
        if (!this.isRunning) return;
        
        this.player1.move(direction);
    }

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

module.exports = SoloPongGame;