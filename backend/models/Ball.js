// models/Ball.js
class Ball {
  constructor() {
    this.x = 0;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.radius = 0.3;
    this.speed = 0.15;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.z = 0;
    // Random direction
    const angle = (Math.random() * Math.PI / 2) - Math.PI / 4; // -45° to 45°
    const direction = Math.random() < 0.5 ? 1 : -1;
    this.vx = Math.cos(angle) * this.speed * direction;
    this.vz = Math.sin(angle) * this.speed;
  }

  update() {
    this.x += this.vx;
    this.z += this.vz;
  }

  reverseX() {
    this.vx *= -1;
    // Slightly increase speed on paddle hit
    this.vx *= 1.05;
    this.vz *= 1.05;
  }

  reverseZ() {
    this.vz *= -1;
  }

  getState() {
    return {
      x: this.x,
      z: this.z,
      radius: this.radius
    };
  }
}

module.exports = Ball;