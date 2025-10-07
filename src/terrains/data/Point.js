class Point {
  x;
  y;
  z;

  constructor(x, y, z) {      
    this.x = x;
    this.y = y;
    this.z = z;
  }

  projectIsometric() {
    const angleX = Math.PI / 6;  // 30 degrees tilt X
    const angleY = Math.PI / 4;  // 45 degrees rotation Y

    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);

    // Rotate around Y axis
    const rx = this.x * cosY - this.y * sinY;
    const ry = this.x * sinY + this.y * cosY;

    // Tilt around X axis
    const py = ry * cosX - this.z * sinX;

    const screenX = rx;
    const screenY = -py;

    return { x: screenX, y: screenY, z: this.z };
  }
}

module.exports = Point;