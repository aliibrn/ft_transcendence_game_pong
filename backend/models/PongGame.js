const Player = require('./Player');
const Ball = require('./Ball');

class PongGame {
  constructor(mode, gameId) {
    this.gameId = gameId;
    this.mode = mode;
    this.fieldWidth = 20;
    this.fieldDepth = 30;
    this.maxScore = 5;

    this.player1 = new Player('player1', 'down', this.fieldWidth, this.fieldDepth);
    this.player2 = new Player('player2', 'up', this.fieldWidth, this.fieldDepth);
    this.ball = new Ball();

    this.gameLoop = null;
    this.isRunning = false;
    this.winner = null;

    this.players = [];
    this.readyPlayers = new Set();
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.ball.reset('up');

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

  pause(duration) {
    if (!this.isRunning || this.isPaused) return;

    this.isPaused = true;
    console.log(`[${this.gameId}] Game paused for ${duration}ms`);

    setTimeout(() => {
      this.isPaused = false;
      console.log(`[${this.gameId}] Game resumed`);
    }, duration);
  }

  update() {
    if (!this.isRunning) return;

    if (this.mode === 'solo')
      this.updateAI();

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
    console.log(`[${this.gameId}] ${scorer} scored!`);

    // this.pause(300);

    // // Broadcast GOAL event immediately
    // this.broadcastGoal(scorer);

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

  // broadcastGoal(scorer) {
  //   const state = this.getState();
  //   const goalData = {
  //     state,
  //     scorer: scorer,
  //     isPaused: this.isPaused
  //   };

  //   if (this.mode === 'remote') {
  //     this.players.forEach(playerSocket => {
  //       if (playerSocket && playerSocket.readyState === 1) {
  //         playerSocket.send(JSON.stringify({
  //           type: 'GOAL',
  //           data: goalData
  //         }));
  //       }
  //     });
  //   } else {
  //     if (this.players[0] && this.players[0].readyState === 1) {
  //       this.players[0].send(JSON.stringify({
  //         type: 'GOAL',
  //         data: goalData
  //       }));
  //     }
  //   }
  // }

  broadcastState() {
    const state = this.getState();

    if (this.mode === 'remote') {
      this.players.forEach(playerSocket => {
        if (playerSocket && playerSocket.readyState === 1) {
          playerSocket.send(JSON.stringify({
            type: 'update',
            data: state
          }));
        }
      });
    } else {
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

    if (this.mode === 'remote' && this.readyPlayers.size === 2) {
      this.start();
    }
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