// Pure rules and strategy for the two NMHS Nim stations.
// Positions use [coins] for round 1 and [pile A, pile B] for round 3.
(function (root) {
  'use strict';
  const PHI = (1 + Math.sqrt(5)) / 2;

  function validPosition(game, position) {
    const size = game === 'round1' ? 1 : game === 'round3' ? 2 : 0;
    return size > 0 && Array.isArray(position) && position.length === size &&
      position.every(n => Number.isSafeInteger(n) && n >= 0);
  }

  function moves(game, position) {
    if (!validPosition(game, position)) return [];
    if (game === 'round1') {
      return Array.from({length: Math.min(3, position[0])}, (_, i) => [position[0] - i - 1]);
    }
    const [a, b] = position;
    const result = [];
    for (let take = 1; take <= a; take++) result.push([a - take, b]);
    for (let take = 1; take <= b; take++) result.push([a, b - take]);
    for (let take = 1; take <= Math.min(a, b); take++) result.push([a - take, b - take]);
    return result;
  }

  function isLosing(game, position) {
    if (!validPosition(game, position)) return false;
    if (game === 'round1') return position[0] % 4 === 0;
    const a = Math.min(position[0], position[1]);
    const b = Math.max(position[0], position[1]);
    return a === Math.floor((b - a) * PHI);
  }

  function bestMove(game, position) {
    const options = moves(game, position);
    return options.find(next => isLosing(game, next)) || options[0] || null;
  }

  function describeMove(game, from, to) {
    if (!validPosition(game, from) || !validPosition(game, to) ||
        !moves(game, from).some(next => next.every((n, i) => n === to[i]))) return 'Invalid move';
    if (game === 'round1') {
      const n = from[0] - to[0];
      return 'Take ' + n + ' ' + (n === 1 ? 'coin' : 'coins') + '.';
    }
    const a = from[0] - to[0];
    const b = from[1] - to[1];
    if (a && b) return 'Take ' + a + ' ' + (a === 1 ? 'coin' : 'coins') + ' from each pile.';
    const n = a || b;
    return 'Take ' + n + ' ' + (n === 1 ? 'coin' : 'coins') + ' from pile ' + (a ? 'A' : 'B') + '.';
  }

  root.NimEngine = Object.freeze({moves, isLosing, bestMove, describeMove});
})(typeof globalThis !== 'undefined' ? globalThis : window);
