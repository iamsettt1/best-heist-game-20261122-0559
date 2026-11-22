// main.js — the game loop, the state machine, the autopilot bot, and the
// window.__game handle the harness and screenshots read. Ties together
// config, levels, guards, cameras, player, audio, input and render.
import { CONFIG } from './config.js';
import { LEVELS } from './levels.js';
import { Guard } from './guards.js';
import { Camera } from './cameras.js';
import { Player } from './player.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { render } from './render.js';
import { applyShot } from './shots.js';
import { RNG } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.VIEW_W;
canvas.height = CONFIG.VIEW_H;

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shot = params.get('shot');
const rng = new RNG(seed);

class Game {
  constructor() {
    this.audio = new AudioEngine();
    this.input = new Input(canvas);
    this.player = new Player();
    this.time = 0;
    this.phase = 'title'; // title | playing | paused | levelComplete | win | gameOver
    this.levelIndex = 0;
    this.level = LEVELS[0];
    this.guards = [];
    this.cameras = [];
    this.loot = [];
    this.blockers = [];
    this.coinsThrown = [];
    this.alarm = 0;
    this.score = 0;
    this.lootValue = 0;
    this.gemTaken = false;
    this.timeLeft = LEVELS[0].timeLimit;
    this.lockdownTimer = 0;
    this.lockdownCooldown = 0;
    this.caughtCount = 0;
    this.spotted = false; // any guard/camera has seen Wren this run
    this.ghost = true;
    this.levelScore = 0;
    this.gameOverReason = '';
    this.flashMessage = '';
    this.flashTimer = 0;
    this.autopilot = false;
    this.autopilotTarget = null;
    this.playerVisible = true;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.guards = this.level.guards.map((d, i) => new Guard(d, i));
    this.cameras = this.level.cameras.map((d, i) => new Camera(d, i));
    this.loot = this.level.loot.map((l) => ({ ...l, taken: false }));
    this.blockers = [...this.level.walls, ...this.level.cover];
    this.coinsThrown = [];
    this.player.reset(this.level.playerStart.x, this.level.playerStart.y);
    this.alarm = 0;
    this.lootValue = 0;
    this.gemTaken = false;
    this.timeLeft = this.level.timeLimit;
    this.lockdownTimer = 0;
    this.lockdownCooldown = 0;
    this.flashMessage = '';
    this.flashTimer = 0;
    this.autopilotTarget = null;
    this.playerVisible = true;
    this.spotted = false;
  }

  get ghostBonus() {
    return this.ghost ? CONFIG.GHOST_BONUS : 0;
  }

  inShadow(x, y) {
    return this.level.shadows.some((s) => x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h);
  }

