class player {
    constructor(fieldWidth, fieldDepth, speed) {
        this.fieldWidth = fieldWidth;
        this.fieldDepth = fieldDepth;
        this.playerSpeed = speed;

        this.player = {
            x: 0,
            y: 0.4,
            z: this.fieldDepth / 2 - 1,
            width: 4
        };
    }

    updatePlayer(direction) {
        if (direction === 'left') {
            this.player.x -= this.playerSpeed;
        } else if (direction === 'right') {
            this.player.x += this.playerSpeed;
        }

        // Keep player in bounds
        const maxX = this.fieldWidth / 2 - 2;
        const minX = -this.fieldWidth / 2 + 2;
        this.player.x = Math.max(minX, Math.min(maxX, this.player.x));
    }

    getState() {
        return {
            fieldWidth: this.fieldWidth,
            fieldDepth: this.fieldDepth,
            player: {
                x: this.player.x,
                y: this.player.y,
                z: this.player.z
            }
        };
    }
}

class LocalPlayer extends Player {
  constructor(side, controls) {
    super(side);
    this.controls = controls; // e.g. { left: 'ArrowLeft', right: 'ArrowRight' }
  }

  update(deltaTime) {
    if (keys[this.controls.left]) this.x -= this.speed * deltaTime;
    if (keys[this.controls.right]) this.x += this.speed * deltaTime;
  }
}

class AIPlayer extends Player {
  constructor(side, ball) {
    super(side);
    this.ball = ball;
  }

  update(deltaTime) {
    if (this.ball.x > this.x) this.x += this.speed * deltaTime;
    if (this.ball.x < this.x) this.x -= this.speed * deltaTime;
  }
}

