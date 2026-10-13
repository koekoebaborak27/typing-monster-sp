import { loadProgress } from "@/modules/progress";

/** 鳴らす音の1つ分。周波数（Hz）・始まる時刻（秒）・長さ（秒）・波の形。 */
type Tone = { frequency: number; start: number; duration: number; wave: OscillatorType };

/**
 * 音の種類ごとの鳴らし方。音声ファイルは使わず、ブラウザの音の合成だけで鳴らす（DESIGN.md）。
 * 正解は明るい2音（ド→ソ）、不正解は低くて短いブザー。
 */
const TONES: Record<"correct" | "wrong", Tone[]> = {
  correct: [
    { frequency: 523, start: 0, duration: 0.12, wave: "sine" },
    { frequency: 784, start: 0.12, duration: 0.2, wave: "sine" },
  ],
  wrong: [{ frequency: 150, start: 0, duration: 0.3, wave: "square" }],
};

/** 音を出すための部品。ホームのタップで作り、以降のバトルで使い回す。 */
let audioContext: AudioContext | null = null;

/**
 * 音を鳴らせるようにする。
 * ブラウザは、画面をタップする前は音を鳴らせない決まりなので、ホームの難易度／リベンジボタンのタップの中で呼ぶ。
 * 音が使えない端末では何もしない。
 */
export function enableSound(): void {
  try {
    audioContext ??= new AudioContext();
    // 作った直後や、しばらく使わなかったあとは止まっていることがあるので、動かし直す。
    void audioContext.resume();
  } catch {
    audioContext = null;
  }
}

/**
 * 正解音・不正解音を1回鳴らす。
 * サウンドがOFFのとき、まだ有効にしていないとき、音が使えないときは何もしない。
 */
export function playSound(kind: "correct" | "wrong"): void {
  const context = audioContext;
  if (!context || !loadProgress().soundOn) return;

  for (const tone of TONES[kind]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone.wave;
    oscillator.frequency.value = tone.frequency;
    // 音量は控えめにし、終わりに向けて小さくしてぷつっという雑音を防ぐ。
    const startAt = context.currentTime + tone.start;
    gain.gain.setValueAtTime(0.15, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + tone.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + tone.duration);
  }
}
