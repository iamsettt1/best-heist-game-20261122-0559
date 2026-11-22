// levels.js — the three nights of the Halcyon job. Each level is one room:
// walls and cover that block sight and movement, patrol routes, cameras,
// loot, the Star of Halcyon, the skylight exit, and a vent shortcut.
// Coordinates are logical canvas pixels (1280 x 800); the playfield runs
// from y=76 (below the HUD) to y=732 (above the bottom strip).
//
// Every room offers three routes: the open floor (fast, exposed), a shadow
// lane behind display cases (slow, safe), and a vent crawl (one-way shortcut).
// Walls and cover block both movement and line of sight; shadows only slow
// detection. All coordinates are logical canvas pixels (1280 x 800).

export const LEVELS = [
  {
    name: 'Night 1 — The Marble Gallery',
    subtitle: 'Cross the gallery. The Star of Halcyon waits in its case.',
    timeLimit: 180,
    playerStart: { x: 96, y: 668 },
    gem: { x: 1012, y: 400 },
    exit: { x: 1148, y: 108, w: 64, h: 64, label: 'SKYLIGHT EXIT' },
    walls: [
      // Central colonnade wall with two gaps: open floor vs shadow lane.
      { x: 560, y: 76, w: 26, h: 220 },
      { x: 560, y: 420, w: 26, h: 312 },
      // Low wall near the gem case, forcing a choice of approach.
      { x: 880, y: 560, w: 200, h: 24 },
      { x: 880, y: 240, w: 24, h: 180 },
    ],
    cover: [
      { x: 300, y: 180, w: 120, h: 60, kind: 'case' },
      { x: 300, y: 520, w: 120, h: 60, kind: 'case' },
      { x: 700, y: 140, w: 90, h: 54, kind: 'case' },
      { x: 700, y: 600, w: 90, h: 54, kind: 'case' },
      { x: 460, y: 360, w: 44, h: 44, kind: 'pillar' },
      { x: 980, y: 170, w: 44, h: 44, kind: 'pillar' },
      { x: 190, y: 380, w: 70, h: 46, kind: 'planter' },
      { x: 1080, y: 560, w: 70, h: 46, kind: 'planter' },
    ],
    shadows: [
      { x: 240, y: 470, w: 260, h: 130 },
      { x: 640, y: 90, w: 220, h: 110 },
    ],
    loot: [
      { x: 360, y: 290, kind: 'vase', value: 150, label: 'Porcelain Vase' },
      { x: 360, y: 610, kind: 'coins', value: 120, label: 'Coin Hoard' },
      { x: 745, y: 690, kind: 'vase', value: 150, label: 'Jade Vase' },
      { x: 1115, y: 630, kind: 'coins', value: 120, label: 'Coin Hoard' },
    ],
    guards: [
      { path: [[300, 320], [820, 320], [820, 470], [300, 470]], speed: 62 },
      { path: [[1050, 220], [1050, 580], [880, 580], [880, 220]], speed: 58 },
    ],
    cameras: [
      { x: 640, y: 84, baseAngle: Math.PI / 2, sweep: 0.9, range: 300, speed: 0.55 },
    ],
    vents: [
      { x: 180, y: 96, w: 54, h: 34, to: { x: 920, y: 660 } },
      { x: 920, y: 660, w: 54, h: 34, to: { x: 180, y: 96 } },
    ],
  },
  {
    name: 'Night 2 — The Vault Corridor',
    subtitle: 'Tighter halls, more eyes. The Star moved to the inner vault.',
    timeLimit: 180,
    playerStart: { x: 96, y: 668 },
    gem: { x: 1120, y: 150 },
    exit: { x: 1148, y: 640, w: 64, h: 64, label: 'SKYLIGHT EXIT' },
    walls: [
      { x: 340, y: 76, w: 26, h: 300 },
      { x: 340, y: 500, w: 26, h: 232 },
      { x: 660, y: 76, w: 26, h: 180 },
      { x: 660, y: 380, w: 26, h: 352 },
      { x: 940, y: 420, w: 26, h: 312 },
      { x: 940, y: 76, w: 26, h: 220 },
      { x: 1080, y: 300, w: 160, h: 24 },
    ],
    cover: [
      { x: 180, y: 150, w: 90, h: 54, kind: 'case' },
      { x: 470, y: 300, w: 90, h: 54, kind: 'case' },
      { x: 800, y: 560, w: 90, h: 54, kind: 'case' },
      { x: 1020, y: 520, w: 90, h: 54, kind: 'case' },
      { x: 480, y: 620, w: 44, h: 44, kind: 'pillar' },
      { x: 820, y: 150, w: 44, h: 44, kind: 'pillar' },
      { x: 180, y: 480, w: 70, h: 46, kind: 'planter' },
      { x: 1140, y: 420, w: 70, h: 46, kind: 'planter' },
    ],
    shadows: [
      { x: 380, y: 560, w: 240, h: 120 },
      { x: 700, y: 90, w: 200, h: 120 },
      { x: 980, y: 560, w: 200, h: 110 },
    ],
    loot: [
      { x: 225, y: 240, kind: 'vase', value: 150, label: 'Porcelain Vase' },
      { x: 515, y: 390, kind: 'coins', value: 120, label: 'Coin Hoard' },
      { x: 845, y: 650, kind: 'vase', value: 150, label: 'Jade Vase' },
      { x: 1065, y: 610, kind: 'coins', value: 120, label: 'Coin Hoard' },
      { x: 760, y: 660, kind: 'vase', value: 200, label: 'Golden Idol' },
    ],
    guards: [
      { path: [[200, 300], [300, 300], [300, 600], [200, 600]], speed: 66 },
      { path: [[500, 200], [620, 200], [620, 500], [500, 500]], speed: 64 },
      { path: [[820, 300], [900, 300], [900, 660], [820, 660]], speed: 62 },
    ],
    cameras: [
      { x: 366, y: 84, baseAngle: Math.PI / 2, sweep: 1.0, range: 300, speed: 0.6 },
      { x: 966, y: 84, baseAngle: Math.PI / 2, sweep: 1.0, range: 300, speed: 0.7 },
    ],
    vents: [
      { x: 140, y: 96, w: 54, h: 34, to: { x: 900, y: 660 } },
      { x: 900, y: 660, w: 54, h: 34, to: { x: 140, y: 96 } },
    ],
  },
  {
    name: 'Night 3 — The Rooftop Getaway',
    subtitle: 'Open roof, sweeping searchlights. Reach the zipline with the Star.',
    timeLimit: 180,
    playerStart: { x: 96, y: 668 },
    gem: { x: 640, y: 400 },
    exit: { x: 1150, y: 120, w: 70, h: 70, label: 'ZIPLINE' },
    walls: [
      // Parapet blocks and AC units: low cover on an open roof.
      { x: 420, y: 200, w: 180, h: 26 },
      { x: 420, y: 560, w: 180, h: 26 },
      { x: 820, y: 200, w: 26, h: 200 },
      { x: 820, y: 500, w: 26, h: 160 },
    ],
    cover: [
      { x: 300, y: 300, w: 80, h: 80, kind: 'pillar' },
      { x: 980, y: 300, w: 80, h: 80, kind: 'pillar' },
      { x: 300, y: 560, w: 80, h: 60, kind: 'planter' },
      { x: 980, y: 560, w: 80, h: 60, kind: 'planter' },
      { x: 640, y: 120, w: 90, h: 54, kind: 'case' },
      { x: 640, y: 640, w: 90, h: 54, kind: 'case' },
    ],
    shadows: [
      { x: 240, y: 240, w: 220, h: 130 },
      { x: 900, y: 480, w: 240, h: 130 },
    ],
    loot: [
      { x: 340, y: 420, kind: 'coins', value: 150, label: 'Dropped Satchel' },
      { x: 1020, y: 420, kind: 'vase', value: 200, label: 'Rooftop Cache' },
      { x: 685, y: 210, kind: 'coins', value: 150, label: 'Dropped Satchel' },
      { x: 685, y: 600, kind: 'vase', value: 200, label: 'Rooftop Cache' },
    ],
    guards: [
      { path: [[250, 200], [1000, 200], [1000, 600], [250, 600]], speed: 78 },
      { path: [[1100, 300], [1100, 600], [700, 600], [700, 300]], speed: 74 },
    ],
    cameras: [
      { x: 640, y: 84, baseAngle: Math.PI / 2, sweep: 1.2, range: 380, speed: 0.5 },
      { x: 1240, y: 400, baseAngle: Math.PI, sweep: 1.1, range: 380, speed: 0.65 },
    ],
    vents: [
      { x: 150, y: 96, w: 54, h: 34, to: { x: 900, y: 660 } },
      { x: 900, y: 660, w: 54, h: 34, to: { x: 150, y: 96 } },
    ],
  },
];
