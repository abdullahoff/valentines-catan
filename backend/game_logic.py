"""Server-authoritative game logic.

Mirrors the rules in js/rules.js, js/state.js, and js/ai.js but keeps the
state as a plain dict so it serialises to JSON / SQLite trivially.
"""

import random
from .constants import RES, COSTS, DEV_DECK, PLAYER_COLORS, PLAYER_NAMES, BANK_SIZE
from .board import build_board

# ── helpers ────────────────────────────────────────────────────────────────

def _pip(n: int) -> int:
    return 0 if n == 0 else 6 - abs(7 - n)

def _can_afford(p: dict, cost: dict) -> bool:
    return all(p["res"].get(r, 0) >= cost.get(r, 0) for r in RES)

def _pay(state: dict, pidx: int, cost: dict):
    p = state["players"][pidx]
    for r in RES:
        a = cost.get(r, 0)
        p["res"][r] -= a
        state["bank"][r] += a

def _bank_take(state: dict, r: str, n: int) -> int:
    avail = min(n, state["bank"][r])
    state["bank"][r] -= avail
    return avail

def _total_cards(p: dict) -> int:
    return sum(p["res"].values())

def _get_vp(state: dict, pidx: int) -> int:
    vp = 0
    for vb in state["board"]["vertexBuildings"]:
        if vb["player"] == pidx:
            vp += 2 if vb["type"] == "city" else 1
    if state.get("longestRoadPlayer") == pidx:
        vp += 2
    if state.get("largestArmyPlayer") == pidx:
        vp += 2
    vp += state["players"][pidx].get("vpCards", 0)
    return vp

def _trade_ratio(state: dict, pidx: int, resource: str) -> int:
    best = 4
    for port in state["board"]["ports"]:
        if any(state["board"]["vertexBuildings"][v]["player"] == pidx for v in port["vertices"]):
            if port["type"] == "generic":
                best = min(best, 3)
            elif port["type"] == resource:
                best = min(best, 2)
    return best

# ── valid positions ────────────────────────────────────────────────────────

def _valid_settlements(state: dict, pidx: int) -> list[int]:
    vb = state["board"]["vertexBuildings"]
    eb = state["board"]["edgeBuildings"]
    verts = state["board"]["vertices"]
    out = []
    for i, v in enumerate(verts):
        if vb[i]["type"]:
            continue
        if any(vb[adj]["type"] for adj in v["adjVertexIds"]):
            continue
        if not any(eb[e]["player"] == pidx for e in v["adjEdgeIds"]):
            continue
        if not v["hexIds"]:
            continue
        out.append(i)
    return out

def _valid_cities(state: dict, pidx: int) -> list[int]:
    return [i for i, vb in enumerate(state["board"]["vertexBuildings"])
            if vb["type"] == "settlement" and vb["player"] == pidx]

def _valid_roads(state: dict, pidx: int) -> list[int]:
    eb = state["board"]["edgeBuildings"]
    vb = state["board"]["vertexBuildings"]
    verts = state["board"]["vertices"]
    edges = state["board"]["edges"]
    out = []
    for i, e in enumerate(edges):
        if eb[i]["player"] is not None:
            continue
        conn = False
        for vid in e["v"]:
            if vb[vid]["player"] == pidx:
                conn = True; break
            for ae in verts[vid]["adjEdgeIds"]:
                if ae != i and eb[ae]["player"] == pidx:
                    if vb[vid]["player"] is None or vb[vid]["player"] == pidx:
                        conn = True; break
            if conn:
                break
        if conn:
            out.append(i)
    return out

def _valid_setup_settlements(state: dict) -> list[int]:
    vb = state["board"]["vertexBuildings"]
    verts = state["board"]["vertices"]
    out = []
    for i, v in enumerate(verts):
        if vb[i]["type"]:
            continue
        if any(vb[adj]["type"] for adj in v["adjVertexIds"]):
            continue
        if not v["hexIds"]:
            continue
        out.append(i)
    return out

