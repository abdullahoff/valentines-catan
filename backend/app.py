"""Valentine's Catan – multiplayer backend.

Thin FastAPI server that owns the authoritative game state, persists it in
SQLite, and pushes updates to connected browsers over WebSockets.

Run:  uvicorn backend.app:app --reload
"""

import json, os, random, string, time
from collections import defaultdict
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from . import db, game_logic

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
MAX_ROOMS = int(os.getenv("MAX_ROOMS", "200"))
ROOM_TTL = int(os.getenv("ROOM_TTL", "86400"))  # 24h
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 5      # max room creates per IP per window

# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Rate limiting (in-memory, resets on restart — fine for free tier)
# ---------------------------------------------------------------------------

_rate: dict[str, list[float]] = defaultdict(list)

def _check_rate(ip: str) -> bool:
    now = time.time()
    _rate[ip] = [t for t in _rate[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate[ip]) >= RATE_LIMIT_MAX:
        return False
    _rate[ip].append(now)
    return True

# ---------------------------------------------------------------------------
# Connection registry  (room_code -> {player_idx: websocket})
# ---------------------------------------------------------------------------

rooms: dict[str, dict[int, WebSocket]] = {}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=5))


async def _broadcast(room_code: str, msg: dict):
    for ws in list(rooms.get(room_code, {}).values()):
        try:
            await ws.send_json(msg)
        except Exception:
            pass

# ---------------------------------------------------------------------------
# WebSocket endpoint – all game interaction happens here
# ---------------------------------------------------------------------------

@app.websocket("/ws/{room_code}")
async def ws_endpoint(ws: WebSocket, room_code: str):
    await ws.accept()
    player_idx: int | None = None

    try:
        while True:
            data = await ws.receive_json()
            action = data.get("action")

            # -- join -------------------------------------------------------
            if action == "join":
                name = data.get("name", "Player")[:20]
                row = db.get_room(room_code)
                if row is None:
                    await ws.send_json({"error": "Room not found"})
                    continue

                state = json.loads(row["state"])
                # assign first open human slot
                assigned = False
                for i, p in enumerate(state["players"]):
                    if not p["connected"] and not p["isAI"]:
                        p["name"] = name
                        p["connected"] = True
                        player_idx = i
                        assigned = True
                        break
                # if all human slots taken, try converting an AI slot
                if not assigned:
                    for i, p in enumerate(state["players"]):
                        if p["isAI"]:
                            p["name"] = name
                            p["isAI"] = False
                            p["connected"] = True
                            player_idx = i
                            assigned = True
                            break
                if not assigned:
                    await ws.send_json({"error": "Room is full"})
                    continue

                rooms.setdefault(room_code, {})[player_idx] = ws
                db.save_state(room_code, state)
                await ws.send_json({"event": "joined", "playerIdx": player_idx, "state": state})
                await _broadcast(room_code, {"event": "player_joined", "playerIdx": player_idx, "name": name, "state": state})

            # -- game actions -----------------------------------------------
            elif action in ("roll", "build", "buy_devcard", "play_devcard",
                            "trade", "end_turn", "move_robber", "steal",
                            "discard", "place_setup"):
                row = db.get_room(room_code)
                if row is None:
                    continue
                state = json.loads(row["state"])
                result = game_logic.handle(state, action, data, player_idx)
                if "error" in result:
                    await ws.send_json(result)
                    continue
                db.save_state(room_code, state)
                await _broadcast(room_code, {"event": "state_update", "state": state, "log": result.get("log")})

                # run AI turns if next player is AI
                await _run_ai(room_code, state)

    except WebSocketDisconnect:
        if player_idx is not None and room_code in rooms:
            rooms[room_code].pop(player_idx, None)
            row = db.get_room(room_code)
            if row:
                state = json.loads(row["state"])
                if player_idx < len(state["players"]):
                    state["players"][player_idx]["connected"] = False
                    db.save_state(room_code, state)
                    await _broadcast(room_code, {"event": "player_left", "playerIdx": player_idx, "state": state})


async def _run_ai(room_code: str, state: dict):
    """Execute AI turns until it's a human player's turn."""
    safety = 0
    while safety < 20:
        cp = state["currentPlayer"]
        p = state["players"][cp]
        if not p["isAI"]:
            break
        game_logic.ai_turn(state)
        safety += 1
    db.save_state(room_code, state)
    await _broadcast(room_code, {"event": "state_update", "state": state})

# ---------------------------------------------------------------------------
# REST – create / list rooms
# ---------------------------------------------------------------------------

@app.post("/api/rooms")
async def create_room(request: Request, body: dict | None = None):
    ip = request.client.host if request.client else "unknown"
    if not _check_rate(ip):
        return JSONResponse({"error": "Rate limited. Try again in a minute."}, status_code=429)

    # cleanup expired rooms
    db.delete_expired(ROOM_TTL)

    if db.count_rooms() >= MAX_ROOMS:
        return JSONResponse({"error": "Server is busy. Try again later."}, status_code=503)

    body = body or {}
    code = _code()
    num_humans = min(body.get("numPlayers", 1), 4)
    state = game_logic.new_game(num_humans)
    db.create_room(code, state)
    return {"roomCode": code}


@app.get("/api/rooms/{room_code}")
async def get_room(room_code: str):
    row = db.get_room(room_code)
    if row is None:
        return {"error": "not found"}
    return {"roomCode": room_code, "state": json.loads(row["state"])}


@app.get("/health")
async def health():
    return {"status": "ok", "rooms": db.count_rooms()}
