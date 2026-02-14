// ===== UI / HUD =====

function showRules() {
  const c = document.getElementById('rules-content');
  c.innerHTML = `
    <h3 style="color:#ff6b9d;font-size:11px;margin:10px 0 6px">Goal</h3>
    <p>Be the first to reach <b style="color:#ffd700">10 Victory Points</b> on your turn!</p>

    <h3 style="color:#ff6b9d;font-size:11px;margin:10px 0 6px">Resources</h3>
    <p>${Icons.svg('choc',14)} <b>Chocolates</b> (Brick) &nbsp;
       ${Icons.svg('rose',14)} <b>Roses</b> (Lumber) &nbsp;
       ${Icons.svg('bear',14)} <b>Teddy Bears</b> (Wool) &nbsp;
       ${Icons.svg('love',14)} <b>Love Letters</b> (Grain) &nbsp;
       ${Icons.svg('diam',14)} <b>Diamonds</b> (Ore)</p>

    <h3 style="color:#ff6b9d;font-size:11px;margin:10px 0 6px">Building Costs</h3>
    <table style="color:#ddd;width:100%;border-collapse:collapse;font-size:inherit">
      <tr style="border-bottom:1px solid #333">
        <td><b>Love Path (Road)</b></td><td>1 ${Icons.svg('choc',12)} + 1 ${Icons.svg('rose',12)}</td><td>0 VP</td>
      </tr>
      <tr style="border-bottom:1px solid #333">
        <td><b>Date Spot (Settlement)</b></td><td>1 ${Icons.svg('choc',12)} + 1 ${Icons.svg('rose',12)} + 1 ${Icons.svg('bear',12)} + 1 ${Icons.svg('love',12)}</td><td>1 VP</td>
      </tr>
      <tr style="border-bottom:1px solid #333">
        <td><b>Dream Home (City)</b></td><td>3 ${Icons.svg('diam',12)} + 2 ${Icons.svg('love',12)}</td><td>2 VP</td>
      </tr>
      <tr>
        <td><b>Cupid Card (Dev Card)</b></td><td>1 ${Icons.svg('diam',12)} + 1 ${Icons.svg('bear',12)} + 1 ${Icons.svg('love',12)}</td><td>Varies</td>
      </tr>
    </table>

    <h3 style="color:#ff6b9d;font-size:11px;margin:10px 0 6px">Turn Order</h3>
    <p>1. <b>Roll Dice</b> -- All players collect resources from matching hexes.<br>
       2. <b>Trade</b> -- Trade with the bank (4:1, or better with ports).<br>
       3. <b>Build</b> -- Roads, settlements, cities, or buy dev cards.<br>
       4. <b>End Turn</b> -- Pass to next player.</p>

    <h3 style="color:#ff6b9d;font-size:11px;margin:10px 0 6px">Rolling a 7 (Anti-Cupid!)</h3>
    <p>Anyone with 8+ cards must discard half. Then move the Anti-Cupid ${Icons.svg('broken_heart',14)} to block a hex and steal 1 card from an adjacent player.</p>

    <h3 style="color:#ff6b9d;font-size:11px;margin:10px 0 6px">Dev Cards</h3>
    <p>${Icons.svg('knight',14)} <b>Cupid's Arrow (Knight)</b> -- Move Anti-Cupid + steal. 3+ = Largest Army (2 VP).<br>
       <b>Road Building</b> -- Place 2 free roads.<br>
       <b>Year of Plenty</b> -- Take any 2 resources from bank.<br>
       <b>Monopoly</b> -- Name a resource, take ALL of it from every player.<br>
       ${Icons.svg('vp_card',14)} <b>VP Cards</b> -- Worth 1 VP each (hidden until you win).</p>
    <p style="color:#ffd700">You can play 1 dev card per turn. Cannot play a card the same turn you bought it.</p>

    <h3 style="color:#ff6b9d;font-size:11px;margin:10px 0 6px">Special Awards</h3>
    <p>${Icons.svg('road_award',14)} <b>Longest Love Path</b> -- 5+ continuous roads = 2 VP<br>
       ${Icons.svg('army_award',14)} <b>Cupid's Champion</b> -- 3+ knights played = 2 VP</p>

    <h3 style="color:#ff6b9d;font-size:11px;margin:10px 0 6px">Ports</h3>
    <p>Build on a port to get better trade rates! <b>3:1</b> generic ports trade any 3 same for 1. <b>2:1</b> specialty ports trade 2 of that resource for 1 of anything.</p>

    <h3 style="color:#ff6b9d;font-size:11px;margin:10px 0 6px">Victory</h3>
    <p>Reach 10 VP on your turn from: Settlements (1), Cities (2), Longest Road (2), Largest Army (2), VP cards (1 each). Your VP becomes Love Points for the Prize Shop!</p>
  `;
  document.getElementById('rules-modal').classList.remove('hidden');
}

function logMsg(msg) {
  const log = document.getElementById('game-log');
  if (!log) return;
  const p = document.createElement('p');
  p.textContent = msg;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
  if (log.children.length > 60) log.removeChild(log.firstChild);
}

