import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sampleRate = 22_050;
const channels = 2;
const bitsPerSample = 16;
const outputRoot = path.resolve('public/bullshit-factory/music');

const TRACKS = [
  { id: 'bf-theme-main', category: 'themes', title: 'Factory Theme: Nobody Asked', seconds: 32, bpm: 124, bass: 58, lead: 196, seed: 0x1001, energy: 8, loopable: true },
  { id: 'bf-intro-01', category: 'intros', title: 'Clock In, Regret It', seconds: 8, bpm: 148, bass: 64, lead: 247, seed: 0x1002, energy: 9, loopable: false },
  { id: 'bf-outro-01', category: 'outros', title: 'Management Has Left the Building', seconds: 10, bpm: 96, bass: 55, lead: 165, seed: 0x1003, energy: 5, loopable: false },
  { id: 'bf-garage-stomp', category: 'beds', title: 'Garage Stomp', seconds: 45, bpm: 132, bass: 73, lead: 220, seed: 0x1004, energy: 8, loopable: true },
  { id: 'bf-bar-band-jangle', category: 'breakroom', title: 'Bar Band Jangle', seconds: 45, bpm: 112, bass: 62, lead: 185, seed: 0x1005, energy: 6, loopable: true },
  { id: 'bf-dusty-psych-rock', category: 'technology', title: 'Dusty Psych Rock', seconds: 45, bpm: 88, bass: 49, lead: 147, seed: 0x1006, energy: 6, loopable: true },
  { id: 'bf-bit-crushed-rock', category: 'emergency', title: 'Bit-Crushed Rock', seconds: 30, bpm: 156, bass: 82, lead: 262, seed: 0x1007, energy: 10, loopable: true },
  { id: 'bf-dockside-shanty-rock', category: 'sailing', title: 'Dockside Shanty Rock', seconds: 45, bpm: 104, bass: 55, lead: 174, seed: 0x1008, energy: 7, loopable: true },
  { id: 'bf-rust-belt-blues', category: 'beds', title: 'Rust Belt Blues', seconds: 45, bpm: 78, bass: 46, lead: 123, seed: 0x1009, energy: 4, loopable: true },
  { id: 'bf-late-night-rock', category: 'beds', title: 'Late Night Rock', seconds: 45, bpm: 108, bass: 52, lead: 208, seed: 0x100a, energy: 6, loopable: true },
  { id: 'bf-warehouse-pulse', category: 'corporate', title: 'Warehouse Pulse', seconds: 30, bpm: 120, bass: 61, lead: 233, seed: 0x100b, energy: 7, loopable: true },
  { id: 'bf-corporate-jingle', category: 'commercials', title: 'Your Bullshit Is Our Bullshit', seconds: 9, bpm: 144, bass: 69, lead: 294, seed: 0x100c, energy: 8, loopable: false },
  { id: 'bf-cartoon-drum-break', category: 'stingers', title: 'Cartoon Drum Break', seconds: 6, bpm: 168, bass: 76, lead: 330, seed: 0x100d, energy: 10, loopable: false },
  { id: 'bf-dog-cue', category: 'dog', title: 'Bork Investigates', seconds: 6, bpm: 132, bass: 92, lead: 392, seed: 0x100e, energy: 8, loopable: false },
];

function seededNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state / 4294967296) * 2 - 1;
  };
}

function envelope(position, length, attack = 0.02, release = 0.12) {
  const a = Math.min(1, position / Math.max(1, length * attack));
  const r = Math.min(1, (length - position) / Math.max(1, length * release));
  return Math.max(0, Math.min(a, r));
}

function waveSample(track, index, random) {
  const time = index / sampleRate;
  const beat = 60 / track.bpm;
  const beatPosition = (time % beat) / beat;
  const kick = Math.exp(-beatPosition * 34) * Math.sin(2 * Math.PI * (track.bass + 18 - beatPosition * 30) * time);
  const snarePosition = ((time + beat / 2) % beat) / beat;
  const snare = Math.exp(-snarePosition * 30) * random() * 0.34;
  const bass = Math.sin(2 * Math.PI * track.bass * time) * 0.19;
  const octave = Math.sin(2 * Math.PI * track.bass * 2 * time) * 0.06;
  const lead = (Math.sin(2 * Math.PI * track.lead * time) + Math.sin(2 * Math.PI * (track.lead * 1.5) * time) * 0.32) * 0.09;
  const stutter = Math.sin(2 * Math.PI * track.lead * 0.5 * time) * (track.category === 'technology' || track.category === 'emergency' ? 0.05 : 0.02);
  const grit = random() * 0.014;
  const fade = envelope(index, Math.floor(track.seconds * sampleRate));
  return Math.max(-1, Math.min(1, (kick * 0.8 + snare + bass + octave + lead + stutter + grit) * fade));
}

function writeWavBuffer(track) {
  const sampleCount = Math.max(1, Math.floor(track.seconds * sampleRate));
  const dataBytes = sampleCount * channels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  const random = seededNoise(track.seed);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.round(waveSample(track, index, random) * 0x7fff);
    const offset = 44 + index * channels * 2;
    buffer.writeInt16LE(sample, offset);
    buffer.writeInt16LE(sample, offset + 2);
  }
  return buffer;
}

await mkdir(outputRoot, { recursive: true });
const library = [];
for (const track of TRACKS) {
  const categoryRoot = path.join(outputRoot, track.category);
  await mkdir(categoryRoot, { recursive: true });
  const file = path.join(categoryRoot, `${track.id}.wav`);
  await writeFile(file, writeWavBuffer(track));
  library.push({
    id: track.id,
    title: track.title,
    category: track.category,
    mood: track.category === 'dog' ? 'suspicious-investigation' : track.category === 'commercials' ? 'cheap-corporate-confidence' : 'dusty-16-bit-rock',
    duration: track.seconds,
    energy: track.energy,
    loopable: track.loopable,
    approved: true,
    rightsHolder: 'Bullshit Factory',
    source: 'original procedural composition',
    file: `/bullshit-factory/music/${track.category}/${track.id}.wav`,
    permittedUse: ['livestream', 'VOD', 'commercial'],
  });
}
await writeFile(path.join(outputRoot, 'library.json'), `${JSON.stringify({ schemaVersion: '1.1', showId: 'bullshit-factory', generatedAt: new Date().toISOString(), policy: 'Original internal masters and local Stable Audio 3 generations are selected by metadata, generated before playout, and retained as reviewable Bullshit Factory assets.', stableAudio: { provider: 'stable-audio-3-small-music', backend: 'tflite-cpu', ownership: 'Bullshit Factory subject to the Stability AI Community License and AUP', autoApprove: true, serialized: true, preGenerationOnly: true }, tracks: library }, null, 2)}\n`, 'utf8');
console.log(`Generated ${library.length} original Bullshit Factory music masters in ${outputRoot}`);
