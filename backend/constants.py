"""Game constants mirroring js/constants.js."""

RES = ["choc", "rose", "bear", "love", "diam"]
RES_NAMES = {"choc": "Chocolates", "rose": "Roses", "bear": "Teddy Bears", "love": "Love Letters", "diam": "Diamonds"}

HEX_TYPES = [
    "choc", "choc", "choc",
    "rose", "rose", "rose", "rose",
    "bear", "bear", "bear", "bear",
    "love", "love", "love", "love",
    "diam", "diam", "diam",
    "desert",
]
NUM_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]

COSTS = {
    "road":       {"choc": 1, "rose": 1},
    "settlement": {"choc": 1, "rose": 1, "bear": 1, "love": 1},
    "city":       {"love": 2, "diam": 3},
    "devcard":    {"bear": 1, "love": 1, "diam": 1},
}

DEV_DECK = (
    ["knight"] * 14 + ["vp"] * 5 +
    ["roads"] * 2 + ["plenty"] * 2 + ["monopoly"] * 2
)

PLAYER_COLORS = ["#ff4081", "#2196f3", "#ffc107", "#9c27b0"]
PLAYER_NAMES = ["Noor", "Abdullah", "Dequavious", "Jay Quellin"]
BANK_SIZE = 19
