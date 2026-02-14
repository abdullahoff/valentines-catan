// ===== CANVAS RENDERING =====

function render() {
  const cv = document.getElementById('board-canvas');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  if (!gameStarted) { renderTitleBg(ctx); return; }

  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(0, 0, W, H);

  // Ocean circle
  ctx.fillStyle = '#0a1628';
  ctx.beginPath();
  ctx.arc(boardCX, boardCY, hexSize * 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Ports
  for (let port of ports) drawPort(ctx, port);

  // Hexes
  for (let h of hexes) drawHex(ctx, h);

  // Roads
  for (let i = 0; i < edges.length; i++) {
    if (edgeBuildings[i].player !== null) drawRoad(ctx, edges[i], players[edgeBuildings[i].player].color);
  }

  // Valid position highlights
  if (buildMode === 'road') {
    for (let eIdx of validPositions) {
      const e = edges[eIdx];
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + Math.sin(animFrame * 0.1) * 0.2) + ')';
      ctx.lineWidth = 5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(vertices[e.v[0]].x, vertices[e.v[0]].y);
      ctx.lineTo(vertices[e.v[1]].x, vertices[e.v[1]].y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (buildMode === 'settlement' || buildMode === 'city') {
    for (let vIdx of validPositions) {
      const al = 0.3 + Math.sin(animFrame * 0.1) * 0.25;
      ctx.fillStyle = 'rgba(255,215,0,' + al + ')';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(vertices[vIdx].x, vertices[vIdx].y, hexSize * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Buildings
  for (let i = 0; i < vertices.length; i++) {
    const b = vertexBuildings[i];
    if (b.type) drawBuilding(ctx, vertices[i].x, vertices[i].y, b.type, players[b.player].color);
  }

  // Robber
  const rh = hexes[robberHex];
  if (rh) {
    ctx.fillStyle = 'rgba(30,0,0,0.75)';
    ctx.beginPath();
    ctx.arc(rh.cx, rh.cy, hexSize * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.stroke();
    Icons.draw(ctx, 'broken_heart', rh.cx, rh.cy, hexSize * 0.35);
  }

  animFrame++;
}

function drawHex(ctx, h) {
  const cx = h.cx, cy = h.cy, s = hexSize;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 3;
    const x = cx + s * Math.cos(a), y = cy + s * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();

  const col = RES_COLORS[h.type] || '#6b6b6b';
  ctx.fillStyle = col + 'bb';
  ctx.fill();
  ctx.strokeStyle = '#1a0a2e';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Darken robber hex
  if (h.id === robberHex && h.type !== 'desert') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
  }

  // Resource icon
  const iconKey = h.type === 'desert' ? 'broken_heart' : h.type;
  Icons.draw(ctx, iconKey, cx, cy - s * 0.22, s * 0.38);

  // Number token
  if (h.number > 0) {
    const r = s * 0.24;
    ctx.fillStyle = '#f5e6c8';
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.15, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = (h.number === 6 || h.number === 8) ? '#dc3545' : '#333';
    ctx.font = 'bold ' + Math.round(r * 1.1) + 'px "Press Start 2P",monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(h.number, cx, cy + s * 0.16);

    // Pip dots
    const pips = pipCount(h.number);
    const py = cy + s * 0.15 + r * 0.75;
    for (let p = 0; p < pips; p++) {
      ctx.fillStyle = (h.number === 6 || h.number === 8) ? '#dc3545' : '#888';
      ctx.beginPath();
      ctx.arc(cx + (p - (pips - 1) / 2) * 4, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRoad(ctx, e, color) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = hexSize * 0.15;
  ctx.beginPath();
  ctx.moveTo(vertices[e.v[0]].x, vertices[e.v[0]].y);
  ctx.lineTo(vertices[e.v[1]].x, vertices[e.v[1]].y);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = hexSize * 0.1;
  ctx.beginPath();
  ctx.moveTo(vertices[e.v[0]].x, vertices[e.v[0]].y);
  ctx.lineTo(vertices[e.v[1]].x, vertices[e.v[1]].y);
  ctx.stroke();
}

function drawBuilding(ctx, x, y, type, color) {
  const s = hexSize * 0.2;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + s, s * 1.2, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (type === 'settlement') {
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x - s, y - s * 0.5, s * 2, s * 1.5);
    ctx.strokeRect(x - s, y - s * 0.5, s * 2, s * 1.5);
    ctx.beginPath();
    ctx.moveTo(x - s * 1.3, y - s * 0.5);
    ctx.lineTo(x, y - s * 1.6);
    ctx.lineTo(x + s * 1.3, y - s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    const cs = s * 1.5;
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 2;
    ctx.fillRect(x - cs, y - cs * 0.2, cs * 2, cs * 1.2);
    ctx.strokeRect(x - cs, y - cs * 0.2, cs * 2, cs * 1.2);
    ctx.fillRect(x - cs * 0.35, y - cs * 1.3, cs * 0.7, cs * 1.1);
    ctx.strokeRect(x - cs * 0.35, y - cs * 1.3, cs * 0.7, cs * 1.1);
    ctx.beginPath();
    ctx.moveTo(x - cs * 1.2, y - cs * 0.2);
    ctx.lineTo(x, y - cs * 1);
    ctx.lineTo(x + cs * 1.2, y - cs * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Tower flag
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x - cs * 0.15, y - cs * 1.7, cs * 0.3, cs * 0.35);
  }
}

function drawPort(ctx, port) {
  const v1 = vertices[port.vertices[0]], v2 = vertices[port.vertices[1]];
  const mx = (v1.x + v2.x) / 2, my = (v1.y + v2.y) / 2;
  // Push outward from board center
  const dx = mx - boardCX, dy = my - boardCY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ox = mx + dx / dist * hexSize * 0.5;
  const oy = my + dy / dist * hexSize * 0.5;

  // Draw connecting lines to port vertices
  ctx.strokeStyle = '#ffd70066';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(v1.x, v1.y); ctx.lineTo(ox, oy);
  ctx.moveTo(v2.x, v2.y); ctx.lineTo(ox, oy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Port circle
  const r = hexSize * 0.22;
  ctx.fillStyle = port.type === 'generic' ? '#33333399' : (RES_COLORS[port.type] + '99');
  ctx.beginPath();
  ctx.arc(ox, oy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = port.type === 'generic' ? '#ffd700' : RES_COLORS[port.type];
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Ratio text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + Math.round(r * 0.85) + 'px "Press Start 2P",monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(port.ratio + ':1', ox, oy);
}

function renderTitleBg(ctx) {
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(0, 0, W, H);
  animFrame++;
  // Floating pixel hearts
  for (let i = 0; i < 15; i++) {
    const x = (i * 137 + animFrame * 0.3) % W;
    const y = (i * 97 + animFrame * 0.5) % (H + 40) - 20;
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ff6b9d';
    const sz = 10 + i % 10;
    const sc = sz / 8;
    ctx.fillRect(x + sc, y, sc * 2, sc);
    ctx.fillRect(x + 5 * sc, y, sc * 2, sc);
    ctx.fillRect(x, y + sc, sc * 4, sc);
    ctx.fillRect(x + 4 * sc, y + sc, sc * 4, sc);
    ctx.fillRect(x, y + 2 * sc, sc * 8, sc);
    ctx.fillRect(x, y + 3 * sc, sc * 8, sc);
    ctx.fillRect(x + sc, y + 4 * sc, sc * 6, sc);
    ctx.fillRect(x + 2 * sc, y + 5 * sc, sc * 4, sc);
    ctx.fillRect(x + 3 * sc, y + 6 * sc, sc * 2, sc);
  }
  ctx.globalAlpha = 1;
}
