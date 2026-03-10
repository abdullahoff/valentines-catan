# Valentine's Catan 💕

A Valentine's Day themed Catan game built for Noor. Play as Noor against three AI opponents (Abdullah, Dequavious, and Jay Quellin) on a love-themed board where you collect Chocolates, Roses, Teddy Bears, Love Letters, and Diamonds to build Date Spots and Dream Homes.

Win the game and earn Love Points to spend in the Prize Shop!

## How to Play

Open `index.html` in a browser. That's it — no build step, no dependencies.

### Game Rules

Standard Catan rules with a Valentine's twist:

| Catan | Valentine's Catan |
|-------|-------------------|
| Brick | 🍫 Chocolates |
| Lumber | 🌹 Roses |
| Wool | 🧸 Teddy Bears |
| Grain | 💌 Love Letters |
| Ore | 💎 Diamonds |
| Settlement | Date Spot |
| City | Dream Home |
| Road | Love Path |
| Robber | Anti-Cupid |
| Knight | Cupid's Arrow |

First to 10 Victory Points wins. Your VP converts to Love Points for the Prize Shop where you can claim real prizes.

## Features

- Full Catan game engine with all standard rules
- Strategic AI opponents with smart placement, trading, and dev card play
- Hex board with randomized tiles, number tokens, and 6/8 adjacency enforcement
- Port trading system (3:1 generic, 2:1 specialty)
- Dev cards: Knights, Road Building, Year of Plenty, Monopoly, VP cards
- Longest Road and Largest Army tracking
- Prize Shop with redeemable rewards
- Canvas-based rendering with confetti effects
- Fully responsive — works on desktop and mobile

## Multiplayer

FastAPI backend with WebSocket support so Noor can play with friends. Game state persisted in SQLite.

### Setup

```bash
pip install -r requirements.txt
uvicorn backend.app:app --reload
```

Open `http://localhost:8000` in your browser. Create a room, share the 5-letter code with friends, and they join from their browser.

### How it works

- Server owns the game state (no cheating!)
- WebSocket pushes real-time updates to all players
- SQLite persists games across server restarts
- Empty player slots are filled by AI

### API

- `POST /api/rooms` — create a new game room (body: `{"numPlayers": 2}`)
- `GET /api/rooms/{code}` — get room state
- `WS /ws/{code}` — WebSocket for real-time play

## Tech

- Frontend: Vanilla JavaScript, HTML5 Canvas, CSS
- Backend: Python, FastAPI, WebSockets, SQLite
