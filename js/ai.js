// ===== HARD MODE AI =====

function aiTurn() {
  const p = players[currentPlayer];
  if (!p.isAI || turnPhase === 'gameover') return;

  // Setup placement
  if (turnPhase === 'setup_settle') {
    aiSetupSettlement(p);
    return;
  }

  if (turnPhase === 'setup_road') {
    aiSetupRoad(p);
    return;
  }

  // Pre-roll: consider playing a knight
  if (turnPhase === 'roll') {
    if (!devCardPlayedThisTurn && p.devCards.includes('knight')) {
      if (aiShouldPlayKnight(p)) {
        aiPlayKnight(p);
        if (turnPhase !== 'roll') { setTimeout(aiTurn, 400); return; }
      }
    }

    executeRoll(1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6));
    if (turnPhase === 'robber') { setTimeout(aiTurn, 300); return; }
    if (turnPhase !== 'main') { setTimeout(aiTurn, 300); return; }
  }

  if (turnPhase === 'robber') {
    aiMoveRobber();
    if (turnPhase !== 'main') { setTimeout(aiTurn, 300); return; }
  }

  if (turnPhase === 'main') aiMainPhase();
}

// ===== SETUP: STRATEGIC PLACEMENT =====

function aiSetupSettlement(p) {
  let best = -1, bestScore = -Infinity;

  // Track what resources this player already gets from 1st settlement
  const existingRes = new Set();
  for (let i = 0; i < vertices.length; i++) {
    if (vertexBuildings[i].player === currentPlayer) {
      for (let hId of vertices[i].hexIds) {
        if (hexes[hId].type !== 'desert') existingRes.add(hexes[hId].type);
      }
    }
  }

  for (let v of validPositions) {
    let score = 0;
    const resTypes = new Set();

    for (let hId of vertices[v].hexIds) {
      if (hexes[hId].type === 'desert') continue;
      const pips = pipCount(hexes[hId].number);
      score += pips;
      resTypes.add(hexes[hId].type);

      // Bonus for high-value numbers (6, 8)
      if (hexes[hId].number === 6 || hexes[hId].number === 8) score += 2;
    }

    // Strong bonus for resource diversity
    score += resTypes.size * 3;

    // Second settlement: bonus for resources we don't have yet
    if (setupRound === 2) {
      for (let hId of vertices[v].hexIds) {
        if (hexes[hId].type !== 'desert' && !existingRes.has(hexes[hId].type)) {
          score += 3; // big bonus for new resource type
        }
      }
      // Bonus for getting ore+grain combo (needed for cities and dev cards)
      const newTypes = new Set();
      for (let hId of vertices[v].hexIds) {
        if (hexes[hId].type !== 'desert') newTypes.add(hexes[hId].type);
      }
      const combined = new Set([...existingRes, ...newTypes]);
      if (combined.has('diam') && combined.has('love')) score += 4; // city resources
      if (combined.has('choc') && combined.has('rose')) score += 2; // road resources
    }

    // Bonus for port access
    for (let port of ports) {
      if (port.vertices.includes(v)) {
        if (port.type === 'generic') score += 2;
        else {
          // Specialty port bonus if we produce that resource
          for (let hId of vertices[v].hexIds) {
            if (hexes[hId].type === port.type) { score += 4; break; }
          }
          score += 1;
        }
      }
    }

    if (score > bestScore || (score === bestScore && Math.random() > 0.5)) {
      bestScore = score;
      best = v;
    }
  }

  if (best >= 0) placeSetupSettlement(best);
  else advanceSetup();
}

