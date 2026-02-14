// ===== GAME STATE =====
let players = [], devDeck = [], currentPlayer = 0;
let turnPhase = '';
let setupRound = 1, setupOrder = [], setupIdx = 0, lastSetupSettlement = -1;
let buildMode = null, validPositions = [];
let longestRoadPlayer = -1, longestRoadLen = 0;
let largestArmyPlayer = -1, largestArmyCount = 0;
let gameStarted = false, animFrame = 0;
let finalLP = 0, cartItems = [];
// Dev card timing: track cards bought this turn (can't play same turn)
let devCardPlayedThisTurn = false;
let devCardsBoughtThisTurn = [];

function initGame() {
  players = [];
  for (let i = 0; i < 4; i++) {
    players.push({
      id: i,
      name: PLAYER_NAMES[i],
      color: PLAYER_COLORS[i],
      isAI: i > 0,
      res: { choc: 0, rose: 0, bear: 0, love: 0, diam: 0 },
      devCards: [],        // playable dev cards in hand
      newDevCards: [],     // bought this turn, can't play yet
      knightsPlayed: 0,
      vpCards: 0,
      settlementsLeft: 5,
      citiesLeft: 4,
      roadsLeft: 15
    });
  }
  devDeck = [...DEV_DECK_DEF];
  shuffle(devDeck);
  setupRound = 1;
  setupOrder = [0, 1, 2, 3];
  setupIdx = 0;
  currentPlayer = 0;
  turnPhase = 'setup_settle';
  buildMode = null;
  validPositions = [];
  longestRoadPlayer = -1;
  longestRoadLen = 0;
  largestArmyPlayer = -1;
  largestArmyCount = 0;
  devCardPlayedThisTurn = false;
  devCardsBoughtThisTurn = [];
  initBank();
  gameStarted = true;

  document.getElementById('hud').classList.remove('hidden');
  computeSetupValid();
  updateUI();
  logMsg("Game started! Noor, place your first Date Spot.");
  if (players[currentPlayer].isAI) setTimeout(aiTurn, 600);
}

// Called at end of each turn to move newDevCards -> devCards
function promoteNewDevCards(pid) {
  const p = players[pid];
  for (let c of p.newDevCards) {
    p.devCards.push(c);
  }
  p.newDevCards = [];
}
