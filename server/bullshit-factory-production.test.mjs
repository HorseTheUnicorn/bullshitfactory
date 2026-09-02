import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAnimationCandidate,
  buildAnimationDirectorPrompt,
  buildGoblinPrompt,
  buildScriptWriterPrompt,
  buildSegmentDraft,
  cameraViewportForFrame,
  interpolateCameraViewport,
  characterClip,
  stabilizeFrameGeometry,
  spriteOffsetForFixedBox,
  spriteOffsetForStableEnvelope,
  deterministicTopicDialogue,
  timedDialogue,
  ensureAdultLanguageBeats,
  episodeTitleBodyKey,
  episodeDurationSeconds,
  normalizeContinuousDurationWeights,
  selectContinuousDurationPreset,
  resolveGenerationWho,
  selectGenerationWho,
  splitSpeechTextForTts,
  stripTrailingCaseTag,
  evaluateWritingCandidate,
  validateSegmentContract,
} from './bullshit-factory-production.mjs';
import { buildMotionPlan, buildOrangeIdiotTvPlan, dialogueLineBudget, minimumDialogueLines, serializeVoiceTimeline, spreadVoiceTimeline, SPEAKER_HANDOFF_GAP_MS, VOICE_REACTION_TAIL_MS } from '../lib/bullshit-factory-production.mjs';

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
  assert.match(scriptPrompt, /recentSpeechPreviews/i);
  assert.match(scriptPrompt, /choose the episode subject yourself/i);
  assert.match(scriptPrompt, /Every line must add a new detail/i);
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
      { speakerId: 'kernelkline', text: 'The permissions are still arguing, so nobody touch the damn console.' },
      { speakerId: 'sudsmcgee', text: 'Fine, I will toast the chairs until the paperwork gives up.' },
    ],
    movementNotes: ['Rook plants his feet and guards the server rack.', 'Kernel turns from the console to challenge the fake labor rule.'],
    stageDirections: [{ character: 'rookboss', action: 'talk' }, { character: 'kernelkline', action: 'react' }],
  };
  const dialogue = candidate.dialogue.map((line) => ({ ...line, startMs: 1000, endMs: 5000 }));
  const evaluation = evaluateWritingCandidate(candidate, dialogue, ['rookboss', 'kernelkline', 'sudsmcgee'], 30, { reservedTopics: ['technology'] }, []);
  assert.equal(evaluation.status, 'pass', JSON.stringify(evaluation.checks));
  assert.equal(evaluation.checks.find((check) => check.id === 'topic-speaker-coverage')?.pass, true);
});

test('cast dialogue repair fills the runtime-scaled vulgarity floor', () => {
  const repaired = ensureAdultLanguageBeats(
    Array.from({ length: 12 }, (_, index) => ({ speakerId: index % 2 ? 'kernelkline' : 'rookboss', text: 'The server changed the rule again.' })),
    180,
    17,
  );
  const profaneWords = ['bullshit', 'shit', 'fuck', 'goddamn', 'asshole', 'dickhead'];
  const profaneBeats = repaired.filter((line) => profaneWords.some((word) => line.text.toLowerCase().includes(word))).length;
  assert.ok(profaneBeats >= 9, 'expected at least 9 profane beats, got ' + profaneBeats);
});
test('deterministic fallback keeps enough unique dialogue after collision repair', () => {
  const draft = buildSegmentDraft({ templateId: 'old-timer-override', seed: 2000338723, durationSeconds: 57, castIds: ['magsrust', 'kernelkline', 'karen', 'bork'] });
  const lines = deterministicTopicDialogue(draft);
  const timed = timedDialogue(lines, draft.dialogue, draft.castIds, draft.durationSeconds);
  assert.equal(lines.length, dialogueLineBudget(57));
  assert.equal(new Set(lines.map((line) => line.text.toLowerCase())).size, lines.length);
  assert.equal(lines.some((line) => /\(case \d+\)/iu.test(line.text)), false);
  assert.ok(timed.length >= 6, 'collision repair must survive timeline filtering');
});

test('spoken dialogue strips trailing case labels before captions and Kokoro', () => {
  assert.equal(stripTrailingCaseTag('The memo is breathing (case 123).'), 'The memo is breathing');
  assert.equal(stripTrailingCaseTag('The memo is breathing (case XXX)!'), 'The memo is breathing');
  assert.equal(stripTrailingCaseTag('The case is closed.'), 'The case is closed.');
  const timed = timedDialogue([
    { speakerId: 'rookboss', text: 'The memo is breathing (case 123).' },
    { speakerId: 'kernelkline', text: 'The server is watching us (case XXX).' },
  ], [], ['rookboss', 'kernelkline'], 30);
  assert.equal(timed.length, 2);
  assert.deepEqual(timed.map((line) => line.text), ['The memo is breathing', 'The server is watching us']);
  assert.equal(timed.some((line) => /\(case\s+[a-z0-9_-]+\)/iu.test(line.text)), false);
});