function aiSetupRoad(p) {
  if (validPositions.length === 0) { advanceSetup(); updateUI(); return; }

  let bestEdge = validPositions[0], bestScore = -1;
  for (let eIdx of validPositions) {
    let score = 0;
    for (let vId of edges[eIdx].v) {
      // Skip the vertex we just built on
      if (vertexBuildings[vId].type) continue;

      // Score based on potential settlement value at end of road
      let tooClose = false;
      for (let adj of vertices[vId].adjVertexIds) {
        if (vertexBuildings[adj].type) { tooClose = true; break; }
      }
      if (tooClose) continue;

      for (let hId of vertices[vId].hexIds) {
        if (hexes[hId].type !== 'desert') score += pipCount(hexes[hId].number);
      }

      // Bonus for port access at end of road
      for (let port of ports) {
        if (port.vertices.includes(vId)) score += 3;
      }
    }
    if (score > bestScore) { bestScore = score; bestEdge = eIdx; }
  }

  placeSetupRoad(bestEdge);
  updateUI();
}

// ===== KNIGHT STRATEGY =====

function aiShouldPlayKnight(p) {
  // Always play to claim/keep largest army
  if (p.knightsPlayed >= 2 && largestArmyPlayer !== currentPlayer) return true;
  if (largestArmyPlayer === currentPlayer && p.knightsPlayed <= largestArmyCount) {
    // Someone might steal it; play defensively if another player is close
    for (let i = 0; i < 4; i++) {
      if (i === currentPlayer) continue;
      if (players[i].knightsPlayed >= largestArmyCount - 1) return true;
    }
  }
  // Play knight if robber is hurting us
  for (let vId of hexes[robberHex].vertexIds) {
    if (vertexBuildings[vId].player === currentPlayer) return true;
  }
  // Play if we have excess knights (3+)
  if (p.devCards.filter(c => c === 'knight').length >= 3) return true;
  return false;
}

function aiPlayKnight(p) {
  const idx = p.devCards.indexOf('knight');
  if (idx === -1) return;
  p.devCards.splice(idx, 1);
  devCardPlayedThisTurn = true;
  p.knightsPlayed++;
  checkLargestArmy();
  logMsg(p.name + " played Cupid's Arrow!");
  turnPhase = 'robber';
  setTimeout(aiTurn, 300);
}

// ===== ROBBER: TARGET LEADER ON HIGH-VALUE HEX =====

function aiMoveRobber() {
  // Find the leading opponent
  let threats = [];
  for (let i = 0; i < 4; i++) {
    if (i === currentPlayer) continue;
    threats.push({ pid: i, vp: getVP(i) });
  }
  threats.sort((a, b) => b.vp - a.vp);
  const leaderPid = threats[0].pid;

  // Also consider player 0 (Noor) as priority target to keep game hard
  const noorVP = getVP(0);
  const targetPid = (noorVP >= threats[0].vp && 0 !== currentPlayer) ? 0 : leaderPid;

  let bh = -1, bv = 0;
  for (let h of hexes) {
    if (h.id === robberHex || h.type === 'desert') continue;
    let val = 0;
    for (let vId of h.vertexIds) {
      const b = vertexBuildings[vId];
      if (b.player === null || b.player === currentPlayer) continue;
      let weight = pipCount(h.number) * (b.type === 'city' ? 2 : 1);
      if (b.player === targetPid) weight *= 2;
      else if (b.player === 0) weight *= 1.3; // slight bias against Noor
      val += weight;
    }
    if (val > bv) { bv = val; bh = h.id; }
  }
  if (bh < 0) {
    const dh = hexes.find(h => h.id !== robberHex);
    bh = dh ? dh.id : 0;
  }
  moveRobber(bh);
}

// ===== MAIN PHASE: STRATEGIC BUILD ORDER =====

