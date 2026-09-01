'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { factoryBrandAssets, factoryCast } from '../lib/bullshit-factory';

type PublicEpisode = {
  id: string;
  title: string;
  durationSeconds: number | null;
  createdAt: string | null;
  publishedAt: string | null;
  sceneId: string | null;
  media: { video: string; poster: string; captions: string };
};

type PublicPlaylistItem = {
  segmentId?: string | null;
  title?: string;
  source?: string;
  media?: { video: string; poster: string; captions: string } | null;
};

type PublicPlaylist = {
  mode?: string;
  status?: string;
  running?: boolean;
  healthy?: boolean;
  hasPlaylist?: boolean;
  itemCount?: number;
  current?: PublicPlaylistItem | null;
  next?: PublicPlaylistItem | null;
  updatedAt?: string | null;
};

type PublicPayload = {
  service?: string;
  episodes?: PublicEpisode[];
  playlist?: PublicPlaylist;
  continuousGeneration?: { status?: string };
};

type LiveChatMessage = {
  id: string;
  source: string;
  author: string;
  text: string;
  influence?: 'chat' | 'episode' | 'line';
  suggestionQueued?: boolean;
  createdAt: string | null;
};

type LiveChatPayload = {
  chat?: { messages?: LiveChatMessage[] };
  message?: LiveChatMessage;
  suggestion?: { id?: string };
  accepted?: boolean;
  duplicate?: boolean;
  rateLimited?: boolean;
  error?: string;
};
function formatDuration(seconds: number | null) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(value / 60);
  const remaining = String(value % 60).padStart(2, '0');
  return `${minutes}:${remaining}`;
}

