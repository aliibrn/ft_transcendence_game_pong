// models/PongGame.js
const Player = require('./Player');
const Ball = require('./Ball');

class PongGame {
  constructor(mode, gameId) {
    this.gameId = gameId;
    this.mode = mode; // 'local', 'remote', 'solo'
    this.fieldWidth = 20;
    this.fieldDepth = 30;
    this.maxScore = 5;
    
    this.player1 = new Player('player1', 'left', this.fieldDepth);
    this.player2 = new Player('player2', 'right', this.fieldDepth);
    this.ball = new Ball();
    
    this.gameLoop = null;
    this.isRunning = false;
    this.winner = null;
    
    // For matchmaking
    this.players = []; // Will store socket references for remote mode
    this.readyPlayers = new Set();
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.ball.reset();
    
    // Start game loop (60 FPS)
    this.gameLoop = setInterval(() => {
      this.update();
    }, 1000 / 60);
    
    console.log(`[${this.gameId}] Game started in ${this.mode} mode`);
  }

  stop() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
    this.isRunning = false;
    console.log(`[${this.gameId}] Game stopped`);
  }

  update() {
    if (!this.isRunning) return;

    // AI logic for solo mode
    if (this.mode === 'solo') {
      this.updateAI();
    }

    // Update ball position
    this.ball.update();

    // Check collisions
    this.checkCollisions();

    // Check scoring
    this.checkScoring();

    // Broadcast state to all connected clients
    this.broadcastState();
  }

  updateAI() {
    // Simple AI: follow the ball
    const aiPlayer = this.player2;
    const ballZ = this.ball.z;
    const aiZ = aiPlayer.z;
    const threshold = 0.5;

    if (ballZ < aiZ - threshold) {
      aiPlayer.move('up');
    } else if (ballZ > aiZ + threshold) {
      aiPlayer.move('down');
    }
  }

  checkCollisions() {
    const halfDepth = this.fieldDepth / 2;
    const halfWidth = this.fieldWidth / 2;

    // Wall collisions (top and bottom)
    if (Math.abs(this.ball.z) > halfDepth - this.ball.radius) {
      this.ball.reverseZ();
    }

    // Paddle collisions
    this.checkPaddleCollision(this.player1);
    this.checkPaddleCollision(this.player2);
  }

  checkPaddleCollision(player) {
    const ballX = this.ball.x;
    const ballZ = this.ball.z;
    const paddleX = player.x;
    const paddleZ = player.z;
    const paddleHalfHeight = player.height / 2;
    const paddleHalfWidth = player.width / 2;

    // Check if ball is in paddle zone
    if (
      Math.abs(ballX - paddleX) < paddleHalfWidth + this.ball.radius &&
      Math.abs(ballZ - paddleZ) < paddleHalfHeight + this.ball.radius
    ) {
      this.ball.reverseX();
      // Add some angle based on where it hit the paddle
      const hitPos = (ballZ - paddleZ) / paddleHalfHeight;
      this.ball.vz += hitPos * 0.05;
    }
  }

  checkScoring() {
    const halfWidth = this.fieldWidth / 2;

    // Player 2 scores (ball went past player 1)
    if (this.ball.x < -halfWidth) {
      this.player2.incrementScore();
      this.onScore('player2');
    }
    // Player 1 scores (ball went past player 2)
    else if (this.ball.x > halfWidth) {
      this.player1.incrementScore();
      this.onScore('player1');
    }
  }

  onScore(scorer) {
    console.log(`[${this.gameId}] ${scorer} scored!`);
    this.ball.reset();
    this.player1.reset();
    this.player2.reset();

    // Check for winner
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
    console.log(`[${this.gameId}] Game ended. Winner: ${this.winner}`);
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

  broadcastState() {
    const state = this.getState();
    
    if (this.mode === 'remote') {
      // Send to both players
      this.players.forEach(playerSocket => {
        if (playerSocket && playerSocket.readyState === 1) {
          playerSocket.send(JSON.stringify({
            type: 'update',
            data: state
          }));
        }
      });
    } else {
      // Local or solo: send to single client
      if (this.players[0] && this.players[0].readyState === 1) {
        this.players[0].send(JSON.stringify({
          type: 'update',
          data: state
        }));
      }
    }
  }

  broadcastGameEnd() {
    const endData = {
      winner: this.winner,
      finalScore: {
        player1: this.player1.score,
        player2: this.player2.score
      }
    };

    if (this.mode === 'remote') {
      this.players.forEach(playerSocket => {
        if (playerSocket && playerSocket.readyState === 1) {
          playerSocket.send(JSON.stringify({
            type: 'gameEnd',
            data: endData
          }));
        }
      });
    } else {
      if (this.players[0] && this.players[0].readyState === 1) {
        this.players[0].send(JSON.stringify({
          type: 'gameEnd',
          data: endData
        }));
      }
    }
  }

  addPlayer(socket) {
    this.players.push(socket);
    console.log(`[${this.gameId}] Player added. Total: ${this.players.length}`);
  }

  markPlayerReady(socket) {
    this.readyPlayers.add(socket);
    
    // For remote mode, start when both players are ready
    if (this.mode === 'remote' && this.readyPlayers.size === 2) {
      this.start();
    }
    // For local/solo, start immediately when ready
    else if (this.mode !== 'remote') {
      this.start();
    }
  }

  getState() {
    return {
      gameId: this.gameId,
      mode: this.mode,
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
    this.players = [];
    this.readyPlayers.clear();
  }
}

module.exports = PongGame;