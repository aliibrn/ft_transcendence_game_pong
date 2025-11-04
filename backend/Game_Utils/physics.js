class Ball {
  constructor() {
    this.x = 0;
    this.z = 0;
    this.vx = 0.3;
    this.vz = 0.3;
  }

  update(deltaTime, players) {
    this.x += this.vx * deltaTime;
    this.z += this.vz * deltaTime;

    // bounce on walls
    if (this.x >= 1 || this.x <= -1) this.vx *= -1;

    // check paddle collision
    for (const p of players) {
      if (this.collidesWith(p)) this.vz *= -1;
    }
  }

  collidesWith(player) {
    // simplified hitbox
    return Math.abs(this.z - player.sideZ) < 0.1 &&
           Math.abs(this.x - player.x) < 0.2;
  }
}
