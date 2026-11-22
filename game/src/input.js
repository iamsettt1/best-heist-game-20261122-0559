// input.js — keyboard (WASD/arrows, Shift sneak, E interact, Q EMP,
// P pause, M mute, R restart) and mouse clicks (coin toss). Tracks the
// time of the last human input so the autopilot can take over after idle.
export class Input {
  constructor(canvas) {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.sneak = false;
    this.interactPressed = false;
    this.empPressed = false;
    this.pausePressed = false;
    this.mutePressed = false;
    this.restartPressed = false;
    this.startPressed = false;
    this.click = null;
    this.lastInputAt = performance.now();
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    canvas.addEventListener('mousedown', (e) => {
      this.lastInputAt = performance.now();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.click = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    });
    // Any pointer or key counts as the player being present. Clicking the
    // canvas also starts the game from the title screen (handled in main).
    window.addEventListener('pointermove', () => {
      this.lastInputAt = performance.now();
    });
    // Right-click should not open a menu over the game.
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onKey(e, down) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
      e.preventDefault();
    }
    this.lastInputAt = performance.now();
    if (k === 'a' || k === 'arrowleft') this.left = down;
    else if (k === 'd' || k === 'arrowright') this.right = down;
    else if (k === 'w' || k === 'arrowup') this.up = down;
    else if (k === 's' || k === 'arrowdown') this.down = down;
    else if (k === 'shift') this.sneak = down;
    else if (down && k === 'e') this.interactPressed = true;
    else if (down && k === 'q') this.empPressed = true;
    else if (down && k === 'p') this.pausePressed = true;
    else if (down && k === 'm') this.mutePressed = true;
    else if (down && k === 'r') this.restartPressed = true;
    else if (down && (k === 'enter' || k === ' ')) this.startPressed = true;
  }

  get idleSeconds() {
    return (performance.now() - this.lastInputAt) / 1000;
  }
}