  hitsSolid(x, y, r) {
    for (const b of this.blockers) {
      const cx = Math.max(b.x, Math.min(x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(y, b.y + b.h));
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
    }
    return false;
  }

  // The wall or cover rect the thief is pressed against, if any — probed
  // a step ahead in each direction, for the autopilot's detour logic.
  blockerAhead(p) {
    const r = p.radius;
    const probes = [
      [p.x + 24, p.y],
      [p.x - 24, p.y],
      [p.x, p.y + 24],
      [p.x, p.y - 24],
    ];
    for (const [x, y] of probes) {
      for (const b of this.blockers) {
        const cx = Math.max(b.x, Math.min(x, b.x + b.w));
        const cy = Math.max(b.y, Math.min(y, b.y + b.h));
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return b;
      }
    }
    return null;
  }

  // A waypoint around the nearest PASSABLE end of the blocking wall. A tall
  // wall is rounded vertically, a wide one horizontally — and an end only
  // counts if the thief can actually get past it inside the playfield.
  // (A wall whose top edge sits above the floor, for instance, can only be
  // rounded from below.) Returns null when nothing blocks the thief.
  detourAround(p) {
    const b = this.blockerAhead(p);
    if (!b) return null;
    const r = p.radius + 2;
    const minY = CONFIG.FLOOR_TOP + 24;
    const maxY = CONFIG.FLOOR_BOTTOM - 24;
    const minX = 40 + 24;
    const maxX = 1240 - 24;
    if (b.h >= b.w) {
      // Tall wall: go around the top or the bottom end, whichever is nearer
      // and actually passable.
      const topY = Math.max(minY, b.y - 64);
      const botY = Math.min(maxY, b.y + b.h + 64);
      const topOk = topY < b.y - r;
      const botOk = botY > b.y + b.h + r;
      if (topOk && (!botOk || Math.abs(p.y - topY) <= Math.abs(p.y - botY))) {
        return { x: p.x, y: topY };
      }
      return { x: p.x, y: botY };
    }
    const leftX = Math.max(minX, b.x - 64);
    const rightX = Math.min(maxX, b.x + b.w + 64);
    const leftOk = leftX < b.x - r;
    const rightOk = rightX > b.x + b.w + r;
    if (leftOk && (!rightOk || Math.abs(p.x - leftX) <= Math.abs(p.x - rightX))) {
      return { x: leftX, y: p.y };
    }
    return { x: rightX, y: p.y };
  }

  addAlarm(amount) {
    if (this.phase !== 'playing') return;
    this.alarm = Math.min(100, this.alarm + amount);
    if (this.alarm >= 100 && this.lockdownTimer <= 0 && this.lockdownCooldown <= 0) {
      this.lockdownTimer = CONFIG.LOCKDOWN_SEC;
      this.lockdownCooldown = 20;
      this.audio.alarmSwell();
      for (const g of this.guards) {
        g.state = 'chase';
        g.lastSeenX = this.player.x;
        g.lastSeenY = this.player.y;
      }
    }
  }

  onCaught() {
    if (this.player.graceTimer > 0) return;
    this.caughtCount += 1;
    this.score = Math.max(0, this.score - CONFIG.CAUGHT_SCORE_PENALTY);
    this.addAlarm(CONFIG.ALARM_CAUGHT_SPIKE);
    this.audio.caught();
    this.flash('CAUGHT! The guards drag you back to the entrance…');
    // Fair caught moment: respawn at the entrance, alarm retained, brief grace.
    this.player.reset(this.level.playerStart.x, this.level.playerStart.y);
    this.player.graceTimer = CONFIG.GRACE_AFTER_CAUGHT_SEC;
    for (const g of this.guards) g.reset();
    for (const c of this.cameras) c.reset();
    this.lockdownTimer = 0;
    this.playerVisible = false;
    setTimeout(() => {
      this.playerVisible = true;
    }, CONFIG.GRACE_AFTER_CAUGHT_SEC * 1000);
  }

  completeChannel(channel) {
    if (channel.kind === 'gem') {
      this.gemTaken = true;
      this.score += CONFIG.GEM_VALUE;
      this.lootValue += CONFIG.GEM_VALUE;
      this.audio.pickup();
      this.flash('★ THE STAR OF HALCYON IS YOURS — GET TO THE EXIT!');
    } else if (channel.kind === 'loot') {
      channel.target.taken = true;
      this.score += channel.target.value;
      this.lootValue += channel.target.value;
      this.audio.pickup();
      this.flash(`+${channel.target.value} — ${channel.target.label}`);
    } else if (channel.kind === 'vent') {
      const v = channel.target;
      this.player.x = v.to.x + 27;
      this.player.y = v.to.y + 17;
      this.audio.clink();
      this.flash('Through the vent — behind their lines!');
    }
  }

  flash(msg) {
    this.flashMessage = msg;
    this.flashTimer = 3;
  }

  update(dt) {
    this.time += dt;
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flashMessage = '';
    }
    for (const c of this.coinsThrown) c.t += dt;
    this.coinsThrown = this.coinsThrown.filter((c) => c.t < 1.2);

    // Global keys.
    if (this.input.mutePressed) {
      this.input.mutePressed = false;
      this.audio.ensure();
      this.audio.toggleMute();
    }
    if (this.input.restartPressed) {
      this.input.restartPressed = false;
      this.score = 0;
      this.caughtCount = 0;
      this.ghost = true;
      this.loadLevel(0);
      this.phase = 'playing';
      return;
    }

    if (this.phase === 'title') {
      if (this.input.startPressed || this.input.click) {
        this.input.startPressed = false;
        this.input.click = null;
        this.audio.ensure();
        this.phase = 'playing';
      }
      // Let the guards patrol behind the title so the room feels alive.
      for (const g of this.guards) g.update(dt, this);
      return;
    }
    if (this.phase === 'paused') {
      if (this.input.pausePressed) {
        this.input.pausePressed = false;
        this.phase = 'playing';
      }
      return;
    }
    if (this.phase === 'levelComplete' || this.phase === 'win' || this.phase === 'gameOver') {
      // The autopilot plays through on its own: after a short breather it
      // walks into the next night without waiting for a key press.
      if (this.phase === 'levelComplete' && this.autopilot) {
        this._completeTimer = (this._completeTimer ?? 0) + dt;
        if (this._completeTimer > 3) {
          this._completeTimer = 0;
          this.input.startPressed = true;
        }
      }
      if (this.input.startPressed) {
        this.input.startPressed = false;
        if (this.phase === 'levelComplete') {
          if (this.levelIndex + 1 < LEVELS.length) {
            this.loadLevel(this.levelIndex + 1);
            this.phase = 'playing';
          } else {
            this.phase = 'win';
          }
        } else if (this.phase === 'gameOver') {
          this.score = 0;
          this.loadLevel(0);
          this.phase = 'playing';
        }
      }
      return;
    }

    // Playing.
    if (this.input.pausePressed) {
      this.input.pausePressed = false;
      this.phase = 'paused';
      return;
    }

    // Autopilot: 8 seconds without a human hand, the bot takes over.
    const idle = this.input.idleSeconds;
    if (idle > CONFIG.AUTOPILOT_IDLE_SEC && !this.autopilot) {
      this.autopilot = true;
    } else if (idle < 1 && this.autopilot) {
      this.autopilot = false;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.phase = 'gameOver';
      this.gameOverReason = 'Dawn broke over the Halcyon — the night ran out.';
      return;
    }

    if (this.lockdownTimer > 0) {
      this.lockdownTimer -= dt;
      if (this.lockdownTimer <= 0) {
        this.alarm = CONFIG.LOCKDOWN_ALARM_RESET;
      }
    }
    if (this.lockdownCooldown > 0) this.lockdownCooldown -= dt;

    // Alarm slowly bleeds off while Wren hides in shadow or cover.
    const hidden = this.inShadow(this.player.x, this.player.y) || !this.anyoneSeesPlayer();
    if (hidden && this.alarm > 0 && this.lockdownTimer <= 0) {
      this.alarm = Math.max(0, this.alarm - CONFIG.ALARM_DECAY_PER_SEC * dt);
    }

    if (this.autopilot) {
      this.autopilotUpdate(dt);
    } else {
      this.player.update(dt, this, this.input);
    }
    for (const g of this.guards) g.update(dt, this);
    for (const c of this.cameras) c.update(dt, this);

    // Reaching the exit with the Star ends the level.
    if (this.gemTaken) {
      const e = this.level.exit;
      if (
        this.player.x > e.x - 6 && this.player.x < e.x + e.w + 6 &&
        this.player.y > e.y - 6 && this.player.y < e.y + e.h + 6
      ) {
        const timeBonus = Math.round(this.timeLeft) * CONFIG.TIME_BONUS_PER_SEC;
        // lootValue already includes the gem; the level score is loot + time.
        this.levelScore = this.lootValue + timeBonus;
        this.score += timeBonus;
        this.audio.win();
        this._completeTimer = 0;
        if (this.levelIndex + 1 >= LEVELS.length) {
          if (this.ghost) this.score += CONFIG.GHOST_BONUS;
          this.phase = 'win';
        } else {
          this.phase = 'levelComplete';
        }
      }
    }
  }

