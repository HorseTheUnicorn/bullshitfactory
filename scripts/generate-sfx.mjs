import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const outputDirectory = path.resolve('public/sfx');
fs.mkdirSync(outputDirectory, { recursive: true });

const clamp = (value) => Math.max(-1, Math.min(1, value));
const noise = (index, seed) => {
  const value = Math.sin((index + seed * 997) * 12.9898) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
};
const pulse = (time, start, duration, attack = 0.008, release = 0.12) => {
  if (time < start || time > start + duration) return 0;
  const local = time - start;
  const inEnvelope = Math.min(1, local / Math.max(0.001, attack));
  const outEnvelope = Math.min(1, (start + duration - time) / Math.max(0.001, release));
  return Math.max(0, Math.min(inEnvelope, outEnvelope));
};
const tone = (time, frequency, start, duration, amplitude, decay = 0, phase = 0) => {
  const envelope = pulse(time, start, duration, 0.004, Math.min(0.2, duration * 0.7));
  const falloff = decay ? Math.exp(-Math.max(0, time - start) * decay) : 1;
  return Math.sin((time * frequency + phase) * Math.PI * 2) * envelope * falloff * amplitude;
};

function renderEffect(name, duration, generator, seed = 1) {
  const sampleCount = Math.ceil(duration * sampleRate);
  const samples = new Float32Array(sampleCount);
  let peak = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const value = generator(index / sampleRate, index, seed);
    samples[index] = value;
    peak = Math.max(peak, Math.abs(value));
  }
  const normalizer = peak > 0.92 ? 0.92 / peak : 1;
  const data = Buffer.alloc(44 + sampleCount * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + sampleCount * 2, 4);
  data.write('WAVE', 8);
  data.write('fmt ', 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(sampleCount * 2, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    data.writeInt16LE(Math.round(clamp(samples[index] * normalizer) * 32767), 44 + index * 2);
  }
  fs.writeFileSync(path.join(outputDirectory, `${name}.wav`), data);
}

