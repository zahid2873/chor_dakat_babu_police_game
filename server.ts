import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Types
export type RoleType = 'babu' | 'police' | 'dakat' | 'chor';

export interface RoomPlayer {
  id: string;
  name: string;
  avatarEmoji: string;
  seatIndex: number;
  isBot: boolean;
  role: RoleType;
  hasSeenChit: boolean;
  currentReaction: string;
  currentDialogue: string;
  scoreHistory: number[];
  totalScore: number;
}

export interface GameRoom {
  id: string;
  name: string;
  isPublic: boolean;
  hostPlayerId: string;
  totalRounds: number;
  currentRound: number;
  status: 'waiting' | 'playing' | 'scoreboard' | 'finished';
  roundPhase: 'unfold' | 'babuCall' | 'policeSalute' | 'interrogation' | 'resolved';
  players: RoomPlayer[];
  targetRoleToCatch: 'chor' | 'dakat';
  babuDeclared: boolean;
  policeDeclared: boolean;
  accusedPlayerId: string | null;
  isCorrectGuess: boolean;
  createdAt: number;
}

// In-Memory Database for active rooms and sockets
const rooms = new Map<string, GameRoom>();
const clientSockets = new Map<string, WebSocket>(); // socketId -> ws
const clientRooms = new Map<string, string>(); // socketId -> roomId
const matchmakingQueue: { playerId: string; name: string; avatarEmoji: string; ws: WebSocket }[] = [];

// Seed default AI Bot players
const BOT_NAMES = ['রহিম (বট)', 'করিম (বট)', 'ফাতেমা (বট)', 'সুজন (বট)'];
const BOT_EMOJIS = ['👦', '🧔', '👧', '🧑'];

const BLUFF_REACTIONS = [
  'ঘাম মুছে স্বাভাবিক থাকার চেষ্টা...',
  'চোখ পিটপিট করে আশেপাশে তাকাচ্ছে...',
  'মুচকি হেসে আত্মবিশ্বাস দেখাচ্ছে...',
  'দারোগার দিকে তাকিয়ে মৃদু কাঁপছে...',
  'গভীর চিন্তায় মগ্ন ভাব দেখাচ্ছে...',
  'একেবারে সাধু সন্ন্যাসীর মতো নিষ্পাপ মুখ!',
];

const BLUFF_DIALOGUES: Record<RoleType, string[]> = {
  babu: [
    'আমি বাবু মশাই! আমার টাকা পয়সা সব সিন্দুকে বন্দি!',
    'দারোগা বাবু! আমার দরবারে চোর-ডাকাতের কোনো স্থান নেই!',
    'কে আমার পুলিশ? সামনে এসে আসামীকে সনাক্ত করো!',
  ],
  police: [
    'হুজুর, আমি আপনার পুলিশ! এক পলকে চোর-ডাকাত ধরে ফেলব!',
    'কারো চোখের দিকে তাকিয়েই আমি বলে দিতে পারি সে অপরাধী কি না!',
    'কাঁপবেন না! সত্যি কথা বলে ফেলুন!',
  ],
  dakat: [
    'আমি তো সামান্য নিরীহ পথিক, ডাকাত কোথায় পেলেন? 😅',
    'চোরের মার বড় গলা, পাশের জনের দিকে তাকান! 👀',
    'আমাকে ডাকাত ভাবলে মস্ত ভুল করবেন দারোগা বাবু! 😏',
  ],
  chor: [
    'ভাই আমি নিরীহ ছাত্র! জীবনে একটা মাছিও মারিনি! 🥺',
    'চোরের মার বড় গলা! ওনার চোখের দিকে তাকান! 👀',
    'দারোগা ভাই, আমার পকেট সার্চ করেন, কিচ্ছু নেই! 🏃‍♂️',
    'আমি তো সকাল থেকে স্কুলে অঙ্ক খাতা লিখছি! 📝',
  ],
};