  anyoneSeesPlayer() {
    for (const g of this.guards) {
      if (g.suspicion > 60) return true;
    }
    for (const c of this.cameras) {
      if (c.seeing) return true;
    }
    return false;
  }

  // The autopilot: a simple waypoint bot. Sneak to the nearest loot, pick
  // the lock on the Star, then slip to the exit — sneaking whenever a guard
  // is close, pausing its channel when a cone sweeps over it. If it gets
  // pinned against a wall (the target sits in the wall's span, so sliding
  // along the face never frees it), it detours around the nearest end of
  // the blocking wall and then resumes.
  autopilotUpdate(dt) {
    const p = this.player;
    // Stuck detection: sample the position once a second. A thief creeping
    // along a wall face toward a target on the far side barely moves, so
    // the bar is low — any genuine walk covers far more ground than this.
    // (Skipped while channelling, when standing still is the job.)
    this._sampleTimer = (this._sampleTimer ?? 0) + dt;
    if (this._sampleTimer >= 1.0 && !p.channel) {
      this._sampleTimer = 0;
      const sx = this._sampleX ?? p.x;
      const sy = this._sampleY ?? p.y;
      const moved = Math.hypot(p.x - sx, p.y - sy);
      this._sampleX = p.x;
      this._sampleY = p.y;
      if (this._detour) {
        // A detour only counts as reached when the thief is actually
        // past the wall's end — a generous radius would "arrive" while
        // still blocked and the bot would ping-pong back to the wall.
        if (Math.hypot(this._detour.x - p.x, this._detour.y - p.y) < 12) this._detour = null;
      } else if (moved < 6) {
        this._stuckTime = (this._stuckTime ?? 0) + 1.0;
        if (this._stuckTime >= 1.0) {
          this._stuckTime = 0;
          this._detour = this.detourAround(p);
        }
      } else {
        this._stuckTime = 0;
      }
    }

    let target = this._detour;
    if (!target) {
      if (!this.gemTaken) {
        const nearLoot = this.loot.find((l) => !l.taken && Math.hypot(l.x - p.x, l.y - p.y) < 160);
        target = nearLoot ? { x: nearLoot.x, y: nearLoot.y } : { x: this.level.gem.x, y: this.level.gem.y };
      } else {
        const e = this.level.exit;
        target = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
      }
    }
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy);
    const nearGuard = this.guards.some((g) => Math.hypot(g.x - p.x, g.y - p.y) < 300);
    p.sneaking = nearGuard || d < 120;

