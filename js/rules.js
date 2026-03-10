// ===== SETUP =====
function computeSetupValid() {
  validPositions = [];
  for (let i = 0; i < vertices.length; i++) {
    if (vertexBuildings[i].type) continue;
    let tooClose = false;
    for (let adj of vertices[i].adjVertexIds) {
      if (vertexBuildings[adj].type) { tooClose = true; break; }
    }
    if (tooClose) continue;
    if (vertices[i].hexIds.length === 0) continue;
    validPositions.push(i);
  }
  buildMode = 'settlement';
}

function computeSetupRoads(sv) {
  validPositions = [];
  for (let eId of vertices[sv].adjEdgeIds) {
    if (edgeBuildings[eId].player === null) validPositions.push(eId);
  }
  buildMode = 'road';
}

function placeSetupSettlement(vIdx) {
  vertexBuildings[vIdx] = { type: 'settlement', player: currentPlayer };
  players[currentPlayer].settlementsLeft--;
  lastSetupSettlement = vIdx;
  logMsg(players[currentPlayer].name + ' placed a Date Spot.');
  // Round 2: collect starting resources
  if (setupRound === 2) {
    for (let hId of vertices[vIdx].hexIds) {
      if (hexes[hId].type !== 'desert') {
        const got = bankTake(hexes[hId].type, 1);
        players[currentPlayer].res[hexes[hId].type] += got;
      }
    }
  }
  turnPhase = 'setup_road';
  computeSetupRoads(vIdx);
  updateUI();
  if (players[currentPlayer].isAI) setTimeout(aiTurn, 400);
}

function placeSetupRoad(eIdx) {
  edgeBuildings[eIdx] = { player: currentPlayer };
  players[currentPlayer].roadsLeft--;
  logMsg(players[currentPlayer].name + ' placed a Love Path.');
  advanceSetup();
}

function advanceSetup() {
  setupIdx++;
  if (setupIdx >= setupOrder.length) {
    if (setupRound === 1) {
      setupRound = 2;
      setupOrder = [3, 2, 1, 0];
      setupIdx = 0;
    } else {
      currentPlayer = 0;
      turnPhase = 'roll';
      buildMode = null;
      validPositions = [];
      logMsg("Setup complete! Noor's turn -- Roll the Dice!");
      updateUI();
      return;
    }
  }
  currentPlayer = setupOrder[setupIdx];
  turnPhase = 'setup_settle';
  computeSetupValid();
  updateUI();
  logMsg(players[currentPlayer].name + "'s turn to place.");
  if (players[currentPlayer].isAI) setTimeout(aiTurn, 500);
}

// ===== TURN LOGIC =====
function doRoll() {
  if (turnPhase !== 'roll' || currentPlayer !== 0) return;
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  executeRoll(d1, d2);
}

function executeRoll(d1, d2) {
  const total = d1 + d2;
  document.getElementById('die1').textContent = d1;
  document.getElementById('die2').textContent = d2;
  logMsg(players[currentPlayer].name + ' rolled ' + total + '.');

  if (total === 7) {
    let needsHumanDiscard = false;
    for (let p of players) {
      const ct = totalCards(p);
      if (ct > 7) {
        if (!p.isAI) {
          needsHumanDiscard = true;
          startDiscard(p.id, Math.floor(ct / 2));
        } else {
          aiDiscard(p.id, Math.floor(ct / 2));
        }
      }
    }
    if (!needsHumanDiscard) {
      turnPhase = 'robber';
      if (currentPlayer === 0) showRobberBanner();
      else setTimeout(aiTurn, 400);
    }
    updateUI();
    return;
  }

  // Resource production with bank exhaustion rule
  // First, calculate total demand per resource type
  const demand = {};
  for (let r of RES) demand[r] = 0;
  for (let h of hexes) {
    if (h.number !== total || h.type === 'desert' || h.id === robberHex) continue;
    for (let vId of h.vertexIds) {
      const b = vertexBuildings[vId];
      if (b.player !== null) {
        demand[h.type] += b.type === 'city' ? 2 : 1;
      }
    }
  }
  // Distribute: if bank can't pay all entitled players for a type, NO ONE gets it
  for (let h of hexes) {
    if (h.number !== total || h.type === 'desert' || h.id === robberHex) continue;
    if (demand[h.type] > resourceBank[h.type]) continue; // bank exhaustion: skip this type
    for (let vId of h.vertexIds) {
      const b = vertexBuildings[vId];
      if (b.player !== null) {
        const amt = b.type === 'city' ? 2 : 1;
        const taken = bankTake(h.type, amt);
        players[b.player].res[h.type] += taken;
      }
    }
  }
  turnPhase = 'main';
  updateUI();
}

