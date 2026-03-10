// ===== TRADE SYSTEM =====
let tradeGive = null, tradeGet = null;

function openTrade() {
  const myIdx = mpMode ? mpPlayerIdx : 0;
  if (turnPhase !== 'main' || currentPlayer !== myIdx) return;
  tradeGive = null;
  tradeGet = null;
  const gd = document.getElementById('trade-give');
  const gt = document.getElementById('trade-get');
  gd.innerHTML = '';
  gt.innerHTML = '';

  const ratios = {};
  let bestOverall = 4;
  for (let r of RES) {
    ratios[r] = getTradeRatio(myIdx, r);
    bestOverall = Math.min(bestOverall, ratios[r]);
  }
  const titleEl = document.querySelector('#trade-modal .modal-box h2');
  titleEl.textContent = bestOverall < 4 ? 'Bank Trade (ports available!)' : 'Bank Trade (4:1)';

  for (let r of RES) {
    const ratio = ratios[r];
    const hasEnough = players[myIdx].res[r] >= ratio;
    const g = document.createElement('div');
    g.className = 'trade-res';
    g.innerHTML = Icons.svg(r, 18) +
      ' <span style="color:#fff;font-size:10px">' + players[myIdx].res[r] + '</span>' +
      '<span style="color:#ffd700;font-size:7px;display:block">' + ratio + ':1</span>';
    g.style.borderColor = RES_COLORS[r];
    if (!hasEnough) g.style.opacity = '0.4';
    if (ratio < 4) g.style.borderColor = '#ffd700';
    g.onclick = () => {
      tradeGive = r;
      gd.querySelectorAll('.trade-res').forEach(x => x.classList.remove('sel'));
      g.classList.add('sel');
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
  const myIdx = mpMode ? mpPlayerIdx : 0;
  const ratio = getTradeRatio(myIdx, tradeGive);
  if (players[myIdx].res[tradeGive] < ratio) {
    logMsg("Not enough " + RES_NAMES[tradeGive] + " to trade.");
    return;
  }
  if (mpMode) {
    mpDoTrade(tradeGive, tradeGet);
    closeTrade();
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
