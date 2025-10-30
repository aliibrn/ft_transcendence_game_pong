class PongGame {
  constructor() {
    this.fieldWidth = 20;
    this.fieldDepth = 30;
    this.playerSpeed = 0.3;
    
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

module.exports = PongGame;