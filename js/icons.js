// ===== SVG ICON SYSTEM =====
// Provides both inline SVG strings (for DOM) and canvas draw functions (for canvas rendering)

const Icons = {
  // Returns inline SVG string for use in innerHTML
  svg(name, size = 16) {
    const fn = Icons._svgMap[name];
    if (!fn) return `<span style="font-size:${size}px">?</span>`;
    return fn(size);
  },

  // Draws icon on canvas context
  draw(ctx, name, x, y, size) {
    const fn = Icons._drawMap[name];
    if (fn) fn(ctx, x, y, size);
  },

  _svgMap: {
    choc(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="6" width="18" height="12" rx="2" fill="#6B3A2A" stroke="#4A2518" stroke-width="1"/>
        <line x1="9" y1="6" x2="9" y2="18" stroke="#4A2518" stroke-width="0.8"/>
        <line x1="15" y1="6" x2="15" y2="18" stroke="#4A2518" stroke-width="0.8"/>
        <line x1="3" y1="12" x2="21" y2="12" stroke="#4A2518" stroke-width="0.8"/>
        <rect x="3" y="6" width="18" height="3" rx="1" fill="#8B5E3C" opacity="0.5"/>
      </svg>`;
    },
    rose(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4C10 4 8 6 8 8C8 10 10 11 12 11C14 11 16 10 16 8C16 6 14 4 12 4Z" fill="#E53E3E"/>
        <path d="M10 6C9 6 7 7.5 7.5 9.5C8 11 10 11 10 11" fill="#C53030"/>
        <path d="M14 6C15 6 17 7.5 16.5 9.5C16 11 14 11 14 11" fill="#FC8181"/>
        <line x1="12" y1="11" x2="12" y2="21" stroke="#38A169" stroke-width="1.5"/>
        <path d="M12 14C10 13 9 14 9 15" stroke="#38A169" stroke-width="1" fill="none"/>
        <path d="M12 17C14 16 15 17 15 18" stroke="#38A169" stroke-width="1" fill="none"/>
      </svg>`;
    },
    bear(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="7" r="3" fill="#D4A574"/>
        <circle cx="16" cy="7" r="3" fill="#D4A574"/>
        <circle cx="8" cy="7" r="1.5" fill="#C4956A"/>
        <circle cx="16" cy="7" r="1.5" fill="#C4956A"/>
        <circle cx="12" cy="13" r="6" fill="#D4A574"/>
        <circle cx="10" cy="11.5" r="0.8" fill="#4A3728"/>
        <circle cx="14" cy="11.5" r="0.8" fill="#4A3728"/>
        <ellipse cx="12" cy="13" rx="1.2" ry="0.8" fill="#4A3728"/>
        <path d="M12 13.8C11 14.5 10.5 14 10.5 14" stroke="#4A3728" stroke-width="0.5" fill="none"/>
        <circle cx="12" cy="15.5" r="1" fill="#FF6B9D" opacity="0.5"/>
      </svg>`;
    },
    love(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="6" width="16" height="12" rx="1" fill="#E8D5B7" stroke="#C4A882" stroke-width="1"/>
        <path d="M4 7L12 13L20 7" stroke="#C4A882" stroke-width="1" fill="none"/>
        <path d="M12 11C11 10 9.5 10.5 9.5 11.5C9.5 12.5 12 14 12 14C12 14 14.5 12.5 14.5 11.5C14.5 10.5 13 10 12 11Z" fill="#E53E3E"/>
      </svg>`;
    },
    diam(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3L5 10L12 21L19 10L12 3Z" fill="#60A5FA" stroke="#3B82F6" stroke-width="1"/>
        <path d="M5 10L19 10" stroke="#3B82F6" stroke-width="0.8"/>
        <path d="M12 3L9 10L12 21" fill="#93C5FD" opacity="0.5"/>
        <path d="M12 3L15 10L12 21" fill="#2563EB" opacity="0.3"/>
      </svg>`;
    },
    desert(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 12C6 9 8 7 10 7C10 5 12 4 14 5C15 3 18 3 19 5C21 5 22 7 21 9" stroke="#6B6B6B" stroke-width="1.5" fill="#9CA3AF" opacity="0.6"/>
        <path d="M5 18Q8 15 12 18Q16 15 19 18" stroke="#D4A574" stroke-width="2" fill="none"/>
      </svg>`;
    },
    broken_heart(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21C12 21 3 15 3 9C3 6 5 4 8 4C9.5 4 11 5 12 6.5C13 5 14.5 4 16 4C19 4 21 6 21 9C21 15 12 21 12 21Z" fill="#991B1B"/>
        <path d="M13 6L11 11L14 12L10 19" stroke="#1A0A2E" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
    },
    heart(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21C12 21 3 15 3 9C3 6 5 4 8 4C9.5 4 11 5 12 6.5C13 5 14.5 4 16 4C19 4 21 6 21 9C21 15 12 21 12 21Z" fill="#FF4081"/>
      </svg>`;
    },
    knight(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14 8L20 8L15 12L17 19L12 15L7 19L9 12L4 8L10 8L12 2Z" fill="#FFD700" stroke="#DAA520" stroke-width="0.5"/>
        <circle cx="12" cy="10" r="2" fill="#FF4081"/>
      </svg>`;
    },
    vp_card(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.5 8.5L21.5 9.5L16.5 14L18 21L12 17.5L6 21L7.5 14L2.5 9.5L9.5 8.5L12 2Z" fill="#FFD700" stroke="#DAA520" stroke-width="1"/>
      </svg>`;
    },
    devcard(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="2" width="14" height="20" rx="2" fill="#2D1B4E" stroke="#FFD700" stroke-width="1.5"/>
        <text x="12" y="14" text-anchor="middle" fill="#FFD700" font-size="8" font-weight="bold">?</text>
      </svg>`;
    },
    road_award(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 20L8 4" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
        <path d="M20 20L16 4" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 12L18 12" stroke="#FFD700" stroke-width="1" stroke-dasharray="2 2"/>
        <circle cx="12" cy="6" r="3" fill="#FFD700" stroke="#DAA520" stroke-width="1"/>
      </svg>`;
    },
    army_award(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14 6L18 6L15 9L16 13L12 11L8 13L9 9L6 6L10 6L12 2Z" fill="#FFD700"/>
        <path d="M8 15L12 13L16 15L16 20L12 22L8 20Z" fill="#FF4081" stroke="#CC3366" stroke-width="0.5"/>
      </svg>`;
    },
    candy(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="12" cy="12" rx="5" ry="4" fill="#FF4081"/>
        <path d="M7 12C5 10 4 8 5 7" stroke="#FF80AB" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M17 12C19 10 20 8 19 7" stroke="#FF80AB" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="9" y1="9" x2="11" y2="15" stroke="#FFB6C1" stroke-width="0.8" opacity="0.6"/>
        <line x1="13" y1="9" x2="15" y2="15" stroke="#FFB6C1" stroke-width="0.8" opacity="0.6"/>
      </svg>`;
    },
    flowers(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="10" y1="13" x2="8" y2="21" stroke="#38A169" stroke-width="1.5"/>
        <line x1="12" y1="12" x2="12" y2="21" stroke="#38A169" stroke-width="1.5"/>
        <line x1="14" y1="13" x2="16" y2="21" stroke="#38A169" stroke-width="1.5"/>
        <circle cx="10" cy="8" r="3" fill="#E53E3E"/>
        <circle cx="14" cy="7" r="3" fill="#FF6B9D"/>
        <circle cx="12" cy="5" r="3" fill="#FFB6C1"/>
        <circle cx="10" cy="8" r="1" fill="#FFD700"/>
        <circle cx="14" cy="7" r="1" fill="#FFD700"/>
        <circle cx="12" cy="5" r="1" fill="#FFD700"/>
      </svg>`;
    },
    dice(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="#FFF" stroke="#333" stroke-width="1.5"/>
        <circle cx="8" cy="8" r="1.5" fill="#333"/>
        <circle cx="16" cy="8" r="1.5" fill="#333"/>
        <circle cx="12" cy="12" r="1.5" fill="#333"/>
        <circle cx="8" cy="16" r="1.5" fill="#333"/>
        <circle cx="16" cy="16" r="1.5" fill="#333"/>
      </svg>`;
    },
    ticket(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="6" width="20" height="12" rx="2" fill="#FF4081"/>
        <line x1="16" y1="6" x2="16" y2="18" stroke="#FFF" stroke-width="1" stroke-dasharray="2 2"/>
        <circle cx="9" cy="12" r="2" fill="#FFF" opacity="0.3"/>
        <text x="9" y="13" text-anchor="middle" fill="#FFF" font-size="4" font-weight="bold">2H</text>
      </svg>`;
    },
    brick(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="16" height="16" rx="1" fill="#E53E3E" stroke="#C53030" stroke-width="1"/>
        <rect x="4" y="4" width="16" height="5" rx="1" fill="#FC8181"/>
        <circle cx="8" cy="14" r="1.5" fill="#FF0" opacity="0.8"/>
        <circle cx="12" cy="10" r="1.5" fill="#00BCD4" opacity="0.8"/>
        <circle cx="16" cy="14" r="1.5" fill="#4CAF50" opacity="0.8"/>
      </svg>`;
    },
    sparkle(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L13.5 9L20 8L14.5 12L18 19L12 14.5L6 19L9.5 12L4 8L10.5 9L12 2Z" fill="#FFD700" stroke="#DAA520" stroke-width="0.5"/>
        <circle cx="12" cy="11" r="2" fill="#FFF" opacity="0.6"/>
      </svg>`;
    },
    ring(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="12" cy="15" rx="6" ry="5" fill="none" stroke="#FFD700" stroke-width="2.5"/>
        <path d="M9 11L12 6L15 11" fill="#60A5FA" stroke="#3B82F6" stroke-width="1"/>
        <path d="M10 11L12 7.5L14 11" fill="#93C5FD"/>
      </svg>`;
    },
    beach(s) {
      return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 4C14 4 18 5 19 8C20 11 17 12 14 10" stroke="#38A169" stroke-width="1.5" fill="#48BB78"/>
        <path d="M14 4C14 4 10 5 9 8C8 11 11 12 14 10" stroke="#38A169" stroke-width="1.5" fill="#68D391"/>
        <line x1="14" y1="4" x2="14" y2="20" stroke="#8B6914" stroke-width="2"/>
        <path d="M2 18Q6 15 12 18Q18 15 22 18L22 22L2 22Z" fill="#F6E05E"/>
        <path d="M2 20Q8 17 14 20Q20 17 22 20L22 22L2 22Z" fill="#3182CE" opacity="0.4"/>
      </svg>`;
    }
  },

  _drawMap: {
    choc(ctx, x, y, s) {
      const hs = s / 2;
      ctx.fillStyle = '#6B3A2A';
      ctx.fillRect(x - hs, y - hs * 0.6, s, s * 0.6);
      ctx.strokeStyle = '#4A2518';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - hs, y - hs * 0.6, s, s * 0.6);
      // grid lines
      ctx.beginPath();
      ctx.moveTo(x - hs * 0.33, y - hs * 0.6);
      ctx.lineTo(x - hs * 0.33, y + hs * 0.6 - s * 0.4);
      ctx.moveTo(x + hs * 0.33, y - hs * 0.6);
      ctx.lineTo(x + hs * 0.33, y + hs * 0.6 - s * 0.4);
      ctx.stroke();
    },
    rose(ctx, x, y, s) {
      const r = s * 0.35;
      // Stem
      ctx.strokeStyle = '#38A169';
      ctx.lineWidth = s * 0.08;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + s * 0.4);
      ctx.stroke();
      // Petals
      ctx.fillStyle = '#E53E3E';
      ctx.beginPath();
      ctx.arc(x, y - r * 0.3, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FC8181';
      ctx.beginPath();
      ctx.arc(x - r * 0.4, y - r * 0.1, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    },
    bear(ctx, x, y, s) {
      const r = s * 0.3;
      // Ears
      ctx.fillStyle = '#D4A574';
      ctx.beginPath(); ctx.arc(x - r * 0.9, y - r * 0.9, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.9, y - r * 0.9, r * 0.5, 0, Math.PI * 2); ctx.fill();
      // Head
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      // Eyes
      ctx.fillStyle = '#4A3728';
      ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
      // Nose
      ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.15, 0, Math.PI * 2); ctx.fill();
    },
    love(ctx, x, y, s) {
      const hs = s / 2;
      // Envelope
      ctx.fillStyle = '#E8D5B7';
      ctx.fillRect(x - hs, y - hs * 0.5, s, s * 0.6);
      ctx.strokeStyle = '#C4A882';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - hs, y - hs * 0.5, s, s * 0.6);
      // Flap
      ctx.beginPath();
      ctx.moveTo(x - hs, y - hs * 0.5);
      ctx.lineTo(x, y + hs * 0.1);
      ctx.lineTo(x + hs, y - hs * 0.5);
      ctx.strokeStyle = '#C4A882';
      ctx.stroke();
      // Heart
      Icons._drawMap._heart(ctx, x, y - hs * 0.1, s * 0.25, '#E53E3E');
    },
    diam(ctx, x, y, s) {
      const hs = s / 2;
      ctx.fillStyle = '#60A5FA';
      ctx.beginPath();
      ctx.moveTo(x, y - hs);
      ctx.lineTo(x + hs * 0.7, y - hs * 0.1);
      ctx.lineTo(x, y + hs);
      ctx.lineTo(x - hs * 0.7, y - hs * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Facet
      ctx.fillStyle = '#93C5FD';
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y - hs);
      ctx.lineTo(x - hs * 0.35, y - hs * 0.1);
      ctx.lineTo(x, y + hs);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    broken_heart(ctx, x, y, s) {
      Icons._drawMap._heart(ctx, x, y, s * 0.4, '#991B1B');
      ctx.strokeStyle = '#1a0a2e';
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.02, y - s * 0.15);
      ctx.lineTo(x - s * 0.04, y);
      ctx.lineTo(x + s * 0.04, y + s * 0.02);
      ctx.lineTo(x - s * 0.02, y + s * 0.15);
      ctx.stroke();
    },
    // Utility: draw a heart shape
    _heart(ctx, x, y, r, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y + r);
      ctx.bezierCurveTo(x - r * 2, y - r * 0.5, x - r * 0.5, y - r * 2, x, y - r * 0.5);
      ctx.bezierCurveTo(x + r * 0.5, y - r * 2, x + r * 2, y - r * 0.5, x, y + r);
      ctx.fill();
    }
  }
};
