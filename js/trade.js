// ===== TRADE SYSTEM =====
let tradeGive = null, tradeGet = null;

function openTrade() {
  if (turnPhase !== 'main' || currentPlayer !== 0) return;
  tradeGive = null;
  tradeGet = null;
  const gd = document.getElementById('trade-give');
  const gt = document.getElementById('trade-get');
  gd.innerHTML = '';
  gt.innerHTML = '';

  // Update modal title to show best available ratio
  const ratios = {};
  let bestOverall = 4;
  for (let r of RES) {
    ratios[r] = getTradeRatio(0, r);
    bestOverall = Math.min(bestOverall, ratios[r]);
  }
  const titleEl = document.querySelector('#trade-modal .modal-box h2');
  if (bestOverall < 4) {
    titleEl.textContent = 'Bank Trade (ports available!)';
  } else {
    titleEl.textContent = 'Bank Trade (4:1)';
  }

  for (let r of RES) {
    const ratio = ratios[r];
    const hasEnough = players[0].res[r] >= ratio;
    const g = document.createElement('div');
    g.className = 'trade-res';
    g.innerHTML = Icons.svg(r, 18) +
      ' <span style="color:#fff;font-size:10px">' + players[0].res[r] + '</span>' +
      '<span style="color:#ffd700;font-size:7px;display:block">' + ratio + ':1</span>';
    g.style.borderColor = RES_COLORS[r];
    if (!hasEnough) g.style.opacity = '0.4';
    if (ratio < 4) g.style.borderColor = '#ffd700'; // highlight port rates
    g.onclick = () => {
      tradeGive = r;
      gd.querySelectorAll('.trade-res').forEach(x => x.classList.remove('sel'));
      g.classList.add('sel');
      // Update "Give X:" label
      document.getElementById('trade-give-label').textContent = 'Give ' + ratio + ':';
    };
    gd.appendChild(g);

    const t = document.createElement('div');
    t.className = 'trade-res';
    t.innerHTML = Icons.svg(r, 18);
    t.style.borderColor = RES_COLORS[r];
    t.onclick = () => {
      tradeGet = r;
      gt.querySelectorAll('.trade-res').forEach(x => x.classList.remove('sel'));
      t.classList.add('sel');
    };
    gt.appendChild(t);
  }

  document.getElementById('trade-modal').classList.remove('hidden');
}

function doTrade() {
  if (!tradeGive || !tradeGet || tradeGive === tradeGet) {
    logMsg("Select different resources to give and receive.");
    return;
  }
  const ratio = getTradeRatio(0, tradeGive);
  if (players[0].res[tradeGive] < ratio) {
    logMsg("Not enough " + RES_NAMES[tradeGive] + " to trade.");
    return;
  }
  players[0].res[tradeGive] -= ratio;
  bankReturn(tradeGive, ratio);
  const taken = bankTake(tradeGet, 1);
  players[0].res[tradeGet] += taken;
  logMsg('Noor traded ' + ratio + ' ' + RES_NAMES[tradeGive] + ' for 1 ' + RES_NAMES[tradeGet] + '.');
  closeTrade();
  updateUI();
}

function closeTrade() {
  document.getElementById('trade-modal').classList.add('hidden');
}