function aiMainPhase() {
  const p = players[currentPlayer];
  const myVP = getVP(currentPlayer);

  // Play dev cards (non-knight) strategically
  if (!devCardPlayedThisTurn) {
    aiPlayProgressCards(p);
  }

  // Multiple build attempts in priority order
  let built = true;
  while (built) {
    built = false;

    // Priority 1: City (best VP-per-resource)
    if (canAfford(p, COSTS.city) && p.citiesLeft > 0) {
      const v = getValidCities(currentPlayer);
      if (v.length > 0) {
        // Upgrade settlement with highest resource production
        let bestV = v[0], bestProd = -1;
        for (let vi of v) {
          let prod = 0;
          for (let hId of vertices[vi].hexIds) {
            if (hexes[hId].type !== 'desert' && hexes[hId].id !== robberHex) {
              prod += pipCount(hexes[hId].number);
            }
          }
          if (prod > bestProd) { bestProd = prod; bestV = vi; }
        }
        payCost(p, COSTS.city);
        vertexBuildings[bestV] = { type: 'city', player: currentPlayer };
        p.citiesLeft--;
        p.settlementsLeft++;
        logMsg(p.name + ' built a Dream Home!');
        checkLongestRoad();
        built = true;
        continue;
      }
    }

    // Priority 2: Settlement if good spots available
    if (canAfford(p, COSTS.settlement) && p.settlementsLeft > 0) {
      const v = getValidSettlements(currentPlayer);
      if (v.length > 0) {
        let best = -1, bv = -1;
        for (let vi of v) {
          let val = 0;
          for (let hId of vertices[vi].hexIds) {
            if (hexes[hId].type !== 'desert') val += pipCount(hexes[hId].number);
          }
          // Bonus for port access
          for (let port of ports) {
            if (port.vertices.includes(vi)) val += 3;
          }
          if (val > bv) { bv = val; best = vi; }
        }
        if (best >= 0) {
          payCost(p, COSTS.settlement);
          vertexBuildings[best] = { type: 'settlement', player: currentPlayer };
          p.settlementsLeft--;
          logMsg(p.name + ' built a Date Spot!');
          checkLongestRoad();
          built = true;
          continue;
        }
      }
    }

    // Priority 3: Road - build toward expansion or longest road
    if (canAfford(p, COSTS.road) && p.roadsLeft > 0) {
      const settlements = getValidSettlements(currentPlayer);
      const myRoadLen = computeLR(currentPlayer);
      const chasingLongestRoad = (longestRoadPlayer !== currentPlayer && myRoadLen >= longestRoadLen - 2);
      const needsExpansion = settlements.length === 0;
      const shouldBuildRoad = needsExpansion || chasingLongestRoad || Math.random() > 0.3;

      if (shouldBuildRoad) {
        const v = getValidRoads(currentPlayer);
        if (v.length > 0) {
          let bestEdge = v[0], bestScore = -1;
          for (let eIdx of v) {
            let score = 0;
            for (let vId of edges[eIdx].v) {
              if (vertexBuildings[vId].type) continue;
              let tooClose = false;
              for (let adj of vertices[vId].adjVertexIds) {
                if (vertexBuildings[adj].type) { tooClose = true; break; }
              }
              if (!tooClose) {
                // Score the expansion potential
                for (let hId of vertices[vId].hexIds) {
                  if (hexes[hId].type !== 'desert') score += pipCount(hexes[hId].number);
                }
                // Port bonus
                for (let port of ports) {
                  if (port.vertices.includes(vId)) score += 4;
                }
              }
            }
            // Bonus if this extends our longest road chain
            if (chasingLongestRoad) {
              // Simulate placing road and check if LR increases
              edgeBuildings[eIdx] = { player: currentPlayer };
              const newLen = computeLR(currentPlayer);
              edgeBuildings[eIdx] = { player: null };
              if (newLen > myRoadLen) score += 8;
            }
            if (score > bestScore) { bestScore = score; bestEdge = eIdx; }
          }
          payCost(p, COSTS.road);
          edgeBuildings[bestEdge] = { player: currentPlayer };
          p.roadsLeft--;
          logMsg(p.name + ' built a Love Path!');
          checkLongestRoad();
          built = true;
          continue;
        }
      }
    }

    // Priority 4: Dev card - buy strategically
    if (canAfford(p, COSTS.devcard) && devDeck.length > 0) {
      const wantDevCard = aiWantsDevCard(p, myVP);
      if (wantDevCard) {
        payCost(p, COSTS.devcard);
        const card = devDeck.pop();
        if (card === 'vp') {
          p.vpCards++;
          logMsg(p.name + ' bought a dev card.');
        } else {
          p.newDevCards.push(card);
          logMsg(p.name + ' bought a dev card.');
        }
        built = true;
        continue;
      }
    }

    break; // Nothing more to build
  }

  // Multiple trades per turn to enable builds
  aiTradeLoop(p);

  // After trading, try building again
  let builtAfterTrade = true;
  while (builtAfterTrade) {
    builtAfterTrade = false;

    if (canAfford(p, COSTS.city) && p.citiesLeft > 0) {
      const v = getValidCities(currentPlayer);
      if (v.length > 0) {
        let bestV = v[0], bestProd = -1;
        for (let vi of v) {
          let prod = 0;
          for (let hId of vertices[vi].hexIds) {
            if (hexes[hId].type !== 'desert' && hexes[hId].id !== robberHex) prod += pipCount(hexes[hId].number);
          }
          if (prod > bestProd) { bestProd = prod; bestV = vi; }
        }
        payCost(p, COSTS.city);
        vertexBuildings[bestV] = { type: 'city', player: currentPlayer };
        p.citiesLeft--;
        p.settlementsLeft++;
        logMsg(p.name + ' built a Dream Home!');
        checkLongestRoad();
        builtAfterTrade = true;
      }
    }

    if (canAfford(p, COSTS.settlement) && p.settlementsLeft > 0) {
      const v = getValidSettlements(currentPlayer);
      if (v.length > 0) {
        let best = -1, bv = -1;
        for (let vi of v) {
          let val = 0;
          for (let hId of vertices[vi].hexIds) {
            if (hexes[hId].type !== 'desert') val += pipCount(hexes[hId].number);
          }
          if (val > bv) { bv = val; best = vi; }
        }
        if (best >= 0) {
          payCost(p, COSTS.settlement);
          vertexBuildings[best] = { type: 'settlement', player: currentPlayer };
          p.settlementsLeft--;
          logMsg(p.name + ' built a Date Spot!');
          checkLongestRoad();
          builtAfterTrade = true;
        }
      }
    }

    if (!builtAfterTrade) break;
    aiTradeLoop(p); // Trade again if we built something
  }

  checkVictory();
  updateUI();
  if (turnPhase === 'main') {
    promoteNewDevCards(currentPlayer);
    devCardPlayedThisTurn = false;
    setTimeout(endTurn, 400);
  }
}