// ===== DISCARD =====
let discardTarget = 0, discardSelected = {};

function startDiscard(pid, count) {
  turnPhase = 'discard';
  discardTarget = count;
  discardSelected = {};
  document.getElementById('discard-msg').textContent = 'You have too many cards! Discard ' + count + '.';
  const c = document.getElementById('discard-cards');
  c.innerHTML = '';
  for (let r of RES) {
    for (let i = 0; i < players[pid].res[r]; i++) {
      const btn = document.createElement('div');
      btn.className = 'trade-res';
      btn.innerHTML = Icons.svg(r, 20);
      btn.style.borderColor = RES_COLORS[r];
      btn.dataset.res = r;
      btn.dataset.idx = r + '_' + i;
      btn.onclick = () => {
        if (btn.classList.contains('sel')) {
          btn.classList.remove('sel');
          delete discardSelected[btn.dataset.idx];
        } else if (Object.keys(discardSelected).length < discardTarget) {
          btn.classList.add('sel');
          discardSelected[btn.dataset.idx] = r;
        }
        updateDiscardCount();
      };
      c.appendChild(btn);
    }
  }
  updateDiscardCount();
  document.getElementById('discard-modal').classList.remove('hidden');
}

function updateDiscardCount() {
  const ct = Object.keys(discardSelected).length;
  document.getElementById('discard-count').textContent = ct + '/' + discardTarget;
  document.getElementById('discard-btn').disabled = (ct !== discardTarget);
}

function confirmDiscard() {
  const counts = {};
  for (let r of Object.values(discardSelected)) counts[r] = (counts[r] || 0) + 1;
  for (let r in counts) { players[0].res[r] -= counts[r]; bankReturn(r, counts[r]); }
  document.getElementById('discard-modal').classList.add('hidden');
  logMsg('Noor discarded ' + Object.keys(discardSelected).length + ' cards.');
  turnPhase = 'robber';
  if (currentPlayer === 0) showRobberBanner();
  else setTimeout(aiTurn, 400);
  updateUI();
}

// ===== ROBBER =====
function showRobberBanner() {
  document.getElementById('robber-banner').classList.remove('hidden');
  logMsg("Click any hex to move the Anti-Cupid!");
}

function hideRobberBanner() {
  document.getElementById('robber-banner').classList.add('hidden');
}

function moveRobber(hexId) {
  if (hexId === robberHex) return; // must move to different hex
  robberHex = hexId;
  hideRobberBanner();
  logMsg('Anti-Cupid moved to ' + (RES_NAMES[hexes[hexId].type] || 'desert') + '!');

  const targets = new Set();
  for (let vId of hexes[hexId].vertexIds) {
    const b = vertexBuildings[vId];
    if (b.player !== null && b.player !== currentPlayer) {
      if (totalCards(players[b.player]) > 0) targets.add(b.player);
    }
  }
  if (targets.size > 0) {
    if (currentPlayer === 0) showStealModal([...targets]);
    else { aiSteal([...targets]); turnPhase = 'main'; updateUI(); }
  } else {
    turnPhase = 'main';
    updateUI();
  }
}

