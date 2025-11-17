# Scrabble Server (WebSockets, Socket.IO, real dictionary)

Authoritative game server for the Scrabble-like game.

## Features

- 15x15 Scrabble board with real bonus squares (DW, TW, DL, TL)
- Letter bag & racks
- Turn-based play (server-enforced)
- Move validation:
  - Straight line (row or column)
  - First move must hit center
  - Subsequent moves must connect to existing tiles
  - Main word & all cross words must be valid
- Scoring:
  - Letter & word bonuses applied correctly (only for newly placed tiles)
  - Cross words fully scored
- Uses the **`word-list` npm package** as a dictionary source (not just a local text file)

## Quick start

```bash
cd scrabble-server
cp .env.example .env
npm install
npm run dev
```

The server runs on http://localhost:4000 by default.
