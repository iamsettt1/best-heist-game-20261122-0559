// render.js — everything the eye sees, drawn procedurally on one canvas:
// the night museum, vision cones, the thief, the loot, and the HUD.
// No images, no fonts from the network; the only font is the system stack.
import { CONFIG } from './config.js';
import { angleDiff } from './guards.js';

const C = CONFIG.COLORS;

function conePath(ctx, x, y, facing, range, fov) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - fov / 2, facing + fov / 2);
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, game) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);
  // Marble checker, two dark tones, plus a soft vignette feel.
  const tile = 64;
  for (let y = CONFIG.FLOOR_TOP; y < CONFIG.FLOOR_BOTTOM; y += tile) {
    for (let x = 32; x < 1248; x += tile) {
      const even = ((x / tile) | 0) + ((y / tile) | 0);
      ctx.fillStyle = even % 2 === 0 ? C.floorA : C.floorB;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 32; x <= 1248; x += tile) {
    ctx.beginPath(); ctx.moveTo(x, CONFIG.FLOOR_TOP); ctx.lineTo(x, CONFIG.FLOOR_BOTTOM); ctx.stroke();
  }
  for (let y = CONFIG.FLOOR_TOP; y <= CONFIG.FLOOR_BOTTOM; y += tile) {
    ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(1248, y); ctx.stroke();
  }
  // Border walls.
  ctx.fillStyle = C.wall;
  ctx.fillRect(0, CONFIG.FLOOR_TOP, 32, CONFIG.FLOOR_BOTTOM - CONFIG.FLOOR_TOP);
  ctx.fillRect(1248, CONFIG.FLOOR_TOP, 32, CONFIG.FLOOR_BOTTOM - CONFIG.FLOOR_TOP);
  ctx.fillRect(0, CONFIG.FLOOR_TOP, CONFIG.VIEW_W, 8);
  ctx.fillRect(0, CONFIG.FLOOR_BOTTOM - 8, CONFIG.VIEW_W, 8);
}