function showStealModal(targets) {
  turnPhase = 'steal';
  const c = document.getElementById('steal-targets');
  c.innerHTML = '';
  for (let pid of targets) {
    const btn = document.createElement('div');
    btn.className = 'trade-res';
    btn.textContent = players[pid].name;
    btn.style.borderColor = players[pid].color;
    btn.style.color = players[pid].color;
    btn.onclick = () => {
      stealFrom(pid);
      document.getElementById('steal-modal').classList.add('hidden');
      turnPhase = 'main';
      updateUI();
    };
    c.appendChild(btn);
  }
  document.getElementById('steal-modal').classList.remove('hidden');
}

function stealFrom(pid) {
  const avail = [];
  for (let r of RES) {
    for (let i = 0; i < players[pid].res[r]; i++) avail.push(r);
  }
  if (!avail.length) return;
  const s = avail[Math.floor(Math.random() * avail.length)];
  players[pid].res[s]--;
  players[currentPlayer].res[s]++;
  logMsg(players[currentPlayer].name + ' stole from ' + players[pid].name + '!');
}

// ===== BUILDING =====
function startBuild(type) {
  const myIdx = mpMode ? mpPlayerIdx : 0;
  if (turnPhase !== 'main' || currentPlayer !== myIdx) return;
  if (buildMode === type) { buildMode = null; validPositions = []; updateUI(); return; }
  const costKey = type === 'city' ? 'city' : type === 'settlement' ? 'settlement' : 'road';
  if (!canAfford(players[myIdx], COSTS[costKey])) return;

  if (type === 'road' && players[myIdx].roadsLeft <= 0) return;
  if (type === 'settlement' && players[myIdx].settlementsLeft <= 0) return;
  if (type === 'city' && players[myIdx].citiesLeft <= 0) return;

  buildMode = type;
  if (type === 'settlement') validPositions = getValidSettlements(myIdx);
  else if (type === 'city') validPositions = getValidCities(myIdx);
  else validPositions = getValidRoads(myIdx);
  updateUI();
}

function getValidSettlements(pid) {
  const v = [];
  for (let i = 0; i < vertices.length; i++) {
    if (vertexBuildings[i].type) continue;
    let close = false;
    for (let adj of vertices[i].adjVertexIds) {
      if (vertexBuildings[adj].type) { close = true; break; }
    }
    if (close) continue;
    let conn = false;
    for (let eId of vertices[i].adjEdgeIds) {
      if (edgeBuildings[eId].player === pid) { conn = true; break; }
    }
    if (!conn || vertices[i].hexIds.length === 0) continue;
    v.push(i);
  }
  return v;
}

function getValidCities(pid) {
  const v = [];
  for (let i = 0; i < vertices.length; i++) {
    if (vertexBuildings[i].type === 'settlement' && vertexBuildings[i].player === pid) v.push(i);
  }
  return v;
}

function getValidRoads(pid) {
  const v = [];
  for (let i = 0; i < edges.length; i++) {
    if (edgeBuildings[i].player !== null) continue;
    let conn = false;
    for (let vId of edges[i].v) {
      // Connected if we have a building at this vertex
      if (vertexBuildings[vId].player === pid) { conn = true; break; }
      // Or if we have a road at an adjacent edge AND no enemy building blocks the path
      for (let ae of vertices[vId].adjEdgeIds) {
        if (ae !== i && edgeBuildings[ae].player === pid) {
          if (vertexBuildings[vId].player === null || vertexBuildings[vId].player === pid) {
            conn = true; break;
          }
        }
      }
      if (conn) break;
    }
    if (conn) v.push(i);
  }
  return v;
}

