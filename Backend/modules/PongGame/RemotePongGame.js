const PongGame = require('./PongGame')
const Player = require('../player')

class RemotePongGame extends PongGame {
    constructor() {
        super(null, null)

        this.player1 = new Player('player1', 'down', this.fieldWidth, this.fieldDepth);
        this.player2 = new Player('player2', 'up', this.fieldWidth, this.fieldDepth);

        this.player1Data = null;
        this.player2Data = null;

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

    addPlayer1(playerData) {
        this.player1Data = playerData;
        this.player1Data.playerID = 'player1';
    }

    addPlayer2(playerData) {
        this.player2Data = playerData;
        this.player2Data.playerID = 'player2';
    }


    notify() {
        const matchData = {
            gameId: game.gameId,
            yourSide: 'player1',
            initialState: game.getState()
        };

        game.player1.socket.send(JSON.stringify({
            type: 'matchFound',
            data: { ...matchData, yourSide: game.player1.id }
        }));

        game.player2.socket.send(JSON.stringify({
            type: 'matchFound',
            data: { ...matchData, yourSide: game.player1.id }
        }));
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