function drawShadows(ctx, level) {
  for (const s of level.shadows) {
    ctx.fillStyle = 'rgba(6, 9, 18, 0.55)';
    roundRect(ctx, s.x, s.y, s.w, s.h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 170, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(160, 190, 255, 0.5)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('S H A D O W', s.x + s.w / 2, s.y + 18);
  }
}

function drawWallsAndCover(ctx, level) {
  for (const w of level.walls) {
    ctx.fillStyle = C.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = C.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }
  for (const c of level.cover) {
    if (c.kind === 'case') {
      ctx.fillStyle = C.coverCase;
      roundRect(ctx, c.x, c.y, c.w, c.h, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(127, 212, 255, 0.28)';
      roundRect(ctx, c.x + 5, c.y + 5, c.w - 10, c.h - 10, 4);
      ctx.fill();
      ctx.strokeStyle = C.coverGlass;
      ctx.lineWidth = 1.5;
      roundRect(ctx, c.x + 5, c.y + 5, c.w - 10, c.h - 10, 4);
      ctx.stroke();
    } else if (c.kind === 'pillar') {
      ctx.fillStyle = C.pillar;
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a608f';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, c.w / 2 - 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.kind === 'planter') {
      ctx.fillStyle = C.planter;
      roundRect(ctx, c.x, c.y, c.w, c.h, 8);
      ctx.fill();
      ctx.fillStyle = '#2f7a4a';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(c.x + 10 + i * 13, c.y + c.h / 2, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawVents(ctx, level) {
  for (const v of level.vents) {
    ctx.fillStyle = '#101725';
    roundRect(ctx, v.x, v.y, v.w, v.h, 4);
    ctx.fill();
    ctx.strokeStyle = '#5a6b8c';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(v.x + 6, v.y + (v.h / 4) * i);
      ctx.lineTo(v.x + v.w - 6, v.y + (v.h / 4) * i);
      ctx.stroke();
    }
    ctx.fillStyle = '#8fa3c4';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VENT · E', v.x + v.w / 2, v.y - 6);
  }
}

function drawLoot(ctx, game) {
  const t = game.time;
  for (const loot of game.loot) {
    if (loot.taken) continue;
    const bob = Math.sin(t * 2 + loot.x) * 2;
    const glow = ctx.createRadialGradient(loot.x, loot.y + bob, 2, loot.x, loot.y + bob, 34);
    glow.addColorStop(0, 'rgba(245, 197, 66, 0.5)');
    glow.addColorStop(1, 'rgba(245, 197, 66, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(loot.x, loot.y + bob, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(loot.kind === 'vase' ? '🏺' : '🪙', loot.x, loot.y + bob);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(loot.label, loot.x, loot.y + bob + 26);
  }
  // The Star of Halcyon in its case.
  if (!game.gemTaken) {
    const g = game.level.gem;
    const pulse = 0.5 + 0.3 * Math.sin(t * 3);
    const glow = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, 70);
    glow.addColorStop(0, `rgba(126, 240, 255, ${0.55 * pulse + 0.2})`);
    glow.addColorStop(1, 'rgba(126, 240, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(127, 212, 255, 0.25)';
    roundRect(ctx, g.x - 34, g.y - 34, 68, 68, 8);
    ctx.fill();
    ctx.strokeStyle = C.gem;
    ctx.lineWidth = 2;
    roundRect(ctx, g.x - 34, g.y - 34, 68, 68, 8);
    ctx.stroke();
    // Faceted gem.
    ctx.fillStyle = C.gem;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y - 16);
    ctx.lineTo(g.x + 13, g.y);
    ctx.lineTo(g.x, g.y + 16);
    ctx.lineTo(g.x - 13, g.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y - 16);
    ctx.lineTo(g.x + 13, g.y);
    ctx.lineTo(g.x, g.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ STAR OF HALCYON ★', g.x, g.y + 52);
  }
}

function drawExit(ctx, game) {
  const e = game.level.exit;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const pulse = 0.5 + 0.25 * Math.sin(game.time * 2.4);
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 64);
  glow.addColorStop(0, `rgba(141, 255, 158, ${0.5 * pulse + 0.2})`);
  glow.addColorStop(1, 'rgba(141, 255, 158, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.exit;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.setLineDash([]);
  ctx.fillStyle = C.exit;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(e.label, cx, e.y + e.h + 18);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('↗', cx, cy + 7);
}

function drawCones(ctx, game) {
  // Faint dotted patrol routes, so the player can read where each guard
  // will walk next and plan a crossing around it.
  for (const g of game.guards) {
    ctx.strokeStyle = 'rgba(255, 120, 120, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    g.path.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const cam of game.cameras) {
    if (cam.disabledTimer > 0) continue;
    ctx.fillStyle = C.cameraCone;
    conePath(ctx, cam.x, cam.y, cam.angle, cam.range, CONFIG.CAMERA_FOV);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 255, 150, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const g of game.guards) {
    const alert = g.state === 'chase';
    ctx.fillStyle = alert ? C.guardConeAlert : C.guardCone;
    conePath(ctx, g.x, g.y, g.facing, CONFIG.GUARD_RANGE, CONFIG.GUARD_FOV);
    ctx.fill();
    ctx.strokeStyle = alert ? 'rgba(255, 40, 40, 0.55)' : 'rgba(255, 84, 84, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawEntities(ctx, game) {
  // Cameras: small wall mounts with a lens.
  for (const cam of game.cameras) {
    ctx.fillStyle = cam.disabledTimer > 0 ? '#3a4356' : '#1f2c22';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cam.disabledTimer > 0 ? '#666' : '#50ff96';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (cam.disabledTimer > 0) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMP ' + Math.ceil(cam.disabledTimer) + 's', cam.x, cam.y - 14);
    }
  }
  // Guards: red-uniformed patrolmen with a facing tick and a suspicion bar.
  for (const g of game.guards) {
    ctx.fillStyle = '#3d1620';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = g.state === 'chase' ? '#ff2e2e' : C.guardBody;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    // Facing nose.
    ctx.strokeStyle = '#ffd9d9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.facing) * 18, g.y + Math.sin(g.facing) * 18);
    ctx.stroke();
    // Cap brim.
    ctx.fillStyle = '#2a2f45';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 6, 0, Math.PI * 2);
    ctx.fill();
    if (g.suspicion > 5) {
      const w = 34;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(g.x - w / 2, g.y - 30, w, 6);
      ctx.fillStyle = g.suspicion >= 100 ? '#ff2e2e' : '#ffb02e';
      ctx.fillRect(g.x - w / 2, g.y - 30, (w * g.suspicion) / 100, 6);
    }
    if (g.state === 'chase') {
      ctx.fillStyle = '#ff2e2e';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 34);
    } else if (g.suspicion > 40) {
      ctx.fillStyle = '#ffb02e';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 34);
    }
  }
  // Thrown coins, still ringing.
  for (const c of game.coinsThrown) {
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 197, 66, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 10 + c.t * 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Wren, the thief: hooded figure, cloak billowing, gold trim.
  const p = game.player;
  const blink = p.graceTimer > 0 && Math.floor(game.time * 10) % 2 === 0;
  if (!blink) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 12, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.playerCloak;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius - 3, 0, Math.PI * 2);
    ctx.fill();
    // Hood point + facing tick.
    ctx.fillStyle = C.playerCloak;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.facing - 0.5) * 12, p.y + Math.sin(p.facing - 0.5) * 12);
    ctx.lineTo(p.x + Math.cos(p.facing) * 20, p.y + Math.sin(p.facing) * 20);
    ctx.lineTo(p.x + Math.cos(p.facing + 0.5) * 12, p.y + Math.sin(p.facing + 0.5) * 12);
    ctx.closePath();
    ctx.fill();
    if (p.sneaking) {
      ctx.fillStyle = '#9fd8ff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SNEAK', p.x, p.y - 22);
    }
    // Channel progress ring.
    if (p.channel) {
      const frac = p.channel.t / p.channel.total;
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const label = p.channel.kind === 'gem' ? 'PICKING LOCK…' : p.channel.kind === 'vent' ? 'CRAWLING…' : 'GRABBING…';
      ctx.fillText(label, p.x, p.y - 30);
    }
  }
}

