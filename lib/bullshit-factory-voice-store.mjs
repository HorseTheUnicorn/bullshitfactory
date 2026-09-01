import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  VOICE_PROFILE_SCHEMA_VERSION,
  normalizeSelectedVoiceProfile,
  normalizeVoiceCandidate,
} from './bullshit-factory-voice.mjs';

const CHARACTER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,95}$/u;
const CANDIDATE_ID_PATTERN = /^[abc]$/u;

function safeCharacterId(value) {
  const id = String(value || '').trim().toLowerCase();
  return CHARACTER_ID_PATTERN.test(id) ? id : '';
}

function safeCandidateId(value) {
  const id = String(value || '').trim().toLowerCase();
  return CANDIDATE_ID_PATTERN.test(id) ? id : '';
}

async function atomicWriteJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

function isoNow() {
  return new Date().toISOString();
}

export class VoiceProfileStore {
  constructor(rootDir, { now = isoNow } = {}) {
    this.rootDir = path.resolve(String(rootDir || '.'));
    this.now = now;
  }

  characterDirectory(characterId) {
    const id = safeCharacterId(characterId);
    if (!id) throw new Error('A valid characterId is required.');
    return path.join(this.rootDir, id);
  }

  profilePath(characterId) {
    return path.join(this.characterDirectory(characterId), 'profile.json');
  }

  candidatesPath(characterId) {
    return path.join(this.characterDirectory(characterId), 'candidates.json');
  }

  historyDirectory(characterId) {
    return path.join(this.characterDirectory(characterId), 'history');
  }

  auditionPath(characterId, candidateId) {
    const id = safeCandidateId(candidateId);
    if (!id) throw new Error('A valid voice candidate id is required.');
    return path.join(this.characterDirectory(characterId), `audition-${id}.wav`);
  }

  castReelPath() {
    return path.join(this.rootDir, 'cast-reel.wav');
  }

  castReelReportPath() {
    return path.join(this.rootDir, 'cast-reel.json');
  }

  async readDocument(filePath) {
    try {
      return { value: JSON.parse(await readFile(filePath, 'utf8')), error: null };
    } catch (error) {
      if (error?.code === 'ENOENT') return { value: null, error: null };
      return { value: null, error: 'The stored voice document is unreadable.' };
    }
  }

  async readProfile(characterId) {
    const id = safeCharacterId(characterId);
    if (!id) return { profile: null, error: 'A valid characterId is required.' };
    const document = await this.readDocument(this.profilePath(id));
    if (!document.value) return { profile: null, error: document.error ? 'The saved voice profile is invalid; stock fallback remains active.' : null };
    try {
      return { profile: normalizeSelectedVoiceProfile(document.value, id), error: null };
    } catch {
      return { profile: null, error: 'The saved voice profile is invalid; stock fallback remains active.' };
    }
  }

  async readCandidates(characterId) {
    const id = safeCharacterId(characterId);
    if (!id) return { document: null, error: 'A valid characterId is required.' };
    const raw = await this.readDocument(this.candidatesPath(id));
    if (!raw.value) return { document: null, error: raw.error };
    if (!Array.isArray(raw.value.candidates)) return { document: null, error: 'The stored voice candidate list is invalid.' };
    try {
      const candidates = raw.value.candidates.map((candidate) => normalizeVoiceCandidate(candidate, id));
      return {
        document: {
          schemaVersion: VOICE_PROFILE_SCHEMA_VERSION,
          characterId: id,
          generationId: String(raw.value.generationId || '').slice(0, 100) || null,
          generatedAt: String(raw.value.generatedAt || '').slice(0, 40) || null,
          feedback: String(raw.value.feedback || '').slice(0, 240),
          status: String(raw.value.status || 'ready'),
          candidates,
          error: String(raw.value.error || '').slice(0, 500) || null,
        },
        error: null,
      };
    } catch {
      return { document: null, error: 'The stored voice candidate list is invalid.' };
    }
  }

