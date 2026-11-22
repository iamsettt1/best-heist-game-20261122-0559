// shots.js — staged screenshot states. The ?shot= parameter only picks an
// initial state of the real game; every pixel is still rendered live by
// the game's own code, so the screenshots are honest renders.
//
//   start  — title screen over the full room, guards on patrol.
//   play   — mid-heist: Wren beside the gem case, cones sweeping, loot glowing.
//   alarm  — alarm at ~85, a guard converging, red lockdown tint on the way.
//   escape — the Star secured, Wren at the skylight, getaway banner up.
import { CONFIG } from './config.js';

export function applyShot(game, shot) {
  if (!shot) return;
  if (shot === 'start') {
    game.phase = 'title';
    game.loadLevel(0);
    return;
  }
  if (shot === 'play') {
    game.loadLevel(0);
    game.phase = 'playing';
    game.player.x = game.level.gem.x - 90;
    game.player.y = game.level.gem.y + 40;
    game.player.facing = Math.atan2(game.level.gem.y - game.player.y, game.level.gem.x - game.player.x);
    game.alarm = 25;
    game.loot[0].taken = true;
    game.lootValue = game.loot[0].value;
    game.score = game.loot[0].value;
    game.timeLeft = 132;
    // Push the guards mid-patrol so the cones sweep across the frame.
    game.guards[0].x = 640;
    game.guards[0].y = 380;
    game.guards[0].facing = Math.PI / 4;
    game.guards[0].suspicion = 55;
    game.guards[1].x = 980;
    game.guards[1].y = 300;
    game.guards[1].facing = Math.PI;
    return;
  }
  if (shot === 'alarm') {
    game.loadLevel(0);
    game.phase = 'playing';
    game.player.x = 760;
    game.player.y = 430;
    game.player.facing = -Math.PI / 2;
    game.alarm = 85;
    game.gemTaken = true;
    game.lootValue = 270;
    game.score = 270 + CONFIG.GEM_VALUE;
    game.timeLeft = 96;
    game.guards[0].state = 'chase';
    // Stage the converging guard far enough away that it is still closing
    // in — not already on top of Wren — when the screenshot is taken.
    game.guards[0].x = 300;
    game.guards[0].y = 180;
    game.guards[0].suspicion = 100;
    game.guards[1].x = 900;
    game.guards[1].y = 500;
    game.guards[1].facing = Math.PI;
    game.cameras[0].seeing = true;
    game.lockdownTimer = 4;
    game.flashMessage = 'SPOTTED! ALARM RISING';
    return;
  }
  if (shot === 'escape') {
    game.loadLevel(0);
    game.phase = 'playing';
    game.gemTaken = true;
    game.lootValue = 540;
    game.score = 540 + CONFIG.GEM_VALUE;
    const e = game.level.exit;
    // Stand just below the skylight: close enough to read as "at the exit",
    // but outside the exit trigger so the shot stays in play, not on the
    // level-complete overlay.
    game.player.x = e.x + e.w / 2;
    game.player.y = e.y + e.h + 34;
    game.player.facing = -Math.PI / 2;
    game.alarm = 12;
    game.timeLeft = 88;
    game.guards[0].x = 640;
    game.guards[0].y = 380;
    game.guards[0].facing = Math.PI / 2;
    game.guards[1].x = 980;
    game.guards[1].y = 520;
    game.guards[1].facing = -Math.PI / 2;
    game.flashMessage = '★ STAR SECURED — GETAWAY! ★';
  }
}
