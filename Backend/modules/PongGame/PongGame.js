const Ball = require('../ball')

class PongGame {
    constructor(data, WebsocketHandler) {
        this.data = data;
        this.WebsocketHandler = WebsocketHandler;

        this.fieldWidth = 20;
        this.fieldDepth = 30;
        this.maxScore = 5;

        this.gameLoop = null;
        this.isRunning = false;
        this.winner = null;

        this.player1 = null;
        this.player2 = null;
        this.ball = new Ball();
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.ball.reset('up');

        this.gameLoop = setInterval(() => {
            this.update();
        }, 1000 / 60);

        console.log(`[${this.data.gameId}] Game started in ${this.data.mode} mode`);
    }

    stop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        this.isRunning = false;
        console.log(`[${this.data.gameId}] Game stopped`);
    }

    checkCollisions() {
        const halfWidth = this.fieldWidth / 2;

        if (this.ball.x <= -halfWidth + 0.4 || this.ball.x >= halfWidth - 0.4)
            this.ball.reverseX();

        this.checkPaddleCollision(this.player1);
        this.checkPaddleCollision(this.player2);
    }

    checkPaddleCollision(player) {
        const ball = this.ball;
        const ballRadius = ball.radius;
        const paddleHalfWidth = player.width / 2;
        const paddleHalfDepth = player.height / 2;

        const withinX = Math.abs(ball.x - player.x) < paddleHalfWidth + ballRadius;
        const withinZ = ball.z >= player.z - paddleHalfDepth - ballRadius &&
            ball.z <= player.z + paddleHalfDepth + ballRadius;

        if (withinX && withinZ) {
            if (player.side === 'down')
                ball.vz = -Math.abs(ball.vz);
            else
                ball.vz = Math.abs(ball.vz);

            ball.addSpin(player.x);
        }
    }

    checkScoring() {
        const halfDepth = this.fieldDepth / 2;

        if (this.ball.z > halfDepth) {
            this.player2.incrementScore();
            this.onScore('player2');
        }
        else if (this.ball.z < -halfDepth) {
            this.player1.incrementScore();
            this.onScore('player1');
        }
    }

    onScore(scorer) {
        console.log(`[${this.data.gameId}] ${scorer} scored!`);

        const ballDirection = scorer === 'player2' ? 'down' : 'up';
        this.ball.reset(ballDirection);

        this.player1.reset();
        this.player2.reset();

        if (this.player1.score >= this.maxScore) {
            this.winner = 'player1';
            this.endGame();
        } else if (this.player2.score >= this.maxScore) {
            this.winner = 'player2';
            this.endGame();
        }
    }

    endGame() {
        this.stop();
        console.log(`[${this.data.gameId}] Game ended. Winner: ${this.winner}`);
        this.broadcastGameEnd();
    }

    handleInput(playerId, direction) {
        if (!this.isRunning) return;

        if (playerId === 'player1') {
            this.player1.move(direction);
        } else if (playerId === 'player2') {
            this.player2.move(direction);
        }
    }

    getState() {
        return {
            gameId: this.data.gameId,
            mode: this.data.mode,
            player1: this.player1.getState(),
            player2: this.player2.getState(),
            ball: this.ball.getState(),
            fieldWidth: this.fieldWidth,
            fieldDepth: this.fieldDepth,
            isRunning: this.isRunning,
            winner: this.winner
        };
    }

    cleanup() {
        this.stop();
    }
}

module.exports = PongGame;