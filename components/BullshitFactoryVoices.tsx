'use client';

import { useEffect, useRef, useState } from 'react';

type VoiceValidation = {
  status?: string;
  checks?: Array<{ id?: string; pass?: boolean; detail?: string }>;
  durationSeconds?: number;
  latencyMs?: number;
  fallbackUsed?: boolean;
  error?: string;
};

type VoiceCandidate = {
  candidateId: string;
  label: string;
  direction?: string;
  validation?: VoiceValidation;
  audioFile?: string | null;
  notes?: string;
};

type CurrentVoice = {
  mode?: string;
  voiceId?: string | null;
  label?: string;
  version?: number | null;
  candidateId?: string | null;
  fallbackVoice?: string;
  audioFile?: string | null;
};

type VoiceCharacter = {
  characterId: string;
  displayName: string;
  role?: string;
  portrait?: string | null;
  isDog?: boolean;
  current?: CurrentVoice;
  profileError?: string | null;
  candidatesError?: string | null;
  generation?: { status?: string; feedback?: string; generatedAt?: string | null; error?: string | null } | null;
  candidates?: VoiceCandidate[];
};

type VoicePayload = {
  auditionScript?: string;
  candidateCount?: number;
  characters?: VoiceCharacter[];
  collisions?: Array<{ left?: string; right?: string; warning?: string; distance?: number }>;
  selectedCount?: number;
};

type VoiceJob = {
  jobId?: string;
  label?: string;
  status?: string;
  error?: string | null;
};

function auditionUrl(characterId: string, candidateId: string) {
  return `/api/bullshit-factory/production?view=voice-audition&characterId=${encodeURIComponent(characterId)}&id=${encodeURIComponent(candidateId)}`;
}

function currentVoiceUrl(characterId: string) {
  return `/api/bullshit-factory/production?view=voice-current&characterId=${encodeURIComponent(characterId)}`;
}

function reelUrl() {
  return '/api/bullshit-factory/production?view=voice-reel';
}

function candidateStatus(candidate: VoiceCandidate) {
  if (candidate.validation?.status === 'pass') return 'READY';
  if (candidate.validation?.status === 'failed') return 'FAILED';
  return 'WAITING';
}