// ===== DEV CARD PURCHASE STRATEGY =====

function aiWantsDevCard(p, myVP) {
  // Always buy if close to winning (hidden VP cards!)
  if (myVP >= 7) return true;
  // Buy to chase largest army
  if (p.knightsPlayed >= 2 && largestArmyPlayer !== currentPlayer) return true;
  // Don't overbuy - cap at 4 in hand to avoid flooding
  if (p.devCards.length + p.newDevCards.length >= 4) return false;
  // Buy with ~60% chance if can afford
  return Math.random() > 0.4;
}

// ===== PROGRESS CARD PLAY =====

function aiPlayProgressCards(p) {
  // Road Building - play when we need expansion or chasing longest road
  if (p.devCards.includes('roads') && p.roadsLeft >= 2) {
    const myRoadLen = computeLR(currentPlayer);
    const chasing = longestRoadPlayer !== currentPlayer && myRoadLen >= longestRoadLen - 2;
    const needsExpansion = getValidSettlements(currentPlayer).length === 0;
    if (chasing || needsExpansion || Math.random() > 0.3) {
      const idx = p.devCards.indexOf('roads');
      p.devCards.splice(idx, 1);
      devCardPlayedThisTurn = true;
      logMsg(p.name + ' played Road Building!');
      for (let r = 0; r < 2 && p.roadsLeft > 0; r++) {
        const roads = getValidRoads(currentPlayer);
        if (roads.length > 0) {
          // Pick road that best extends our chain
          let bestEdge = roads[0], bestScore = -1;
          for (let eIdx of roads) {
            let score = 0;
            for (let vId of edges[eIdx].v) {
              if (vertexBuildings[vId].type) continue;
              let tooClose = false;
              for (let adj of vertices[vId].adjVertexIds) {
                if (vertexBuildings[adj].type) { tooClose = true; break; }
              }
              if (!tooClose) {
                for (let hId of vertices[vId].hexIds) {
                  if (hexes[hId].type !== 'desert') score += pipCount(hexes[hId].number);
                }
              }
            }
            if (chasing) {
              edgeBuildings[eIdx] = { player: currentPlayer };
              const newLen = computeLR(currentPlayer);
              edgeBuildings[eIdx] = { player: null };
              if (newLen > computeLR(currentPlayer)) score += 10;
            }
            if (score > bestScore) { bestScore = score; bestEdge = eIdx; }
          }
          edgeBuildings[bestEdge] = { player: currentPlayer };
          p.roadsLeft--;
        }
      }
      checkLongestRoad();
      return;
    }
  }

  // Year of Plenty - take resources to enable the best available build
  if (p.devCards.includes('plenty')) {
    // Always play year of plenty if we can get close to a build
    const idx = p.devCards.indexOf('plenty');
    p.devCards.splice(idx, 1);
    devCardPlayedThisTurn = true;
    logMsg(p.name + ' played Year of Plenty!');

    // Prioritize: city > settlement > dev card > road
    for (let cost of [COSTS.city, COSTS.settlement, COSTS.devcard, COSTS.road]) {
      let needs = [];
      for (let r of RES) {
        const need = (cost[r] || 0) - p.res[r];
        if (need > 0) for (let i = 0; i < need; i++) needs.push(r);
      }
      if (needs.length <= 2) {
        while (needs.length < 2) needs.push(RES[Math.floor(Math.random() * RES.length)]);
        p.res[needs[0]] += bankTake(needs[0], 1);
        p.res[needs[1]] += bankTake(needs[1], 1);
        logMsg(p.name + ' took ' + RES_NAMES[needs[0]] + ' and ' + RES_NAMES[needs[1]] + '.');
        return;
      }
    }
    // Fallback: take what we need most of
    const deficit = {};
    for (let r of RES) deficit[r] = 0;
    for (let cost of [COSTS.city, COSTS.settlement]) {
      for (let r of RES) {
        const need = (cost[r] || 0) - p.res[r];
        if (need > 0) deficit[r] += need;
      }
    }
    const sorted = [...RES].sort((a, b) => deficit[b] - deficit[a]);
    p.res[sorted[0]] += bankTake(sorted[0], 1);
    p.res[sorted[1]] += bankTake(sorted[1], 1);
    return;
  }

  // Monopoly - steal the most valuable resource
  if (p.devCards.includes('monopoly')) {
    const myVP = getVP(currentPlayer);
    // Play more aggressively when close to winning or when opponents have lots of cards
    let maxOppCards = 0;
    for (let r of RES) {
      let total = 0;
      for (let i = 0; i < 4; i++) { if (i !== currentPlayer) total += players[i].res[r]; }
      maxOppCards = Math.max(maxOppCards, total);
    }
    if (myVP >= 6 || maxOppCards >= 4 || Math.random() > 0.5) {
      const idx = p.devCards.indexOf('monopoly');
      p.devCards.splice(idx, 1);
      devCardPlayedThisTurn = true;
      // Target resource with most cards among opponents, weighted by our need
      let bestRes = RES[0], bestVal = 0;
      for (let r of RES) {
        let total = 0;
        for (let i = 0; i < 4; i++) { if (i !== currentPlayer) total += players[i].res[r]; }
        // Weight by how much we need it
        let needWeight = 1;
        for (let cost of [COSTS.city, COSTS.settlement]) {
          if ((cost[r] || 0) > p.res[r]) needWeight += 1;
        }
        const val = total * needWeight;
        if (val > bestVal) { bestVal = val; bestRes = r; }
      }
      logMsg(p.name + ' played Monopoly on ' + RES_NAMES[bestRes] + '!');
      let stolen = 0;
      for (let i = 0; i < 4; i++) {
        if (i === currentPlayer) continue;
        stolen += players[i].res[bestRes];
        p.res[bestRes] += players[i].res[bestRes];
        players[i].res[bestRes] = 0;
      }
      logMsg(p.name + ' stole ' + stolen + ' ' + RES_NAMES[bestRes] + '!');
    }
  }
}

