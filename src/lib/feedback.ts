// Tap feedback during a session: a short vibration always, plus an optional click
// sound (per-device setting, on by default).
const KEY = 'golf-practice-click';

export function clickSoundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setClickSound(on: boolean) {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, 'off');
  } catch {
    // choice just won't persist
  }
}

let ctx: AudioContext | null = null;

/** A crisp ~30ms synthesised click; no audio file to download or cache. */
export function playClick() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    // Phones suspend audio until a user gesture; taps count, so resume here.
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch {
    // audio unavailable: vibration still happens
  }
}

export function tapFeedback() {
  navigator.vibrate?.(15);
  if (clickSoundEnabled()) playClick();
}