def _valid_setup_roads(state: dict, sv: int) -> list[int]:
    verts = state["board"]["vertices"]
    eb = state["board"]["edgeBuildings"]
    return [e for e in verts[sv]["adjEdgeIds"] if eb[e]["player"] is None]

# ── longest road ───────────────────────────────────────────────────────────

def _compute_lr(state: dict, pidx: int) -> int:
    eb = state["board"]["edgeBuildings"]
    vb = state["board"]["vertexBuildings"]
    verts = state["board"]["vertices"]
    edges = state["board"]["edges"]
    pe = [i for i, e in enumerate(eb) if e["player"] == pidx]
    if not pe:
        return 0
    mx = 0
    for eid in pe:
        for sv in edges[eid]["v"]:
            mx = max(mx, _dfs_road(state, sv, pidx, set()))
    return mx

def _dfs_road(state: dict, vid: int, pidx: int, vis: set) -> int:
    vb = state["board"]["vertexBuildings"]
    verts = state["board"]["vertices"]
    eb = state["board"]["edgeBuildings"]
    if vb[vid]["player"] is not None and vb[vid]["player"] != pidx:
        return 0
    mx = 0
    for eid in verts[vid]["adjEdgeIds"]:
        if eid in vis or eb[eid]["player"] != pidx:
            continue
        vis.add(eid)
        e = state["board"]["edges"][eid]
        other = e["v"][1] if e["v"][0] == vid else e["v"][0]
        mx = max(mx, 1 + _dfs_road(state, other, pidx, vis))
        vis.discard(eid)
    return mx

def _check_longest_road(state: dict):
    for pid in range(4):
        lr = _compute_lr(state, pid)
        if lr >= 5 and lr > state.get("longestRoadLen", 0):
            state["longestRoadLen"] = lr
            state["longestRoadPlayer"] = pid

def _check_largest_army(state: dict):
    for pid in range(4):
        kp = state["players"][pid].get("knightsPlayed", 0)
        if kp >= 3 and kp > state.get("largestArmyCount", 0):
            state["largestArmyCount"] = kp
            state["largestArmyPlayer"] = pid

# ── new game ───────────────────────────────────────────────────────────────

def new_game(num_humans: int = 1) -> dict:
    deck = DEV_DECK[:]
    random.shuffle(deck)
    players = []
    for i in range(4):
        players.append({
            "id": i,
            "name": PLAYER_NAMES[i],
            "color": PLAYER_COLORS[i],
            "isAI": i >= num_humans,
            "connected": False,
            "res": {r: 0 for r in RES},
            "devCards": [],
            "newDevCards": [],
            "knightsPlayed": 0,
            "vpCards": 0,
            "settlementsLeft": 5,
            "citiesLeft": 4,
            "roadsLeft": 15,
        })
    board = build_board()
    state = {
        "players": players,
        "board": board,
        "devDeck": deck,
        "bank": {r: BANK_SIZE for r in RES},
        "currentPlayer": 0,
        "turnPhase": "lobby",
        "setupRound": 1,
        "setupOrder": [0, 1, 2, 3],
        "setupIdx": 0,
        "lastSetupSettlement": -1,
        "longestRoadPlayer": -1,
        "longestRoadLen": 0,
        "largestArmyPlayer": -1,
        "largestArmyCount": 0,
        "devCardPlayedThisTurn": False,
        "hostPlayer": 0,
        "numHumans": num_humans,
    }
    return state

# ── action handler ─────────────────────────────────────────────────────────

def handle(state: dict, action: str, data: dict, player_idx: int | None) -> dict:
    # lobby actions don't need turn check
    if action == "start_game":
        return _handle_start_game(state, player_idx)

    cp = state["currentPlayer"]
    if player_idx is not None and player_idx != cp and action not in ("discard",):
        return {"error": "Not your turn"}

    if action == "place_setup":
        return _handle_setup(state, data, player_idx)
    if action == "roll":
        return _handle_roll(state)
    if action == "build":
        return _handle_build(state, data)
    if action == "buy_devcard":
        return _handle_buy_devcard(state)
    if action == "trade":
        return _handle_trade(state, data)
    if action == "end_turn":
        return _handle_end_turn(state)
    if action == "move_robber":
        return _handle_move_robber(state, data)
    if action == "steal":
        return _handle_steal(state, data)
    if action == "discard":
        return _handle_discard(state, data, player_idx)
    if action == "play_devcard":
        return _handle_play_devcard(state, data)
    return {"error": "Unknown action"}

