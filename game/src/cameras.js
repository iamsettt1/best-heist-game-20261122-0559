// cameras.js — wall-mounted cameras with sweeping green cones. Being seen
// by a camera raises the alarm meter; an EMP pulse disables them for a
// few seconds. Searchlights on the rooftop are cameras with a longer range.
import { CONFIG } from './config.js';
import { hasLineOfSight, inCone } from './guards.js';

export class Camera {
  constructor(def, index) {
    this.index = index;
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep ?? 0.9; // radians either side of base
    this.range = def.range ?? CONFIG.CAMERA_RANGE;
    this.speed = def.speed ?? 0.55; // sweep radians per second
    this.phase = index * 1.7; // stagger the sweeps
    this.angle = def.baseAngle;
    this.disabledTimer = 0;
    this.seeing = false;
  }

  reset() {
    this.disabledTimer = 0;
    this.angle = this.baseAngle;
    this.seeing = false;
  }

  update(dt, game) {
    if (this.disabledTimer > 0) {
      this.disabledTimer -= dt;
      this.seeing = false;
      return;
    }
    // The sweep is a sine wave, so the cone slows at the extremes — a
    // readable rhythm the player can time their crossing against.
    this.angle = this.baseAngle + Math.sin(game.time * this.speed + this.phase) * this.sweep;
    const player = game.player;
    this.seeing = game.playerVisible
      ? inCone(this.x, this.y, this.angle, this.range, CONFIG.CAMERA_FOV, player.x, player.y) &&
        hasLineOfSight(this.x, this.y, player.x, player.y, game.blockers)
      : false;
    if (this.seeing) {
      game.addAlarm(CONFIG.CAMERA_ALARM_PER_SEC * dt);
      game.spotted = true;
    }
  }

  disable(seconds) {
    this.disabledTimer = Math.max(this.disabledTimer, seconds);
  }
}
