# Valentine's Catan 💕

A Valentine's Day themed Catan game I built for fun. Play it here: **[abdullahoff.github.io/valentines-catan](https://abdullahoff.github.io/valentines-catan/)**

<img width="1723" height="982" alt="image" src="https://github.com/user-attachments/assets/5e0d46d9-2f16-4a7b-92b7-6997f727a707" />


> This is a side project I tinker with here and there. It started as a Valentine's gift and turned into a full Catan engine with AI, multiplayer, and a prize shop.

## What is this

A complete Settlers of Catan implementation with a Valentine's Day twist. Everything is renamed to fit the theme:

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

## Features

- Full Catan rules — hex board, resource production, building, dev cards, trading, robber, ports
- 3 AI opponents with strategic placement, trading, and dev card play
- Multiplayer — create a room, share the code, play with friends
- Prize Shop — win Love Points and redeem real prizes
- Canvas rendering with confetti effects
- Works on desktop and mobile

## Multiplayer

The game has a FastAPI backend with WebSocket support so you can play with friends instead of AI.

```bash
pip install -r requirements.txt
uvicorn backend.app:app --reload
```

Or just play online — the backend is deployed on Render and the frontend auto-connects.

## Tech

- Frontend: Vanilla JS, HTML5 Canvas, CSS — no frameworks, no build step
- Backend: Python, FastAPI, WebSockets, SQLite
- Hosting: GitHub Pages (frontend) + Render (backend)
