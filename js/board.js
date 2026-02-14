// ===== BOARD TOPOLOGY =====
let hexes = [], vertices = [], edges = [];
let vertexBuildings = [], edgeBuildings = [], robberHex = 0;

function buildBoard() {
  const rowXMul = [[-1, 0, 1], [-1.5, -0.5, 0.5, 1.5], [-2, -1, 0, 1, 2], [-1.5, -0.5, 0.5, 1.5], [-1, 0, 1]];
  hexes = [];
  let hIdx = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < rowXMul[r].length; c++) {
      hexes.push({ id: hIdx, row: r, colMul: rowXMul[r][c], type: null, number: 0, vertexIds: [], edgeIds: [] });
      hIdx++;
    }
  }

  // Assign types and numbers
  const types = [...HEX_TYPES]; shuffle(types);
  const nums = [...NUM_TOKENS]; shuffle(nums);
  let ni = 0;
  for (let h of hexes) {
    h.type = types.shift();
    if (h.type !== 'desert') { h.number = nums[ni++]; }
    else { h.number = 0; robberHex = h.id; }
  }

  // Enforce 6/8 non-adjacency rule
  enforce68Rule();

  // Build vertex topology
  const vMap = new Map();
  const hexW = Math.sqrt(3) * 100;
  vertices = [];
  for (let h of hexes) {
    h.vertexIds = [];
    const cx = h.colMul * hexW, cy = (h.row - 2) * 150;
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 3;
      const vx = cx + 100 * Math.cos(angle), vy = cy + 100 * Math.sin(angle);
      const key = Math.round(vx) + '_' + Math.round(vy);
      if (!vMap.has(key)) {
        const vid = vertices.length;
        vertices.push({ id: vid, refX: vx, refY: vy, hexIds: [h.id], adjVertexIds: [], adjEdgeIds: [] });
        vMap.set(key, vid);
      } else {
        const existing = vertices[vMap.get(key)];
        if (!existing.hexIds.includes(h.id)) existing.hexIds.push(h.id);
      }
      h.vertexIds.push(vMap.get(key));
    }
  }

  // Build edge topology
  const eMap = new Map();
  edges = [];
  for (let h of hexes) {
    h.edgeIds = [];
    for (let i = 0; i < 6; i++) {
      const v1 = h.vertexIds[i], v2 = h.vertexIds[(i + 1) % 6];
      const eKey = Math.min(v1, v2) + '_' + Math.max(v1, v2);
      if (!eMap.has(eKey)) {
        const eid = edges.length;
        edges.push({ id: eid, v: [v1, v2], hexIds: [h.id] });
        eMap.set(eKey, eid);
      } else {
        const existing = edges[eMap.get(eKey)];
        if (!existing.hexIds.includes(h.id)) existing.hexIds.push(h.id);
      }
      h.edgeIds.push(eMap.get(eKey));
    }
  }

  // Build adjacency lists
  for (let e of edges) {
    const v1 = e.v[0], v2 = e.v[1];
    if (!vertices[v1].adjVertexIds.includes(v2)) vertices[v1].adjVertexIds.push(v2);
    if (!vertices[v2].adjVertexIds.includes(v1)) vertices[v2].adjVertexIds.push(v1);
    if (!vertices[v1].adjEdgeIds.includes(e.id)) vertices[v1].adjEdgeIds.push(e.id);
    if (!vertices[v2].adjEdgeIds.includes(e.id)) vertices[v2].adjEdgeIds.push(e.id);
  }

  // Init building arrays
  vertexBuildings = vertices.map(() => ({ type: null, player: null }));
  edgeBuildings = edges.map(() => ({ player: null }));

  // Assign ports to coastal edges
  assignPorts();
}

// ===== PORT SYSTEM =====
// Ports are assigned to coastal vertex pairs
let ports = []; // { vertices: [v1, v2], type: 'generic'|resource, ratio: 3|2 }