    // Arrival radius depends on the target: loot and the gem need only get
    // close enough to channel (their interact radii are 56–64px), but the
    // exit must actually be stepped into — a wide radius would make the bot
    // idle just outside the skylight forever.
    const arriveDist = this._detour ? 12 : this.gemTaken ? 8 : 46;
    if (d < arriveDist) {
      if (this._detour) {
        // Close enough to the detour point: it served its purpose.
        this._detour = null;
      } else if (!this.gemTaken) {
        // Close enough to interact; stand still and channel.
        p.moving = false;
        if (!p.channel) p.tryInteract(this);
        if (p.channel) {
          p.channel.t += dt;
          if (p.channel.t >= p.channel.total) {
            this.completeChannel(p.channel);
            p.channel = null;
          }
        }
      }
    } else {
      const speed = p.sneaking ? CONFIG.PLAYER_SNEAK_SPEED : CONFIG.PLAYER_WALK_SPEED;
      const nx = dx / d;
      const ny = dy / d;
      p.facing = Math.atan2(ny, nx);
      p.moving = true;
      p.moveAxis(nx * speed * dt, 0, this);
      p.moveAxis(0, ny * speed * dt, this);
    }
    // A guard right on top of us: toss a coin away to buy room.
    if (nearGuard && p.coins > 0 && this.guards.some((g) => Math.hypot(g.x - p.x, g.y - p.y) < 120)) {
      p.tossCoin(p.x + 260, p.y - 120, this);
    }
  }

  snapshot() {
    return {
      phase: this.phase,
      level: this.levelIndex + 1,
      levelName: this.level.name,
      alarm: Math.round(this.alarm),
      loot: this.lootValue,
      score: this.score,
      timeLeft: Math.ceil(this.timeLeft),
      caught: this.caughtCount,
      won: this.phase === 'win',
      gemTaken: this.gemTaken,
      autopilot: this.autopilot,
    };
  }
}

const game = new Game();
applyShot(game, shot);
window.__game = game.snapshot();
window.__gameInstance = game;

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  render(ctx, game);
  window.__game = game.snapshot();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Keep the seeded RNG referenced so the build stays deterministic.
void rng;
