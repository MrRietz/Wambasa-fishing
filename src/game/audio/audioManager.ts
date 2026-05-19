import { SETTINGS_STORAGE_KEY } from '../config/constants';
import { clamp } from '../core/math';
import type { RtsDebugState } from '../debug/debugState';

export type SfxCue = 'confirm' | 'error' | 'produce' | 'harvest' | 'unload' | 'fish' | 'build' | 'repair' | 'sabotage' | 'warning' | 'victory' | 'defeat' | 'resource' | 'combat' | 'combatFire' | 'combatHit';
type AudioState = RtsDebugState['audio'];
type MusicLayer = AudioState['musicLayer'];

interface MusicPhrase {
  bass: number[];
  lead: number[];
  accent?: number[];
}

const MUSIC_PHRASES: Record<MusicLayer, MusicPhrase[]> = {
  calm: [
    {
      bass: [82.41, 98, 110, 73.42, 92.5, 123.47, 110, 98],
      lead: [246.94, 277.18, 329.63, 369.99, 329.63, 277.18, 246.94, 220],
      accent: [392, 440, 392, 329.63],
    },
    {
      bass: [82.41, 92.5, 110, 123.47, 98, 92.5, 82.41, 73.42],
      lead: [293.66, 329.63, 392, 440, 392, 349.23, 329.63, 277.18],
      accent: [493.88, 440, 392, 349.23],
    },
  ],
  tension: [
    {
      bass: [92.5, 92.5, 116.54, 87.31, 92.5, 138.59, 116.54, 87.31],
      lead: [293.66, 311.13, 369.99, 415.3, 369.99, 311.13, 293.66, 261.63],
      accent: [466.16, 415.3, 369.99, 311.13],
    },
    {
      bass: [87.31, 92.5, 103.83, 116.54, 92.5, 87.31, 138.59, 116.54],
      lead: [261.63, 293.66, 311.13, 369.99, 415.3, 369.99, 311.13, 293.66],
      accent: [415.3, 369.99, 311.13, 293.66],
    },
  ],
  combat: [
    {
      bass: [110, 82.41, 110, 146.83, 98, 82.41, 130.81, 98],
      lead: [329.63, 392, 440, 493.88, 440, 392, 349.23, 293.66],
      accent: [523.25, 587.33, 523.25, 493.88],
    },
    {
      bass: [98, 110, 130.81, 98, 146.83, 110, 164.81, 123.47],
      lead: [349.23, 392, 493.88, 523.25, 493.88, 440, 392, 329.63],
      accent: [659.25, 587.33, 523.25, 493.88],
    },
  ],
};

interface BrowserAudioWindow extends Window {
  AudioContext: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

export class AudioManager {
  readonly state: AudioState;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private uiGain: GainNode | null = null;
  private alertsGain: GainNode | null = null;
  private musicTimer: number | undefined;
  private layerTimer: number | undefined;
  private musicStep = 0;
  private musicPhraseIndex = 0;

  constructor(private readonly browserWindow: BrowserAudioWindow) {
    this.state = {
      supported: Boolean(browserWindow.AudioContext || browserWindow.webkitAudioContext),
      unlocked: false,
      musicPlaying: false,
      masterVolume: 0.86,
      musicVolume: 0.28,
      sfxVolume: 0.72,
      uiVolume: 0.7,
      alertsVolume: 0.84,
      musicLayer: 'calm',
      lastCue: undefined,
    };
  }

  loadPersistedSettings(): void {
    try {
      const raw = this.browserWindow.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<Pick<AudioState, 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'uiVolume' | 'alertsVolume'>>;
      if (typeof parsed.masterVolume === 'number') {
        this.state.masterVolume = clamp(parsed.masterVolume, 0, 1);
      }
      if (typeof parsed.musicVolume === 'number') {
        this.state.musicVolume = clamp(parsed.musicVolume, 0, 1);
      }
      if (typeof parsed.sfxVolume === 'number') {
        this.state.sfxVolume = clamp(parsed.sfxVolume, 0, 1);
      }
      if (typeof parsed.uiVolume === 'number') {
        this.state.uiVolume = clamp(parsed.uiVolume, 0, 1);
      }
      if (typeof parsed.alertsVolume === 'number') {
        this.state.alertsVolume = clamp(parsed.alertsVolume, 0, 1);
      }
    } catch {
      this.state.lastCue = 'settings-load-failed';
    }
  }

