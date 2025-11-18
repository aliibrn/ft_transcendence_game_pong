class Ball {
  constructor() {
    this.x = 0;
    this.y = 0.4;
    this.z = 0;
    this.vx = 0.15;
    this.vz = -0.15;
    this.radius = 0.4;
    this.speed = 0.15;
  }

  reset(direction) {
    this.x = 0;
    this.z = 0;
    this.vx = (Math.random() - 0.5) * this.speed * 2;
    this.vz = direction === 'up' ? -this.speed : this.speed;
  }

  update() {
    this.x += this.vx;
    this.z += this.vz;
  }

  reverseX() {
    this.vx *= -1;
  }

  reverseZ() {
    this.vz *= -1;
  }

  addSpin(paddleX) {
    const offset = this.x - paddleX;
    this.vx += offset * 0.05;
    this.vx = Math.max(-0.3, Math.min(0.3, this.vx));
  }

  getState() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      radius: this.radius,
      vx: this.vx,
      vz: this.vz
    };
  }
}

module.exports = Ball;