// ===== TITLE SCREEN =====
let noClicks = 0;
const noMsgs = [
  "Wait... seriously?",
  "Noor. Abdullah needs you. He can't trade with himself.",
  "The AI players are SETTLING everywhere because of you.",
  "I can't believe you'd leave him to play alone.",
  "FINE. He'll play Catan by himself. *cries in hexagons*",
  "NOOR PLEASE.",
  ""
];

function declineQuest() {
  noClicks++;
  const nb = document.getElementById('no-btn');
  const yb = document.getElementById('yes-btn');
  const msg = document.getElementById('no-msg');

  if (noClicks <= 6) msg.textContent = noMsgs[noClicks - 1];

  switch (noClicks) {
    case 1:
      nb.classList.add('shake');
      setTimeout(() => nb.classList.remove('shake'), 300);
      break;
    case 2:
      nb.style.fontSize = '10px';
      nb.style.padding = '8px 15px';
      yb.style.fontSize = '20px';
      yb.style.padding = '18px 36px';
      break;
    case 3:
      nb.classList.add('flee');
      nb.style.fontSize = '8px';
      nb.style.padding = '6px 12px';
      break;
    case 4:
      nb.style.fontSize = '6px';
      nb.style.padding = '4px 8px';
      yb.style.fontSize = '26px';
      yb.style.padding = '22px 44px';
      break;
    case 5:
      nb.style.fontSize = '5px';
      nb.style.padding = '2px 4px';
      nb.style.opacity = '0.4';
      break;
    case 6:
      nb.style.opacity = '0.2';
      nb.classList.remove('flee');
      nb.classList.add('flicker');
      nb.style.pointerEvents = 'none';
      break;
    case 7:
      nb.style.display = 'none';
      msg.textContent = "THAT'S WHAT I THOUGHT.";
      msg.style.fontSize = 'clamp(14px,2.5vw,22px)';
      msg.style.color = '#ff4081';
      yb.style.fontSize = '30px';
      yb.style.padding = '28px 56px';
      startConfetti();
      setTimeout(acceptQuest, 2200);
      break;
  }
}

function acceptQuest() {
  document.getElementById('title-screen').classList.add('hidden');
  stopConfetti();
  initGame();
}
