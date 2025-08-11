class Point {
    x;
    y;
    z;

    constructor(x, y, z) {      
        this.x = x;
        this.y = y;
        this.z = z;
    }

    projectIsometric(scale, width, height) {
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

    // You can center and scale however you like
    const screenX = width / 2 + rx * scale;
    const screenY = height / 2 - py * scale;

    return { x: screenX, y: screenY };
  }

  // Simple orthographic projection with tilt around X axis
  project3D(x, y, z, width, height) {
    const angleX = Math.PI / 6; // 30 degrees tilt
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
  
    let py = y * cosX - z * sinX;
  
    // let screenX = width / 2 + x * scale;
    // let screenY = height / 2 - py * scale;
  
    let screenX = x * scale;
    let screenY = py * scale;
  
    return { x: screenX, y: screenY };
  }
}

module.exports = Point;