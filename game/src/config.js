// config.js — every tuning number for Midnight Vault lives here, so the
// feel of the game can be balanced without touching game logic.
export const CONFIG = {
  VIEW_W: 1280,
  VIEW_H: 800,
  // Playfield margins: the HUD bar sits on top, the info strip at the bottom.
  HUD_H: 64,
  FLOOR_TOP: 64,
  FLOOR_BOTTOM: 744,

  PLAYER_RADIUS: 14,
  PLAYER_WALK_SPEED: 175, // px per second
  PLAYER_SNEAK_SPEED: 92,
  PLAYER_CHASE_ESCAPE_SPEED: 200,

  // Guard vision.
  GUARD_RANGE: 265,
  GUARD_FOV: 1.22, // radians, about 70 degrees
  GUARD_PATROL_SPEED: 62,
  GUARD_CHASE_SPEED: 168,
  GUARD_INVESTIGATE_SPEED: 110,
  SUSPICION_FILL_PER_SEC: 55, // while the thief is seen, standing
  SUSPICION_FILL_SNEAK: 26, // while the thief is seen but sneaking
  SUSPICION_DECAY_PER_SEC: 30,
  CATCH_RADIUS: 26,
  GRACE_AFTER_CAUGHT_SEC: 2.0,

  // Cameras.
  CAMERA_RANGE: 300,
  CAMERA_FOV: 0.9,
  CAMERA_ALARM_PER_SEC: 26, // alarm gained while a camera sees the thief
  EMP_DISABLE_SEC: 6,
  EMP_ALARM_COST: 15,
  EMP_CHARGES_PER_LEVEL: 2,

  // Alarm meter.
  ALARM_DECAY_PER_SEC: 1.6, // slow bleed while hidden
  ALARM_GUARD_ALERT: 12, // spike when a guard first goes to chase
  ALARM_CAUGHT_SPIKE: 20,
  LOCKDOWN_SEC: 10,
  LOCKDOWN_ALARM_RESET: 60,

  // Tools.
  COINS_PER_LEVEL: 3,
  COIN_DISTRACT_RADIUS: 320, // guards inside this hear the clink
  COIN_INVESTIGATE_SEC: 4,

  // Interaction channels.
  GEM_CHANNEL_SEC: 3.0,
  LOOT_CHANNEL_SEC: 1.0,
  VENT_CHANNEL_SEC: 0.8,

  // Round timer per level.
  LEVEL_TIME_SEC: 180,
  AUTOPILOT_IDLE_SEC: 8,

  // Scoring.
  GEM_VALUE: 1000,
  TIME_BONUS_PER_SEC: 2,
  GHOST_BONUS: 500,
  CAUGHT_SCORE_PENALTY: 100,
  // A thief standing in the open while a camera watches is spotted fast;
  // shadows and sneaking are the counterplay, so the numbers above stay
  // forgiving enough that a careful player can cross a room unspotted.

  // Look.
  COLORS: {
    bg: '#0b1220',
    floorA: '#16233a',
    floorB: '#131e31',
    wall: '#2c3a55',
    wallTop: '#3d5178',
    coverCase: '#28405e',
    coverGlass: '#7fd4ff',
    pillar: '#33456a',
    planter: '#1d4a33',
    shadow: '#0a0f1c',
    gold: '#f5c542',
    gem: '#7ef0ff',
    exit: '#8dff9e',
    guardBody: '#c94f4f',
    guardCone: 'rgba(255, 84, 84, 0.20)',
    guardConeAlert: 'rgba(255, 40, 40, 0.34)',
    cameraCone: 'rgba(80, 255, 150, 0.16)',
    player: '#e8e4d8',
    playerCloak: '#232a3d',
    hudBar: 'rgba(8, 12, 24, 0.82)',
    text: '#e8ecf4',
    muted: '#93a1b8',
    alarmLow: '#7ddb8a',
    alarmMid: '#f5c542',
    alarmHigh: '#ff5252',
  },
};