  async writeCandidates(characterId, { generationId, generatedAt = this.now(), feedback = '', status = 'ready', candidates = [], error = null } = {}) {
    const id = safeCharacterId(characterId);
    if (!id) throw new Error('A valid characterId is required.');
    const normalized = candidates.map((candidate) => normalizeVoiceCandidate({ ...candidate, characterId: id }, id));
    const document = {
      schemaVersion: VOICE_PROFILE_SCHEMA_VERSION,
      characterId: id,
      generationId: String(generationId || '').slice(0, 100) || null,
      generatedAt: String(generatedAt || this.now()).slice(0, 40),
      feedback: String(feedback || '').slice(0, 240),
      status: String(status || 'ready').slice(0, 40),
      candidates: normalized,
      error: String(error || '').slice(0, 500) || null,
    };
    await atomicWriteJson(this.candidatesPath(id), document);
    return document;
  }

  async selectCandidate(characterId, candidateId) {
    const id = safeCharacterId(characterId);
    const candidateKey = safeCandidateId(candidateId);
    if (!id || !candidateKey) throw new Error('A valid characterId and candidateId are required.');
    const candidateDocument = await this.readCandidates(id);
    if (candidateDocument.error || !candidateDocument.document) throw new Error(candidateDocument.error || 'Voice candidates have not been generated.');
    const candidate = candidateDocument.document.candidates.find((entry) => entry.candidateId === candidateKey);
    if (!candidate) throw new Error('That voice candidate is no longer available. Generate a fresh set and try again.');
    if (candidate.validation?.status && candidate.validation.status !== 'pass') throw new Error('That voice candidate did not pass audio validation.');

    const current = await this.readProfile(id);
    // A corrupt profile must fail closed to the stock fallback, but it must
    // not prevent the operator from selecting a fresh, validated candidate.
    const previous = current.profile;
    const version = (Number.isInteger(previous?.version) && previous.version > 0 ? previous.version : 0) + 1;
    if (previous) {
      await atomicWriteJson(path.join(this.historyDirectory(id), `v${previous.version}.json`), previous);
    }
    let auditionFile = candidate.audioFile || `voices/${id}/audition-${candidateKey}.wav`;
    const selectedAudioPath = path.join(this.characterDirectory(id), `selected-v${version}.wav`);
    try {
      await copyFile(this.auditionPath(id, candidateKey), selectedAudioPath);
      auditionFile = `voices/${id}/selected-v${version}.wav`;
    } catch (error) {
      // The production service verifies the candidate file before calling the
      // store. Keeping the candidate reference here also makes the store
      // usable in metadata-only tests and leaves selection recoverable if a
      // temporary preview file disappears between those checks.
      if (error?.code !== 'ENOENT') throw error;
    }
    const profile = normalizeSelectedVoiceProfile({
      ...candidate,
      characterId: id,
      voiceId: `${id}-voice-v${version}`,
      label: `Candidate ${candidate.label}`,
      status: 'selected',
      version,
      selectedAt: this.now(),
      auditionFile,
      previousVersion: previous?.version || null,
    }, id);
    await atomicWriteJson(this.profilePath(id), profile);
    return profile;
  }

  async writeCastReelReport(report) {
    const value = report && typeof report === 'object' ? report : {};
    await atomicWriteJson(this.castReelReportPath(), { schemaVersion: VOICE_PROFILE_SCHEMA_VERSION, ...value });
    return value;
  }

  async list(characterIds = []) {
    const ids = [...new Set(characterIds.map(safeCharacterId).filter(Boolean))];
    return Promise.all(ids.map(async (id) => {
      const [profile, candidates] = await Promise.all([this.readProfile(id), this.readCandidates(id)]);
      return { characterId: id, ...profile, candidates: candidates.document, candidatesError: candidates.error };
    }));
  }
}

export { CANDIDATE_ID_PATTERN, CHARACTER_ID_PATTERN, safeCandidateId, safeCharacterId };