function drawMinimap(ctx, game) {
  const mw = 190;
  const mh = 104;
  const mx = CONFIG.VIEW_W - mw - 16;
  const my = CONFIG.VIEW_H - mh - 16;
  const sx = mw / CONFIG.VIEW_W;
  const sy = mh / (CONFIG.FLOOR_BOTTOM - CONFIG.FLOOR_TOP);
  ctx.fillStyle = 'rgba(8, 12, 24, 0.78)';
  roundRect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 8);
  ctx.fill();
  ctx.fillStyle = '#1b2947';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#31456e';
  for (const w of game.level.walls) ctx.fillRect(mx + w.x * sx, my + (w.y - CONFIG.FLOOR_TOP) * sy, w.w * sx, w.h * sy);
  for (const c of game.level.cover) ctx.fillRect(mx + c.x * sx, my + (c.y - CONFIG.FLOOR_TOP) * sy, c.w * sx, c.h * sy);
  if (!game.gemTaken) {
    ctx.fillStyle = C.gem;
    ctx.beginPath();
    ctx.arc(mx + game.level.gem.x * sx, my + (game.level.gem.y - CONFIG.FLOOR_TOP) * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const e = game.level.exit;
  ctx.fillStyle = C.exit;
  ctx.fillRect(mx + e.x * sx, my + (e.y - CONFIG.FLOOR_TOP) * sy, e.w * sx, e.h * sy);
  ctx.fillStyle = '#ff5b5b';
  for (const g of game.guards) {
    ctx.beginPath();
    ctx.arc(mx + g.x * sx, my + (g.y - CONFIG.FLOOR_TOP) * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx + game.player.x * sx, my + (game.player.y - CONFIG.FLOOR_TOP) * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.muted;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  // Bottom-left inside the box, so it never collides with loot labels.
  ctx.fillText('MAP', mx + 4, my + mh - 6);
}

function alarmColor(alarm) {
  if (alarm >= 75) return C.alarmHigh;
  if (alarm >= 40) return C.alarmMid;
  return C.alarmLow;
}

function drawHUD(ctx, game) {
  ctx.fillStyle = C.hudBar;
  ctx.fillRect(0, 0, CONFIG.VIEW_W, CONFIG.HUD_H);
  ctx.fillStyle = C.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(game.level.name, 18, 26);
  ctx.fillStyle = C.muted;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(game.level.subtitle, 18, 46);

  // Alarm meter, top centre.
  const bw = 340;
  const bx = CONFIG.VIEW_W / 2 - bw / 2;
  ctx.fillStyle = C.muted;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚠ ALARM', CONFIG.VIEW_W / 2, 20);
  ctx.fillStyle = '#101828';
  roundRect(ctx, bx, 28, bw, 18, 9);
  ctx.fill();
  ctx.fillStyle = alarmColor(game.alarm);
  const aw = (bw * Math.min(100, game.alarm)) / 100;
  if (aw > 0) {
    roundRect(ctx, bx, 28, Math.max(aw, 10), 18, 9);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, bx, 28, bw, 18, 9);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(Math.round(game.alarm) + '%', CONFIG.VIEW_W / 2, 42);

  // Timer + score, top right.
  const t = Math.max(0, Math.ceil(game.timeLeft));
  ctx.fillStyle = t <= 30 ? '#ff6b6b' : C.text;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, CONFIG.VIEW_W - 18, 26);
  ctx.fillStyle = C.gold;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`★ ${game.score}  ·  LOOT $${game.lootValue}`, CONFIG.VIEW_W - 18, 48);

  // Bottom strip: tools + hints + minimap.
  ctx.fillStyle = C.hudBar;
  ctx.fillRect(0, CONFIG.FLOOR_BOTTOM, CONFIG.VIEW_W, CONFIG.VIEW_H - CONFIG.FLOOR_BOTTOM);
  ctx.fillStyle = C.text;
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const gemMark = game.gemTaken ? '★ STAR SECURED' : '☆ STEAL THE STAR';
  ctx.fillText(
    `${gemMark}   ·   🪙 Coins ${game.player.coins} (click to toss)   ·   ⚡ EMP ${game.player.empCharges} (Q)   ·   Shift sneak · E interact`,
    18,
    CONFIG.FLOOR_BOTTOM + 22,
  );
  ctx.fillStyle = C.muted;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('WASD move · P pause · M mute · R restart · reach the exit with the Star', 18, CONFIG.FLOOR_BOTTOM + 42);
  if (game.autopilot) {
    ctx.fillStyle = '#9fd8ff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🤖 AUTOPILOT — press any key to take over', CONFIG.VIEW_W / 2, CONFIG.FLOOR_BOTTOM + 34);
  }
  drawMinimap(ctx, game);
}