// ===== MULTI-TRADE LOOP =====

function aiTradeLoop(p) {
  // Do up to 3 trades per turn
  for (let t = 0; t < 3; t++) {
    if (!aiDoOneTrade(p)) break;
  }
}

function aiDoOneTrade(p) {
  // Evaluate what build we want most and trade toward it
  const buildGoals = [];
  if (p.citiesLeft > 0 && getValidCities(currentPlayer).length > 0) buildGoals.push(COSTS.city);
  if (p.settlementsLeft > 0 && getValidSettlements(currentPlayer).length > 0) buildGoals.push(COSTS.settlement);
  if (devDeck.length > 0) buildGoals.push(COSTS.devcard);
  if (p.roadsLeft > 0 && getValidRoads(currentPlayer).length > 0) buildGoals.push(COSTS.road);

  for (let target of buildGoals) {
    // Find which resources we need
    for (let need of RES) {
      if (p.res[need] >= (target[need] || 0)) continue;
      // Find a resource we have surplus of to trade
      for (let give of RES) {
        if (give === need) continue;
        const ratio = getTradeRatio(currentPlayer, give);
        const surplus = p.res[give] - (target[give] || 0);
        if (surplus >= ratio) {
          p.res[give] -= ratio;
          bankReturn(give, ratio);
          const taken = bankTake(need, 1);
          p.res[need] += taken;
          logMsg(p.name + ' traded ' + ratio + ' ' + RES_NAMES[give] + ' for 1 ' + RES_NAMES[need] + '.');
          return true;
        }
      }
    }
  }
  return false;
}