function shuffleRoles(): RoleType[] {
  const roles: RoleType[] = ['babu', 'police', 'dakat', 'chor'];
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

function dealRound(room: GameRoom) {
  const roles = shuffleRoles();
  room.players.forEach((p, idx) => {
    p.role = roles[idx];
    p.hasSeenChit = p.isBot; // bots automatically see
    p.currentReaction = BLUFF_REACTIONS[Math.floor(Math.random() * BLUFF_REACTIONS.length)];
    const quotes = BLUFF_DIALOGUES[p.role];
    p.currentDialogue = quotes[Math.floor(Math.random() * quotes.length)];
  });

  room.babuDeclared = false;
  room.policeDeclared = false;
  room.accusedPlayerId = null;
  room.isCorrectGuess = false;
  room.roundPhase = 'unfold';
}

function broadcastRoomState(room: GameRoom) {
  const payload = JSON.stringify({ type: 'ROOM_STATE', room });
  room.players.forEach((p) => {
    if (!p.isBot) {
      const ws = clientSockets.get(p.id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  });
}

// REST APIs
// 1. Search for public open rooms
app.get('/api/rooms/search', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  const availableRooms: { id: string; name: string; playersCount: number; status: string }[] = [];

  rooms.forEach((room) => {
    if (room.isPublic) {
      if (!query || room.name.toLowerCase().includes(query) || room.id.toLowerCase().includes(query)) {
        availableRooms.push({
          id: room.id,
          name: room.name,
          playersCount: room.players.filter((p) => !p.isBot).length,
          status: room.status,
        });
      }
    }
  });

  res.json({ rooms: availableRooms });
});

// WebSocket Connection Handler
wss.on('connection', (ws: WebSocket) => {
  let boundPlayerId: string | null = null;

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw);

      // 1. Create Room
      if (data.type === 'CREATE_ROOM') {
        const { roomName, hostPlayer, totalRounds, isPublic, fillWithBots } = data;
        const roomId = 'CP' + Math.floor(1000 + Math.random() * 9000);

        boundPlayerId = hostPlayer.id;
        clientSockets.set(hostPlayer.id, ws);
        clientRooms.set(hostPlayer.id, roomId);

        const players: RoomPlayer[] = [
          {
            id: hostPlayer.id,
            name: hostPlayer.name || 'আপনি',
            avatarEmoji: hostPlayer.avatarEmoji || '🧑‍🎓',
            seatIndex: 0,
            isBot: false,
            role: 'babu',
            hasSeenChit: false,
            currentReaction: '',
            currentDialogue: '',
            scoreHistory: [],
            totalScore: 0,
          },
        ];

        // Fill remaining seats with bots if requested
        if (fillWithBots) {
          for (let i = 1; i <= 3; i++) {
            players.push({
              id: `bot-${roomId}-${i}`,
              name: BOT_NAMES[i - 1],
              avatarEmoji: BOT_EMOJIS[i - 1],
              seatIndex: i,
              isBot: true,
              role: 'babu',
              hasSeenChit: true,
              currentReaction: '',
              currentDialogue: '',
              scoreHistory: [],
              totalScore: 0,
            });
          }
        }

        const newRoom: GameRoom = {
          id: roomId,
          name: roomName || `${hostPlayer.name}-এর বেঞ্চ`,
          isPublic: isPublic ?? true,
          hostPlayerId: hostPlayer.id,
          totalRounds: totalRounds || 5,
          currentRound: 1,
          status: fillWithBots ? 'playing' : 'waiting',
          roundPhase: 'unfold',
          players,
          targetRoleToCatch: 'chor',
          babuDeclared: false,
          policeDeclared: false,
          accusedPlayerId: null,
          isCorrectGuess: false,
          createdAt: Date.now(),
        };

        if (fillWithBots) {
          dealRound(newRoom);
        }

        rooms.set(roomId, newRoom);
        broadcastRoomState(newRoom);
      }

      // 2. Join Room
      else if (data.type === 'JOIN_ROOM') {
        const { roomId, player } = data;
        const room = rooms.get(roomId.toUpperCase().trim());

        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'রুম কোড খুঁজে পাওয়া যায়নি!' }));
          return;
        }

        boundPlayerId = player.id;
        clientSockets.set(player.id, ws);
        clientRooms.set(player.id, room.id);

        // Check if already in room
        const existingIdx = room.players.findIndex((p) => p.id === player.id);
        if (existingIdx !== -1) {
          room.players[existingIdx].name = player.name;
          broadcastRoomState(room);
          return;
        }

        // Find empty slot or replace bot slot
        const emptySeatIndex = room.players.findIndex((p) => p.isBot);
        if (emptySeatIndex !== -1) {
          room.players[emptySeatIndex] = {
            id: player.id,
            name: player.name,
            avatarEmoji: player.avatarEmoji || '🧑',
            seatIndex: emptySeatIndex,
            isBot: false,
            role: room.players[emptySeatIndex].role,
            hasSeenChit: false,
            currentReaction: '',
            currentDialogue: '',
            scoreHistory: room.players[emptySeatIndex].scoreHistory,
            totalScore: room.players[emptySeatIndex].totalScore,
          };
        } else if (room.players.length < 4) {
          room.players.push({
            id: player.id,
            name: player.name,
            avatarEmoji: player.avatarEmoji || '🧑',
            seatIndex: room.players.length,
            isBot: false,
            role: 'babu',
            hasSeenChit: false,
            currentReaction: '',
            currentDialogue: '',
            scoreHistory: [],
            totalScore: 0,
          });
        } else {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'এই রুমটি ৪ জন দিয়ে পূর্ণ হয়ে গেছে!' }));
          return;
        }

        broadcastRoomState(room);
      }

      // 3. Random Matchmaking Queue
      else if (data.type === 'JOIN_MATCHMAKING') {
        const { player } = data;
        boundPlayerId = player.id;
        clientSockets.set(player.id, ws);

        // Avoid duplicate queue entry
        const existingQueueIdx = matchmakingQueue.findIndex((q) => q.playerId === player.id);
        if (existingQueueIdx !== -1) {
          matchmakingQueue[existingQueueIdx].ws = ws;
        } else {
          matchmakingQueue.push({
            playerId: player.id,
            name: player.name,
            avatarEmoji: player.avatarEmoji,
            ws,
          });
        }

        // When 4 players are in queue, create room instantly!
        if (matchmakingQueue.length >= 4) {
          const matched = matchmakingQueue.splice(0, 4);
          const roomId = 'CP' + Math.floor(1000 + Math.random() * 9000);

          const players: RoomPlayer[] = matched.map((m, idx) => ({
            id: m.playerId,
            name: m.name,
            avatarEmoji: m.avatarEmoji,
            seatIndex: idx,
            isBot: false,
            role: 'babu',
            hasSeenChit: false,
            currentReaction: '',
            currentDialogue: '',
            scoreHistory: [],
            totalScore: 0,
          }));

          const room: GameRoom = {
            id: roomId,
            name: 'অনলাইন র্যান্ডম ম্যাচ',
            isPublic: true,
            hostPlayerId: players[0].id,
            totalRounds: 5,
            currentRound: 1,
            status: 'playing',
            roundPhase: 'unfold',
            players,
            targetRoleToCatch: 'chor',
            babuDeclared: false,
            policeDeclared: false,
            accusedPlayerId: null,
            isCorrectGuess: false,
            createdAt: Date.now(),
          };

          dealRound(room);
          rooms.set(roomId, room);

          matched.forEach((m) => {
            clientRooms.set(m.playerId, roomId);
          });

          broadcastRoomState(room);
        } else {
          ws.send(
            JSON.stringify({
              type: 'MATCHMAKING_STATUS',
              waitingCount: matchmakingQueue.length,
              requiredCount: 4,
            })
          );
        }
      }

      // 4. Start Game
      else if (data.type === 'START_GAME') {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (!room) return;

        // Fill remaining with bots if less than 4
        while (room.players.length < 4) {
          const idx = room.players.length;
          room.players.push({
            id: `bot-${roomId}-${idx}`,
            name: BOT_NAMES[idx - 1],
            avatarEmoji: BOT_EMOJIS[idx - 1],
            seatIndex: idx,
            isBot: true,
            role: 'babu',
            hasSeenChit: true,
            currentReaction: '',
            currentDialogue: '',
            scoreHistory: [],
            totalScore: 0,
          });
        }

        room.status = 'playing';
        room.currentRound = 1;
        dealRound(room);
        broadcastRoomState(room);
      }

      // 5. Open Chit
      else if (data.type === 'OPEN_CHIT') {
        const { roomId, playerId } = data;
        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          player.hasSeenChit = true;
          broadcastRoomState(room);
        }
      }

      // 6. Babu Declare
      else if (data.type === 'BABU_DECLARE') {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (!room) return;

        room.babuDeclared = true;
        room.roundPhase = 'babuCall';
        broadcastRoomState(room);
      }

      // 7. Police Step Forward
      else if (data.type === 'POLICE_STEP_FORWARD') {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (!room) return;

        room.policeDeclared = true;
        room.roundPhase = 'interrogation';
        broadcastRoomState(room);
      }

      // 8. Set Target Role
      else if (data.type === 'SET_TARGET_ROLE') {
        const { roomId, targetRole } = data;
        const room = rooms.get(roomId);
        if (!room) return;

        room.targetRoleToCatch = targetRole;
        broadcastRoomState(room);
      }

      // 9. Accuse Suspect
      else if (data.type === 'ACCUSE_SUSPECT') {
        const { roomId, suspectPlayerId } = data;
        const room = rooms.get(roomId);
        if (!room) return;

        const accused = room.players.find((p) => p.id === suspectPlayerId);
        if (!accused) return;

        room.accusedPlayerId = suspectPlayerId;
        room.isCorrectGuess = accused.role === room.targetRoleToCatch;
        room.roundPhase = 'resolved';

        // Automatically calculate and record scores in Score Khata immediately
        room.players.forEach((p) => {
          let earned = 0;
          if (p.role === 'babu') {
            earned = 1000;
          } else if (p.role === 'police') {
            earned = room.isCorrectGuess ? 500 : 0;
          } else if (p.role === 'dakat') {
            if (room.targetRoleToCatch === 'dakat' && room.isCorrectGuess && p.id === room.accusedPlayerId) {
              earned = 0;
            } else {
              earned = 400;
            }
          } else if (p.role === 'chor') {
            if (room.targetRoleToCatch === 'chor' && room.isCorrectGuess && p.id === room.accusedPlayerId) {
              earned = 0;
            } else {
              earned = 100;
            }
          }

          p.scoreHistory.push(earned);
          p.totalScore += earned;
        });

        broadcastRoomState(room);
      }

      // 10. Next Round
      else if (data.type === 'NEXT_ROUND') {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (!room) return;

        if (room.currentRound >= room.totalRounds) {
          room.status = 'finished';
        } else {
          room.currentRound += 1;
          dealRound(room);
        }

        broadcastRoomState(room);
      }
    } catch (err) {
      console.error('WebSocket Error:', err);
    }
  });

  ws.on('close', () => {
    if (boundPlayerId) {
      clientSockets.delete(boundPlayerId);
      const qIdx = matchmakingQueue.findIndex((q) => q.playerId === boundPlayerId);
      if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);
    }
  });
});

// Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Chor Police Real-Time Server running on port ${PORT}`);
  });
}

startServer();