function overlayText(ctx, lines, accent) {
  ctx.fillStyle = 'rgba(5, 8, 16, 0.72)';
  ctx.fillRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);
  ctx.textAlign = 'center';
  let y = 300;
  for (const line of lines) {
    ctx.fillStyle = line.color || C.text;
    ctx.font = line.font;
    ctx.fillText(line.text, CONFIG.VIEW_W / 2, y);
    y += line.gap || 44;
  }
  if (accent) {
    ctx.fillStyle = accent;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(accent, CONFIG.VIEW_W / 2, y + 10);
  }
}

export function render(ctx, game) {
  drawFloor(ctx, game);
  drawShadows(ctx, game.level);
  drawVents(ctx, game.level);
  drawExit(ctx, game);
  drawLoot(ctx, game);
  drawCones(ctx, game);
  drawWallsAndCover(ctx, game.level);
  drawEntities(ctx, game);
  drawHUD(ctx, game);

  // Lockdown red tint.
  if (game.lockdownTimer > 0) {
    ctx.fillStyle = 'rgba(255, 30, 30, 0.13)';
    ctx.fillRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒 LOCKDOWN — doors sealed!', CONFIG.VIEW_W / 2, 96);
  }
  if (game.flashMessage) {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.flashMessage, CONFIG.VIEW_W / 2, 130);
  }

  if (game.phase === 'title') {
    overlayText(ctx, [
      { text: '🌙 MIDNIGHT VAULT', font: 'bold 54px system-ui, sans-serif', color: C.gold, gap: 62 },
      { text: 'The Halcyon Job', font: 'italic 28px system-ui, sans-serif', color: C.text, gap: 46 },
      { text: 'Sneak past the guards. Dodge the cameras. Steal the Star of Halcyon.', font: '18px system-ui, sans-serif', color: C.muted, gap: 36 },
      { text: 'WASD move · Shift sneak · E lockpick · Click toss a coin · Q EMP', font: '16px system-ui, sans-serif', color: C.text, gap: 40 },
      { text: 'Press ENTER or click to begin the heist', font: 'bold 20px system-ui, sans-serif', color: '#8dff9e' },
    ]);
  } else if (game.phase === 'paused') {
    overlayText(ctx, [
      { text: '⏸ PAUSED', font: 'bold 44px system-ui, sans-serif', color: C.text, gap: 50 },
      { text: 'Press P to resume', font: '18px system-ui, sans-serif', color: C.muted },
    ]);
  } else if (game.phase === 'levelComplete') {
    overlayText(ctx, [
      { text: '🎉 CLEAN GETAWAY!', font: 'bold 48px system-ui, sans-serif', color: C.exit, gap: 56 },
      { text: `Level score ${game.levelScore}  ·  Total ${game.score}`, font: '20px system-ui, sans-serif', color: C.text, gap: 40 },
      { text: game.levelIndex + 1 < 3 ? 'Press ENTER for the next night…' : 'Press ENTER to see the final score…', font: '18px system-ui, sans-serif', color: C.muted },
    ]);
  } else if (game.phase === 'win') {
    overlayText(ctx, [
      { text: '🏆 THE HALCYON JOB IS DONE', font: 'bold 44px system-ui, sans-serif', color: C.gold, gap: 56 },
      { text: `Wren slips into the night with the Star — final score ${game.score}`, font: '20px system-ui, sans-serif', color: C.text, gap: 40 },
      { text: game.ghost ? '👻 GHOST BONUS: never spotted (+500)' : 'Spotted along the way — the ghost bonus slipped away', font: '17px system-ui, sans-serif', color: C.muted, gap: 36 },
      { text: 'Press R to run the job again', font: '18px system-ui, sans-serif', color: C.text },
    ]);
  } else if (game.phase === 'gameOver') {
    overlayText(ctx, [
      { text: '🚨 THE JOB IS BLOWN', font: 'bold 44px system-ui, sans-serif', color: '#ff6b6b', gap: 52 },
      { text: game.gameOverReason, font: '20px system-ui, sans-serif', color: C.text, gap: 40 },
      { text: 'Press R to try the night again', font: '18px system-ui, sans-serif', color: C.muted },
    ]);
  }
}