function formatDate(value: string | null) {
  if (!value) return 'UNDATED CUT';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'UNDATED CUT';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

function displayScene(value: string | null) {
  return String(value || 'FACTORY FLOOR').replaceAll('-', ' ').toUpperCase();
}

export default function BullshitFactoryLanding() {
  const [episodes, setEpisodes] = useState<PublicEpisode[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [service, setService] = useState('CONNECTING');
  const [playlist, setPlaylist] = useState<PublicPlaylist | null>(null);
  const [continuousGeneration, setContinuousGeneration] = useState<{ status?: string } | null>(null);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [playerNeedsSound, setPlayerNeedsSound] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatName, setChatName] = useState('');
  const [chatText, setChatText] = useState('');
  const [chatStatus, setChatStatus] = useState('CHAT IS OPEN / SUGGESTIONS ARE OPTIONAL');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatClientId, setChatClientId] = useState('');
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const advancedEpisodeRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/bullshit-factory/public?view=episodes', { cache: 'no-store' });
        const payload = await response.json() as PublicPayload;
        if (cancelled) return;
        const nextEpisodes = Array.isArray(payload.episodes) ? payload.episodes : [];
        setEpisodes(nextEpisodes);
        setPlaylist(payload.playlist || null);
        setContinuousGeneration(payload.continuousGeneration || null);
        setLastSyncedAt(new Date().toISOString());
        const continuousActive = Boolean(payload.playlist?.running || ['running', 'stopping'].includes(String(payload.continuousGeneration?.status || '')));
        setService(response.ok ? (continuousActive ? 'CONTINUOUS SIGNAL' : 'SIGNAL READY') : 'STANDBY');
        setSelectedId((current) => {
          if (current && nextEpisodes.some((episode) => episode.id === current)) return current;
          const playlistId = continuousActive ? payload.playlist?.current?.segmentId : '';
          if (playlistId && nextEpisodes.some((episode) => episode.id === playlistId)) return playlistId;
          // Internal fallback slots do not have public media. Keep the live
          // player on a published cut instead of rendering an unplayable
          // title card when the queue's current item is not an episode.
          if (continuousActive) return nextEpisodes[0]?.id || '';
          return nextEpisodes[0]?.id || '';
        });
      } catch {
        if (!cancelled) setService('STANDBY');
      }
    }
    void load();
    const refresh = window.setInterval(() => void load(), 12_000);
    return () => { cancelled = true; window.clearInterval(refresh); };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedName = window.localStorage.getItem('bf-chat-name') || '';
        let savedClientId = window.localStorage.getItem('bf-chat-client-id') || '';
        if (!savedClientId) {
          savedClientId = 'viewer-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
          window.localStorage.setItem('bf-chat-client-id', savedClientId);
        }
        setChatName(savedName);
        setChatClientId(savedClientId);
      } catch {
        setChatClientId('viewer-' + Date.now());
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadChat() {
      try {
        const response = await fetch('/api/bullshit-factory/chat?limit=60', { cache: 'no-store' });
        const payload = await response.json() as LiveChatPayload;
        if (cancelled || !response.ok) return;
        setChatMessages(Array.isArray(payload.chat?.messages) ? payload.chat.messages : []);
      } catch {
        // The chat panel keeps its last messages during a short service interruption.
      }
    }
    void loadChat();
    const refresh = window.setInterval(() => { void loadChat(); }, 4_000);
    return () => { cancelled = true; window.clearInterval(refresh); };
  }, []);

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = chatText.trim();
    if (!text || chatBusy) return;
    setChatBusy(true);
    try {
      const response = await fetch('/api/bullshit-factory/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ text, author: chatName.trim() || 'viewer', clientId: chatClientId }),
      });
      const payload = await response.json() as LiveChatPayload;
      if (payload.rateLimited) {
        setChatStatus('PLEASE WAIT A MOMENT BEFORE SENDING AGAIN');
        return;
      }
      if (!response.ok) throw new Error(payload.error || 'CHAT IS UNAVAILABLE');
      const message = payload.message;
      if (message) setChatMessages((current) => [...current, message].slice(-60));
      setChatText('');
      if (payload.suggestion || message?.influence === 'line' || message?.influence === 'episode') {
        setChatStatus(payload.suggestion ? 'SEED QUEUED FOR THE WRITER' : 'SEED RECEIVED / ALREADY IN QUEUE');
      } else {
        setChatStatus('MESSAGE RECEIVED / CHAT ONLY');
      }
      if (chatName.trim()) window.localStorage.setItem('bf-chat-name', chatName.trim().slice(0, 32));
    } catch (error) {
      setChatStatus(error instanceof Error ? error.message : 'CHAT IS UNAVAILABLE');
    } finally {
      setChatBusy(false);
    }
  }

  const playContinuousPlayer = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.ended || (Number.isFinite(player.duration) && player.duration > 0 && player.currentTime >= player.duration - 0.05)) {
      player.currentTime = 0;
    }
    try {
      player.muted = false;
      await player.play();
      setPlayerPlaying(true);
      setPlayerNeedsSound(false);
    } catch {
      try {
        // Chrome blocks audible autoplay on a fresh visit. Keep the channel
        // visibly moving and let the viewer grant sound with one click.
        player.muted = true;
        await player.play();
        setPlayerPlaying(true);
        setPlayerNeedsSound(true);
      } catch {
        setPlayerPlaying(false);
        setPlayerNeedsSound(false);
      }
    }
  }, [])

  const continuousGenerationActive = ['running', 'stopping'].includes(String(continuousGeneration?.status || ''));
  const continuousPlaybackActive = Boolean(playlist?.running || continuousGenerationActive);
  const continuousEpisodeId = continuousPlaybackActive
    ? (selectedId || playlist?.current?.segmentId || '')
    : '';
  const selectedEpisode = useMemo(() => {
    if (continuousPlaybackActive) return episodes.find((episode) => episode.id === continuousEpisodeId) || null;
    return episodes.find((episode) => episode.id === selectedId) || episodes[0] || null;
  }, [continuousEpisodeId, continuousPlaybackActive, episodes, selectedId]);
  const selectedEpisodeId = selectedEpisode?.id || '';

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !selectedEpisodeId || !continuousPlaybackActive) return;
    void playContinuousPlayer();
  }, [continuousPlaybackActive, playlist?.current?.segmentId, playContinuousPlayer, selectedEpisodeId]);

  const advanceContinuousPlayer = useCallback(() => {
    const currentEpisodeId = selectedEpisodeId;
    if (!continuousPlaybackActive || !currentEpisodeId || advancedEpisodeRef.current === currentEpisodeId) return;
    // `timeupdate` and `ended` can both fire around the same media boundary.
    // Guard the transition so one episode cannot be skipped by duplicate events.
    advancedEpisodeRef.current = currentEpisodeId;
    const nextId = playlist?.next?.segmentId || '';
    if (nextId && episodes.some((episode) => episode.id === nextId)) {
      setSelectedId(nextId);
    } else if (episodes.length) {
      const currentIndex = episodes.findIndex((episode) => episode.id === selectedId);
      setSelectedId(episodes[(currentIndex + 1 + episodes.length) % episodes.length]?.id || episodes[0].id);
    }
    setPlayerPlaying(false);
  }, [continuousPlaybackActive, episodes, playlist?.next?.segmentId, selectedEpisodeId, selectedId]);

  useEffect(() => {
    if (!continuousPlaybackActive || !selectedEpisodeId) return;
    // Some browsers can stop dispatching media events at the exact final
    // frame. Poll only the existing player state as a last-resort handoff.
    const watchdog = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const duration = Number(player.duration);
      if (player.ended || (Number.isFinite(duration) && duration > 0 && player.currentTime >= duration - 0.05)) {
        advanceContinuousPlayer();
      }
    }, 250);
    return () => window.clearInterval(watchdog);
  }, [advanceContinuousPlayer, continuousPlaybackActive, selectedEpisodeId]);

  function handlePlayerProgress() {
    const player = playerRef.current;
    if (!player || !continuousPlaybackActive) return;
    const duration = Number(player.duration);
    if (player.ended || (Number.isFinite(duration) && duration > 0 && player.currentTime >= duration - 0.05)) {
      advanceContinuousPlayer();
    }
  }

  return (
    <main className="bf-public-page">
      <div className="bf-public-scanlines" aria-hidden="true" />
      <header className="bf-public-header">
        <Link className="bf-public-brand" href="/" prefetch={false} aria-label="Bullshit Factory home">
          <span className="bf-public-mark">BF</span>
          <span><strong>BULLSHIT FACTORY</strong><small>16-BIT NONSENSE NETWORK</small></span>
        </Link>
        <div className="bf-public-header-right">
          <span className="bf-public-signal"><i aria-hidden="true" /> {service}</span>
          <a href="#episodes">EPISODES</a>
          <Link href="/admin" prefetch={false}>ADMIN</Link>
        </div>
      </header>

      <section className="bf-public-layout" aria-label="Bullshit Factory broadcast and episode library">
        <div className="bf-public-broadcast bf-public-panel">
          <div className="bf-public-window-bar"><span>FACTORY BROADCAST // REVIEW PLAYER</span><b>{selectedEpisode && continuousPlaybackActive ? 'CONTINUOUS CUT' : selectedEpisode ? 'PUBLISHED CUT' : 'FACTORY WARMING UP'}</b></div>
          <div className="bf-public-player">
            {selectedEpisode ? (
              <video
                key={selectedEpisode.id}
                ref={playerRef}
                autoPlay={continuousPlaybackActive}
                className="bf-public-media"
                controls
                volume={1}
                onEnded={advanceContinuousPlayer}
                onTimeUpdate={handlePlayerProgress}
                onError={() => {
                  setPlayerPlaying(false);
                  setPlayerNeedsSound(false);
                }}
                onLoadStart={() => {
                  setPlayerPlaying(false);
                  setPlayerNeedsSound(false);
                }}
                onCanPlay={() => {
                  if (continuousPlaybackActive && !playerPlaying) void playContinuousPlayer();
                }}
                onPause={() => {
                  setPlayerPlaying(false);
                  setPlayerNeedsSound(false);
                }}
                onPlaying={() => {
                  setPlayerPlaying(true);
                  setPlayerNeedsSound(playerRef.current?.muted === true);
                }}
                playsInline
                preload="metadata"
                poster={selectedEpisode.media.poster}
              >
                <source src={selectedEpisode.media.video} type="video/mp4" />
                <track kind="captions" srcLang="en" label="English" src={selectedEpisode.media.captions} default />
                Your browser cannot play this episode.
              </video>
            ) : (
              <img className="bf-public-media" src={factoryBrandAssets.titleScreen} alt="Bullshit Factory title card" />
            )}
            {selectedEpisode && continuousPlaybackActive && playerPlaying && playerNeedsSound && (
              <button className="bf-public-audio-unlock" onClick={() => void playContinuousPlayer()} type="button">
                UNMUTE / PLAY SOUND
              </button>
            )}
            {selectedEpisode && continuousPlaybackActive && !playerPlaying && !playerNeedsSound && (
              <div className="bf-public-autoplay-placeholder" aria-live="polite">
                <img src={factoryBrandAssets.titleScreen} alt="" />
                <div>
                  <b>BULLSHIT FACTORY</b>
                  <span>CONTINUOUS FEED / PRESS PLAY TO START SOUND</span>
                </div>
                <button className="bf-public-play-button" onClick={() => void playContinuousPlayer()} type="button">PLAY WITH SOUND</button>
              </div>
            )}
            {!selectedEpisode && (
              <div className="bf-public-player-copy bf-public-warmup-copy">
                <span className="bf-eyebrow">PRESENTED BY THE DEPARTMENT OF NOTHING</span>
                <strong className="bf-brand-title">BULLSHIT FACTORY</strong>
                <span className="bf-brand-subtitle">CONTINUOUS NONSENSE / NO REFUNDS</span>
                <small><b>THE FACTORY IS WARMING UP.</b> The continuous feed is waiting for its next published cut.</small>
              </div>
            )}
          </div>
          <div className="bf-public-broadcast-meta">
            <div><span className="bf-public-label">NOW LOADED</span><strong>{selectedEpisode?.title || 'BULLSHIT FACTORY TITLE CARD'}</strong><small>{selectedEpisode ? `${formatDuration(selectedEpisode.durationSeconds)} // ${displayScene(selectedEpisode.sceneId)}` : 'CONTINUOUS FEED WAITING // TITLE CARD'}</small></div>
            <div className="bf-public-status-stack">
              <span className="bf-public-status-chip">{selectedEpisode ? 'READY TO PLAY' : 'AWAITING CUT'}</span>
              <small className="bf-public-playlist-status">AUTO SYNC / {playlist?.running ? 'PLAYING' : playlist?.hasPlaylist ? 'QUEUED' : 'IDLE'} / {playlist?.itemCount || 0} ITEMS</small>
            </div>
          </div>
        </div>

        <aside id="episodes" className="bf-public-side bf-public-panel bf-public-episodes-panel">
          <div className="bf-public-window-bar"><span>EPISODE FILES // AUTO SYNC</span><b>{episodes.length} PUBLISHED / {playlist?.itemCount || 0} QUEUED</b></div>
          <div className="bf-public-episode-scroll">
            {episodes.length ? episodes.map((episode, index) => (
              <button className={`bf-public-episode ${episode.id === selectedEpisode?.id ? 'is-selected' : ''}`} key={episode.id} onClick={() => setSelectedId(episode.id)} type="button">
                <img src={episode.media.poster} alt="" />
                <span><b>#{String(episodes.length - index).padStart(2, '0')}{' // '}{episode.title}</b><small>{formatDuration(episode.durationSeconds)}{' // '}{formatDate(episode.publishedAt || episode.createdAt)}</small></span>
              </button>
            )) : <p className="bf-public-empty">No public cuts have cleared the review gate. The title card is holding the channel.</p>}
          </div>
        </aside>
        <aside className="bf-public-chat-panel bf-public-panel" aria-label="Live audience chat">
          <div className="bf-public-window-bar"><span>LIVE CHAT // AUDIENCE</span><b>{chatMessages.length} MESSAGES</b></div>
          <div className="bf-public-chat-messages" aria-live="polite">
            {chatMessages.length ? chatMessages.map((message) => (
              <article className="bf-public-chat-message" key={message.id}>
                <div className="bf-public-chat-message-meta">
                  <strong>{message.author || 'viewer'}</strong>
                  <span>{String(message.source || 'website').toUpperCase()}</span>
                  {message.influence && message.influence !== 'chat' ? <b>{message.influence === 'line' ? 'LINE SEED' : 'EPISODE SEED'}</b> : null}
                </div>
                <p>{message.text}</p>
              </article>
            )) : <p className="bf-public-chat-empty">No audience messages yet. The factory chat is waiting for somebody to make it worse.</p>}
          </div>
          <form className="bf-public-chat-form" onSubmit={sendChat}>
            <input aria-label="Chat name" autoComplete="nickname" maxLength={32} onChange={(event) => setChatName(event.target.value)} placeholder="NAME" value={chatName} />
            <input aria-label="Chat message" maxLength={240} onChange={(event) => setChatText(event.target.value)} placeholder="Say something..." value={chatText} />
            <button type="submit" disabled={chatBusy || !chatText.trim()}>{chatBusy ? '...' : 'SEND'}</button>
          </form>
          <p className="bf-public-chat-help">CHAT IS VISIBLE. USE <code>!bf</code> FOR AN EPISODE SEED OR <code>!line</code> FOR A LINE SEED. GOBLIN TRANSFORMS SUGGESTIONS; NOTHING POSTS TO DISCORD AUTOMATICALLY.</p>
          <p className="bf-public-chat-status" role="status">{chatStatus}</p>
        </aside>
      </section>

      <section className="bf-public-cast" aria-label="Bullshit Factory cast">
        <div className="bf-public-cast-heading"><span className="bf-public-label">THE FLOOR CREW</span><p>Idle portraits only. They move when a finished cut says they should.</p></div>
        <div className="bf-public-cast-rail">
          {factoryCast.map((character) => (
            <figure className="bf-public-cast-card" key={character.id}>
              <div><img src={character.preview} alt="" /></div>
              <figcaption><b>{character.displayName}</b><small>{character.isDog ? 'BARK ONLY' : character.department.toUpperCase()}</small></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="bf-public-footer"><span>GOBLIN SUGGESTIONS: EXPLICITLY CALLED ONLY</span><span>NO AUTONOMOUS DISCORD POSTING // ORIGINAL MUSIC PIPELINE</span><small>{lastSyncedAt ? "PLAYLIST AUTO-SYNCED " + new Date(lastSyncedAt).toLocaleTimeString() : "PLAYLIST SYNC CONNECTING"}</small></footer>
    </main>
  );
}
