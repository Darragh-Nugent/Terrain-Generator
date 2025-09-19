class Particle {
    constructor(x, y, z, xVelocity = 0, yVelocity = 0, zVelocity = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.xVelocity = xVelocity;
        this.yVelocity = yVelocity;
        this.zVelocity = zVelocity;
    }

    setPosition(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    setVelocity(xVel, yVel, zVel) {
        this.xVelocity = xVel;
        this.yVelocity = yVel;
        this.zVelocity = zVel;
    }

    setPositionAndVelocity({ x, y, z, xVelocity, yVelocity, zVelocity }) {
        if (x !== undefined) this.x = x;
        if (y !== undefined) this.y = y;
        if (z !== undefined) this.z = z;
        if (xVelocity !== undefined) this.xVelocity = xVelocity;
        if (yVelocity !== undefined) this.yVelocity = yVelocity;
        if (zVelocity !== undefined) this.zVelocity = zVelocity;
    }
    getCoordsAndVel() {
        return {
            x: this.x,
            y: this.y,
            z: this.z,
            xVel: this.xVelocity,
            yVel: this.yVelocity,
            zVel: this.zVelocity
        }
    }
    getCoords() {
        return {
            x: this.x,
            y: this.y,
            z: this.z,
        }
    }
    add(other) {
        return new Vector(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    subtract(other) {
        return new Vector(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    multiply(scalar) {
        return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    dot(other) {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    speed() {
        return Math.sqrt(this.xVelocity * this.xVelocity
            + this.yVelocity * this.yVelocity
            + this.zVelocity * this.zVelocity)
    }

    normalize() {
        const mag = this.magnitude();
        return new Vector(this.x / mag, this.y / mag, this.z / mag);
    }
}

module.exports = Particle;