  persistSettings(): void {
    let existing: Record<string, unknown> = {};
    try {
      const raw = this.browserWindow.localStorage.getItem(SETTINGS_STORAGE_KEY);
      existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      existing = {};
    }
    this.browserWindow.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...existing,
        musicVolume: this.state.musicVolume,
        sfxVolume: this.state.sfxVolume,
        masterVolume: this.state.masterVolume,
        uiVolume: this.state.uiVolume,
        alertsVolume: this.state.alertsVolume,
      }),
    );
  }

  applyGainSettings(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this.state.masterVolume;
    }
    if (this.musicGain) {
      this.musicGain.gain.value = this.state.musicVolume;
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.state.sfxVolume;
    }
    if (this.uiGain) {
      this.uiGain.gain.value = this.state.uiVolume;
    }
    if (this.alertsGain) {
      this.alertsGain.gain.value = this.state.alertsVolume;
    }
  }

  updateSetting(kind: 'music' | 'sfx', value: number): void {
    const normalized = clamp(value / 100, 0, 1);
    if (kind === 'music') {
      this.state.musicVolume = normalized;
    } else {
      this.state.sfxVolume = normalized;
    }
    this.state.lastCue = `${kind}-volume`;
    this.applyGainSettings();
    this.persistSettings();
    if (kind === 'sfx') {
      this.playSfx('confirm');
    }
  }

  async unlock(): Promise<void> {
    if (!this.state.supported) {
      this.state.lastCue = 'audio-unsupported';
      return;
    }

    if (!this.audioContext) {
      const AudioContextCtor = this.browserWindow.AudioContext || this.browserWindow.webkitAudioContext;
      if (!AudioContextCtor) {
        this.state.lastCue = 'audio-unsupported';
        return;
      }
      const context = new AudioContextCtor();
      const masterGain = context.createGain();
      const musicGain = context.createGain();
      const sfxGain = context.createGain();
      const uiGain = context.createGain();
      const alertsGain = context.createGain();
      masterGain.gain.value = this.state.masterVolume;
      musicGain.connect(masterGain);
      sfxGain.connect(masterGain);
      uiGain.connect(masterGain);
      alertsGain.connect(masterGain);
      masterGain.connect(context.destination);
      this.audioContext = context;
      this.masterGain = masterGain;
      this.musicGain = musicGain;
      this.sfxGain = sfxGain;
      this.uiGain = uiGain;
      this.alertsGain = alertsGain;
      this.applyGainSettings();
    }

    const context = this.audioContext;
    if (!context) {
      this.state.lastCue = 'audio-unsupported';
      return;
    }
    if (context.state !== 'running') {
      await context.resume();
    }

    this.state.unlocked = context.state === 'running';
    this.state.lastCue = this.state.unlocked ? 'audio-unlocked' : 'audio-suspended';
    if (this.state.unlocked) {
      this.startMusicLoop();
      this.playSfx('confirm');
    }
  }

  playSfx(cue: SfxCue): void {
    const destination = this.getCueBus(cue);
    if (!this.audioContext || !destination || this.audioContext.state !== 'running') {
      return;
    }
    const now = this.audioContext.currentTime;
    this.state.lastCue = cue;
    if (cue === 'error') {
      this.playTone(140, 0.12, 'square', destination, now, 0.18);
      this.playTone(105, 0.16, 'sawtooth', destination, now + 0.05, 0.14);
      return;
    }
    if (cue === 'produce') {
      this.playTone(220, 0.08, 'triangle', destination, now, 0.13);
      this.playTone(330, 0.12, 'triangle', destination, now + 0.07, 0.14);
      return;
    }
    if (cue === 'resource' || cue === 'harvest' || cue === 'unload' || cue === 'fish') {
      this.playTone(cue === 'fish' ? 392 : 330, 0.07, 'sine', destination, now, 0.12);
      this.playTone(cue === 'unload' ? 523.25 : 440, 0.09, 'sine', destination, now + 0.05, 0.1);
      return;
    }
    if (cue === 'combat') {
      this.setMusicLayer('combat');
      this.playTone(240, 0.055, 'square', destination, now, 0.11);
      this.playTone(160, 0.07, 'triangle', destination, now + 0.016, 0.08);
      this.playTone(92, 0.1, 'sawtooth', destination, now + 0.03, 0.055);
      return;
    }
    if (cue === 'combatFire') {
      this.setMusicLayer('combat');
      this.playTone(280, 0.038, 'square', destination, now, 0.095);
      this.playTone(180, 0.055, 'triangle', destination, now + 0.012, 0.07);
      this.playTone(120, 0.075, 'sawtooth', destination, now + 0.024, 0.045);
      return;
    }
    if (cue === 'combatHit') {
      this.setMusicLayer('combat');
      this.playTone(210, 0.03, 'square', destination, now, 0.08);
      this.playTone(110, 0.09, 'sawtooth', destination, now + 0.014, 0.08);
      this.playTone(72, 0.12, 'triangle', destination, now + 0.03, 0.05);
      return;
    }
    if (cue === 'warning') {
      this.setMusicLayer('tension');
      this.playTone(659.25, 0.11, 'square', destination, now, 0.13);
      this.playTone(493.88, 0.18, 'triangle', destination, now + 0.09, 0.12);
      return;
    }
    if (cue === 'victory' || cue === 'defeat') {
      this.playTone(cue === 'victory' ? 523.25 : 196, 0.18, 'triangle', destination, now, 0.16);
      this.playTone(cue === 'victory' ? 659.25 : 146.83, 0.22, 'sawtooth', destination, now + 0.14, 0.14);
      return;
    }
    this.playTone(cue === 'sabotage' ? 247 : cue === 'repair' ? 349.23 : cue === 'build' ? 220 : 294, 0.07, 'triangle', destination, now, 0.12);
    this.playTone(cue === 'sabotage' ? 185 : cue === 'repair' ? 440 : cue === 'build' ? 330 : 392, 0.08, 'triangle', destination, now + 0.06, 0.1);
  }

  setMusicLayer(layer: AudioState['musicLayer']): void {
    this.state.musicLayer = layer;
    if (this.layerTimer) {
      this.browserWindow.clearTimeout(this.layerTimer);
    }
    if (layer !== 'calm') {
      this.layerTimer = this.browserWindow.setTimeout(() => {
        this.state.musicLayer = 'calm';
        this.musicPhraseIndex = (this.musicPhraseIndex + 1) % MUSIC_PHRASES.calm.length;
        this.layerTimer = undefined;
      }, 8500);
    }
  }

  private startMusicLoop(): void {
    if (!this.audioContext || !this.musicGain || this.state.musicPlaying) {
      return;
    }
    this.state.musicPlaying = true;
    this.scheduleMusicBeat();
    this.musicTimer = this.browserWindow.setInterval(() => this.scheduleMusicBeat(), 620);
  }

  private scheduleMusicBeat(): void {
    if (!this.audioContext || !this.musicGain || this.audioContext.state !== 'running') {
      return;
    }
    const now = this.audioContext.currentTime;
    const phrases = MUSIC_PHRASES[this.state.musicLayer];
    const phrase = phrases[this.musicPhraseIndex % phrases.length];
    const bassNotes = phrase.bass;
    const leadNotes = phrase.lead;
    const accentNotes = phrase.accent ?? [];
    const step = this.musicStep % bassNotes.length;
    this.playTone(bassNotes[step], this.state.musicLayer === 'combat' ? 0.18 : 0.24, 'sawtooth', this.musicGain, now, this.state.musicLayer === 'calm' ? 0.18 : 0.2);
    if (this.musicStep % 2 === 0) {
      this.playTone(leadNotes[step % leadNotes.length], 0.15, this.state.musicLayer === 'combat' ? 'square' : 'triangle', this.musicGain, now + 0.08, this.state.musicLayer === 'calm' ? 0.11 : 0.135);
    }
    if (accentNotes.length > 0 && this.musicStep % 4 === 1) {
      this.playTone(accentNotes[Math.floor(this.musicStep / 4) % accentNotes.length], 0.11, 'sine', this.musicGain, now + 0.18, this.state.musicLayer === 'combat' ? 0.065 : 0.05);
    }
    this.musicStep += 1;
    if (this.musicStep % bassNotes.length === 0) {
      this.musicPhraseIndex = (this.musicPhraseIndex + 1) % phrases.length;
    }
    this.state.lastCue = 'music-loop';
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, destination: GainNode, startTime: number, volume: number): void {
    if (!this.audioContext) {
      return;
    }
    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(volume, startTime + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.03);
  }

  private getCueBus(cue: SfxCue): GainNode | null {
    if (cue === 'confirm' || cue === 'error') return this.uiGain;
    if (cue === 'warning' || cue === 'victory' || cue === 'defeat') return this.alertsGain;
    return this.sfxGain;
  }
}

export function syncAudioControls(
  state: AudioState,
  controls: {
    musicSlider: HTMLInputElement;
    sfxSlider: HTMLInputElement;
    musicReadout: HTMLElement;
    sfxReadout: HTMLElement;
  },
): void {
  controls.musicSlider.value = String(Math.round(state.musicVolume * 100));
  controls.sfxSlider.value = String(Math.round(state.sfxVolume * 100));
  controls.musicReadout.textContent = `${Math.round(state.musicVolume * 100)}%`;
  controls.sfxReadout.textContent = `${Math.round(state.sfxVolume * 100)}%`;
}