function assignPorts() {
  ports = [];
  // Find coastal vertices (vertices touching fewer than 3 hexes)
  const coastalVertices = [];
  for (let v of vertices) {
    if (v.hexIds.length <= 2) coastalVertices.push(v.id);
  }

  // Find coastal edges (both endpoints are coastal)
  const coastalEdges = [];
  for (let e of edges) {
    if (coastalVertices.includes(e.v[0]) && coastalVertices.includes(e.v[1])) {
      // Only edges on the outer rim (exactly 1 adjacent hex)
      if (e.hexIds.length === 1) {
        coastalEdges.push(e.id);
      }
    }
  }

  // Select 9 well-spaced port positions from coastal edges
  const portTypes = [
    { type: 'generic', ratio: 3 },
    { type: 'generic', ratio: 3 },
    { type: 'generic', ratio: 3 },
    { type: 'generic', ratio: 3 },
    { type: 'choc', ratio: 2 },
    { type: 'rose', ratio: 2 },
    { type: 'bear', ratio: 2 },
    { type: 'love', ratio: 2 },
    { type: 'diam', ratio: 2 }
  ];
  shuffle(portTypes);

  // Space ports evenly around the coast
  if (coastalEdges.length < 9) return; // fallback
  const step = Math.floor(coastalEdges.length / 9);
  for (let i = 0; i < 9; i++) {
    const eIdx = coastalEdges[(i * step) % coastalEdges.length];
    const e = edges[eIdx];
    const pt = portTypes[i];
    ports.push({
      edgeId: eIdx,
      vertices: [e.v[0], e.v[1]],
      type: pt.type,
      ratio: pt.ratio
    });
  }
}

// Get best trade ratio for a player on a given resource
function getTradeRatio(pid, resource) {
  let best = 4; // default bank rate
  for (let port of ports) {
    // Check if player has a building on either port vertex
    const hasAccess = port.vertices.some(vId =>
      vertexBuildings[vId].player === pid
    );
    if (!hasAccess) continue;
    if (port.type === 'generic') {
      best = Math.min(best, 3);
    } else if (port.type === resource) {
      best = Math.min(best, 2);
    }
  }
  return best;
}

// Ensure 6 and 8 tokens are never on adjacent hexes
function enforce68Rule() {
  const hexW = Math.sqrt(3) * 100;
  // Build adjacency from hex positions
  function hexDist(a, b) {
    const ax = a.colMul * hexW, ay = (a.row - 2) * 150;
    const bx = b.colMul * hexW, by = (b.row - 2) * 150;
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
  }
  const threshold = hexW * 1.1; // adjacent hexes are ~hexW apart
  let attempts = 0;
  while (attempts < 100) {
    let violation = false;
    for (let i = 0; i < hexes.length; i++) {
      if (hexes[i].number !== 6 && hexes[i].number !== 8) continue;
      for (let j = i + 1; j < hexes.length; j++) {
        if (hexes[j].number !== 6 && hexes[j].number !== 8) continue;
        if (hexDist(hexes[i], hexes[j]) < threshold) {
          // Swap hexes[j].number with a random non-6/8 hex
          const swapCandidates = hexes.filter(h => h.id !== i && h.id !== j && h.number !== 0 && h.number !== 6 && h.number !== 8);
          if (swapCandidates.length > 0) {
            const swap = swapCandidates[Math.floor(Math.random() * swapCandidates.length)];
            const tmp = hexes[j].number;
            hexes[j].number = swap.number;
            swap.number = tmp;
            violation = true;
            break;
          }
        }
      }
      if (violation) break;
    }
    if (!violation) break;
    attempts++;
  }
}

// Canvas pixel positions
let W = 0, H = 0, hexSize = 0, boardCX = 0, boardCY = 0;

function computePixelPositions() {
  if (!hexes.length) return;
  const hexW = Math.sqrt(3) * hexSize;
  for (let h of hexes) {
    h.cx = boardCX + h.colMul * hexW;
    h.cy = boardCY + (h.row - 2) * 1.5 * hexSize;
  }
  for (let v of vertices) {
    v.x = boardCX + v.refX / 100 * hexSize;
    v.y = boardCY + v.refY / 100 * hexSize;
  }
  for (let e of edges) {
    e.mx = (vertices[e.v[0]].x + vertices[e.v[1]].x) / 2;
    e.my = (vertices[e.v[0]].y + vertices[e.v[1]].y) / 2;
  }
}

function resizeCanvas() {
  const cv = document.getElementById('board-canvas');
  const ccv = document.getElementById('confetti-cv');
  W = cv.width = ccv.width = innerWidth;
  H = cv.height = ccv.height = innerHeight;
  hexSize = Math.min((W * 0.7) / (5 * 1.732), (H - 140) / 8.5);
  hexSize = Math.max(25, Math.min(hexSize, 60));
  boardCX = W * 0.42;
  boardCY = H * 0.45;
  computePixelPositions();
}
