import {
  assembleSession,
  evaluateSessionQuality,
  factoryCatalog,
  factoryCast,
  factoryScenes,
  normalizeSessionMinutes,
  sessionDurationOptions,
} from '../../../../lib/bullshit-factory';
import { isAdminAuthenticated } from '../../../../lib/bullshit-factory-admin-auth.mjs';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

export async function GET(request: Request) {
  if (!isAdminAuthenticated(request)) return json({ error: 'Admin login required.' }, 401);
  return json({
    showId: 'bullshit-factory',
    format: factoryCatalog.format,
    style: factoryCatalog.style,
    castCount: factoryCatalog.activeCastCount,
    durationOptions: sessionDurationOptions,
    scenes: factoryScenes.map((scene) => ({ id: scene.id, label: scene.label, location: scene.location })),
    qualityGates: ['duration', 'cast', 'directions', 'movement', 'dog-voice', 'music-rights', 'audio-lipsync'],
  });
}

export async function POST(request: Request) {
  if (!isAdminAuthenticated(request)) return json({ error: 'Admin login required.' }, 401);
  let body: { duration?: unknown; seed?: unknown; sceneId?: unknown; characterId?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return json({ error: 'Request body must be JSON.' }, 400);
  }

  const rawDuration = Number(body.duration);
  if (!Number.isFinite(rawDuration) || rawDuration < 5 || rawDuration > 1440) {
    return json({ error: 'duration must be between 5 minutes and 24 hours.' }, 400);
  }
  const sceneId = typeof body.sceneId === 'string' && factoryScenes.some((scene) => scene.id === body.sceneId)
    ? body.sceneId
    : null;
  const characterId = typeof body.characterId === 'string' && factoryCast.some((character) => character.id === body.characterId)
    ? body.characterId
    : null;
  const seed = Number.isFinite(Number(body.seed)) ? Number(body.seed) : 1;
  const plan = assembleSession(normalizeSessionMinutes(rawDuration), seed, {
    sceneId,
    characterId,
    castIds: factoryCast.map((character) => character.id),
  });
  const gates = evaluateSessionQuality(plan, { catalog: factoryCatalog });
  return json({ plan, gates });
}
