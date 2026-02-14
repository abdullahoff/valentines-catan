// ===== VICTORY & PRIZE SHOP =====

function gameOver(pid) {
  turnPhase = 'gameover';
  hideRobberBanner();

  const noorVP = getVP(0);
  finalLP = noorVP * 100;

  // Bonus points
  if (pid === 0) finalLP += 500; // Win bonus
  // Count buildings
  for (let i = 0; i < vertices.length; i++) {
    if (vertexBuildings[i].player === 0) {
      finalLP += vertexBuildings[i].type === 'city' ? 50 : 25;
    }
  }
  if (longestRoadPlayer === 0) finalLP += 100;
  if (largestArmyPlayer === 0) finalLP += 100;
  finalLP = Math.max(finalLP, 400); // Minimum guarantee

  if (pid === 0) {
    document.getElementById('vic-title').textContent = "NOOR WINS!";
    document.getElementById('vic-text').innerHTML =
      'You conquered Valentine\'s Catan with ' + noorVP + ' VP!<br>' +
      'You earned <span style="color:#ffd700">' + finalLP + ' Love Points</span> to spend in the Prize Shop!<br><br>' +
      'Abdullah is impressed. And a little scared.';
    document.getElementById('vic-btn').textContent = 'Claim Your Prizes!';
  } else {
    document.getElementById('vic-title').textContent = players[pid].name + " Wins!";
    document.getElementById('vic-text').innerHTML =
      players[pid].name + ' reached 10 VP first!<br>' +
      'But you still earned <span style="color:#ffd700">' + finalLP + ' Love Points</span> for trying!<br><br>' +
      "Love isn't about winning... but prizes are.";
    document.getElementById('vic-btn').textContent = 'Visit Prize Shop Anyway!';
  }

  let sc = '';
  for (let p of players) sc += p.name + ': ' + getVP(p.id) + 'VP  ';
  document.getElementById('vic-scores').textContent = sc;
  document.getElementById('victory-screen').classList.remove('hidden');
  startConfetti();
}

function showPrizeShop() {
  document.getElementById('victory-screen').classList.add('hidden');
  stopConfetti();
  cartItems = [];
  renderPrizeShop();
  document.getElementById('prize-screen').classList.remove('hidden');
}

function renderPrizeShop() {
  const remaining = finalLP - cartItems.reduce((s, p) => s + p.cost, 0);
  document.getElementById('lp-display').innerHTML = Icons.svg('heart', 20) + ' ' + remaining + ' Love Points remaining';

  const grid = document.getElementById('prize-grid');
  grid.innerHTML = '';
  for (let prize of PRIZES) {
    const bought = cartItems.some(c => c.id === prize.id);
    const canBuy = remaining >= prize.cost && !prize.impossible;
    const locked = !canBuy && !bought;
    const card = document.createElement('div');
    card.className = 'prize-card' + (bought ? ' bought' : '') + (locked ? ' locked' : '') + (prize.impossible ? ' mexico-card' : '');
    card.innerHTML =
      '<div class="prize-icon">' + Icons.svg(prize.icon, 40) + '</div>' +
      '<div class="prize-name">' + prize.name + '</div>' +
      '<div class="prize-cost">' + prize.cost + ' LP</div>' +
      (prize.impossible ? '<div style="color:#ff4444;font-size:6px;margin-top:4px">NOT ENOUGH POINTS<br>March 21st weekend...</div>' : '') +
      (bought ? '<div class="prize-tag">GOT IT!</div>' : '');

    if (!prize.impossible && !bought) {
      card.onclick = () => {
        if (locked) return;
        cartItems.push(prize);
        renderPrizeShop();
      };
    }
    if (bought) {
      card.onclick = () => {
        cartItems = cartItems.filter(c => c.id !== prize.id);
        renderPrizeShop();
      };
    }
    grid.appendChild(card);
  }

  const cartDiv = document.getElementById('cart-items');
  if (cartItems.length === 0) {
    cartDiv.textContent = 'Nothing yet... click prizes to add them!';
  } else {
    cartDiv.innerHTML = cartItems.map(p => Icons.svg(p.icon, 16) + ' ' + p.name).join(' + ');
  }
}

function finalizePrizes() {
  if (cartItems.length === 0) { alert('Pick at least one prize!'); return; }

  // Build celebration page with hidden prize items for sequential reveal
  const prizeHTML = cartItems.map((p, i) =>
    '<div class="reveal-prize" style="opacity:0;transform:scale(0.5) translateY(20px);transition:all 0.6s ease;margin:12px 0">' +
    Icons.svg(p.icon, 48) +
    '<span style="margin-left:12px;font-size:clamp(10px,1.5vw,16px)">' + p.name + '</span>' +
    '</div>'
  ).join('');

  document.getElementById('prize-screen').innerHTML =
    '<div style="text-align:center;padding:40px 20px">' +
    '<h1 class="reveal-prize" style="font-size:clamp(16px,3vw,32px);color:#ffd700;text-shadow:0 0 20px #ffd700;margin-bottom:24px;opacity:0;transform:scale(0.5);transition:all 0.8s ease">YOUR PRIZES</h1>' +
    '<div style="color:#fff">' + prizeHTML + '</div>' +
    '<p class="reveal-prize" style="color:#ffb6c1;font-size:clamp(9px,1.3vw,14px);margin:20px 0 8px;opacity:0;transform:translateY(20px);transition:all 0.6s ease">Happy Valentine\'s Day, Noor! ' + Icons.svg('heart', 16) + '</p>' +
    '<p class="reveal-prize" style="color:#ff6b9d;font-size:clamp(7px,1vw,11px);opacity:0;transform:translateY(20px);transition:all 0.6s ease">-- From Abdullah, with love</p>' +
    '<button class="prize-done-btn reveal-prize" style="margin-top:24px;opacity:0;transform:translateY(20px);transition:all 0.6s ease" onclick="location.reload()">Play Again</button>' +
    '</div>';

  startConfetti();

  // Sequential reveal animation
  const items = document.querySelectorAll('.reveal-prize');
  items.forEach((el, i) => {
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1) translateY(0)';
    }, 400 + i * 500);
  });
}
