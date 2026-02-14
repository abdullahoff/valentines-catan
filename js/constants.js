// ===== GAME CONSTANTS =====
const RES = ['choc', 'rose', 'bear', 'love', 'diam'];
const RES_NAMES = { choc: 'Chocolates', rose: 'Roses', bear: 'Teddy Bears', love: 'Love Letters', diam: 'Diamonds' };
const RES_COLORS = { choc: '#8B4513', rose: '#dc3545', bear: '#ff69b4', love: '#9b59b6', diam: '#3498db', desert: '#6b6b6b' };
const HEX_TYPES = ['choc', 'choc', 'choc', 'rose', 'rose', 'rose', 'rose', 'bear', 'bear', 'bear', 'bear', 'love', 'love', 'love', 'love', 'diam', 'diam', 'diam', 'desert'];
const NUM_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

const COSTS = {
  road:       { choc: 1, rose: 1, bear: 0, love: 0, diam: 0 },
  settlement: { choc: 1, rose: 1, bear: 1, love: 1, diam: 0 },
  city:       { choc: 0, rose: 0, bear: 0, love: 2, diam: 3 },
  devcard:    { choc: 0, rose: 0, bear: 1, love: 1, diam: 1 }
};

const DEV_DECK_DEF = [
  ...Array(14).fill('knight'),
  ...Array(5).fill('vp'),
  'roads', 'roads',
  'plenty', 'plenty',
  'monopoly', 'monopoly'
];

const PLAYER_COLORS = ['#ff4081', '#2196f3', '#ffc107', '#9c27b0'];
const PLAYER_NAMES = ['Noor', 'Abdullah', 'Dequavious', 'Jay Quellin'];

// Resource icon names (keys into Icons system)
const RES_ICON_KEYS = { choc: 'choc', rose: 'rose', bear: 'bear', love: 'love', diam: 'diam' };

// ===== PRIZES =====
const PRIZES = [
  { id: 0, name: 'Candy Basket',       icon: 'candy',   cost: 200,  desc: 'A basket of sweets and chocolate' },
  { id: 1, name: 'Fresh Flowers',      icon: 'flowers', cost: 250,  desc: 'Beautiful bouquet delivered' },
  { id: 2, name: '3 Games of Catan',   icon: 'dice',    cost: 300,  desc: 'Three Catan game nights with Abdullah' },
  { id: 3, name: 'Abdullah 2hr Coupon',icon: 'ticket',  cost: 350,  desc: 'Abdullah drops EVERYTHING for 2hrs. No matter what.' },
  { id: 4, name: 'Lego Set',           icon: 'brick',   cost: 400,  desc: 'A Lego set of your choice' },
  { id: 5, name: 'Perfume',            icon: 'sparkle', cost: 450,  desc: "That perfume you've been eyeing" },
  { id: 6, name: 'Surprise Jewelry',   icon: 'ring',    cost: 500,  desc: 'A surprise piece of jewelry' },
  { id: 7, name: 'Mexico Vacation',    icon: 'beach',   cost: 2000, desc: 'All-inclusive trip to Mexico! March 21st weekend!', impossible: true }
];

// ===== UTILITY =====
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pipCount(n) {
  return n === 0 ? 0 : 6 - Math.abs(7 - n);
}

function canAfford(p, cost) {
  for (let r of RES) {
    if ((p.res[r] || 0) < (cost[r] || 0)) return false;
  }
  return true;
}

function payCost(p, cost) {
  for (let r of RES) {
    const amt = cost[r] || 0;
    p.res[r] -= amt;
    bankReturn(r, amt);
  }
}

function totalCards(p) {
  return Object.values(p.res).reduce((a, b) => a + b, 0);
}

// ===== RESOURCE BANK =====
const BANK_SIZE = 19; // 19 cards per resource type
let resourceBank = {};

function initBank() {
  resourceBank = {};
  for (let r of RES) resourceBank[r] = BANK_SIZE;
}

// Take resources from bank (returns actual amount taken, may be less if bank empty)
function bankTake(resource, amount) {
  const available = Math.min(amount, resourceBank[resource]);
  resourceBank[resource] -= available;
  return available;
}

// Return resources to bank
function bankReturn(resource, amount) {
  resourceBank[resource] += amount;
}