# ── setup ──────────────────────────────────────────────────────────────────

def _handle_start_game(state: dict, player_idx: int | None) -> dict:
    if state["turnPhase"] != "lobby":
        return {"error": "Game already started"}
    if player_idx != state.get("hostPlayer", 0):
        return {"error": "Only the host can start the game"}
    # check all human slots are filled
    num_needed = state.get("numHumans", 1)
    connected = sum(1 for p in state["players"] if p["connected"] and not p["isAI"])
    if connected < num_needed:
        return {"error": f"Waiting for {num_needed - connected} more player(s)"}
    state["turnPhase"] = "setup_settle"
    return {"log": "Game started!"}

def _handle_setup(state: dict, data: dict, pidx: int | None) -> dict:
    phase = state["turnPhase"]
    cp = state["currentPlayer"]

    if phase == "setup_settle":
        vidx = data.get("vertex")
        valid = _valid_setup_settlements(state)
        if vidx not in valid:
            return {"error": "Invalid settlement position"}
        state["board"]["vertexBuildings"][vidx] = {"type": "settlement", "player": cp}
        state["players"][cp]["settlementsLeft"] -= 1
        state["lastSetupSettlement"] = vidx
        if state["setupRound"] == 2:
            for hid in state["board"]["vertices"][vidx]["hexIds"]:
                h = state["board"]["hexes"][hid]
                if h["type"] != "desert":
                    state["players"][cp]["res"][h["type"]] += _bank_take(state, h["type"], 1)
        state["turnPhase"] = "setup_road"
        return {"log": f"{state['players'][cp]['name']} placed a Date Spot."}

    if phase == "setup_road":
        eidx = data.get("edge")
        valid = _valid_setup_roads(state, state["lastSetupSettlement"])
        if eidx not in valid:
            return {"error": "Invalid road position"}
        state["board"]["edgeBuildings"][eidx] = {"player": cp}
        state["players"][cp]["roadsLeft"] -= 1
        _advance_setup(state)
        return {"log": f"{state['players'][cp]['name']} placed a Love Path."}

    return {"error": "Not in setup phase"}

def _advance_setup(state: dict):
    state["setupIdx"] += 1
    order = state["setupOrder"]
    if state["setupIdx"] >= len(order):
        if state["setupRound"] == 1:
            state["setupRound"] = 2
            state["setupOrder"] = [3, 2, 1, 0]
            state["setupIdx"] = 0
        else:
            state["currentPlayer"] = 0
            state["turnPhase"] = "roll"
            return
    state["currentPlayer"] = state["setupOrder"][state["setupIdx"]]
    state["turnPhase"] = "setup_settle"

# ── roll ───────────────────────────────────────────────────────────────────

