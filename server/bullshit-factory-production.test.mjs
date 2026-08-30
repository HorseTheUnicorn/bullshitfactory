import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAnimationCandidate,
  buildAnimationDirectorPrompt,
  buildGoblinPrompt,
  buildScriptWriterPrompt,
  buildSegmentDraft,
  episodeTitleBodyKey,
  episodeDurationSeconds,
  resolveGenerationWho,
  selectGenerationWho,
  evaluateWritingCandidate,
  validateSegmentContract,
} from './bullshit-factory-production.mjs';
import { buildMotionPlan, dialogueLineBudget, minimumDialogueLines } from '../lib/bullshit-factory-production.mjs';

test('Goblin prompt includes the sitcom and altered-state writing contract', () => {
  const prompt = buildGoblinPrompt(
    { templateId: 'break-policy', title: 'Break policy', synopsis: 'A bad rule spreads.', sceneId: 'factory-floor', castIds: ['rookboss', 'sudsmcgee', 'bork'], music: { trackId: 'bf-theme-main' } },
    { characters: [{ id: 'rookboss', name: 'Rook', role: 'boss', verbalHabits: [], catchphrases: [] }] },
    '',
    { selectedTrack: { id: 'bf-theme-main' } },
    {
      schemaVersion: '1.0',
      rules: ['Give the lead a want and a concrete obstacle.'],
      beatSheet: [{ id: 'hook', instruction: 'Open in the problem.' }],
      alteredStatePalettes: { marijuana: ['specific sensory shift'] },
      characterPerformance: ['Give listeners reactions.'],
      outputContract: { requiredFields: ['premise', 'storyBeats', 'dialogue'] },
    },
  );
  assert.match(prompt, /concrete want/i);
  assert.match(prompt, /alteredStateMode/i);
  assert.match(prompt, /storyBeats/i);
  assert.match(prompt, /specific sensory shift/i);
});

test('the provider prompts keep script writing and animation direction separate', () => {
  const draft = buildSegmentDraft({ templateId: 'server-emergency', seed: 44, durationSeconds: 30, castIds: ['rookboss', 'kernelkline', 'bork'] });
  const scriptPrompt = buildScriptWriterPrompt(draft, { characters: [] }, '', { selectedTrack: { id: 'bf-theme-main' } }, {}, 'Groq Qwen 3.8 27B');
  const animationPrompt = buildAnimationDirectorPrompt(draft, { bibles: { characters: [] }, animationTraining: {} }, { selectedTrack: { id: 'bf-theme-main' } });
  assert.match(scriptPrompt, /Groq Qwen 3\.8 27B/i);
  assert.match(scriptPrompt, /Gemini is the animation director/i);
  assert.match(animationPrompt, /primary animation director/i);
  assert.match(animationPrompt, /never output x\/y pixels/i);
  assert.match(animationPrompt, /locked script/i);
  assert.match(animationPrompt, /line_id/i);
  assert.match(animationPrompt, /listener_id/i);
  assert.match(animationPrompt, /post_line_reaction/i);
  assert.match(animationPrompt, /shot_type/i);
});

test('topic quality gate accepts contextual reactions to one shared incident', () => {
  const candidate = {
    premise: 'A technology server outage becomes a fake labor dispute over who gets to reboot the machine.',
    storyBeats: [
      { id: 'hook', text: 'The technology server starts charging the crew rent in error messages.' },
      { id: 'want', text: 'Rook wants one clean reboot before the factory loses the night shift.' },
      { id: 'obstacle', text: 'Kernel discovers the machine permissions are trapped in a ridiculous labor dispute.' },
      { id: 'escalation', text: 'The network begins issuing contracts to chairs, tools, and one furious router.' },
      { id: 'reversal', text: 'The outage is revealed to be the server demanding a union representative.' },
      { id: 'button', text: 'Rook reboots the machine and the server immediately files overtime.' },
    ],
    dialogue: [
      { speakerId: 'rookboss', text: 'The server is charging rent in error messages, and this shit is mine.' },
      { speakerId: 'kernelkline', text: 'That rule is a damn permissions bug, and the network hates us.' },
      { speakerId: 'sudsmcgee', text: 'I will reboot the machine before this bastard router gets drunk.' },
      { speakerId: 'rookboss', text: 'Then the server fires the chairs, and we all go to hell.' },
    ],
    movementNotes: ['Rook plants his feet and guards the server rack.', 'Kernel turns from the console to challenge the fake labor rule.'],
    stageDirections: [{ character: 'rookboss', action: 'talk' }, { character: 'kernelkline', action: 'react' }],
  };
  const dialogue = candidate.dialogue.map((line) => ({ ...line, startMs: 1000, endMs: 5000 }));
  const evaluation = evaluateWritingCandidate(candidate, dialogue, ['rookboss', 'kernelkline', 'sudsmcgee'], 30, { reservedTopics: ['technology'] }, []);
  assert.equal(evaluation.status, 'pass', JSON.stringify(evaluation.checks));
  assert.equal(evaluation.checks.find((check) => check.id === 'topic-speaker-coverage')?.pass, true);
});