function placeBuild(type, idx) {
  const p = players[currentPlayer];
  if (type === 'settlement') {
    payCost(p, COSTS.settlement);
    vertexBuildings[idx] = { type: 'settlement', player: currentPlayer };
    p.settlementsLeft--;
    logMsg(p.name + ' built a Date Spot!');
  } else if (type === 'city') {
    payCost(p, COSTS.city);
    vertexBuildings[idx] = { type: 'city', player: currentPlayer };
    p.citiesLeft--;
    p.settlementsLeft++; // settlement returns to supply
    logMsg(p.name + ' built a Dream Home!');
  } else {
    payCost(p, COSTS.road);
    edgeBuildings[idx] = { player: currentPlayer };
    p.roadsLeft--;
    logMsg(p.name + ' built a Love Path!');
  }
  buildMode = null;
  validPositions = [];
  checkLongestRoad();
  checkVictory();
  updateUI();
}

// ===== SCORING =====
function getVP(pid) {
  let vp = 0;
  for (let i = 0; i < vertices.length; i++) {
    if (vertexBuildings[i].player === pid) vp += vertexBuildings[i].type === 'city' ? 2 : 1;
  }
  if (longestRoadPlayer === pid) vp += 2;
  if (largestArmyPlayer === pid) vp += 2;
  vp += players[pid].vpCards;
  return vp;
}

function checkLongestRoad() {
  for (let pid = 0; pid < 4; pid++) {
    const len = computeLR(pid);
    if (len >= 5 && len > longestRoadLen) {
      longestRoadLen = len;
      if (longestRoadPlayer !== pid) {
        longestRoadPlayer = pid;
        logMsg(players[pid].name + ' has Longest Love Path! (' + len + ')');
      }
    }
  }
}

function computeLR(pid) {
  const pe = [];
  for (let i = 0; i < edges.length; i++) {
    if (edgeBuildings[i].player === pid) pe.push(i);
  }
  if (!pe.length) return 0;
  let mx = 0;
  for (let eId of pe) {
    for (let sv of edges[eId].v) {
      const vis = new Set();
      mx = Math.max(mx, dfsRoad(sv, pid, vis));
    }
  }
  return mx;
}

function dfsRoad(vId, pid, vis) {
  let mx = 0;
  // Opponent building breaks continuity
  if (vertexBuildings[vId].player !== null && vertexBuildings[vId].player !== pid) return 0;
  for (let eId of vertices[vId].adjEdgeIds) {
    if (vis.has(eId) || edgeBuildings[eId].player !== pid) continue;
    vis.add(eId);
    const o = edges[eId].v[0] === vId ? edges[eId].v[1] : edges[eId].v[0];
    mx = Math.max(mx, 1 + dfsRoad(o, pid, vis));
    vis.delete(eId);
  }
  return mx;
}

function checkLargestArmy() {
  for (let pid = 0; pid < 4; pid++) {
    if (players[pid].knightsPlayed >= 3 && players[pid].knightsPlayed > largestArmyCount) {
      largestArmyCount = players[pid].knightsPlayed;
      if (largestArmyPlayer !== pid) {
        largestArmyPlayer = pid;
        logMsg(players[pid].name + " is Cupid's Champion! (" + largestArmyCount + ' knights)');
      }
    }
  }
}

function checkVictory() {
  // Only check current player (can only win on your own turn)
  if (getVP(currentPlayer) >= 10) {
    gameOver(currentPlayer);
  }
}

// ===== END TURN =====
function endTurn() {
  if (turnPhase !== 'main') return;
  buildMode = null;
  validPositions = [];
  // Move new dev cards to playable
  promoteNewDevCards(currentPlayer);
  devCardPlayedThisTurn = false;
  devCardsBoughtThisTurn = [];
  // Advance to next player
  currentPlayer = (currentPlayer + 1) % 4;
  turnPhase = 'roll';
  updateUI();
  logMsg('--- ' + players[currentPlayer].name + "'s turn ---");
  if (players[currentPlayer].isAI) setTimeout(aiTurn, 600);
}
