class Car {
  constructor(x, y, w = 30, h = 52, road) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.road = road;
    this.speed = 2.85;
    this.maxSpeed = 3.65;
    this.minMovingSpeed = 0.9;
    this.angle = 0;
    this.maxSteerAngle = 0.46;
    this.maxAngleStep = 0.040;
    this.targetX = x;
    this.targetSpeed = 3.15;
    this.emergencyBrake = false;
    this.damaged = false;
    this.distanceTravelled = 0;
    this.sensor = new Sensor(this);
    this.polygon = rectPolygon(this.x, this.y, this.width, this.height, this.angle);
  }

  update(road, traffic, dtMs = 16) {
    if (this.damaged) return;
    const dt = clamp(dtMs / 16.67, 0.5, 2.0);

    // Convert lateral error into a bounded desired heading. The steering command
    // cannot instantly reverse, which prevents the old oscillation.
    const dx = this.targetX - this.x;
    const lookahead = clamp(120 + this.speed * 10, 120, 165);
    const desiredAngle = clamp(-Math.atan2(dx, lookahead), -this.maxSteerAngle, this.maxSteerAngle);
    const maxStep = this.maxAngleStep * dt;
    this.angle += clamp(desiredAngle - this.angle, -maxStep, maxStep);

    let desiredSpeed = clamp(this.targetSpeed, 0, this.maxSpeed);
    if (this.emergencyBrake) desiredSpeed = 0;

    // Smooth acceleration/deceleration rather than abrupt speed changes.
    if (desiredSpeed > this.speed) this.speed = Math.min(desiredSpeed, this.speed + 0.055 * dt);
    else this.speed = Math.max(desiredSpeed, this.speed - 0.105 * dt);

    if (!this.emergencyBrake && this.speed < this.minMovingSpeed) {
      this.speed = this.minMovingSpeed;
    }

    if (this.emergencyBrake) {
      // Emergency/no-feasible-path state: stop decisively rather than creeping
      // into a predicted collision. Normal risk reduction still uses smooth
      // braking above this branch.
      this.speed = 0;
    }

    const oldX = this.x;
    const oldY = this.y;
    this.x -= Math.sin(this.angle) * this.speed * dt;
    this.y -= Math.cos(this.angle) * this.speed * dt;

    // Bounded lateral correction toward the fixed planner corridor.
    // This is intentionally proportional and cannot "teleport" the car sideways.
    const remaining = this.targetX - this.x;
    this.x += clamp(remaining * 0.020 * dt, -1.65 * dt, 1.65 * dt);

    this.x = road.clampX(this.x, 40);
    this.distanceTravelled += Math.hypot(this.x - oldX, this.y - oldY);
    this.polygon = rectPolygon(this.x, this.y, this.width, this.height, this.angle);

    for (const b of road.borders) {
      if (polysIntersect(this.polygon, b)) {
        this.damaged = true;
        return;
      }
    }
    for (const o of traffic) {
      if (o.visible && polysIntersect(this.polygon, o.polygon)) {
        this.damaged = true;
        return;
      }
    }

    this.sensor.update(road, traffic);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-this.angle);
    ctx.fillStyle = this.damaged ? '#8d939a' : '#57dcff';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.fillRect(-this.width * .31, -this.height * .25, this.width * .62, this.height * .22);
    ctx.fillStyle = '#122033';
    ctx.fillRect(-this.width * .34, this.height * .18, this.width * .68, this.height * .12);
    ctx.fillStyle = '#f6dd79';
    ctx.fillRect(-this.width * .32, -this.height * .45, 5, 4);
    ctx.fillRect(this.width * .16, -this.height * .45, 5, 4);
    ctx.restore();
    this.sensor.draw(ctx);
  }
}