// ===== DISCARD: KEEP MOST VALUABLE CARDS =====

function aiDiscard(pid, count) {
  const p = players[pid];
  // Score each resource by how much we need it
  const value = {};
  for (let r of RES) {
    value[r] = 0;
    for (let cost of [COSTS.city, COSTS.settlement, COSTS.devcard]) {
      if ((cost[r] || 0) > 0) value[r] += (cost[r] || 0);
    }
  }
  let d = 0;
  while (d < count) {
    // Discard lowest-value resource with most copies
    let discardRes = null, lowestVal = Infinity;
    for (let r of RES) {
      if (p.res[r] <= 0) continue;
      // Score: lower value = discard first; break ties by having more
      const score = value[r] - p.res[r] * 0.1;
      if (score < lowestVal) { lowestVal = score; discardRes = r; }
    }
    if (!discardRes) break;
    p.res[discardRes]--;
    bankReturn(discardRes, 1);
    d++;
  }
  logMsg(p.name + ' discarded ' + count + ' cards.');
}

// ===== STEAL: TARGET LEADER, PREFER NOOR =====

function aiSteal(t) {
  // Prefer stealing from the leader; bias toward Noor to keep game hard
  let bestTarget = t[0], bestScore = 0;
  for (let pid of t) {
    let score = getVP(pid) * 2 + totalCards(players[pid]);
    if (pid === 0) score += 3; // slight bias against Noor
    if (score > bestScore) { bestScore = score; bestTarget = pid; }
  }
  stealFrom(bestTarget);
}
