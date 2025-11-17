import { Server, Socket } from 'socket.io';
import fs from 'fs';
import wordListPath from 'word-list';

type Bonus = 'TW' | 'DW' | 'TL' | 'DL' | 'NONE';

type Cell = { letter: string | null; bonus: Bonus };
type Board = Cell[][];
type Rack = string[];
type Scores = Record<string, number>;

type Player = {
  socketId: string;
  playerId: string;
  name: string;
  rack: Rack;
};

type ChatItem = { name: string; message: string; timestamp: number };

type Game = {
  id: string;
  board: Board;
  bag: string[];
  players: Player[];
  turnIndex: number;
  scores: Scores; // keyed by playerId
  started: boolean;
  chat: ChatItem[];
};

const LETTER_COUNTS: Record<string, number> = {
  E:12, A:9, I:9, O:8, N:6, R:6, T:6, L:4, S:4, U:4,
  D:4, G:3, B:2, C:2, M:2, P:2, F:2, H:2, V:2, W:2, Y:2,
  K:1, J:1, X:1, Q:1, Z:1
};

const LETTER_SCORES: Record<string, number> = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,
  O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10
};

const BONUS_LAYOUT: Record<Bonus, string[]> = {
  TW: [
    "0,0","0,7","0,14","7,0","7,14","14,0","14,7","14,14"
  ],
  DW: [
    "1,1","2,2","3,3","4,4","10,10","11,11","12,12","13,13",
    "1,13","2,12","3,11","4,10","10,4","11,3","12,2","13,1","7,7"
  ],
  TL: [
    "1,5","1,9","5,1","5,5","5,9","5,13",
    "9,1","9,5","9,9","9,13","13,5","13,9"
  ],
  DL: [
    "0,3","0,11","2,6","2,8","3,0","3,7","3,14",
    "6,2","6,6","6,8","6,12","7,3","7,11",
    "8,2","8,6","8,8","8,12","11,0","11,7","11,14","12,6","12,8","14,3","14,11"
  ],
  "NONE": []
};

function coordKey(r: number, c: number): string {
  return `${r},${c}`;
}

function getBonus(r: number, c: number): Bonus {
  for (const [bonus, coords] of Object.entries(BONUS_LAYOUT) as [Bonus, string[]][]) {
    if (coords.includes(coordKey(r, c))) return bonus;
  }
  return "NONE";
}

function newBoard(): Board {
  const board: Board = [];
  for (let r = 0; r < 15; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < 15; c++) {
      row.push({ letter: null, bonus: getBonus(r, c) });
    }
    board.push(row);
  }
  return board;
}

function buildBag(): string[] {
  const bag: string[] = [];
  for (const [letter, count] of Object.entries(LETTER_COUNTS)) {
    for (let i = 0; i < count; i++) bag.push(letter);
  }
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function drawLetters(bag: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n && bag.length; i++) {
    out.push(bag.pop()!);
  }
  return out;
}

type Placement = { r: number; c: number; letter: string };

export class GameManager {
  private io: Server;
  private games: Map<string, Game> = new Map();
  private wordSet: Set<string>;

  constructor(io: Server) {
    this.io = io;

    const listPath = wordListPath as unknown as string;
    let raw = '';
    try {
      raw = fs.readFileSync(listPath, 'utf-8');
      console.log('Loaded dictionary from word-list package.');
    } catch (e) {
      console.warn('Failed to load word-list dictionary; word validation will be very limited.', e);
    }
    this.wordSet = new Set(
      raw
        .split(/\r?\n/)
        .map(w => w.trim().toUpperCase())
        .filter(Boolean)
    );
  }

  private getOrCreateGame(id: string): Game {
    let g = this.games.get(id);
    if (!g) {
      g = {
        id,
        board: newBoard(),
        bag: buildBag(),
        players: [],
        turnIndex: 0,
        scores: {},
        started: false,
        chat: []
      };
      this.games.set(id, g);
    }
    return g;
  }

  joinGame(socket: Socket, gameId: string, name: string, playerId: string) {
    const game = this.getOrCreateGame(gameId);
    let player = game.players.find(p => p.playerId === playerId);
    if (!player) {
      player = {
        socketId: socket.id,
        playerId,
        name,
        rack: drawLetters(game.bag, 7)
      };
      game.players.push(player);
      if (game.scores[playerId] === undefined) {
        game.scores[playerId] = 0;
      }
      this.io.to(gameId).emit('system', { message: `${name} joined.` });
    } else {
      player.socketId = socket.id;
      player.name = name;
      this.io.to(game.id).emit('system', { message: `${name} reconnected.` });
    }

    socket.join(gameId);
    this.pushState(gameId);
  }

  disconnect(socket: Socket) {
    for (const game of this.games.values()) {
      const player = game.players.find(p => p.socketId === socket.id);
      if (player) {
        this.io.to(game.id).emit('system', { message: `${player.name} disconnected.` });
      }
    }
  }