def _handle_roll(state: dict) -> dict:
    if state["turnPhase"] != "roll":
        return {"error": "Can't roll now"}
    d1, d2 = random.randint(1, 6), random.randint(1, 6)
    total = d1 + d2
    state["lastRoll"] = [d1, d2]
    log = f"{state['players'][state['currentPlayer']]['name']} rolled {total}."

    if total == 7:
        need_discard = False
        for p in state["players"]:
            ct = _total_cards(p)
            if ct > 7:
                if p["isAI"]:
                    _ai_discard(state, p["id"], ct // 2)
                else:
                    need_discard = True
        state["turnPhase"] = "discard" if need_discard else "robber"
        return {"log": log}

    # resource production
    hexes = state["board"]["hexes"]
    vb = state["board"]["vertexBuildings"]
    demand = {r: 0 for r in RES}
    for h in hexes:
        if h["number"] != total or h["type"] == "desert" or h["id"] == state["board"]["robberHex"]:
            continue
        for vid in h["vertexIds"]:
            b = vb[vid]
            if b["player"] is not None:
                demand[h["type"]] += 2 if b["type"] == "city" else 1
    for h in hexes:
        if h["number"] != total or h["type"] == "desert" or h["id"] == state["board"]["robberHex"]:
            continue
        if demand[h["type"]] > state["bank"][h["type"]]:
            continue
        for vid in h["vertexIds"]:
            b = vb[vid]
            if b["player"] is not None:
                amt = 2 if b["type"] == "city" else 1
                taken = _bank_take(state, h["type"], amt)
                state["players"][b["player"]]["res"][h["type"]] += taken

    state["turnPhase"] = "main"
    return {"log": log}

# ── build ──────────────────────────────────────────────────────────────────

def _handle_build(state: dict, data: dict) -> dict:
    if state["turnPhase"] != "main":
        return {"error": "Can't build now"}
    cp = state["currentPlayer"]
    p = state["players"][cp]
    btype = data.get("type")
    idx = data.get("index")

    if btype == "settlement":
        if not _can_afford(p, COSTS["settlement"]) or p["settlementsLeft"] <= 0:
            return {"error": "Can't afford"}
        if idx not in _valid_settlements(state, cp):
            return {"error": "Invalid position"}
        _pay(state, cp, COSTS["settlement"])
        state["board"]["vertexBuildings"][idx] = {"type": "settlement", "player": cp}
        p["settlementsLeft"] -= 1
        _check_longest_road(state)
        _check_victory(state)
        return {"log": f"{p['name']} built a Date Spot!"}

    if btype == "city":
        if not _can_afford(p, COSTS["city"]) or p["citiesLeft"] <= 0:
            return {"error": "Can't afford"}
        if idx not in _valid_cities(state, cp):
            return {"error": "Invalid position"}
        _pay(state, cp, COSTS["city"])
        state["board"]["vertexBuildings"][idx] = {"type": "city", "player": cp}
        p["citiesLeft"] -= 1
        p["settlementsLeft"] += 1
        _check_longest_road(state)
        _check_victory(state)
        return {"log": f"{p['name']} built a Dream Home!"}

    if btype == "road":
        if not _can_afford(p, COSTS["road"]) or p["roadsLeft"] <= 0:
            return {"error": "Can't afford"}
        if idx not in _valid_roads(state, cp):
            return {"error": "Invalid position"}
        _pay(state, cp, COSTS["road"])
        state["board"]["edgeBuildings"][idx] = {"player": cp}
        p["roadsLeft"] -= 1
        _check_longest_road(state)
        return {"log": f"{p['name']} built a Love Path!"}

    return {"error": "Unknown build type"}

# ── dev cards ──────────────────────────────────────────────────────────────

def _handle_buy_devcard(state: dict) -> dict:
    if state["turnPhase"] != "main":
        return {"error": "Can't buy now"}
    cp = state["currentPlayer"]
    p = state["players"][cp]
    if not _can_afford(p, COSTS["devcard"]) or not state["devDeck"]:
        return {"error": "Can't afford"}
    _pay(state, cp, COSTS["devcard"])
    card = state["devDeck"].pop()
    if card == "vp":
        p["vpCards"] += 1
    else:
        p["newDevCards"].append(card)
    _check_victory(state)
    return {"log": f"{p['name']} bought a dev card."}

def _handle_play_devcard(state: dict, data: dict) -> dict:
    cp = state["currentPlayer"]
    p = state["players"][cp]
    card = data.get("card")
    if state["devCardPlayedThisTurn"]:
        return {"error": "Already played a card this turn"}
    if card not in p["devCards"]:
        return {"error": "Don't have that card"}

    p["devCards"].remove(card)
    state["devCardPlayedThisTurn"] = True

    if card == "knight":
        p["knightsPlayed"] = p.get("knightsPlayed", 0) + 1
        _check_largest_army(state)
        state["turnPhase"] = "robber"
        return {"log": f"{p['name']} played Cupid's Arrow!"}
    if card == "roads":
        # give 2 free roads — client sends positions in subsequent build actions
        p["freeRoads"] = 2
        return {"log": f"{p['name']} played Road Building!"}
    if card == "plenty":
        r1, r2 = data.get("res1", "choc"), data.get("res2", "choc")
        p["res"][r1] += _bank_take(state, r1, 1)
        p["res"][r2] += _bank_take(state, r2, 1)
        return {"log": f"{p['name']} took {r1} and {r2}."}
    if card == "monopoly":
        res = data.get("resource", "choc")
        stolen = 0
        for i, op in enumerate(state["players"]):
            if i == cp:
                continue
            stolen += op["res"][res]
            p["res"][res] += op["res"][res]
            op["res"][res] = 0
        return {"log": f"{p['name']} monopolised {res} ({stolen})!"}
    return {"error": "Unknown card"}

# ── trade ──────────────────────────────────────────────────────────────────

def _handle_trade(state: dict, data: dict) -> dict:
    if state["turnPhase"] != "main":
        return {"error": "Can't trade now"}
    cp = state["currentPlayer"]
    p = state["players"][cp]
    give_res = data.get("give")
    get_res = data.get("get")
    ratio = _trade_ratio(state, cp, give_res)
    if p["res"].get(give_res, 0) < ratio:
        return {"error": "Not enough resources"}
    p["res"][give_res] -= ratio
    state["bank"][give_res] += ratio
    taken = _bank_take(state, get_res, 1)
    p["res"][get_res] += taken
    return {"log": f"{p['name']} traded {ratio} {give_res} for 1 {get_res}."}

# ── robber / steal / discard ───────────────────────────────────────────────

def _handle_move_robber(state: dict, data: dict) -> dict:
    hid = data.get("hex")
    if hid == state["board"]["robberHex"]:
        return {"error": "Must move robber"}
    state["board"]["robberHex"] = hid
    # find steal targets
    targets = set()
    cp = state["currentPlayer"]
    for vid in state["board"]["hexes"][hid]["vertexIds"]:
        b = state["board"]["vertexBuildings"][vid]
        if b["player"] is not None and b["player"] != cp and _total_cards(state["players"][b["player"]]) > 0:
            targets.add(b["player"])
    if targets:
        state["stealTargets"] = list(targets)
        state["turnPhase"] = "steal"
    else:
        state["turnPhase"] = "main"
    return {"log": "Anti-Cupid moved!"}

def _handle_steal(state: dict, data: dict) -> dict:
    cp = state["currentPlayer"]
    target = data.get("target")
    tp = state["players"][target]
    avail = [r for r in RES for _ in range(tp["res"][r])]
    if avail:
        s = random.choice(avail)
        tp["res"][s] -= 1
        state["players"][cp]["res"][s] += 1
    state["turnPhase"] = "main"
    return {"log": f"{state['players'][cp]['name']} stole from {tp['name']}!"}

def _handle_discard(state: dict, data: dict, pidx: int | None) -> dict:
    cards = data.get("cards", {})  # {resource: count}
    p = state["players"][pidx]
    for r, n in cards.items():
        p["res"][r] -= n
        state["bank"][r] += n
    # check if all humans have discarded
    all_done = all(
        _total_cards(p) <= 7 or p["isAI"]
        for p in state["players"]
    )
    if all_done:
        state["turnPhase"] = "robber"
    return {"log": f"{p['name']} discarded."}

# ── end turn ───────────────────────────────────────────────────────────────

def _handle_end_turn(state: dict) -> dict:
    if state["turnPhase"] != "main":
        return {"error": "Can't end turn now"}
    cp = state["currentPlayer"]
    p = state["players"][cp]
    # promote new dev cards
    p["devCards"].extend(p["newDevCards"])
    p["newDevCards"] = []
    state["devCardPlayedThisTurn"] = False
    state["currentPlayer"] = (cp + 1) % 4
    state["turnPhase"] = "roll"
    return {"log": f"--- {state['players'][state['currentPlayer']]['name']}'s turn ---"}

# ── victory ────────────────────────────────────────────────────────────────

def _check_victory(state: dict):
    cp = state["currentPlayer"]
    if _get_vp(state, cp) >= 10:
        state["turnPhase"] = "gameover"
        state["winner"] = cp

# ── AI (simplified) ───────────────────────────────────────────────────────

def ai_turn(state: dict):
    """Run one full AI turn. Mutates state in place."""
    cp = state["currentPlayer"]
    p = state["players"][cp]
    if not p["isAI"] or state["turnPhase"] == "gameover":
        return

    # setup
    if state["turnPhase"] == "setup_settle":
        valid = _valid_setup_settlements(state)
        if valid:
            best = max(valid, key=lambda v: sum(_pip(state["board"]["hexes"][h]["number"]) for h in state["board"]["vertices"][v]["hexIds"] if state["board"]["hexes"][h]["type"] != "desert"))
            _handle_setup(state, {"vertex": best}, cp)
        else:
            _advance_setup(state)
        if state["turnPhase"] == "setup_road":
            ai_turn(state)
        return

    if state["turnPhase"] == "setup_road":
        valid = _valid_setup_roads(state, state["lastSetupSettlement"])
        if valid:
            _handle_setup(state, {"edge": valid[0]}, cp)
        else:
            _advance_setup(state)
        return

    # roll
    if state["turnPhase"] == "roll":
        _handle_roll(state)
        if state["turnPhase"] == "robber":
            _ai_move_robber(state)
        if state["turnPhase"] != "main":
            return

    # robber
    if state["turnPhase"] == "robber":
        _ai_move_robber(state)
        if state["turnPhase"] != "main":
            return

    # main phase — build what we can
    if state["turnPhase"] == "main":
        for _ in range(10):
            built = False
            if _can_afford(p, COSTS["city"]) and p["citiesLeft"] > 0:
                vc = _valid_cities(state, cp)
                if vc:
                    _handle_build(state, {"type": "city", "index": vc[0]})
                    built = True; continue
            if _can_afford(p, COSTS["settlement"]) and p["settlementsLeft"] > 0:
                vs = _valid_settlements(state, cp)
                if vs:
                    _handle_build(state, {"type": "settlement", "index": vs[0]})
                    built = True; continue
            if _can_afford(p, COSTS["road"]) and p["roadsLeft"] > 0:
                vr = _valid_roads(state, cp)
                if vr:
                    _handle_build(state, {"type": "road", "index": vr[0]})
                    built = True; continue
            if _can_afford(p, COSTS["devcard"]) and state["devDeck"]:
                _handle_buy_devcard(state)
                built = True; continue
            break
        _handle_end_turn(state)

def _ai_move_robber(state: dict):
    cp = state["currentPlayer"]
    hexes = state["board"]["hexes"]
    best, bv = 0, -1
    for h in hexes:
        if h["id"] == state["board"]["robberHex"] or h["type"] == "desert":
            continue
        val = 0
        for vid in h["vertexIds"]:
            b = state["board"]["vertexBuildings"][vid]
            if b["player"] is not None and b["player"] != cp:
                val += _pip(h["number"]) * (2 if b["type"] == "city" else 1)
        if val > bv:
            bv = val; best = h["id"]
    _handle_move_robber(state, {"hex": best})
    if state["turnPhase"] == "steal":
        targets = state.get("stealTargets", [])
        if targets:
            _handle_steal(state, {"target": targets[0]})

def _ai_discard(state: dict, pidx: int, count: int):
    p = state["players"][pidx]
    for _ in range(count):
        avail = [r for r in RES if p["res"][r] > 0]
        if not avail:
            break
        r = random.choice(avail)
        p["res"][r] -= 1
        state["bank"][r] += 1