export default function BullshitFactoryVoices() {
  const [payload, setPayload] = useState<VoicePayload | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [jobs, setJobs] = useState<Record<string, string>>({});
  const [reelJob, setReelJob] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Voice profiles are loaded from the production host.');
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  async function loadVoices() {
    try {
      const response = await fetch('/api/bullshit-factory/production?view=voices', { cache: 'no-store' });
      const next = await response.json() as VoicePayload & { error?: string };
      if (!response.ok) throw new Error(next.error || 'Voice profiles are unavailable.');
      setPayload(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Voice profiles are unavailable.');
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadVoices(), 0);
    const timer = window.setInterval(() => void loadVoices(), 10_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const activeJobs = Object.entries(jobs);
    if (!activeJobs.length && !reelJob) return undefined;
    let cancelled = false;
    const poll = async () => {
      const ids = [...activeJobs.map(([, jobId]) => jobId), ...(reelJob ? [reelJob] : [])];
      for (const jobId of ids) {
        try {
          const response = await fetch(`/api/bullshit-factory/production?view=job&id=${encodeURIComponent(jobId)}`, { cache: 'no-store' });
          const result = await response.json() as { job?: VoiceJob };
          const job = result.job;
          if (!job || cancelled || !['completed', 'failed'].includes(job.status || '')) continue;
          setJobs((current) => Object.fromEntries(Object.entries(current).filter(([, currentJobId]) => currentJobId !== jobId)));
          setReelJob((current) => current === jobId ? null : current);
          setMessage(job.status === 'completed'
            ? `${job.label || 'Voice job'} finished. The saved profile was not changed.`
            : `${job.label || 'Voice job'} failed: ${job.error || 'check the production log.'}`);
          void loadVoices();
        } catch {
          // The next poll retries without interrupting an audition already in progress.
        }
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [jobs, reelJob]);

  const characters = payload?.characters || [];
  const speakingCount = characters.filter((character) => !character.isDog).length;

  async function regenerate(character: VoiceCharacter) {
    setBusy(true);
    try {
      const response = await fetch('/api/bullshit-factory/production', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'generate-voice-candidates', characterId: character.characterId, feedback: feedback[character.characterId] || '' }),
      });
      const result = await response.json() as { job?: VoiceJob; error?: string };
      if (!response.ok || !result.job?.jobId) throw new Error(result.error || 'The voice designer rejected the request.');
      setJobs((current) => ({ ...current, [character.characterId]: result.job?.jobId || '' }));
      setMessage(`${character.displayName}: three new Kokoro candidates are being auditioned. The current voice stays live until you select one.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Voice candidate generation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function selectCandidate(character: VoiceCharacter, candidate: VoiceCandidate) {
    if (candidate.validation?.status !== 'pass') return;
    const selectionKey = `${character.characterId}:${candidate.candidateId}`;
    setSelecting(selectionKey);
    try {
      const response = await fetch('/api/bullshit-factory/production', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'select-voice-candidate', characterId: character.characterId, candidateId: candidate.candidateId }),
      });
      const result = await response.json() as { error?: string; profile?: { version?: number } };
      if (!response.ok) throw new Error(result.error || 'The voice selection was rejected.');
      await loadVoices();
      setMessage(`${character.displayName}: Candidate ${candidate.label} is now permanent voice version ${Number(result?.profile?.version || 1)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Voice selection failed.');
    } finally {
      setSelecting(null);
    }
  }

  async function generateReel() {
    setBusy(true);
    try {
      const response = await fetch('/api/bullshit-factory/production', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'generate-cast-reel' }),
      });
      const result = await response.json() as { job?: VoiceJob; error?: string };
      if (!response.ok || !result.job?.jobId) throw new Error(result.error || 'The cast reel job was rejected.');
      setReelJob(result.job.jobId);
      setMessage('Cast reel queued. It compares the currently approved profiles and reports recipe collisions without changing them.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cast reel generation failed.');
    } finally {
      setBusy(false);
    }
  }

  function playAudio(key: string) {
    Object.entries(audioRefs.current).forEach(([otherKey, audio]) => {
      if (otherKey !== key && audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    void audioRefs.current[key]?.play();
  }

  function stopAudio(key: string) {
    const audio = audioRefs.current[key];
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  return (
    <section className="bf-section bf-voices-section" id="voices" aria-label="Character voice management">
      <div className="bf-section-heading bf-voices-heading">
        <div>
          <span className="bf-eyebrow">VOICE MANAGEMENT / KOKORO</span>
          <h2>Give every recurring character an actor.</h2>
        </div>
        <p>Listen to three automatically designed performances, then click Select once. Candidate generation never changes the live voice; selected recipes stay in runtime storage and use the existing local Kokoro service forever.</p>
      </div>
      <div className="bf-voices-toolbar">
        <div><span>CAST</span><strong>{speakingCount} speaking / {payload?.selectedCount || 0} approved</strong><small>{payload?.candidateCount || 3} candidates per character / Bork remains bark-only</small></div>
        <div className="bf-voices-toolbar-actions">
          <button className="bf-button" disabled={busy || Boolean(reelJob)} onClick={() => void generateReel()} type="button">{reelJob ? 'CAST REEL QUEUED…' : 'GENERATE CAST REEL'}</button>
          <a className="bf-button" href={reelUrl()} target="_blank" rel="noreferrer">PLAY LAST REEL</a>
          <button className="bf-button" disabled={busy} onClick={() => { void loadVoices(); setMessage('Voice profiles refreshed from disk.'); }} type="button">REFRESH</button>
        </div>
      </div>
      {payload?.collisions?.length ? <div className="bf-voice-collisions" role="status"><strong>SEPARATION REVIEW</strong>{payload.collisions.map((collision) => <span key={`${collision.left}-${collision.right}`}>{collision.warning || `${collision.left} and ${collision.right} may sound overly similar.`}</span>)}</div> : <p className="bf-voice-separation-clear">No approved recipe collisions reported. Generate a cast reel after approving the next voices to audition the real cast together.</p>}
      <p className="bf-voice-message" role="status">{message}</p>
      {payload?.auditionScript && <details className="bf-voice-script"><summary>STANDARDIZED AUDITION PASSAGE</summary><p>{payload.auditionScript}</p></details>}
      <div className="bf-voice-grid">
        {characters.map((character) => {
          const current = character.current || {};
          const characterJob = jobs[character.characterId];
          return (
            <article className={`bf-voice-character ${character.isDog ? 'is-dog' : ''}`} key={character.characterId}>
              <div className="bf-voice-character-heading">
                <div className="bf-voice-portrait">
                  {character.portrait ? <img src={character.portrait} alt={`${character.displayName} portrait`} /> : <span aria-hidden="true">?</span>}
                </div>
                <div><span className="bf-eyebrow">{character.isDog ? 'BARK ASSET' : 'FICTIONAL PERFORMANCE'}</span><h3>{character.displayName}</h3><p>{character.role}</p></div>
                <span className={`bf-voice-current-chip ${current.mode === 'selected-profile' ? 'is-selected' : ''}`}>{character.isDog ? 'BARK ONLY' : current.mode === 'selected-profile' ? `V${current.version}` : 'LEGACY'}</span>
              </div>
              {character.isDog ? (
                <div className="bf-voice-dog-note">Bork keeps the existing bark/non-human audio path. No normal Kokoro dialogue or candidate generation is permitted.</div>
              ) : (
                <>
                  <div className="bf-voice-current">
                    <div><span>CURRENT SELECTED VOICE</span><strong>{current.label || 'Legacy KokovoiceLab voice'}</strong><small>{current.voiceId || 'legacy-compatible mapping'} / fallback {current.fallbackVoice || 'stock Kokoro'}</small></div>
                    {current.audioFile && <audio ref={(element) => { audioRefs.current[`${character.characterId}:current`] = element; }} controls preload="none" src={currentVoiceUrl(character.characterId)} aria-label={`${character.displayName} current selected voice`} />}
                  </div>
                  {character.profileError && <p className="bf-voice-warning">{character.profileError}</p>}
                  {character.candidatesError && <p className="bf-voice-warning">{character.candidatesError}</p>}
                  <div className="bf-voice-feedback">
                    <label htmlFor={`voice-feedback-${character.characterId}`}>OPTIONAL DIRECTION</label>
                    <input id={`voice-feedback-${character.characterId}`} value={feedback[character.characterId] || ''} onChange={(event) => setFeedback((currentFeedback) => ({ ...currentFeedback, [character.characterId]: event.target.value }))} placeholder="older, rougher, more nervous, less robotic…" type="text" />
                    <button className="bf-button bf-button-primary" disabled={busy || Boolean(characterJob)} onClick={() => void regenerate(character)} type="button">{characterJob ? 'GENERATING A / B / C…' : 'GENERATE 3 NEW CANDIDATES'}</button>
                    <button className="bf-button" disabled={busy || Boolean(characterJob)} onClick={() => { void loadVoices(); setMessage(`${character.displayName}: restored the saved selected voice view. Candidate work remains unapproved.`); }} type="button">RESTORE SELECTED</button>
                  </div>
                  <div className="bf-voice-candidates">
                    {(character.candidates || []).map((candidate) => {
                      const audioKey = `${character.characterId}:${candidate.candidateId}`;
                      const selectionKey = `${character.characterId}:${candidate.candidateId}`;
                      const ready = candidate.validation?.status === 'pass';
                      return (
                        <div className={`bf-voice-candidate ${ready ? 'is-ready' : 'is-failed'}`} key={candidate.candidateId}>
                          <div className="bf-voice-candidate-top"><strong>CANDIDATE {candidate.label}</strong><span>{candidateStatus(candidate)}</span></div>
                          <p>{candidate.direction || 'Automatically designed from the character bible.'}</p>
                          {candidate.audioFile && <audio ref={(element) => { audioRefs.current[audioKey] = element; }} controls preload="none" src={auditionUrl(character.characterId, candidate.candidateId)} aria-label={`${character.displayName} candidate ${candidate.label}`} />}
                          <div className="bf-voice-audio-actions">
                            <button className="bf-button" disabled={!candidate.audioFile} onClick={() => playAudio(audioKey)} type="button">PLAY</button>
                            <button className="bf-button" disabled={!candidate.audioFile} onClick={() => stopAudio(audioKey)} type="button">STOP</button>
                            <button className="bf-button bf-button-primary" disabled={!ready || selecting === selectionKey || Boolean(characterJob)} onClick={() => void selectCandidate(character, candidate)} type="button">{selecting === selectionKey ? 'SAVING…' : 'SELECT'}</button>
                          </div>
                          <small className="bf-voice-candidate-meta">{candidate.validation?.durationSeconds ? `${candidate.validation.durationSeconds.toFixed(1)} sec` : '—'} / {candidate.validation?.latencyMs ? `${candidate.validation.latencyMs} ms` : 'validation pending'}{candidate.validation?.fallbackUsed ? ' / STOCK FALLBACK USED' : ''}</small>
                        </div>
                      );
                    })}
                  </div>
                  {!character.candidates?.length && <div className="bf-voice-empty">NO CANDIDATES YET / GENERATE THREE TO START THE AUDITION.</div>}
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
