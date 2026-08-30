#!/usr/bin/env node

const enabled = String(process.env.BF_YOUTUBE_BRIDGE_ENABLED || 'false').trim().toLowerCase() === 'true';
const productionEndpoint = (process.env.BF_PRODUCTION_ENDPOINT || 'http://127.0.0.1:8793').replace(/\/+$/u, '');
const audienceToken = String(process.env.BF_AUDIENCE_INGEST_TOKEN || '').trim();
const productionToken = String(process.env.BF_PRODUCTION_TOKEN || '').trim();
let configuredVideoId = String(process.env.BF_YOUTUBE_LIVE_VIDEO_ID || process.env.YOUTUBE_LIVE_VIDEO_ID || '').trim();
let configuredChatId = String(process.env.BF_YOUTUBE_LIVE_CHAT_ID || process.env.YOUTUBE_LIVE_CHAT_ID || '').trim();
const staticAccessToken = String(process.env.BF_YOUTUBE_ACCESS_TOKEN || process.env.YOUTUBE_ACCESS_TOKEN || '').trim();
const refreshToken = String(process.env.BF_YOUTUBE_REFRESH_TOKEN || process.env.YOUTUBE_REFRESH_TOKEN || '').trim();
const clientId = String(process.env.BF_YOUTUBE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '').trim();
const clientSecret = String(process.env.BF_YOUTUBE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '').trim();
const youtubeApiRoot = 'https://www.googleapis.com/youtube/v3';
const oauthTokenEndpoint = 'https://oauth2.googleapis.com/token';
const maxMessageChars = 360;
let accessToken = staticAccessToken;
let pageToken = '';
let activeChatId = configuredChatId;
let stopping = false;

function log(message, detail = '') {
  const suffix = detail ? ` ${detail}` : '';
  process.stdout.write(`[bullshit-factory-youtube] ${message}${suffix}\n`);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cleanSuggestion(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maxMessageChars);
}

async function responseJson(response) {
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { error: text.slice(0, 240) }; }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || `HTTP ${response.status}`;
    const error = new Error(String(message));
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function refreshAccessToken() {
  if (!refreshToken || !clientId || !clientSecret) throw new Error('YouTube OAuth refresh credentials are not configured.');
  const response = await fetch(oauthTokenEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const payload = await responseJson(response);
  accessToken = String(payload.access_token || '').trim();
  if (!accessToken) throw new Error('YouTube OAuth refresh returned no access token.');
  return accessToken;
}

async function youtubeJson(url, retry = true) {
  const token = accessToken || await refreshAccessToken();
  const response = await fetch(url, { headers: { accept: 'application/json', authorization: `Bearer ${token}` } });
  if (response.status === 401 && retry && refreshToken) {
    accessToken = '';
    await refreshAccessToken();
    return youtubeJson(url, false);
  }
  return responseJson(response);
}


async function syncDashboardLiveConfig() {
  if (!productionToken) return;
  try {
    const response = await fetch(`${productionEndpoint}/api/production/live/status`, {
      headers: { accept: 'application/json', 'x-bullshit-factory-production-token': productionToken },
    });
    if (!response.ok) return;
    const payload = await response.json();
    const nextVideoId = String(payload.youtube?.broadcastId || '').trim();
    const nextChatId = String(payload.youtube?.chatId || '').trim();
    if (nextVideoId && nextVideoId !== configuredVideoId) {
      configuredVideoId = nextVideoId;
      activeChatId = nextChatId;
      pageToken = '';
    } else if (nextChatId && nextChatId !== activeChatId) {
      activeChatId = nextChatId;
      pageToken = '';
    }
  } catch {
    // The bridge keeps its last known IDs when the local production controller is unavailable.
  }
}

async function resolveChatId() {
  if (activeChatId) return activeChatId;
  if (!configuredVideoId) return '';
  const payload = await youtubeJson(`${youtubeApiRoot}/liveBroadcasts?part=snippet&id=${encodeURIComponent(configuredVideoId)}`);
  activeChatId = String(payload.items?.[0]?.snippet?.liveChatId || '').trim();
  return activeChatId;
}

async function forwardChat(text, messageId, author) {
  if (!audienceToken) throw new Error('BF_AUDIENCE_INGEST_TOKEN is not configured.');
  const response = await fetch(`${productionEndpoint}/api/production/audience/chat`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${audienceToken}` },
    body: JSON.stringify({ source: 'youtube', text: cleanSuggestion(text), externalId: `youtube:${messageId}`, author: cleanSuggestion(author) || 'youtube-viewer' }),
  });
  const payload = await responseJson(response);
  return payload;
}

async function pollOnce() {
  await syncDashboardLiveConfig();
  const chatId = await resolveChatId();
  if (!chatId) throw new Error('No live chat ID is configured or available for the live broadcast.');
  const query = new URLSearchParams({ liveChatId: chatId, part: 'snippet,authorDetails', maxResults: '200' });
  if (pageToken) query.set('pageToken', pageToken);
  const payload = await youtubeJson(`${youtubeApiRoot}/liveChat/messages?${query.toString()}`);
  pageToken = String(payload.nextPageToken || pageToken);
  let forwarded = 0;
  let suggestions = 0;
  for (const item of Array.isArray(payload.items) ? payload.items : []) {
    const text = cleanSuggestion(item?.snippet?.displayMessage || item?.snippet?.textMessageDetails?.messageText || '');
    if (!text) continue;
    const author = cleanSuggestion(item?.authorDetails?.displayName || 'youtube-viewer');
    try {
      const result = await forwardChat(text, String(item.id || 'unknown'), author);
      if (result.accepted) forwarded += 1;
      if (result.message?.influence && result.message.influence !== 'chat') suggestions += 1;
    } catch (error) {
      log('chat-forward-failed', error instanceof Error ? error.message : 'unknown error');
    }
  }
  const delay = Math.max(10_000, Math.min(60_000, Number(payload.pollingIntervalMillis || 15_000)));
  if (forwarded) log('messages-forwarded', String(forwarded));
  if (suggestions) log('suggestions-forwarded', String(suggestions));
  return delay;
}

async function start() {
  if (!enabled) {
    log('standby', 'BF_YOUTUBE_BRIDGE_ENABLED is false; no YouTube requests will be made.');
    while (!stopping) await sleep(60 * 60 * 1000);
    return;
  }
  if (!configuredVideoId && !configuredChatId) log('standby', 'Set BF_YOUTUBE_LIVE_VIDEO_ID or BF_YOUTUBE_LIVE_CHAT_ID when the channel goes live.');
  log('started', 'All YouTube chat goes to the shared website chat; only !bf, bf:, or @bullshitfactory and !line messages become writer seeds; no outbound chat or Discord posts are performed.');
  while (!stopping) {
    try {
      const delay = await pollOnce();
      await sleep(delay);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'YouTube bridge request failed.';
      log('poll-failed', message);
      activeChatId = configuredChatId;
      await sleep(30_000);
    }
  }
}

process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
void start().catch((error) => { log('fatal', error instanceof Error ? error.message : 'bridge failed'); process.exitCode = 1; });
