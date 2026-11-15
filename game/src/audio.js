// Every sound is synthesised with WebAudio — no audio files, no network. The context is
// created on the first user gesture (browsers block audio before that) and every effect
// is a short oscillator or filtered-noise envelope. Mute persists in localStorage.

import { MUTE_KEY } from './config.js';

function readMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function createAudio() {
  let context = null;
  let muted = readMuted();

  function ensureContext() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** Call from any user gesture so the browser lets sound start. */
  function unlock() {
    const ctx = ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone({ freq = 440, slideTo = null, dur = 0.12, type = 'sine', gain = 0.12, delay = 0 }) {
    if (muted) return;
    const ctx = ensureContext();
    if (ctx === null) return;
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    if (slideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + dur);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    oscillator.connect(envelope);
    envelope.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + dur + 0.05);
  }

  function noise({ dur = 0.15, gain = 0.12, freq = 1200, delay = 0 }) {
    if (muted) return;
    const ctx = ensureContext();
    if (ctx === null) return;
    const start = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(ctx.destination);
    source.start(start);
  }

  return {
    unlock,
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      try {
        window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      } catch {
        // Storage can be off: mute then lasts this visit only.
      }
      return muted;
    },
    shoot() { tone({ freq: 720, slideTo: 240, dur: 0.09, type: 'square', gain: 0.05 }); },
    hit() { noise({ dur: 0.07, gain: 0.09, freq: 2600 }); },
    kill() { tone({ freq: 340, slideTo: 90, dur: 0.16, type: 'sawtooth', gain: 0.08 }); noise({ dur: 0.12, gain: 0.07, freq: 1800 }); },
    pickup() { tone({ freq: 880, slideTo: 1320, dur: 0.08, type: 'sine', gain: 0.07 }); },
    hurt() { tone({ freq: 160, slideTo: 60, dur: 0.25, type: 'sawtooth', gain: 0.14 }); noise({ dur: 0.2, gain: 0.1, freq: 700 }); },
    lanternHit() { tone({ freq: 220, slideTo: 110, dur: 0.2, type: 'triangle', gain: 0.12 }); },
    levelUp() {
      [523, 659, 784, 1047].forEach((freq, i) => tone({ freq, dur: 0.16, type: 'triangle', gain: 0.1, delay: i * 0.07 }));
    },
    waveHorn() { tone({ freq: 196, slideTo: 294, dur: 0.5, type: 'sawtooth', gain: 0.08 }); tone({ freq: 392, dur: 0.4, type: 'triangle', gain: 0.06, delay: 0.08 }); },
    nova() { tone({ freq: 300, slideTo: 900, dur: 0.3, type: 'sine', gain: 0.1 }); noise({ dur: 0.25, gain: 0.06, freq: 3200 }); },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((freq, i) => tone({ freq, dur: 0.3, type: 'triangle', gain: 0.1, delay: i * 0.11 }));
    },
    defeat() {
      [392, 370, 349, 311].forEach((freq, i) => tone({ freq, dur: 0.35, type: 'triangle', gain: 0.1, delay: i * 0.16 }));
    },
  };
}
