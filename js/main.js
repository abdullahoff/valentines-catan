// ===== MAIN: Init, Events, Game Loop =====

// Build board and start rendering
buildBoard();
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ===== CLICK HANDLING =====
document.getElementById('board-canvas').addEventListener('click', e => {
  if (!gameStarted || turnPhase === 'gameover') return;
  const mx = e.clientX, my = e.clientY;

  // Multiplayer: route clicks through WebSocket
  if (mpMode) {
    mpHandleClick(mx, my);
    return;
  }

  // Robber placement
  if (turnPhase === 'robber' && currentPlayer === 0) {
    for (let h of hexes) {
      const dx = mx - h.cx, dy = my - h.cy;
      if (Math.sqrt(dx * dx + dy * dy) < hexSize * 0.8) {
        moveRobber(h.id);
        return;
      }
    }
    return;
  }

  // Road Building (free roads from dev card)
  if (turnPhase === 'road_building' && buildMode === 'road') {
    for (let eIdx of validPositions) {
      const dx = mx - edges[eIdx].mx, dy = my - edges[eIdx].my;
      if (Math.sqrt(dx * dx + dy * dy) < hexSize * 0.28) {
        placeRoadBuildingRoad(eIdx);
        return;
      }
    }
    return;
  }

  // Settlement/City placement
  if (buildMode === 'settlement' || buildMode === 'city') {
    for (let vIdx of validPositions) {
      const dx = mx - vertices[vIdx].x, dy = my - vertices[vIdx].y;
      if (Math.sqrt(dx * dx + dy * dy) < hexSize * 0.25) {
        if (turnPhase === 'setup_settle') placeSetupSettlement(vIdx);
        else placeBuild(buildMode, vIdx);
        return;
      }
    }
  }

  // Road placement
  if (buildMode === 'road') {
    for (let eIdx of validPositions) {
      const dx = mx - edges[eIdx].mx, dy = my - edges[eIdx].my;
      if (Math.sqrt(dx * dx + dy * dy) < hexSize * 0.28) {
        if (turnPhase === 'setup_road') { placeSetupRoad(eIdx); updateUI(); }
        else placeBuild('road', eIdx);
        return;
      }
    }
  }
});

// ===== DEBUG: Press T to test end screen =====
document.addEventListener('keydown', e => {
  if (e.key === 't' && !e.ctrlKey && !e.metaKey && gameStarted && turnPhase !== 'gameover') {
    finalLP = 1000;
    turnPhase = 'gameover';
    document.getElementById('vic-title').textContent = "NOOR WINS!";
    document.getElementById('vic-text').innerHTML = '[TEST] You earned <span style="color:#ffd700">1000 Love Points</span>!';
    document.getElementById('vic-scores').textContent = 'Test mode -- press T during game';
    document.getElementById('vic-btn').textContent = 'Claim Your Prizes!';
    document.getElementById('victory-screen').classList.remove('hidden');
    startConfetti();
  }
});

// ===== GAME LOOP =====
function gameLoop() {
  render();
  updateConfetti();
  requestAnimationFrame(gameLoop);
}

gameLoop();
