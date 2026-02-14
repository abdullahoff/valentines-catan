// ===== DEVELOPMENT CARDS =====

function buyDevCard() {
  if (turnPhase !== 'main' || currentPlayer !== 0) return;
  if (!canAfford(players[0], COSTS.devcard) || !devDeck.length) return;
  payCost(players[0], COSTS.devcard);
  const card = devDeck.pop();
  if (card === 'vp') {
    players[0].vpCards++;
    logMsg('Noor got a VP card! (+1 VP)');
  } else {
    // Goes to newDevCards (can't play this turn)
    players[0].newDevCards.push(card);
    logMsg('Noor got a ' + devCardDisplayName(card) + ' card!');
  }
  checkVictory();
  updateUI();
}

function devCardDisplayName(card) {
  const names = {
    knight: "Cupid's Arrow",
    roads: 'Road Building',
    plenty: 'Year of Plenty',
    monopoly: 'Monopoly',
    vp: 'Victory Point'
  };
  return names[card] || card;
}

// Open the dev card play modal
function openPlayCard() {
  if (turnPhase !== 'main' && turnPhase !== 'roll') return;
  if (currentPlayer !== 0) return;
  if (devCardPlayedThisTurn) { logMsg("Already played a dev card this turn."); return; }
  if (players[0].devCards.length === 0) { logMsg("No dev cards to play."); return; }

  const modal = document.getElementById('devcard-modal');
  const container = document.getElementById('devcard-choices');
  container.innerHTML = '';

  // Show each playable card
  const cardCounts = {};
  for (let c of players[0].devCards) {
    if (c === 'vp') continue; // VP cards are never played
    cardCounts[c] = (cardCounts[c] || 0) + 1;
  }

  for (let [card, count] of Object.entries(cardCounts)) {
    const btn = document.createElement('div');
    btn.className = 'trade-res';
    btn.style.borderColor = '#ffd700';
    btn.style.minWidth = '80px';
    btn.style.padding = '8px 12px';
    btn.innerHTML = '<div style="color:#ffd700;font-size:9px">' + devCardDisplayName(card) + '</div>' +
      '<div style="color:#999;font-size:7px;margin-top:4px">x' + count + '</div>';
    btn.onclick = () => {
      modal.classList.add('hidden');
      playDevCard(card);
    };
    container.appendChild(btn);
  }

  if (Object.keys(cardCounts).length === 0) {
    container.innerHTML = '<p style="color:#999;font-size:9px">No playable cards (VP cards activate automatically)</p>';
  }

  modal.classList.remove('hidden');
}

function closePlayCard() {
  document.getElementById('devcard-modal').classList.add('hidden');
}

function playDevCard(card) {
  const p = players[0];
  const idx = p.devCards.indexOf(card);
  if (idx === -1) return;
  p.devCards.splice(idx, 1);
  devCardPlayedThisTurn = true;

  switch (card) {
    case 'knight':
      playKnight(0);
      break;
    case 'roads':
      playRoadBuilding(0);
      break;
    case 'plenty':
      playYearOfPlenty();
      break;
    case 'monopoly':
      playMonopoly();
      break;
  }
}

// ===== KNIGHT =====
function playKnight(pid) {
  players[pid].knightsPlayed++;
  checkLargestArmy();
  logMsg(players[pid].name + " played Cupid's Arrow!");
  if (pid === 0) {
    // Human: enter robber move mode (no discard triggered)
    turnPhase = 'robber';
    showRobberBanner();
  }
  // AI knight handled in ai.js
}

// ===== ROAD BUILDING =====
let roadBuildingRemaining = 0;

function playRoadBuilding(pid) {
  logMsg(players[pid].name + ' played Road Building!');
  if (pid === 0) {
    roadBuildingRemaining = Math.min(2, players[0].roadsLeft);
    if (roadBuildingRemaining <= 0) { logMsg("No road pieces left!"); return; }
    turnPhase = 'road_building';
    buildMode = 'road';
    validPositions = getValidRoads(0);
    updateUI();
    logMsg('Place ' + roadBuildingRemaining + ' free roads.');
  }
  // AI road building handled in ai.js
}

function placeRoadBuildingRoad(eIdx) {
  edgeBuildings[eIdx] = { player: 0 };
  players[0].roadsLeft--;
  roadBuildingRemaining--;
  logMsg('Noor placed a free Love Path! (' + roadBuildingRemaining + ' remaining)');
  checkLongestRoad();
  if (roadBuildingRemaining <= 0 || players[0].roadsLeft <= 0) {
    turnPhase = 'main';
    buildMode = null;
    validPositions = [];
  } else {
    validPositions = getValidRoads(0);
  }
  checkVictory();
  updateUI();
}

// ===== YEAR OF PLENTY =====
function playYearOfPlenty() {
  logMsg('Noor played Year of Plenty! Pick 2 resources.');
  const modal = document.getElementById('plenty-modal');
  const container = document.getElementById('plenty-choices');
  container.innerHTML = '';
  let picked = [];

  function renderPlentyChoices() {
    container.innerHTML = '';
    for (let r of RES) {
      const btn = document.createElement('div');
      btn.className = 'trade-res';
      btn.innerHTML = Icons.svg(r, 20) + '<div style="font-size:7px;margin-top:2px">' + RES_NAMES[r] + '</div>';
      btn.style.borderColor = RES_COLORS[r];
      btn.onclick = () => {
        picked.push(r);
        if (picked.length >= 2) {
          modal.classList.add('hidden');
          for (let pr of picked) {
            const got = bankTake(pr, 1);
            players[0].res[pr] += got;
          }
          logMsg('Noor took ' + RES_NAMES[picked[0]] + ' and ' + RES_NAMES[picked[1]] + '.');
          updateUI();
        } else {
          document.getElementById('plenty-count').textContent = 'Pick ' + (2 - picked.length) + ' more';
        }
      };
      container.appendChild(btn);
    }
  }

  document.getElementById('plenty-count').textContent = 'Pick 2 resources from the bank';
  renderPlentyChoices();
  modal.classList.remove('hidden');
}

// ===== MONOPOLY =====
function playMonopoly() {
  logMsg('Noor played Monopoly! Pick a resource to steal.');
  const modal = document.getElementById('monopoly-modal');
  const container = document.getElementById('monopoly-choices');
  container.innerHTML = '';

  for (let r of RES) {
    const btn = document.createElement('div');
    btn.className = 'trade-res';
    btn.innerHTML = Icons.svg(r, 24) + '<div style="font-size:7px;margin-top:2px">' + RES_NAMES[r] + '</div>';
    btn.style.borderColor = RES_COLORS[r];
    btn.onclick = () => {
      modal.classList.add('hidden');
      let stolen = 0;
      for (let i = 1; i < 4; i++) {
        stolen += players[i].res[r];
        players[0].res[r] += players[i].res[r];
        players[i].res[r] = 0;
      }
      logMsg('Noor stole ' + stolen + ' ' + RES_NAMES[r] + ' from everyone!');
      updateUI();
    };
    container.appendChild(btn);
  }

  modal.classList.remove('hidden');
}
