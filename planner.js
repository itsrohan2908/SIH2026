class AdaptivePlanner {
  constructor(road) {
    this.road = road;
    this.currentPath = 'CENTER';
    this.currentTargetX = 0;
    this.risk = 'LOW';
    this.replans = 0;
    this.lastLatency = 0;
    this.costs = { LEFT: 0, CENTER: 0, RIGHT: 0 };
    this.feasibility = { LEFT: true, CENTER: true, RIGHT: true };
    this.lastReason = 'Normal flow';
    this.noSafePath = false;
    this.lastDecisionAt = 0;
    this.pathHoldMs = 900;

    // Road-anchored corridors: these are fixed world targets, not targets that
    // move with the ego vehicle. That prevents lateral target drift.
    this.pathX = {
      LEFT: road.left + 155,
      CENTER: (road.left + road.right) * 0.5,
      RIGHT: road.right - 155
    };

    // The planner predicts both the obstacle AND the ego vehicle at the same
    // future timestamps, then evaluates the complete swept candidate trajectory.
    this.horizonFrames = 180;
    this.sampleStep = 4;
    this.vehicleHalfWidth = 15;
    this.baseClearance = 42;
    this.edgeMargin = 52;
  }

  #typeWeight(type) {
    return {
      CAR: 1.0, AUTO: 1.15, BIKE: 1.25, BUS: 1.05,
      TRUCK: 1.1, PEDESTRIAN: 1.7, CATTLE: 2.1, PUSHCART: 1.45
    }[type] || 1.0;
  }

  #dynamicClearance(obs, ego) {
    const classExtra = (obs.type === 'CATTLE' || obs.type === 'PEDESTRIAN') ? 18 : 0;
    const closing = Math.max(0, ego.speed + obs.object.speedY);
    const speedExtra = clamp(closing * 7, 0, 45);
    return this.vehicleHalfWidth + (obs.object.width || 24) * 0.5 + this.baseClearance + classExtra + speedExtra;
  }

  #pathXAt(ego, targetX, frame) {
    // 0→1 smoothstep over ~42 frames. The target remains fixed in world space.
    const u = clamp(frame / 42, 0, 1);
    const s = smoothstep(u);
    return lerp(ego.x, targetX, s);
  }

  #predict(obs, frame) {
    const o = obs.object;
    return { x: o.x + o.speedX * frame, y: o.y + o.speedY * frame };
  }

  #laneEdgePenalty(x) {
    const gap = Math.min(x - this.road.left, this.road.right - x);
    if (gap < this.edgeMargin) return 8000 + (this.edgeMargin - gap) * 200;
    if (gap < this.edgeMargin + 30) return (this.edgeMargin + 30 - gap) * 45;
    return 0;
  }

  #evaluateCandidate(ego, observations, name) {
    const targetX = this.pathX[name];
    let cost = Math.abs(targetX - ego.x) * 0.018;
    cost += this.#laneEdgePenalty(targetX);

    let infeasible = false;
    let severeConflict = false;
    let totalDanger = 0;
    let occupiedSamples = 0;
    let followingSamples = 0;
    let closestGap = Infinity;

    for (const obs of observations) {
      const required = this.#dynamicClearance(obs, ego);
      const weight = this.#typeWeight(obs.type);
      let localDangerSamples = 0;
      let localFollowingSamples = 0;
      let firstConflictFrame = Infinity;

      for (let frame = 0; frame <= this.horizonFrames; frame += this.sampleStep) {
        const p = this.#predict(obs, frame);
        const futureEgoY = ego.y - ego.speed * frame;
        const pathX = this.#pathXAt(ego, targetX, frame);
        const longitudinal = futureEgoY - p.y;
        if (longitudinal < -45 || longitudinal > 340) continue;

        const lateral = Math.abs(p.x - pathX);
        const gap = lateral - required;
        closestGap = Math.min(closestGap, gap);

        // A path is dangerous when the predicted obstacle sweeps into the
        // vehicle corridor. The closer the encounter, the larger the penalty.
        const danger = clamp(1 - lateral / Math.max(required + 1, 1), 0, 1);
        const forwardWeight = clamp(1 - Math.max(longitudinal, 0) / 300, 0.18, 1);
        const closingWeight = 1 + clamp(Math.max(0, ego.speed + obs.object.speedY) * 0.10, 0, 0.8);
        cost += danger * 95 * weight * forwardWeight * closingWeight;
        totalDanger += danger;

        if (danger > 0.12) occupiedSamples++;
        if (danger > 0.65 && longitudinal > 0) {
          localDangerSamples++;
          if (firstConflictFrame === Infinity) firstConflictFrame = frame;
        }

        // "Do not follow the obstacle": if the candidate and the predicted
        // obstacle remain in almost the same lateral corridor while the obstacle
        // is ahead, penalize it strongly. A side-pass must create and maintain
        // lateral separation instead of tracing the obstacle's path.
        const forwardObstacle = longitudinal > 12 && longitudinal < 220;
        const sameCorridor = lateral < required + 25;
        if (forwardObstacle && sameCorridor) {
          localFollowingSamples++;
          followingSamples++;
        }

        // Hard conflict: enough future samples inside the inflated obstacle
        // corridor means this candidate cannot be considered safe.
        if (danger > 0.88 && longitudinal > -5 && longitudinal < 175) {
          severeConflict = true;
        }
      }

      // Persistent overlap is not just a cost; reject the candidate. This is
      // what stops a path from following an obstacle for a long period.
      if (localDangerSamples >= 5) infeasible = true;
      if (localFollowingSamples >= 6) {
        cost += weight * localFollowingSamples * 48;
        infeasible = true;
      }

      // A direct crossing path gets an additional penalty.
      if (Math.abs(obs.object.speedX) > 0.45 && closestGap < 10) {
        cost += weight * 220;
      }
    }

    // Prefer the center corridor when it is genuinely safe; otherwise side
    // corridors are allowed to win by a meaningful margin.
    if (name === 'CENTER') cost -= 2;
    cost += totalDanger * 0.7 + occupiedSamples * 0.18;

    // Severe conflicts and long obstacle-following are hard constraints.
    if (severeConflict) infeasible = true;
    if (cost >= 1750) infeasible = true;

    return {
      cost: Number(cost.toFixed(2)),
      feasible: !infeasible,
      targetX,
      closestGap,
      followingSamples,
      severeConflict
    };
  }

  evaluate(ego, observations) {
    const out = {};
    for (const name of ['LEFT', 'CENTER', 'RIGHT']) {
      out[name] = this.#evaluateCandidate(ego, observations, name);
    }
    return out;
  }

  #bestSide(ego, candidates) {
    const sides = ['LEFT', 'RIGHT'].filter(n => candidates[n].feasible);
    if (!sides.length) return null;
    return sides.sort((a, b) => {
      const aDist = Math.abs(candidates[a].targetX - ego.x);
      const bDist = Math.abs(candidates[b].targetX - ego.x);
      return (candidates[a].cost + aDist * 0.01) - (candidates[b].cost + bDist * 0.01);
    })[0];
  }

  plan(ego, observations, now = performance.now()) {
    const start = performance.now();
    const candidates = this.evaluate(ego, observations);
    const names = ['LEFT', 'CENTER', 'RIGHT'];

    this.costs = Object.fromEntries(names.map(n => [n, candidates[n].cost]));
    this.feasibility = Object.fromEntries(names.map(n => [n, candidates[n].feasible]));

    const safe = names.filter(n => candidates[n].feasible).sort((a, b) => candidates[a].cost - candidates[b].cost);
    this.noSafePath = safe.length === 0;

    const current = candidates[this.currentPath];
    const closest = observations
      .filter(o => o.longitudinal > -20)
      .sort((a, b) => a.longitudinal - b.longitudinal)[0] || null;
    const best = safe[0] || null;
    const currentUnsafe = !current.feasible || current.cost > 520;
    const bestBetter = best && best !== this.currentPath && candidates[best].cost + 28 < current.cost;

    // Immediate predicted conflict can override the normal path hold.
    const immediateConflict = !current.feasible || current.severeConflict || current.cost > 1000;
    const holdExpired = now - this.lastDecisionAt >= this.pathHoldMs;

    let selected = this.currentPath;

    if (this.noSafePath) {
      // Keep the current corridor but report a yield/stop state. There is no
      // mathematically safe alternative, so forcing a turn would be worse.
      this.lastReason = 'No feasible corridor; yielding for a safe gap';
    } else if (immediateConflict && best && best !== this.currentPath) {
      selected = best;
      this.lastReason = `Predicted conflict on ${this.currentPath}; switched to ${best}`;
    } else if (immediateConflict && (!best || best === this.currentPath)) {
      // The current path is critically unsafe and there is no different safe
      // corridor. Do not "switch" to the same path; enter the yield state.
      this.lastReason = `Predicted conflict on ${this.currentPath}; no safe escape corridor`;
    } else if (holdExpired && bestBetter) {
      selected = best;
      this.lastReason = `Selected lower-risk ${best} corridor`;
    } else if (this.currentPath === 'CENTER' && candidates.CENTER.feasible && candidates.CENTER.followingSamples >= 5 && closest && closest.longitudinal > 20 && closest.longitudinal < 210) {
      const side = this.#bestSide(ego, candidates);
      if (side) {
        selected = side;
        this.lastReason = `Preventing obstacle-following; moved to ${side}`;
      }
    }

    if (selected !== this.currentPath) {
      this.currentPath = selected;
      this.replans += 1;
      this.lastDecisionAt = now;
    }

    this.currentTargetX = this.pathX[this.currentPath];
    const currentCost = candidates[this.currentPath].cost;
    this.risk = this.noSafePath || currentCost >= 520 ? 'HIGH' : currentCost >= 125 ? 'MEDIUM' : 'LOW';
    this.lastLatency = performance.now() - start;

    return {
      path: this.currentPath,
      targetX: this.currentTargetX,
      risk: this.risk,
      costs: this.costs,
      feasibility: this.feasibility,
      emergencyBrake: this.noSafePath || (immediateConflict && (!best || best === this.currentPath)),
      noSafePath: this.noSafePath,
      reason: this.lastReason
    };
  }

  getPathPoints(ego, name = this.currentPath) {
    const targetX = this.pathX[name];
    const points = [];
    for (let frame = 0; frame <= this.horizonFrames; frame += 8) {
      points.push({
        x: this.#pathXAt(ego, targetX, frame),
        y: ego.y - ego.speed * frame
      });
    }
    return points;
  }
}
