class Point {
    x;
    y;
    z;

    constructor(x, y, z) {      
        this.x = x;
        this.y = y;
        this.z = z;
    }

  // projectIsometric(scale, minX, minY, width, height) {
  //   const angleX = Math.PI / 6;
  //   const angleY = Math.PI / 4;

  //   const cosX = Math.cos(angleX);
  //   const sinX = Math.sin(angleX);
  //   const cosY = Math.cos(angleY);
  //   const sinY = Math.sin(angleY);

  //   // Rotate around Y axis
  //   const rx = this.x * cosY - this.y * sinY;
  //   const ry = this.x * sinY + this.y * cosY;

  //   // Tilt around X axis
  //   const py = ry * cosX - this.z * sinX;

  //   // Normalize relative to bounds
  //   const normX = (rx - minX) * scale;
  //   const normY = (py - minY) * scale;

  //   // Center on canvas
  //   return {
  //       x: normX,
  //       y: normY
  //   };
  // } 

  projectIsometricRaw(scale) {
    const angleX = Math.PI / 6;  // ~30°
    const angleY = Math.PI / 4;  // 45°


    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);

    // Rotate around Y axis
    const rx = this.x * cosY - this.y * sinY;
    const ry = this.x * sinY + this.y * cosY;

    // Tilt around X axis
    const py = ry * cosX - this.z * sinX;

    return {
        x: rx * scale,
        y: py * scale
    };
  }

projectIsometric(minX, minY, scale = 1) {
    const raw = this.projectIsometricRaw(scale);
    return {
        x: raw.x - minX,
        y: raw.y - minY
    };
}

}

module.exports = Point;