function updateUI() {
  if (!gameStarted) return;

  // Turn info
  const ti = document.getElementById('turn-info');
  const pn = players[currentPlayer].name;
  const phaseText = {
    setup_settle: pn + ': Place Date Spot',
    setup_road: pn + ': Place Love Path',
    roll: pn + ': Roll Dice',
    main: pn + "'s Turn",
    robber: pn + ': Move Anti-Cupid',
    road_building: pn + ': Place Free Roads',
    steal: pn + ': Steal!',
    discard: 'Discard cards',
    gameover: 'Game Over'
  };
  ti.textContent = phaseText[turnPhase] || '';
  ti.style.color = players[currentPlayer].color;

  // Score bar
  const sb = document.getElementById('score-bar');
  sb.innerHTML = '';
  for (let p of players) {
    const vp = getVP(p.id);
    const d = document.createElement('div');
    d.className = 'p-score' + (p.id === currentPlayer ? ' p-active' : '');
    d.innerHTML = '<span class="p-dot" style="background:' + p.color + '"></span>' +
      '<span style="color:' + p.color + '">' + p.name + ': ' + vp + 'VP</span>';
    sb.appendChild(d);
  }
  if (longestRoadPlayer >= 0) {
    const d = document.createElement('div');
    d.className = 'p-score';
    d.innerHTML = '<span style="color:#ffd700">' + Icons.svg('road_award', 14) + ' ' + players[longestRoadPlayer].name + '</span>';
    sb.appendChild(d);
  }
  if (largestArmyPlayer >= 0) {
    const d = document.createElement('div');
    d.className = 'p-score';
    d.innerHTML = '<span style="color:#ffd700">' + Icons.svg('army_award', 14) + ' ' + players[largestArmyPlayer].name + '</span>';
    sb.appendChild(d);
  }

  // Resources
  const rs = document.getElementById('res-section');
  rs.innerHTML = '';
  for (let r of RES) {
    const d = document.createElement('div');
    d.className = 'res-card';
    d.style.borderColor = RES_COLORS[r];
    d.style.background = RES_COLORS[r] + '22';
    d.innerHTML = '<span class="lbl">' + Icons.svg(r, 18) + '</span>' +
      '<span class="cnt">' + players[0].res[r] + '</span>';
    rs.appendChild(d);
  }

  // Dev card stacks
  const cs = document.getElementById('cards-section');
  cs.innerHTML = '';
  const allDevCards = [...players[0].devCards, ...players[0].newDevCards];
  const knights = allDevCards.filter(c => c === 'knight').length;
  const others = allDevCards.filter(c => c !== 'knight' && c !== 'vp').length;
  const vpCards = players[0].vpCards;

  if (knights > 0) {
    const d = document.createElement('div');
    d.className = 'dev-stack';
    d.innerHTML = '<span class="cnt">' + knights + '</span><span class="lbl">' + Icons.svg('knight', 12) + 'KNT</span>';
    cs.appendChild(d);
  }
  if (others > 0) {
    const d = document.createElement('div');
    d.className = 'dev-stack';
    d.innerHTML = '<span class="cnt">' + others + '</span><span class="lbl">' + Icons.svg('devcard', 12) + 'DEV</span>';
    cs.appendChild(d);
  }
  if (vpCards > 0) {
    const d = document.createElement('div');
    d.className = 'dev-stack';
    d.innerHTML = '<span class="cnt">' + vpCards + '</span><span class="lbl">' + Icons.svg('vp_card', 12) + 'VP</span>';
    cs.appendChild(d);
  }

  // Buttons
  const hm = currentPlayer === 0 && turnPhase === 'main';
  document.getElementById('btn-roll').disabled = !(currentPlayer === 0 && turnPhase === 'roll');
  document.getElementById('btn-road').disabled = !hm || !canAfford(players[0], COSTS.road) || players[0].roadsLeft <= 0;
  document.getElementById('btn-settle').disabled = !hm || !canAfford(players[0], COSTS.settlement) || players[0].settlementsLeft <= 0;
  document.getElementById('btn-city').disabled = !hm || !canAfford(players[0], COSTS.city) || players[0].citiesLeft <= 0;
  document.getElementById('btn-card').disabled = !hm || !canAfford(players[0], COSTS.devcard) || !devDeck.length;
  document.getElementById('btn-play').disabled = !(hm || (currentPlayer === 0 && turnPhase === 'roll')) || devCardPlayedThisTurn || players[0].devCards.length === 0;
  document.getElementById('btn-trade').disabled = !hm;
  document.getElementById('btn-endturn').disabled = !hm;

  // Active build button highlights
  document.getElementById('btn-road').classList.toggle('active', buildMode === 'road' && turnPhase === 'main');
  document.getElementById('btn-settle').classList.toggle('active', buildMode === 'settlement');
  document.getElementById('btn-city').classList.toggle('active', buildMode === 'city');
}