const effects = {
  click: [0.16, (time, index, seed) => tone(time, 1850 - time * 800, 0, 0.06, 0.6, 8) + noise(index, seed) * pulse(time, 0, 0.055) * 0.18],
  stamp: [0.34, (time, index, seed) => tone(time, 92, 0, 0.26, 0.72, 5) + tone(time, 240, 0, 0.12, 0.28, 12) + noise(index, seed) * pulse(time, 0, 0.08) * 0.32],
  thud: [0.42, (time, index, seed) => tone(time, 58, 0, 0.34, 0.8, 4) + tone(time, 119, 0, 0.19, 0.3, 9) + noise(index, seed) * pulse(time, 0, 0.15) * 0.35],
  impact: [0.52, (time, index, seed) => tone(time, 48, 0, 0.42, 0.85, 3) + tone(time, 170, 0, 0.18, 0.35, 13) + noise(index, seed) * pulse(time, 0, 0.11) * 0.55],
  footstep: [0.24, (time, index, seed) => tone(time, 70, 0, 0.18, 0.64, 8) + tone(time, 145, 0, 0.08, 0.23, 18) + noise(index, seed) * pulse(time, 0, 0.09) * 0.34],
  door: [0.66, (time, index, seed) => tone(time, 73, 0, 0.28, 0.5, 5) + tone(time, 210, 0.12, 0.36, 0.3, 4) + noise(index, seed) * pulse(time, 0.3, 0.22) * 0.28 + tone(time, 920 - time * 300, 0.42, 0.13, 0.25, 16)],
  paper: [0.72, (time, index, seed) => noise(index, seed) * (0.18 + time * 0.36) * Math.sin(Math.PI * Math.min(1, time / 0.72)) + tone(time, 420, 0.1, 0.38, 0.09, 7) + tone(time, 690, 0.31, 0.27, 0.08, 9)],
  paper_rip: [0.64, (time, index, seed) => noise(index, seed) * (0.2 + Math.sin(time * 23) * 0.11) * pulse(time, 0.03, 0.5, 0.02, 0.16) + tone(time, 160 + time * 1400, 0.03, 0.5, 0.18, 3)],
  typing: [0.9, (time, index, seed) => {
    let value = 0;
    for (let click = 0; click < 7; click += 1) {
      const start = 0.06 + click * 0.115 + ((seed + click) % 3) * 0.006;
      value += tone(time, 760 + (click % 2) * 220, start, 0.045, 0.23, 18);
      value += noise(index, seed + click) * pulse(time, start, 0.032) * 0.12;
    }
    return value;
  }],
  bell: [0.9, (time) => tone(time, 392, 0, 0.86, 0.52, 2.8) + tone(time, 784, 0.01, 0.78, 0.28, 3.2) + tone(time, 1175, 0.015, 0.68, 0.16, 3.8)],
  chime: [0.72, (time) => tone(time, 523.25, 0, 0.42, 0.36, 5) + tone(time, 659.25, 0.12, 0.46, 0.3, 5) + tone(time, 783.99, 0.24, 0.5, 0.26, 5)],
  whoosh: [0.86, (time, index, seed) => {
    const envelope = Math.sin(Math.PI * Math.min(1, time / 0.86));
    return noise(index, seed) * envelope * (0.14 + time * 0.34) + tone(time, 180 + time * 1800, 0, 0.78, 0.09, 1.2);
  }],
  spark: [0.44, (time, index, seed) => {
    let value = 0;
    for (let burst = 0; burst < 5; burst += 1) {
      const start = 0.04 + burst * 0.075;
      value += noise(index, seed + burst) * pulse(time, start, 0.045, 0.002, 0.03) * 0.5;
      value += tone(time, 1300 + burst * 180, start, 0.055, 0.12, 18);
    }
    return value;
  }],
  buzz: [0.66, (time, index, seed) => tone(time, 92 + Math.sin(time * 24) * 21, 0, 0.58, 0.24, 0.4) + tone(time, 184, 0.04, 0.5, 0.16, 0.8) + noise(index, seed) * 0.06 * pulse(time, 0, 0.58)],
  engine: [1.05, (time, index, seed) => {
    let value = tone(time, 58 + Math.sin(time * 17) * 8, 0, 0.98, 0.34, 0.18) + tone(time, 116, 0, 0.9, 0.12, 0.5);
    for (let pulseIndex = 0; pulseIndex < 4; pulseIndex += 1) value += tone(time, 210, 0.1 + pulseIndex * 0.22, 0.12, 0.2, 15);
    return value + noise(index, seed) * 0.06;
  }],
  valve: [0.78, (time, index, seed) => tone(time, 330 - time * 200, 0, 0.52, 0.25, 4) + tone(time, 80, 0.42, 0.24, 0.54, 7) + noise(index, seed) * pulse(time, 0.42, 0.2) * 0.24],
  beep: [0.58, (time) => tone(time, 880, 0, 0.13, 0.36, 12) + tone(time, 660, 0.2, 0.15, 0.31, 12) + tone(time, 990, 0.4, 0.12, 0.3, 12)],
  siren: [1.12, (time, index, seed) => tone(time, 520 + Math.sin(time * 7.1) * 390, 0, 1.02, 0.2, 0.25) + noise(index, seed) * 0.025],
  dog_bark: [0.44, (time, index, seed) => {
    const bark = pulse(time, 0.02, 0.24, 0.015, 0.1) + pulse(time, 0.29, 0.12, 0.01, 0.06) * 0.8;
    return (tone(time, 260 + Math.sin(time * 16) * 90, 0, 0.42, 0.36, 2) + noise(index, seed) * 0.32) * bark;
  }],
  record_scratch: [0.86, (time, index, seed) => noise(index, seed) * Math.sin(Math.PI * Math.min(1, time / 0.86)) * 0.32 + tone(time, 980 - time * 800, 0, 0.78, 0.18, 2)],
  coin: [0.62, (time) => tone(time, 1318, 0, 0.42, 0.27, 5) + tone(time, 1760, 0.06, 0.45, 0.21, 5) + tone(time, 2093, 0.14, 0.5, 0.17, 5)],
};

for (const [name, [duration, generator]] of Object.entries(effects)) renderEffect(name, duration, generator, name.length);
