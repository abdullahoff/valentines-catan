"""Board topology builder – produces the same hex/vertex/edge graph as js/board.js."""

import math, random
from .constants import HEX_TYPES, NUM_TOKENS

_ROW_X = [[-1, 0, 1], [-1.5, -0.5, 0.5, 1.5], [-2, -1, 0, 1, 2], [-1.5, -0.5, 0.5, 1.5], [-1, 0, 1]]
_HEX_W = math.sqrt(3) * 100


def build_board() -> dict:
    """Return serialisable board dict with hexes, vertices, edges, ports."""
    types = HEX_TYPES[:]
    random.shuffle(types)
    nums = NUM_TOKENS[:]
    random.shuffle(nums)

    hexes, ni, hid = [], 0, 0
    robber_hex = 0
    for r, row in enumerate(_ROW_X):
        for cm in row:
            t = types.pop(0)
            n = 0
            if t != "desert":
                n = nums[ni]; ni += 1
            else:
                robber_hex = hid
            hexes.append({"id": hid, "row": r, "colMul": cm, "type": t, "number": n, "vertexIds": [], "edgeIds": []})
            hid += 1

    _enforce_68(hexes)

    # vertices
    vmap: dict[str, int] = {}
    vertices: list[dict] = []
    for h in hexes:
        h["vertexIds"] = []
        cx, cy = h["colMul"] * _HEX_W, (h["row"] - 2) * 150
        for i in range(6):
            a = -math.pi / 2 + i * math.pi / 3
            vx, vy = cx + 100 * math.cos(a), cy + 100 * math.sin(a)
            key = f"{round(vx)}_{round(vy)}"
            if key not in vmap:
                vid = len(vertices)
                vertices.append({"id": vid, "refX": vx, "refY": vy, "hexIds": [h["id"]], "adjVertexIds": [], "adjEdgeIds": []})
                vmap[key] = vid
            else:
                v = vertices[vmap[key]]
                if h["id"] not in v["hexIds"]:
                    v["hexIds"].append(h["id"])
            h["vertexIds"].append(vmap[key])

    # edges
    emap: dict[str, int] = {}
    edges: list[dict] = []
    for h in hexes:
        h["edgeIds"] = []
        for i in range(6):
            v1, v2 = h["vertexIds"][i], h["vertexIds"][(i + 1) % 6]
            ek = f"{min(v1,v2)}_{max(v1,v2)}"
            if ek not in emap:
                eid = len(edges)
                edges.append({"id": eid, "v": [v1, v2], "hexIds": [h["id"]]})
                emap[ek] = eid
            else:
                e = edges[emap[ek]]
                if h["id"] not in e["hexIds"]:
                    e["hexIds"].append(h["id"])
            h["edgeIds"].append(emap[ek])

    # adjacency
    for e in edges:
        v1, v2 = e["v"]
        if v2 not in vertices[v1]["adjVertexIds"]:
            vertices[v1]["adjVertexIds"].append(v2)
        if v1 not in vertices[v2]["adjVertexIds"]:
            vertices[v2]["adjVertexIds"].append(v1)
        if e["id"] not in vertices[v1]["adjEdgeIds"]:
            vertices[v1]["adjEdgeIds"].append(e["id"])
        if e["id"] not in vertices[v2]["adjEdgeIds"]:
            vertices[v2]["adjEdgeIds"].append(e["id"])

    ports = _assign_ports(vertices, edges)

    return {
        "hexes": hexes,
        "vertices": [{"id": v["id"], "hexIds": v["hexIds"], "adjVertexIds": v["adjVertexIds"], "adjEdgeIds": v["adjEdgeIds"]} for v in vertices],
        "edges": [{"id": e["id"], "v": e["v"], "hexIds": e["hexIds"]} for e in edges],
        "vertexBuildings": [{"type": None, "player": None} for _ in vertices],
        "edgeBuildings": [{"player": None} for _ in edges],
        "robberHex": robber_hex,
        "ports": ports,
    }


def _enforce_68(hexes):
    hw = _HEX_W
    for _ in range(100):
        bad = False
        for i, a in enumerate(hexes):
            if a["number"] not in (6, 8):
                continue
            ax, ay = a["colMul"] * hw, (a["row"] - 2) * 150
            for j in range(i + 1, len(hexes)):
                b = hexes[j]
                if b["number"] not in (6, 8):
                    continue
                bx, by = b["colMul"] * hw, (b["row"] - 2) * 150
                if math.hypot(ax - bx, ay - by) < hw * 1.1:
                    swaps = [h for h in hexes if h["id"] not in (i, j) and h["number"] not in (0, 6, 8)]
                    if swaps:
                        s = random.choice(swaps)
                        b["number"], s["number"] = s["number"], b["number"]
                        bad = True
                        break
            if bad:
                break
        if not bad:
            break


def _assign_ports(vertices, edges):
    coastal_v = {v["id"] for v in vertices if len(v["hexIds"]) <= 2}
    coastal_e = [e["id"] for e in edges if e["v"][0] in coastal_v and e["v"][1] in coastal_v and len(e["hexIds"]) == 1]
    port_types = [
        {"type": "generic", "ratio": 3}] * 4 + [
        {"type": r, "ratio": 2} for r in ("choc", "rose", "bear", "love", "diam")
    ]
    random.shuffle(port_types)
    ports = []
    if len(coastal_e) >= 9:
        step = len(coastal_e) // 9
        for i in range(9):
            eidx = coastal_e[(i * step) % len(coastal_e)]
            e = edges[eidx]
            pt = port_types[i]
            ports.append({"edgeId": eidx, "vertices": e["v"][:], "type": pt["type"], "ratio": pt["ratio"]})
    return ports