test('deterministic drafts carry a complete writing beat sheet', () => {
  const draft = buildSegmentDraft({ templateId: 'break-policy', seed: 42, durationSeconds: 30, castIds: ['rookboss', 'sudsmcgee'] });
  assert.deepEqual(draft.story.beats.map((beat) => beat.id), ['hook', 'want', 'obstacle', 'escalation', 'reversal', 'button']);
  assert.equal(draft.writing.trainingVersion, '1.0');
  const contract = validateSegmentContract(draft);
  assert.equal(contract.ok, true);
  assert.equal(contract.warnings.some((warning) => /writing beat sheet/i.test(warning)), false);
});

test('dialogue budget scales with runtime instead of stopping at six lines', () => {
  assert.equal(minimumDialogueLines(10), 2);
  assert.equal(dialogueLineBudget(30), 4);
  assert.equal(dialogueLineBudget(60), 8);
  assert.equal(minimumDialogueLines(60), 6);
  const draft = buildSegmentDraft({ templateId: 'break-policy', seed: 7, durationSeconds: 60, castIds: ['rookboss', 'sudsmcgee', 'nico'] });
  assert.ok(draft.dialogue.length >= 6, `expected a full-minute dialogue pass, got ${draft.dialogue.length} lines`);
  assert.equal(draft.stageDirections, undefined);
});

test('short bumper drafts retain two playable exchanges', () => {
  const draft = buildSegmentDraft({ templateId: 'break-policy', seed: 20260828, durationSeconds: 10, castIds: ['rookboss', 'sudsmcgee', 'bork'] });
  assert.ok(draft.dialogue.length >= 2, `expected two short-slot dialogue lines, got ${draft.dialogue.length}`);
});

test('semantic motion gives every line a listener, motivated shot, and locked purpose', () => {
  const draft = buildSegmentDraft({ templateId: 'server-emergency', seed: 811, durationSeconds: 30, castIds: ['rookboss', 'kernelkline', 'sudsmcgee', 'bork'] });
  assert.equal(draft.motion.semanticVersion, '2.0');
  assert.equal(draft.motion.scriptLocked, true);
  for (const line of draft.dialogue) {
    const cue = draft.motion.cues.find((item) => item.kind === 'talk-and-gesture' && item.lineId === line.id);
    assert.ok(cue, `missing talk cue for ${line.id}`);
    assert.notEqual(cue.listenerId, line.speakerId);
    assert.equal(cue.purpose, `voice:${line.id}`);
    assert.ok(draft.motion.cues.some((item) => item.kind === 'listen-and-react' && item.lineId === line.id && item.actorId === cue.listenerId));
    assert.ok(draft.motion.shots.some((shot) => shot.lineId === line.id && shot.participants.includes(line.speakerId)));
  }
  assert.ok(draft.motion.shots.some((shot) => shot.type === 'two_shot'));
  assert.ok(draft.motion.shots.some((shot) => shot.type === 'final_button'));
  assert.equal(validateSegmentContract(draft).ok, true);
});

test('post-line reactions stay inside the measured 30 ms media tail', () => {
  const durationSeconds = 12.743;
  const dialogue = [
    { id: 'line-01', speakerId: 'rookboss', text: 'The server is now management.', startMs: 900, endMs: 4000, reaction: 'Kernel doubts it.' },
    { id: 'line-02', speakerId: 'kernelkline', text: 'That explains the permissions.', startMs: 4005, endMs: 8000, reaction: 'Rook panics.' },
    { id: 'line-03', speakerId: 'sudsmcgee', text: 'Then toast the outage.', startMs: 8005, endMs: 12713, reaction: 'Bork objects.' },
  ];
  const motion = buildMotionPlan(
    ['rookboss', 'kernelkline', 'sudsmcgee', 'bork'],
    dialogue,
    [],
    22,
    12,
    [{
      character: 'bork',
      action: 'react',
      clip_action: 'bark',
      start_ms: 12713,
      end_ms: 13433,
      purpose: 'reaction:line-03',
      priority: 80,
    }],
    durationSeconds,
  );
  assert.equal(motion.cues.some((cue) => cue.endMs > durationSeconds * 1000 || cue.endMs <= cue.startMs), false);
  assert.ok(motion.shots.some((shot) => shot.type === 'two_shot'));
  assert.ok(motion.shots.some((shot) => shot.type === 'final_button'));
});