  private isPlayersTurn(game: Game, playerId: string) {
    return game.players[game.turnIndex]?.playerId === playerId;
  }

  private getPlayerBySocket(game: Game, socketId: string): Player | undefined {
    return game.players.find(p => p.socketId === socketId);
  }

  private validateAndScoreMove(game: Game, placements: Placement[], player: Player) {
    if (placements.length === 0) return { ok: false, error: 'No tiles placed.' };

    for (const pl of placements) {
      if (pl.r < 0 || pl.r >= 15 || pl.c < 0 || pl.c >= 15) {
        return { ok: false, error: 'Placement out of bounds.' };
      }
      if (game.board[pl.r][pl.c].letter) {
        return { ok: false, error: 'Cannot place on occupied cell.' };
      }
    }

    const rackCopy = [...player.rack];
    for (const pl of placements) {
      const L = pl.letter.toUpperCase();
      const idx = rackCopy.indexOf(L);
      if (idx === -1) {
        return { ok: false, error: `You do not have letter ${L}.` };
      }
      rackCopy.splice(idx, 1);
    }

    const rows = new Set(placements.map(p => p.r));
    const cols = new Set(placements.map(p => p.c));
    const sameRow = rows.size === 1;
    const sameCol = cols.size === 1;
    if (!sameRow && !sameCol) {
      return { ok: false, error: 'Tiles must be in a straight line.' };
    }

    const isBoardEmpty = game.board.every(row => row.every(cell => !cell.letter));
    const center = { r: 7, c: 7 };

    if (isBoardEmpty) {
      if (!placements.find(p => p.r === center.r && p.c === center.c)) {
        return { ok: false, error: 'First move must cover the center square.' };
      }
    } else {
      let touchesExisting = false;
      for (const pl of placements) {
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]] as const;
        for (const [dr,dc] of dirs) {
          const nr = pl.r + dr;
          const nc = pl.c + dc;
          if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && game.board[nr][nc].letter) {
            touchesExisting = true;
            break;
          }
        }
        if (touchesExisting) break;
      }
      if (!touchesExisting) {
        return { ok: false, error: 'Move must connect to existing tiles.' };
      }
    }

    const boardCopy: Board = game.board.map(row => row.map(cell => ({ ...cell })));
    const placedSet = new Set(placements.map(p => coordKey(p.r, p.c)));
    for (const pl of placements) {
      boardCopy[pl.r][pl.c].letter = pl.letter.toUpperCase();
    }

    const words: string[] = [];
    let totalScore = 0;

    function scoreWord(cells: { r: number; c: number; letter: string }[]): number {
      let wordMult = 1;
      let sum = 0;
      for (const { r, c, letter } of cells) {
        const base = LETTER_SCORES[letter.toUpperCase()] || 0;
        const key = coordKey(r, c);
        const isNew = placedSet.has(key);
        let letterMult = 1;
        if (isNew) {
          const bonus = boardCopy[r][c].bonus;
          if (bonus === 'DL') letterMult = 2;
          if (bonus === 'TL') letterMult = 3;
          if (bonus === 'DW') wordMult *= 2;
          if (bonus === 'TW') wordMult *= 3;
        }
        sum += base * letterMult;
      }
      return sum * wordMult;
    }

    let mainCells: { r: number; c: number; letter: string }[] = [];
    if (sameRow) {
      const r = [...rows][0];
      const cs = placements.map(p => p.c);
      const minC = Math.min(...cs);
      const maxC = Math.max(...cs);
      for (let c = minC; c <= maxC; c++) {
        if (!boardCopy[r][c].letter) {
          return { ok: false, error: 'Main word must be contiguous.' };
        }
      }
      let startC = minC;
      while (startC > 0 && boardCopy[r][startC - 1].letter) startC--;
      let endC = maxC;
      while (endC < 14 && boardCopy[r][endC + 1].letter) endC++;
      for (let c = startC; c <= endC; c++) {
        const letter = boardCopy[r][c].letter;
        if (letter) mainCells.push({ r, c, letter });
      }
    } else if (sameCol) {
      const c = [...cols][0];
      const rs = placements.map(p => p.r);
      const minR = Math.min(...rs);
      const maxR = Math.max(...rs);
      for (let r = minR; r <= maxR; r++) {
        if (!boardCopy[r][c].letter) {
          return { ok: false, error: 'Main word must be contiguous.' };
        }
      }
      let startR = minR;
      while (startR > 0 && boardCopy[startR - 1][c].letter) startR--;
      let endR = maxR;
      while (endR < 14 && boardCopy[endR + 1][c].letter) endR++;
      for (let r = startR; r <= endR; r++) {
        const letter = boardCopy[r][c].letter;
        if (letter) mainCells.push({ r, c, letter });
      }
    }

    const mainWord = mainCells.map(c => c.letter).join('');

    const checkWord = (w: string) => {
      if (w.length < 2) return true;
      if (this.wordSet.size === 0) return true;
      return this.wordSet.has(w.toUpperCase());
    };

    if (mainWord.length < 2 && !isBoardEmpty) {
      return { ok: false, error: 'Main word too short.' };
    }
    if (mainWord.length >= 2) {
      if (!checkWord(mainWord)) {
        return { ok: false, error: `Main word "${mainWord}" not in dictionary.` };
      }
      words.push(mainWord);
      totalScore += scoreWord(mainCells);
    }

    for (const pl of placements) {
      const r = pl.r;
      const c = pl.c;
      if (sameRow) {
        let startR = r;
        while (startR > 0 && boardCopy[startR - 1][c].letter) startR--;
        let endR = r;
        while (endR < 14 && boardCopy[endR + 1][c].letter) endR++;
        if (endR - startR >= 1) {
          const cells: { r:number;c:number;letter:string }[] = [];
          for (let rr = startR; rr <= endR; rr++) {
            const letter = boardCopy[rr][c].letter;
            if (letter) cells.push({ r: rr, c, letter });
          }
          const w = cells.map(x => x.letter).join('');
          if (w.length >= 2) {
            if (!checkWord(w)) {
              return { ok: false, error: `Cross word "${w}" not in dictionary.` };
            }
            words.push(w);
            totalScore += scoreWord(cells);
          }
        }
      } else if (sameCol) {
        let startC = c;
        while (startC > 0 && boardCopy[r][startC - 1].letter) startC--;
        let endC = c;
        while (endC < 14 && boardCopy[r][endC + 1].letter) endC++;
        if (endC - startC >= 1) {
          const cells: { r:number;c:number;letter:string }[] = [];
          for (let cc = startC; cc <= endC; cc++) {
            const letter = boardCopy[r][cc].letter;
            if (letter) cells.push({ r, c: cc, letter });
          }
          const w = cells.map(x => x.letter).join('');
          if (w.length >= 2) {
            if (!checkWord(w)) {
              return { ok: false, error: `Cross word "${w}" not in dictionary.` };
            }
            words.push(w);
            totalScore += scoreWord(cells);
          }
        }
      }
    }

    if (words.length === 0 && !isBoardEmpty) {
      return { ok: false, error: 'Move must create at least one valid word.' };
    }

    return { ok: true, score: totalScore, words };
  }

  placeTiles(socket: Socket, payload: { gameId: string; placements: Placement[] }) {
    const { gameId, placements } = payload;
    const game = this.games.get(gameId);
    if (!game) return;

    const player = this.getPlayerBySocket(game, socket.id);
    if (!player) return;

    if (!this.isPlayersTurn(game, player.playerId)) {
      this.io.to(socket.id).emit('error_msg', { message: 'Not your turn.' });
      return;
    }

    const result = this.validateAndScoreMove(game, placements, player);
    if (!result.ok) {
      this.io.to(socket.id).emit('error_msg', { message: result.error });
      return;
    }

    for (const pl of placements) {
      const L = pl.letter.toUpperCase();
      game.board[pl.r][pl.c].letter = L;
      const idx = player.rack.indexOf(L);
      if (idx >= 0) player.rack.splice(idx, 1);
    }

    const drawn = drawLetters(game.bag, 7 - player.rack.length);
    player.rack.push(...drawn);

    const scoreDelta = result.score || 0;
    game.scores[player.playerId] = (game.scores[player.playerId] || 0) + scoreDelta;
    game.started = true;
    game.turnIndex = (game.turnIndex + 1) % game.players.length;

    this.io.to(gameId).emit('move_played', {
      by: player.name,
      placements,
      scoreDelta,
      words: result.words || []
    });
    this.pushState(gameId);
  }

  chat(socket: Socket, gameId: string, message: string) {
    const game = this.games.get(gameId);
    if (!game) return;
    const player = this.getPlayerBySocket(game, socket.id);
    const name = player?.name || 'Anon';
    const item: ChatItem = { name, message, timestamp: Date.now() };
    game.chat.push(item);
    this.io.to(gameId).emit('chat_message', item);
  }

  pushState(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) return;
    const publicPlayers = game.players.map(p => ({
      socketId: p.socketId,
      playerId: p.playerId,
      name: p.name,
      rackCount: p.rack.length
    }));
    this.io.to(gameId).emit('game_state', {
      id: game.id,
      board: game.board,
      players: publicPlayers,
      currentPlayerId: game.players[game.turnIndex]?.playerId || null,
      scores: game.scores,
      bagCount: game.bag.length,
      chat: game.chat,
      started: game.started
    });
    for (const p of game.players) {
      this.io.to(p.socketId).emit('your_rack', p.rack);
    }
  }
}
