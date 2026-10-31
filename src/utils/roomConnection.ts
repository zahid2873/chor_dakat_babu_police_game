// HTTP polling connection to the online rooms API (netlify/functions/rooms.ts).
// Actions are sent with `send(action)`; server updates arrive via `onmessage`.

export const ROOMS_API = '/api/rooms';

const POLL_IN_ROOM_MS = 1200;
const POLL_MATCHMAKING_MS = 2000;
const FAILURES_BEFORE_OFFLINE = 3;

export type RoomMessage =
  | { type: 'ROOM_STATE'; room: any }
  | { type: 'MATCHMAKING_STATUS'; waitingCount: number }
  | { type: 'ERROR'; message: string };

export class RoomConnection {
  onmessage: ((msg: RoomMessage) => void) | null = null;
  onstatus: ((online: boolean) => void) | null = null;
  /** serverNow - Date.now(), so countdowns agree across devices */
  serverOffset = 0;

  private roomId: string | null = null;
  private matchmaking = false;
  private lastRoomStamp: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private polling = false;
  private failures = 0;

  constructor(private playerId: string) {
    document.addEventListener('visibilitychange', this.onVisibility);
    this.schedule();
  }

  get inRoom() {
    return this.roomId !== null;
  }

  serverNow() {
    return Date.now() + this.serverOffset;
  }

  send(action: Record<string, unknown>) {
    if (action.type === 'JOIN_MATCHMAKING') this.matchmaking = true;
    if (action.type === 'LEAVE_MATCHMAKING') this.matchmaking = false;
    fetch(`${ROOMS_API}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...action, playerId: this.playerId }),
    })
      .then((res) => res.json())
      .then((msg) => {
        this.setOnline(true);
        this.dispatch(msg, true);
      })
      .catch(() => {
        if (action.type === 'JOIN_MATCHMAKING') this.matchmaking = false;
        // Ticks are retried automatically; don't nag about them
        if (action.type === 'TICK') return;
        this.dispatch(
          { type: 'ERROR', message: 'অনলাইন সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।' },
          true
        );
      });
  }

  leaveRoom() {
    if (this.roomId) {
      // Fire-and-forget: the reply would re-enter the room we're leaving
      fetch(`${ROOMS_API}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'LEAVE_ROOM', roomId: this.roomId, playerId: this.playerId }),
        keepalive: true,
      }).catch(() => {});
    }
    this.roomId = null;
    this.lastRoomStamp = null;
    this.matchmaking = false;
    this.setOnline(true);
  }

  close() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.closed = true;
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private schedule() {
    if (this.closed) return;
    const delay = this.roomId ? POLL_IN_ROOM_MS : POLL_MATCHMAKING_MS;
    this.timer = setTimeout(async () => {
      await this.poll();
      this.schedule();
    }, delay);
  }

  // Refresh as soon as the tab is visible again instead of waiting a tick.
  private onVisibility = () => {
    if (document.visibilityState === 'visible') this.poll();
  };

  private setOnline(online: boolean) {
    this.failures = online ? 0 : this.failures + 1;
    if (online || this.failures === FAILURES_BEFORE_OFFLINE) this.onstatus?.(online);
  }

  private async poll() {
    if (this.polling || document.visibilityState === 'hidden') return;
    if (!this.roomId && !this.matchmaking) return;
    const params = new URLSearchParams({ playerId: this.playerId });
    if (this.roomId) params.set('roomId', this.roomId);
    this.polling = true;
    try {
      const res = await fetch(`${ROOMS_API}/state?${params}`);
      if (!res.ok) throw new Error(String(res.status));
      const msg = await res.json();
      this.setOnline(true);
      this.dispatch(msg, false);
    } catch {
      this.setOnline(false);
    } finally {
      this.polling = false;
    }
  }

  private dispatch(msg: any, fromAction: boolean) {
    if (!msg || this.closed) return;
    if (msg.type === 'ROOM_STATE' && msg.room) {
      // Ignore polls for a room we've already left (matchmaking may hand us a new one)
      if (!fromAction && !this.matchmaking && this.roomId !== msg.room.id) return;
      if (typeof msg.room.serverNow === 'number') this.serverOffset = msg.room.serverNow - Date.now();
      this.roomId = msg.room.id;
      this.matchmaking = false;
      // Presence and reactions change without bumping updatedAt
      const presence = msg.room.players.map((p: any) => (p.online ? 1 : 0)).join('');
      const stamp = `${msg.room.id}:${msg.room.updatedAt}:${presence}:${(msg.room.reactions || []).length}`;
      if (!fromAction && stamp === this.lastRoomStamp) return;
      this.lastRoomStamp = stamp;
    } else if (msg.type === 'MATCHMAKING_STATUS') {
      if (!this.matchmaking) return;
    } else if (msg.type === 'ERROR') {
      if (!fromAction) return;
    } else {
      return;
    }
    this.onmessage?.(msg);
  }
}