test('animation direction cannot mutate the approved script', () => {
  const draft = buildSegmentDraft({ templateId: 'break-policy', seed: 914, durationSeconds: 30, castIds: ['rookboss', 'sudsmcgee', 'bork'] });
  const lockedBefore = JSON.stringify({
    title: draft.title,
    synopsis: draft.synopsis,
    story: draft.story,
    dialogue: draft.dialogue,
    barkEvents: draft.barkEvents,
    tvInterruptions: draft.tvInterruptions,
    music: draft.music,
    continuity: draft.continuity,
  });
  const first = draft.dialogue[0];
  const directed = applyAnimationCandidate({
    movementNotes: ['Rook stays planted and addresses the listener with one deliberate gesture.'],
    stageDirections: [{
      character: first.speakerId,
      location: draft.sceneId,
      walk_band: 'middle',
      near: 'center',
      action: 'point',
      clip_action: 'point',
      line_id: first.id,
      listener_id: draft.dialogue.find((line) => line.speakerId !== first.speakerId)?.speakerId,
      intent: 'win the shared argument',
      reaction: 'the listener doubts the claim',
      post_line_reaction: 'hold for the listener reaction',
      shot_type: 'two_shot',
      start_ms: first.startMs,
      end_ms: first.endMs,
      facing: 'south-east',
      purpose: `voice:${first.id}`,
      priority: 120,
    }],
  }, draft, { catalog: { characters: [] } }, null, 'gemini-test');
  const lockedAfter = JSON.stringify({
    title: directed.title,
    synopsis: directed.synopsis,
    story: directed.story,
    dialogue: directed.dialogue,
    barkEvents: directed.barkEvents,
    tvInterruptions: directed.tvInterruptions,
    music: directed.music,
    continuity: directed.continuity,
  });
  assert.equal(lockedAfter, lockedBefore);
  assert.equal(directed.writing.animationDirector.provider, 'gemini');
  assert.equal(directed.motion.scriptLocked, true);
  assert.ok(directed.motion.assetNeeds.length > 0);

});

test('episode title novelty ignores numbering and show prefix', () => {
  assert.equal(
    episodeTitleBodyKey('Bullshit Factory #008 - The Wellness Memo Is Mostly Vibes'),
    episodeTitleBodyKey('Bullshit Factory #012 - The Wellness Memo Is Mostly Vibes'),
  );
  assert.equal(
    episodeTitleBodyKey('Bullshit Factory: The Wellness Memo Is Mostly Vibes'),
    'the wellness memo is mostly vibes',
  );
});

test('continuous random mode chooses a new who mode and honors fixed modes', () => {
  assert.equal(resolveGenerationWho('random', 2), 'orange');
  assert.equal(resolveGenerationWho('random', 2, 'orange'), 'cast');
  let previousWho = null;
  const sequence = [];
  for (let index = 0; index < 6; index += 1) {
    previousWho = resolveGenerationWho('random', 2, previousWho);
    sequence.push(previousWho);
  }
  assert.deepEqual(sequence, ['orange', 'cast', 'orange', 'cast', 'orange', 'cast']);
  assert.equal(resolveGenerationWho('orange', 2), 'orange');
  assert.equal(resolveGenerationWho('cast', 2), 'cast');
});

test('random who selection persists a fair alternation for repeated dashboard requests', () => {
  const selectionState = { lastWho: null };
  const sequence = [2, 2, 2, 2].map((seed) => selectGenerationWho('random', seed, selectionState));
  assert.deepEqual(sequence, ['orange', 'cast', 'orange', 'cast']);
  assert.equal(selectionState.lastWho, 'cast');
  assert.equal(selectGenerationWho('orange', 2, selectionState), 'orange');
  assert.equal(selectGenerationWho('cast', 2, selectionState), 'cast');
});

test('episode presets map to the final short, standard, and extended lengths', () => {
  assert.equal(episodeDurationSeconds({ durationPreset: 'short' }), 60);
  assert.equal(episodeDurationSeconds({ durationPreset: 'medium' }), 180);
  assert.equal(episodeDurationSeconds({ durationPreset: 'long' }), 300);
  assert.equal(episodeDurationSeconds({}), 180);
  assert.equal(episodeDurationSeconds({ duration: 15 }), 300);
  assert.equal(episodeDurationSeconds({ duration: 60 }), 300);
});
