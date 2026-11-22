// player.js — Wren, the thief. Movement with wall collision, sneaking,
// channelled interactions (lockpick / grab loot / vent crawl), coin tosses
// and the EMP pulse. Tools cost something: coins and EMP charges are limited.
import { CONFIG } from './config.js';

export class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.radius = CONFIG.PLAYER_RADIUS;
    this.sneaking = false;
    this.moving = false;
    this.facing = -Math.PI / 2;
    this.coins = CONFIG.COINS_PER_LEVEL;
    this.empCharges = CONFIG.EMP_CHARGES_PER_LEVEL;
    this.channel = null; // { kind, target, t, total }
    this.graceTimer = 0;
    this.stepTimer = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.sneaking = false;
    this.moving = false;
    this.facing = -Math.PI / 2;
    this.coins = CONFIG.COINS_PER_LEVEL;
    this.empCharges = CONFIG.EMP_CHARGES_PER_LEVEL;
    this.channel = null;
    this.graceTimer = 0;
  }

  update(dt, game, input) {
    if (this.graceTimer > 0) this.graceTimer -= dt;

    // Movement input: WASD or arrows. Sneak with Shift.
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    this.sneaking = input.sneak;
    this.moving = mx !== 0 || my !== 0;

    if (this.channel) {
      // Channelling roots the thief in place; moving cancels it.
      if (this.moving) this.channel = null;
    } else if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      const speed = this.sneaking ? CONFIG.PLAYER_SNEAK_SPEED : CONFIG.PLAYER_WALK_SPEED;
      this.facing = Math.atan2(my, mx);
      this.moveAxis(mx * speed * dt, 0, game);
      this.moveAxis(0, my * speed * dt, game);
      // Footstep ticks, slower and quieter while sneaking.
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        game.audio.footstep(this.sneaking);
        this.stepTimer = this.sneaking ? 0.55 : 0.34;
      }
    }

    // Interact key: start a channel on the nearest usable thing.
    if (input.interactPressed) {
      input.interactPressed = false;
      this.tryInteract(game);
    }
    if (this.channel) {
      this.channel.t += dt;
      if (this.channel.t >= this.channel.total) {
        game.completeChannel(this.channel);
        this.channel = null;
      }
    }

    // Coin toss: mouse click throws a coin to that spot.
    if (input.click) {
      const target = input.click;
      input.click = null;
      this.tossCoin(target.x, target.y, game);
    }

    // EMP pulse: Q disables cameras, but the burst spikes the alarm.
    if (input.empPressed) {
      input.empPressed = false;
      this.useEmp(game);
    }
  }

  // Axis-separated movement so the thief slides along walls instead of
  // sticking on corners.
  moveAxis(dx, dy, game) {
    const nx = this.x + dx;
    const ny = this.y + dy;
    if (!game.hitsSolid(nx, this.y, this.radius)) this.x = nx;
    if (!game.hitsSolid(this.x, ny, this.radius)) this.y = ny;
    // Keep inside the playfield.
    this.x = Math.max(40 + this.radius, Math.min(1240 - this.radius, this.x));
    this.y = Math.max(CONFIG.FLOOR_TOP + 12 + this.radius, Math.min(CONFIG.FLOOR_BOTTOM - 12 - this.radius, this.y));
  }

  tryInteract(game) {
    if (this.channel) return;
    // Gem case first: the main target.
    if (!game.gemTaken && Math.hypot(this.x - game.level.gem.x, this.y - game.level.gem.y) < 64) {
      this.channel = { kind: 'gem', t: 0, total: CONFIG.GEM_CHANNEL_SEC };
      game.audio.lockpick();
      return;
    }
    // Side loot.
    for (const loot of game.loot) {
      if (!loot.taken && Math.hypot(this.x - loot.x, this.y - loot.y) < 56) {
        this.channel = { kind: 'loot', target: loot, t: 0, total: CONFIG.LOOT_CHANNEL_SEC };
        game.audio.lockpick();
        return;
      }
    }
    // Vent crawl: one-way shortcut to the paired vent.
    for (const vent of game.level.vents) {
      if (this.x > vent.x && this.x < vent.x + vent.w && this.y > vent.y && this.y < vent.y + vent.h) {
        this.channel = { kind: 'vent', target: vent, t: 0, total: CONFIG.VENT_CHANNEL_SEC };
        return;
      }
    }
  }

  tossCoin(x, y, game) {
    if (game.phase !== 'playing') return;
    if (this.coins <= 0) {
      game.audio.deny();
      return;
    }
    this.coins -= 1;
    game.audio.clink();
    game.coinsThrown.push({ x, y, t: 0 });
    for (const guard of game.guards) {
      if (Math.hypot(guard.x - x, guard.y - y) < CONFIG.COIN_DISTRACT_RADIUS) {
        guard.distract(x, y);
      }
    }
  }

  useEmp(game) {
    if (this.empCharges <= 0) {
      game.audio.deny();
      return;
    }
    this.empCharges -= 1;
    for (const cam of game.cameras) cam.disable(CONFIG.EMP_DISABLE_SEC);
    game.addAlarm(CONFIG.EMP_ALARM_COST);
    game.audio.emp();
  }
}
