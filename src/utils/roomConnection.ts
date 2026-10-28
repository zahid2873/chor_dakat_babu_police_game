// HTTP polling connection to the online rooms API (netlify/functions/rooms.ts).
// Mirrors the small subset of the WebSocket interface the app uses, so
// actions are sent with `send(json)` and server updates arrive via `onmessage`.

const POLL_INTERVAL_MS = 2000;

export class RoomConnection {
  static readonly OPEN = 1;
  readyState = RoomConnection.OPEN;
  onmessage: ((event: { data: string }) => void) | null = null;

  private roomId: string | null = null;
  private matchmaking = false;
  private lastRoomStamp: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private playerId: string) {
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  send(raw: string) {
    const data = JSON.parse(raw);
    if (data.type === 'JOIN_MATCHMAKING') this.matchmaking = true;
    if (data.type === 'LEAVE_MATCHMAKING') this.matchmaking = false;
    fetch('/api/rooms/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw,
    })
      .then((res) => res.json())
      .then((msg) => this.dispatch(msg, true))
      .catch((err) => console.warn('Room action failed:', err));
  }

  leaveRoom() {
    this.roomId = null;
    this.lastRoomStamp = null;
  }

  close() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.readyState = 3;
  }

  private async poll() {
    if (!this.roomId && !this.matchmaking) return;
    const params = new URLSearchParams({ playerId: this.playerId });
    if (this.roomId) params.set('roomId', this.roomId);
    try {
      const res = await fetch(`/api/rooms/state?${params}`);
      this.dispatch(await res.json(), false);
    } catch {
      // Transient network error; try again on next tick
    }
  }

  private dispatch(msg: any, fromAction: boolean) {
    if (!msg || this.readyState !== RoomConnection.OPEN) return;
    if (msg.type === 'ROOM_STATE' && msg.room) {
      this.roomId = msg.room.id;
      this.matchmaking = false;
      const stamp = `${msg.room.id}:${msg.room.updatedAt}`;
      if (!fromAction && stamp === this.lastRoomStamp) return;
      this.lastRoomStamp = stamp;
    } else if (msg.type === 'MATCHMAKING_STATUS') {
      if (!this.matchmaking) return;
    } else if (msg.type === 'ERROR') {
      if (!fromAction) return;
    } else {
      return;
    }
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
}
