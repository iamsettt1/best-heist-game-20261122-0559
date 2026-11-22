// guards.js — patrol routes, vision cones, suspicion, chase and catch.
// Geometry helpers (segment vs rectangle, point in cone) live here and are
// reused by cameras.js and the renderer.
import { CONFIG } from './config.js';

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Does the segment (x1,y1)-(x2,y2) hit rectangle r? Standard slab test.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Line of sight between two points, blocked by any wall or cover rect.
export function hasLineOfSight(ax, ay, bx, by, blockers) {
  for (const r of blockers) {
    if (segmentHitsRect(ax, ay, bx, by, r)) return false;
  }
  return true;
}

// Is the target inside a vision cone (origin, facing, range, half-FOV)?
export function inCone(ox, oy, facing, range, fov, tx, ty) {
  const d = dist(ox, oy, tx, ty);
  if (d > range) return false;
  if (d < 8) return true;
  const ang = Math.atan2(ty - oy, tx - ox);
  return Math.abs(angleDiff(ang, facing)) <= fov / 2;
}

export class Guard {
  constructor(def, index) {
    this.index = index;
    this.path = def.path;
    this.waypoint = 0;
    this.x = def.path[0][0];
    this.y = def.path[0][1];
    this.speed = def.speed ?? CONFIG.GUARD_PATROL_SPEED;
    this.facing = 0;
    this.state = 'patrol'; // patrol | investigate | chase
    this.suspicion = 0;
    this.investigateX = 0;
    this.investigateY = 0;
    this.investigateTimer = 0;
    this.lastSeenX = 0;
    this.lastSeenY = 0;
    this.alerted = false; // true once this guard has gone to chase
    this.pauseTimer = 0;
  }

  reset() {
    this.waypoint = 0;
    this.x = this.path[0][0];
    this.y = this.path[0][1];
    this.state = 'patrol';
    this.suspicion = 0;
    this.alerted = false;
    this.investigateTimer = 0;
  }

  update(dt, game) {
    const player = game.player;
    const blockers = game.blockers;
    const inShadow = game.inShadow(player.x, player.y);
    const seen = game.playerVisible
      ? inCone(this.x, this.y, this.facing, CONFIG.GUARD_RANGE, CONFIG.GUARD_FOV, player.x, player.y) &&
        hasLineOfSight(this.x, this.y, player.x, player.y, blockers)
      : false;

    if (seen) {
      const rate = player.sneaking ? CONFIG.SUSPICION_FILL_SNEAK : CONFIG.SUSPICION_FILL_PER_SEC;
      this.suspicion = Math.min(100, this.suspicion + rate * dt * (inShadow ? 0.5 : 1));
      this.lastSeenX = player.x;
      this.lastSeenY = player.y;
      game.spotted = true;
    } else {
      this.suspicion = Math.max(0, this.suspicion - CONFIG.SUSPICION_DECAY_PER_SEC * dt);
    }

    if (this.state === 'patrol' && this.suspicion >= 100) {
      this.state = 'chase';
      if (!this.alerted) {
        this.alerted = true;
        game.addAlarm(CONFIG.ALARM_GUARD_ALERT);
        game.audio.alert();
      }
    }

    if (this.state === 'chase') {
      this.moveToward(player.x, player.y, CONFIG.GUARD_CHASE_SPEED, dt, game);
      if (dist(this.x, this.y, player.x, player.y) < CONFIG.CATCH_RADIUS && game.playerVisible) {
        game.onCaught();
        return;
      }
      if (!seen && this.suspicion <= 0) {
        this.state = 'investigate';
        this.investigateX = this.lastSeenX;
        this.investigateY = this.lastSeenY;
        this.investigateTimer = CONFIG.COIN_INVESTIGATE_SEC;
      }
      return;
    }

    if (this.state === 'investigate') {
      this.moveToward(this.investigateX, this.investigateY, CONFIG.GUARD_INVESTIGATE_SPEED, dt, game);
      if (dist(this.x, this.y, this.investigateX, this.investigateY) < 12) {
        this.investigateTimer -= dt;
        this.facing += dt * 1.4; // look around, scanning
        if (this.investigateTimer <= 0) {
          this.state = 'patrol';
          this.alerted = false;
        }
      }
      return;
    }

    // Patrol: walk the waypoint loop, pausing briefly at each corner and
    // scanning the room while stopped, so the cones sweep even at rest.
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      this.facing += dt * 0.9; // slow scan while waiting at the corner
      return;
    }
    const target = this.path[this.waypoint];
    this.moveToward(target[0], target[1], this.speed, dt, game);
    if (dist(this.x, this.y, target[0], target[1]) < 10) {
      this.waypoint = (this.waypoint + 1) % this.path.length;
      this.pauseTimer = 0.6;
    }
  }

  moveToward(tx, ty, speed, dt, game) {
    const d = dist(this.x, this.y, tx, ty);
    if (d < 1) return;
    const nx = (tx - this.x) / d;
    const ny = (ty - this.y) / d;
    this.facing = Math.atan2(ny, nx);
    // Axis-separated movement with wall collision, so a chasing guard
    // slides along walls instead of cutting through them.
    const stepX = nx * speed * dt;
    const stepY = ny * speed * dt;
    if (game && game.hitsSolid) {
      if (!game.hitsSolid(this.x + stepX, this.y, 14)) this.x += stepX;
      if (!game.hitsSolid(this.x, this.y + stepY, 14)) this.y += stepY;
    } else {
      this.x += stepX;
      this.y += stepY;
    }
  }

  // A coin clink pulls a patrolling guard over to look.
  distract(x, y) {
    if (this.state === 'chase') return;
    this.state = 'investigate';
    this.investigateX = x;
    this.investigateY = y;
    this.investigateTimer = CONFIG.COIN_INVESTIGATE_SEC;
  }
}
