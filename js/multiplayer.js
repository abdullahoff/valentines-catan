// ===== MULTIPLAYER: WebSocket client + lobby =====

let mpSocket = null;
let mpRoomCode = null;
let mpPlayerIdx = null;
let mpMode = false;
let mpIsHost = false;
let mpLobbyState = null; // track server state while in lobby

// Backend URL: auto-detect local dev vs deployed GitHub Pages
const MP_BACKEND = (() => {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return location.origin;
  }
  return 'https://valentines-catan.onrender.com';
})();
const MP_WS = MP_BACKEND.replace(/^http/, 'ws');

// ── lobby UI ──────────────────────────────────────────────────────────────

function showMultiplayerLobby() {
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('mp-lobby').classList.remove('hidden');
}

function backToTitle() {
  if (mpSocket) { mpSocket.close(); mpSocket = null; }
  document.getElementById('mp-lobby').classList.add('hidden');
  document.getElementById('mp-create-section').classList.remove('hidden');
  document.getElementById('mp-join-section').classList.remove('hidden');
  document.getElementById('mp-waiting').classList.add('hidden');
  document.getElementById('mp-start-btn').classList.add('hidden');
  document.getElementById('title-screen').classList.remove('hidden');
}

async function mpCreateRoom() {
  const numPlayers = parseInt(document.getElementById('mp-num-players').value) || 2;
  const name = document.getElementById('mp-name').value.trim() || 'Player';
  try {
    const res = await fetch(`${MP_BACKEND}/api/rooms`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({numPlayers})
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    mpRoomCode = data.roomCode;
    mpIsHost = true;
    _showWaiting();
    mpConnect(name);
  } catch (e) {
    alert('Failed to create room: ' + e.message);
  }
}

function mpJoinRoom() {
  const code = document.getElementById('mp-code-input').value.trim().toUpperCase();
  const name = document.getElementById('mp-name').value.trim() || 'Player';
  if (!code) return;
  mpRoomCode = code;
  mpIsHost = false;
  _showWaiting();
  mpConnect(name);
}

function _showWaiting() {
  document.getElementById('mp-room-display').textContent = mpRoomCode;
  document.getElementById('mp-create-section').classList.add('hidden');
  document.getElementById('mp-join-section').classList.add('hidden');
  document.getElementById('mp-waiting').classList.remove('hidden');
}

// ── lobby rendering ───────────────────────────────────────────────────────

function mpRenderLobby(state) {
  const container = document.getElementById('mp-player-slots');
  const numHumans = state.numHumans || 1;
  let html = '';
  for (let i = 0; i < 4; i++) {
    const p = state.players[i];
    const isMe = i === mpPlayerIdx;
    const connected = p.connected;
    const isAI = p.isAI;

    let status, color, nameText;
    if (isAI) {
      status = '🤖 AI';
      color = '#666';
      nameText = p.name;
    } else if (connected) {
      status = '✅ Ready';
      color = p.color;
      nameText = p.name + (isMe ? ' (you)' : '');
    } else {
      status = '⏳ Waiting...';
      color = '#444';
      nameText = 'Open Slot';
    }

    html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;margin:4px 0;border:1px solid ${color};border-radius:6px;background:${color}11">
      <div>
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px"></span>
        <span style="color:#fff;font-size:10px">${nameText}</span>
      </div>
      <span style="font-size:8px;color:${color}">${status}</span>
    </div>`;
  }
  container.innerHTML = html;

  // lobby status + start button
  const connectedHumans = state.players.filter(p => p.connected && !p.isAI).length;
  const statusEl = document.getElementById('mp-lobby-status');
  const startBtn = document.getElementById('mp-start-btn');

  if (connectedHumans < numHumans) {
    statusEl.textContent = `Waiting for players... (${connectedHumans}/${numHumans})`;
    startBtn.classList.add('hidden');
  } else if (mpIsHost) {
    statusEl.textContent = `All players connected!`;
    startBtn.classList.remove('hidden');
  } else {
    statusEl.textContent = `All players connected! Waiting for host to start...`;
    startBtn.classList.add('hidden');
  }
}

function mpStartGame() {
  mpSend({action: 'start_game'});
}

// ── WebSocket ─────────────────────────────────────────────────────────────

function mpConnect(name) {
  mpSocket = new WebSocket(`${MP_WS}/ws/${mpRoomCode}`);

  mpSocket.onopen = () => {
    mpSocket.send(JSON.stringify({action: 'join', name}));
  };

  mpSocket.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.error) { alert(msg.error); return; }

    if (msg.event === 'joined') {
      mpPlayerIdx = msg.playerIdx;
      mpMode = true;
      mpLobbyState = msg.state;

      if (msg.state.turnPhase === 'lobby') {
        mpRenderLobby(msg.state);
      } else {
        _enterGame(msg.state);
      }
    }

    if (msg.event === 'player_joined' || msg.event === 'player_left') {
      mpLobbyState = msg.state;
      if (msg.state.turnPhase === 'lobby') {
        mpRenderLobby(msg.state);
      }
    }

    if (msg.event === 'state_update') {
      if (msg.state.turnPhase === 'lobby') {
        mpLobbyState = msg.state;
        mpRenderLobby(msg.state);
      } else {
        // game has started (or is in progress)
        if (!gameStarted) {
          _enterGame(msg.state);
        } else {
          mpApplyState(msg.state);
          if (msg.log) logMsg(msg.log);
          mpUpdateUI();
        }
      }
    }
  };

  mpSocket.onclose = () => {
    if (mpMode && gameStarted && turnPhase !== 'gameover') logMsg('Disconnected from server.');
  };
}

function _enterGame(state) {
  document.getElementById('mp-lobby').classList.add('hidden');
  document.getElementById('mp-waiting').classList.add('hidden');
  mpApplyState(state);
  // init board rendering
  buildBoard = function(){}; // prevent re-building board since we got it from server
  resizeCanvas();
  document.getElementById('hud').classList.remove('hidden');
  gameStarted = true;
  mpUpdateUI();
  logMsg('Game started! ' + players[state.currentPlayer].name + ' goes first.');
}

function mpSend(data) {
  if (mpSocket && mpSocket.readyState === WebSocket.OPEN) {
    mpSocket.send(JSON.stringify(data));
  }
}

// ── state sync: server state → client rendering state ─────────────────────

function mpApplyState(s) {
  // players
  for (let i = 0; i < 4; i++) {
    const sp = s.players[i];
    players[i] = players[i] || {};
    players[i].id = sp.id;
    players[i].name = sp.name;
    players[i].color = sp.color;
    players[i].isAI = sp.isAI;
    players[i].res = {...sp.res};
    players[i].devCards = [...sp.devCards];
    players[i].newDevCards = [...(sp.newDevCards || [])];
    players[i].knightsPlayed = sp.knightsPlayed;
    players[i].vpCards = sp.vpCards;
    players[i].settlementsLeft = sp.settlementsLeft;
    players[i].citiesLeft = sp.citiesLeft;
    players[i].roadsLeft = sp.roadsLeft;
  }

  // board topology (only on first sync)
  if (s.board.hexes && (!hexes || !hexes.length || hexes.length !== s.board.hexes.length)) {
    hexes = s.board.hexes.map(h => ({
      id: h.id, row: h.row, colMul: h.colMul, type: h.type, number: h.number,
      vertexIds: [...h.vertexIds], edgeIds: [...h.edgeIds]
    }));
    vertices = s.board.vertices.map(v => ({
      id: v.id, hexIds: [...v.hexIds], adjVertexIds: [...v.adjVertexIds], adjEdgeIds: [...v.adjEdgeIds],
      refX: 0, refY: 0, x: 0, y: 0
    }));
    edges = s.board.edges.map(e => ({
      id: e.id, v: [...e.v], hexIds: [...e.hexIds], mx: 0, my: 0
    }));
    ports = (s.board.ports || []).map(p => ({
      edgeId: p.edgeId, vertices: [...p.vertices], type: p.type, ratio: p.ratio
    }));
    _mpComputeRefPositions();
    resizeCanvas();
  }

  // buildings
  for (let i = 0; i < s.board.vertexBuildings.length; i++) {
    vertexBuildings[i] = {type: s.board.vertexBuildings[i].type, player: s.board.vertexBuildings[i].player};
  }
  for (let i = 0; i < s.board.edgeBuildings.length; i++) {
    edgeBuildings[i] = {player: s.board.edgeBuildings[i].player};
  }

  robberHex = s.board.robberHex;
  currentPlayer = s.currentPlayer;
  turnPhase = s.turnPhase;
  longestRoadPlayer = s.longestRoadPlayer;
  longestRoadLen = s.longestRoadLen;
  largestArmyPlayer = s.largestArmyPlayer;
  largestArmyCount = s.largestArmyCount;
  devDeck = s.devDeck || [];
  devCardPlayedThisTurn = s.devCardPlayedThisTurn;

  if (s.lastRoll) {
    document.getElementById('die1').textContent = s.lastRoll[0];
    document.getElementById('die2').textContent = s.lastRoll[1];
  }

  if (s.winner !== undefined && s.winner !== null) {
    gameOver(s.winner);
  }
}

function _mpComputeRefPositions() {
  const hexW = Math.sqrt(3) * 100;
  const vMap = new Map();
  for (const h of hexes) {
    const cx = h.colMul * hexW, cy = (h.row - 2) * 150;
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 3;
      const vx = cx + 100 * Math.cos(angle), vy = cy + 100 * Math.sin(angle);
      const vid = h.vertexIds[i];
      if (!vMap.has(vid)) {
        vertices[vid].refX = vx;
        vertices[vid].refY = vy;
        vMap.set(vid, true);
      }
    }
  }
}

// ── multiplayer UI: override buttons to send actions via WS ───────────────

function mpUpdateUI() {
  updateUI();

  const isMyTurn = currentPlayer === mpPlayerIdx;
  const hm = isMyTurn && turnPhase === 'main';

  document.getElementById('btn-roll').disabled = !(isMyTurn && turnPhase === 'roll');
  document.getElementById('btn-road').disabled = !hm || !canAfford(players[mpPlayerIdx], COSTS.road) || players[mpPlayerIdx].roadsLeft <= 0;
  document.getElementById('btn-settle').disabled = !hm || !canAfford(players[mpPlayerIdx], COSTS.settlement) || players[mpPlayerIdx].settlementsLeft <= 0;
  document.getElementById('btn-city').disabled = !hm || !canAfford(players[mpPlayerIdx], COSTS.city) || players[mpPlayerIdx].citiesLeft <= 0;
  document.getElementById('btn-card').disabled = !hm || !canAfford(players[mpPlayerIdx], COSTS.devcard) || !devDeck.length;
  document.getElementById('btn-play').disabled = !(hm || (isMyTurn && turnPhase === 'roll')) || devCardPlayedThisTurn || players[mpPlayerIdx].devCards.length === 0;
  document.getElementById('btn-trade').disabled = !hm;
  document.getElementById('btn-endturn').disabled = !hm;

  // Show resources for our player
  const rs = document.getElementById('res-section');
  rs.innerHTML = '';
  for (let r of RES) {
    const d = document.createElement('div');
    d.className = 'res-card';
    d.style.borderColor = RES_COLORS[r];
    d.style.background = RES_COLORS[r] + '22';
    d.innerHTML = '<span class="lbl">' + Icons.svg(r, 18) + '</span>' +
      '<span class="cnt">' + players[mpPlayerIdx].res[r] + '</span>';
    rs.appendChild(d);
  }
}

// ── override game actions for multiplayer ─────────────────────────────────

const _origDoRoll = typeof doRoll === 'function' ? doRoll : null;
function doRoll() {
  if (mpMode) { mpSend({action: 'roll'}); return; }
  if (_origDoRoll) _origDoRoll();
}

const _origEndTurn = typeof endTurn === 'function' ? endTurn : null;
function endTurn() {
  if (mpMode) { mpSend({action: 'end_turn'}); return; }
  if (_origEndTurn) _origEndTurn();
}

const _origBuyDevCard = typeof buyDevCard === 'function' ? buyDevCard : null;
function buyDevCard() {
  if (mpMode) { mpSend({action: 'buy_devcard'}); return; }
  if (_origBuyDevCard) _origBuyDevCard();
}

function mpHandleClick(mx, my) {
  if (!mpMode) return false;
  if (currentPlayer !== mpPlayerIdx) return true;

  if (turnPhase === 'robber') {
    for (let h of hexes) {
      const dx = mx - h.cx, dy = my - h.cy;
      if (Math.sqrt(dx * dx + dy * dy) < hexSize * 0.8) {
        mpSend({action: 'move_robber', hex: h.id});
        return true;
      }
    }
    return true;
  }

  if (turnPhase === 'setup_settle') {
    for (let i = 0; i < vertices.length; i++) {
      const dx = mx - vertices[i].x, dy = my - vertices[i].y;
      if (Math.sqrt(dx * dx + dy * dy) < hexSize * 0.25) {
        mpSend({action: 'place_setup', vertex: i});
        return true;
      }
    }
    return true;
  }

  if (turnPhase === 'setup_road') {
    for (let i = 0; i < edges.length; i++) {
      const dx = mx - edges[i].mx, dy = my - edges[i].my;
      if (Math.sqrt(dx * dx + dy * dy) < hexSize * 0.28) {
        mpSend({action: 'place_setup', edge: i});
        return true;
      }
    }
    return true;
  }

  if (buildMode === 'settlement' || buildMode === 'city') {
    for (let vIdx of validPositions) {
      const dx = mx - vertices[vIdx].x, dy = my - vertices[vIdx].y;
      if (Math.sqrt(dx * dx + dy * dy) < hexSize * 0.25) {
        mpSend({action: 'build', type: buildMode, index: vIdx});
        buildMode = null; validPositions = [];
        return true;
      }
    }
  }

  if (buildMode === 'road') {
    for (let eIdx of validPositions) {
      const dx = mx - edges[eIdx].mx, dy = my - edges[eIdx].my;
      if (Math.sqrt(dx * dx + dy * dy) < hexSize * 0.28) {
        mpSend({action: 'build', type: 'road', index: eIdx});
        buildMode = null; validPositions = [];
        return true;
      }
    }
  }

  return false;
}

function mpDoTrade(giveRes, getRes) {
  mpSend({action: 'trade', give: giveRes, get: getRes});
}