test('long Orange speech is split into bounded, lossless Kokoro requests', () => {
  const source = `${Array.from({ length: 90 }, (_, index) => `Sentence ${index + 1} keeps the broadcast moving.`).join(' ')} (case 123).`;
  const chunks = splitSpeechTextForTts(source, 180);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 180));
  assert.equal(chunks.join(' '), source.replace(/\s+\(case\s+123\)\.?$/iu, '').replace(/\s+/gu, ' ').trim());
  assert.equal(chunks.some((chunk) => !chunk.trim()), false);
});

test('standalone Orange speech defaults to the complete content window', () => {
  const plan = buildOrangeIdiotTvPlan('The button is blinking, and the chair has filed a complaint.', 'orange-idiot-house', 57, 'test', 'ending', 0);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].startMs, 0);
  assert.equal(plan[0].endMs, 56_970);
});

test('measured speaker handoffs use the exact two-millisecond gap', () => {
  const timeline = serializeVoiceTimeline([
    { id: 'line-01', speakerId: 'rookboss', startMs: 900, durationMs: 2100 },
    { id: 'line-02', speakerId: 'kernelkline', startMs: 4000, durationMs: 1800 },
  ], 10);
  assert.equal(SPEAKER_HANDOFF_GAP_MS, 2);
  assert.equal(timeline[1].startMs - timeline[0].endMs, 2);
});

test('measured voice timelines fill long segments and leave only the authored reaction tail', () => {
  const durationSeconds = 57;
  const timeline = spreadVoiceTimeline([
    { id: 'line-01', speakerId: 'rookboss', text: 'One measured line.', startMs: 900, durationMs: 4200 },
    { id: 'line-02', speakerId: 'kernelkline', text: 'Two measured lines.', startMs: 5200, durationMs: 4200 },
    { id: 'line-03', speakerId: 'rookboss', text: 'Three measured lines.', startMs: 9800, durationMs: 4200 },
    { id: 'line-04', speakerId: 'kernelkline', text: 'Four measured lines.', startMs: 14400, durationMs: 4200 },
    { id: 'line-05', speakerId: 'rookboss', text: 'Five measured lines.', startMs: 19000, durationMs: 4200 },
    { id: 'line-06', speakerId: 'kernelkline', text: 'Six measured lines.', startMs: 23600, durationMs: 4200 },
  ], durationSeconds, 5, VOICE_REACTION_TAIL_MS);
  const lastEndMs = timeline.at(-1).endMs;
  assert.ok(lastEndMs <= durationSeconds * 1000 - VOICE_REACTION_TAIL_MS + 1);
  assert.ok(durationSeconds * 1000 - lastEndMs <= VOICE_REACTION_TAIL_MS + 1);
  assert.ok(timeline.slice(1).every((line, index) => line.startMs >= timeline[index].endMs));
  assert.ok(timeline.some((line, index) => index > 0 && line.startMs - timeline[index - 1].endMs > 1000), 'long-form speech should retain audible handoff space');
});

test('renderer uses a stable union envelope across H3 frame and clip transitions', () => {
  const stable = stabilizeFrameGeometry([
    { width: 92, height: 92, alphaBounds: { left: 10, top: 5, right: 70, bottom: 86 } },
    { width: 92, height: 92, alphaBounds: { left: 16, top: 3, right: 78, bottom: 87 } },
  ], { width: 64, height: 64, alphaBounds: { left: 8, top: 1, right: 58, bottom: 63 } });
  assert.deepEqual(stable, { width: 92, height: 92, alphaBounds: { left: 10, top: 3, right: 78, bottom: 87 } });
});

test('renderer roots an older unaligned H3 frame inside the stable envelope', () => {
  assert.deepEqual(
    spriteOffsetForStableEnvelope(
      { width: 92, height: 92, alphaBounds: { left: 15, top: 6, right: 75, bottom: 78 } },
      { width: 92, height: 92, alphaBounds: { left: 10, top: 4, right: 82, bottom: 87 } },
      { sprite: { left: 100, top: 20, width: 92, height: 92 }, visibleBounds: { left: 110, top: 24, right: 182, bottom: 107 } },
    ),
    { x: 1, y: 9 },
  );
  assert.deepEqual(
    spriteOffsetForFixedBox({ width: 92, height: 92, alphaBounds: { left: 15, top: 6, right: 75, bottom: 78 } }, 64, 64),
    { x: 0, y: 9 },
  );
});

test('renderer eases camera shot changes instead of flashing between crop envelopes', () => {
  const motion = {
    shots: [
      { id: 'wide', type: 'wide_scene', startMs: 0, endMs: 1000, priority: 10 },
      { id: 'close', type: 'dog_reaction', startMs: 1000, endMs: 2000, participants: ['bork'], priority: 80 },
    ],
  };
  const actors = [{ actorId: 'bork', placement: { visibleBounds: { left: 140, top: 80, right: 190, bottom: 180 } } }];
  const before = cameraViewportForFrame(motion, 990, actors);
  const entering = cameraViewportForFrame(motion, 1010, actors);
  const settled = cameraViewportForFrame(motion, 2000, actors);
  assert.deepEqual(before, { left: 0, top: 0, width: 384, height: 216, type: 'wide_scene' });
  assert.ok(entering.width < 384 && entering.width > 264, 'the incoming shot should be partway zoomed, not an immediate crop');
  assert.ok(entering.height < 216 && entering.height > 149, 'the incoming shot should preserve a smooth scale ramp');
  assert.deepEqual(settled, { left: 33, top: 56, width: 264, height: 149, type: 'dog_reaction', shotId: 'close' });
  const midpoint = interpolateCameraViewport(before, settled, 0.5);
  assert.equal(midpoint.width, 324);
  assert.equal(midpoint.height, 183);
});

