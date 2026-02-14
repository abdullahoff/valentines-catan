// ===== CONFETTI SYSTEM =====
let confettiArr = [], confettiOn = false;

function startConfetti() {
  confettiOn = true;
  confettiArr = [];
  const W = window.innerWidth, H = window.innerHeight;
  const colors = ['#ff4081', '#ff6b9d', '#ffb6c1', '#ffd700', '#ff80ab', '#e040fb'];
  for (let i = 0; i < 120; i++) {
    confettiArr.push({
      x: Math.random() * W,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 5,
      vy: 2 + Math.random() * 4,
      sz: 4 + Math.random() * 5,
      col: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      rs: (Math.random() - 0.5) * 8
    });
  }
}

function stopConfetti() {
  confettiOn = false;
  confettiArr = [];
  const ccv = document.getElementById('confetti-cv');
  if (ccv) ccv.getContext('2d').clearRect(0, 0, ccv.width, ccv.height);
}

function updateConfetti() {
  if (!confettiOn) return;
  const ccv = document.getElementById('confetti-cv');
  if (!ccv) return;
  const cctx = ccv.getContext('2d');
  const W = ccv.width, H = ccv.height;
  cctx.clearRect(0, 0, W, H);
  for (let p of confettiArr) {
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.rs;
    if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
    cctx.save();
    cctx.translate(p.x, p.y);
    cctx.rotate(p.rot * Math.PI / 180);
    cctx.fillStyle = p.col;
    cctx.fillRect(-p.sz / 2, -p.sz / 4, p.sz, p.sz / 2);
    cctx.restore();
  }
}
