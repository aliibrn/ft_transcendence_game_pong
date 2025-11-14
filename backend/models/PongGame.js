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

    this.player1 = new Player('player1', 'down', this.fieldWidth, this.fieldDepth);
    this.player2 = new Player('player2', 'up', this.fieldWidth, this.fieldDepth);
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
    this.ball.reset('up'); // Start ball going up

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
    // Simple AI: follow the ball (player2 is AI)
    const aiPlayer = this.player2;
    const aiSpeed = 0.2;
    
    if (this.ball.x < aiPlayer.x) {
      aiPlayer.x -= aiSpeed;
    } else if (this.ball.x > aiPlayer.x) {
      aiPlayer.x += aiSpeed;
    }
    
    // Keep AI in bounds
    aiPlayer.x = Math.max(-this.fieldWidth / 2 + 2, Math.min(this.fieldWidth / 2 - 2, aiPlayer.x));
  }

  checkCollisions() {
    const halfWidth = this.fieldWidth / 2;

    // Ball collision with side walls (left/right)
    if (this.ball.x <= -halfWidth + 0.4 || this.ball.x >= halfWidth - 0.4) {
      this.ball.reverseX();
    }

    // Paddle collisions
    this.checkPaddleCollision(this.player1); // bottom paddle (down)
    this.checkPaddleCollision(this.player2); // top paddle (up)
  }

  checkPaddleCollision(player) {
    const ball = this.ball;
    const ballRadius = ball.radius;
    const paddleHalfWidth = player.width / 2;
    const paddleHalfDepth = player.height / 2;

    // Check if ball is within paddle bounds
    const withinX = Math.abs(ball.x - player.x) < paddleHalfWidth + ballRadius;
    const withinZ = ball.z >= player.z - paddleHalfDepth - ballRadius &&
                    ball.z <= player.z + paddleHalfDepth + ballRadius;

    if (withinX && withinZ) {
      // Determine bounce direction based on paddle position
      if (player.side === 'down') {
        // Player at bottom (positive z) - bounce ball upward (negative z)
        ball.vz = -Math.abs(ball.vz);
      } else {
        // Player at top (negative z) - bounce ball downward (positive z)
        ball.vz = Math.abs(ball.vz);
      }

      // Add spin based on where ball hits paddle
      ball.addSpin(player.x);
    }
  }

  checkScoring() {
    const halfDepth = this.fieldDepth / 2;

    // Ball goes past bottom (player1 missed)
    if (this.ball.z > halfDepth) {
      this.player2.incrementScore();
      this.onScore('player2');
    }
    // Ball goes past top (player2 missed)
    else if (this.ball.z < -halfDepth) {
      this.player1.incrementScore();
      this.onScore('player1');
    }
  }

  onScore(scorer) {
    console.log(`[${this.gameId}] ${scorer} scored!`);
    
    // Determine ball direction based on who scored
    // If player2 scored, send ball down toward player1
    // If player1 scored, send ball up toward player2
    const ballDirection = scorer === 'player2' ? 'down' : 'up';
    this.ball.reset(ballDirection);
    
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