test('deterministic fallback carries a shared topic without repeating its keyword on every line', () => {
  const draft = buildSegmentDraft({ templateId: 'server-emergency', seed: 90017, durationSeconds: 57, castIds: ['rookboss', 'kernelkline', 'bork'] });
  const lines = deterministicTopicDialogue({ ...draft, topicResearch: { reservedTopics: ['technology'] } });
  const technologyMentions = lines.filter((line) => /\btechnology\b/iu.test(line.text)).length;
  assert.ok(technologyMentions < lines.length, 'the primary topic should not be repeated on every line');
  assert.ok(lines.some((line) => /\b(?:same|current|that issue|it)\b/iu.test(line.text)), 'dialogue should use contextual references');
});

test('long deterministic fallback rotates per-speaker turns without repeating lines', () => {
  const draft = buildSegmentDraft({ templateId: 'break-policy', seed: 77123, durationSeconds: 180, castIds: ['sudsmcgee', 'karen', 'bork'] });
  const lines = deterministicTopicDialogue(draft);
  assert.ok(lines.length >= 18, 'expected the long fallback to scale to at least 18 lines');
  assert.equal(new Set(lines.map((line) => line.text.toLowerCase())).size, lines.length);
});

test('deterministic fallback repairs lines that collide with recent script history', () => {
  const draft = buildSegmentDraft({ templateId: 'old-timer-override', seed: 77224, durationSeconds: 57, castIds: ['magsrust', 'kernelkline', 'bork'] });
  const first = deterministicTopicDialogue({ ...draft, noveltySeed: 'history-collision' });
  const previousSpeech = first.map((line) => line.text).join(' | ');
  const second = deterministicTopicDialogue({ ...draft, noveltySeed: 'history-collision', recentScriptTexts: [previousSpeech] });
  const previousKeys = new Set(first.map((line) => line.text.toLowerCase().replace(/[^a-z0-9]+/giu, ' ').trim()));
  assert.ok(second.every((line) => !previousKeys.has(line.text.toLowerCase().replace(/[^a-z0-9]+/giu, ' ').trim())));
  assert.equal(new Set(second.map((line) => line.text.toLowerCase())).size, second.length);
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
  assert.equal(dialogueLineBudget(30), 7);
  assert.equal(dialogueLineBudget(60), 13);
  assert.equal(minimumDialogueLines(60), 10);
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

test('replacement renderer resolves an omitted action through the semantic clip kind', () => {
  const idle = { id: 'h3-kernel-idle', action: 'idle', status: 'approved', frames: [{ file: '/motion/frame.png' }], source: { kind: 'h3-max-local' } };
  const character = { clips: [idle], actionRegistry: { idle: { clipId: idle.id } } };
  assert.equal(characterClip(character, 'idle', '', true), idle);
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

test('continuous duration weights normalize and avoid immediate repeats', () => {
  assert.deepEqual(normalizeContinuousDurationWeights('short:2,medium:6,long:2'), { short: 0.2, medium: 0.6, long: 0.2 });
  assert.deepEqual(normalizeContinuousDurationWeights({ short: 0, medium: 0, long: 0 }), { short: 0.22, medium: 0.6, long: 0.18 });
  assert.equal(selectContinuousDurationPreset(17, 'short', { short: 1, medium: 0, long: 0 }), 'short');
  assert.notEqual(selectContinuousDurationPreset(17, 'medium', { short: 0.5, medium: 0.5, long: 0 }), 'medium');
});

test('episode presets map to the final short, standard, and extended lengths', () => {
  assert.equal(episodeDurationSeconds({ durationPreset: 'short' }), 60);
  assert.equal(episodeDurationSeconds({ durationPreset: 'medium' }), 180);
  assert.equal(episodeDurationSeconds({ durationPreset: 'long' }), 300);
  assert.equal(episodeDurationSeconds({}), 180);
  assert.equal(episodeDurationSeconds({ duration: 15 }), 300);
  assert.equal(episodeDurationSeconds({ duration: 60 }), 300);
});

test('Orange Idiot prompt carries the original New York performance direction', () => {
  const draft = buildSegmentDraft({ templateId: 'old-timer-override', seed: 20260901, durationSeconds: 30, castIds: [], orangeIdiotRequested: true, orangeIdiotOnly: true, orangeIdiotSpeechText: 'A supplied fictional broadcast line.' });
  const prompt = buildScriptWriterPrompt(draft, { characters: [] }, '', null, {}, 'Goblin');
  assert.match(prompt, /low-to-mid-pitched/i);
  assert.match(prompt, /New York\/Queens/i);
  assert.match(prompt, /short bursts/i);
});
