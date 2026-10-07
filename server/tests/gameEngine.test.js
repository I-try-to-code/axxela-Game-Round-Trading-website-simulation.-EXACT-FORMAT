import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DigitRevealEngine } from '../src/engines/digitRevealEngine.js';
import { PositionEngine } from '../src/engines/positionEngine.js';
import { PnlEngine } from '../src/engines/pnlEngine.js';
import { SettlementEngine } from '../src/engines/settlementEngine.js';
import { TradeEngine } from '../src/engines/tradeEngine.js';
import { LeaderboardEngine } from '../src/engines/leaderboardEngine.js';
import { BotEngine } from '../src/engines/botEngine.js';
import { GameEngine } from '../src/engines/gameEngine.js';

describe('DigitRevealEngine & Expected Value', () => {
  test('Deterministic demo sequence has sum 27 and correct reveal counts', () => {
    const engine = new DigitRevealEngine({ isDeterministicDemo: true });
    assert.deepEqual(engine.getSecretDigits(), [5, 7, 2, 4, 1, 8]);
    assert.equal(engine.getFinalSum(), 27);

    // Round 1: 0 digits
    assert.deepEqual(engine.getRevealedDigitsForRound(1), []);
    // Round 2: 1 digit [5]
    assert.deepEqual(engine.getRevealedDigitsForRound(2), [5]);
    // Round 3: 2 digits [5, 7]
    assert.deepEqual(engine.getRevealedDigitsForRound(3), [5, 7]);
    // Round 4: 3 digits [5, 7, 2]
    assert.deepEqual(engine.getRevealedDigitsForRound(4), [5, 7, 2]);
    // Round 5: 4 digits [5, 7, 2, 4]
    assert.deepEqual(engine.getRevealedDigitsForRound(5), [5, 7, 2, 4]);
    // Round 6: 5 digits [5, 7, 2, 4, 1]
    assert.deepEqual(engine.getRevealedDigitsForRound(6), [5, 7, 2, 4, 1]);
    // After Round 6: all 6 digits
    assert.deepEqual(engine.getRevealedDigitsForRound(6, true), [5, 7, 2, 4, 1, 8]);
  });

  test('Fair value expected sum calculations', () => {
    const engine = new DigitRevealEngine({ isDeterministicDemo: true });
    // Round 1: 6 * 4.5 = 27
    const r1 = engine.getExpectedValue(1);
    assert.equal(r1.expectedValue, 27);
    assert.equal(r1.minPossible, 0);
    assert.equal(r1.maxPossible, 54);

    // Round 2: 5 + 5 * 4.5 = 27.5
    const r2 = engine.getExpectedValue(2);
    assert.equal(r2.expectedValue, 27.5);
    assert.equal(r2.minPossible, 5);
    assert.equal(r2.maxPossible, 50);

    // Round 3: 5 + 7 + 4 * 4.5 = 30
    const r3 = engine.getExpectedValue(3);
    assert.equal(r3.expectedValue, 30);
  });
});

describe('PositionEngine & Limits', () => {
  test('Enforces strict -2 to +2 limits but allows unlimited round-trip trades', () => {
    const pos = new PositionEngine();
    pos.initPlayer('A');
    pos.initPlayer('B');

    assert.equal(pos.getPosition('A'), 0);
    assert.equal(pos.canBuy('A'), true);
    assert.equal(pos.canSell('A'), true);

    // Buy 1
    pos.applyTrade('A', 'B', 20, 1);
    assert.equal(pos.getPosition('A'), 1);
    assert.equal(pos.getPosition('B'), -1);

    // Buy 2nd
    pos.applyTrade('A', 'B', 21, 1);
    assert.equal(pos.getPosition('A'), 2);
    assert.equal(pos.getPosition('B'), -2);

    // Cannot buy 3rd
    assert.equal(pos.canBuy('A'), false);
    assert.equal(pos.canSell('B'), false);
    assert.throws(() => pos.applyTrade('A', 'B', 22, 1));

    // Selling restores capacity
    pos.applyTrade('B', 'A', 25, 1); // B buys 1 from A (A sells 1)
    assert.equal(pos.getPosition('A'), 1);
    assert.equal(pos.getPosition('B'), -1);
    assert.equal(pos.canBuy('A'), true);

    // Continuous trades (e.g. 10 round trips)
    for (let i = 0; i < 10; i++) {
      pos.applyTrade('A', 'B', 20, 1); // A at +2, B at -2
      pos.applyTrade('B', 'A', 25, 1); // A at +1, B at -1
    }
    assert.equal(pos.getPosition('A'), 1);
    assert.equal(pos.getPosition('B'), -1);
  });
});

describe('PnlEngine Realized P&L', () => {
  test('Long: Buy @ 20, Sell @ 25 -> Profit +5', () => {
    const pnl = new PnlEngine();
    pnl.processTrade('A', 'B', 20, 1);
    const result = pnl.processTrade('B', 'A', 25, 1); // A sells to B at 25
    assert.equal(pnl.getRealizedPnL('A'), 5);
  });

  test('Long: Buy @ 25, Sell @ 20 -> Profit -5', () => {
    const pnl = new PnlEngine();
    pnl.processTrade('A', 'B', 25, 1);
    pnl.processTrade('B', 'A', 20, 1);
    assert.equal(pnl.getRealizedPnL('A'), -5);
  });

  test('Short: Sell @ 30, Buy @ 24 -> Profit +6', () => {
    const pnl = new PnlEngine();
    pnl.processTrade('B', 'A', 30, 1); // A sells to B at 30 (A is short)
    pnl.processTrade('A', 'B', 24, 1); // A buys from B at 24 (A covers)
    assert.equal(pnl.getRealizedPnL('A'), 6);
  });

  test('Short: Sell @ 24, Buy @ 30 -> Loss -6', () => {
    const pnl = new PnlEngine();
    pnl.processTrade('B', 'A', 24, 1); // A sells to B at 24
    pnl.processTrade('A', 'B', 30, 1); // A buys from B at 30
    assert.equal(pnl.getRealizedPnL('A'), -6);
  });
});

describe('SettlementEngine', () => {
  test('Settles open long +2 at avg 23 with final sum 27 -> +8', () => {
    const openLots = new Map([
      ['A', [{ side: 'BUY', price: 23 }, { side: 'BUY', price: 23 }]]
    ]);
    const realized = new Map([['A', 0]]);

    const results = SettlementEngine.settleAll(27, openLots, realized);
    assert.equal(results['A'].settlementPnl, 8);
    assert.equal(results['A'].finalPnl, 8);
  });

  test('Settles open short -2 at avg 30 with final sum 27 -> +6', () => {
    const openLots = new Map([
      ['A', [{ side: 'SELL', price: 30 }, { side: 'SELL', price: 30 }]]
    ]);
    const realized = new Map([['A', 0]]);

    const results = SettlementEngine.settleAll(27, openLots, realized);
    assert.equal(results['A'].settlementPnl, 6);
    assert.equal(results['A'].finalPnl, 6);
  });

  test('Player A buys @ 25, game ends at 27 -> +2', () => {
    const openLots = new Map([
      ['A', [{ side: 'BUY', price: 25 }]]
    ]);
    const realized = new Map([['A', 0]]);

    const results = SettlementEngine.settleAll(27, openLots, realized);
    assert.equal(results['A'].settlementPnl, 2);
    assert.equal(results['A'].finalPnl, 2);
  });
});

describe('TradeEngine Working Orders & Limits', () => {
  test('Maker quotes BUY, Taker takes it -> executed trade', () => {
    const pos = new PositionEngine();
    const pnl = new PnlEngine();
    const tradeEngine = new TradeEngine(pos, pnl);

    pos.initPlayer('A');
    pos.initPlayer('C');

    // A places broadcast BUY working order @ 24
    const order = tradeEngine.createWorkingOrder({
      playerId: 'A',
      playerLetter: 'A',
      side: 'BUY',
      price: 24,
      round: 2
    });

    assert.equal(order.status, 'OPEN');
    assert.equal(tradeEngine.getWorkingOrdersForPlayer('A').length, 1);
    assert.equal(tradeEngine.getAllOpenWorkingOrders().length, 1);

    // C takes the order (selling to A @ 24)
    const res = tradeEngine.takeWorkingOrder(order.id, 'C', 'C');
    assert.equal(res.trade.price, 24);
    assert.equal(res.trade.buyerId, 'A');
    assert.equal(res.trade.sellerId, 'C');
    assert.equal(pos.getPosition('A'), 1);
    assert.equal(pos.getPosition('C'), -1);

    // Working orders cleared
    assert.equal(tradeEngine.getWorkingOrdersForPlayer('A').length, 0);
    assert.equal(tradeEngine.getTradesForPlayer('A').length, 1);
    assert.equal(tradeEngine.getTradesForPlayer('C').length, 1);
  });

  test('Enforces maximum of 2 active working orders per player', () => {
    const pos = new PositionEngine();
    const pnl = new PnlEngine();
    const tradeEngine = new TradeEngine(pos, pnl);

    pos.initPlayer('A');

    tradeEngine.createWorkingOrder({ playerId: 'A', playerLetter: 'A', side: 'BUY', price: 20, round: 1 });
    tradeEngine.createWorkingOrder({ playerId: 'A', playerLetter: 'A', side: 'SELL', price: 30, round: 1 });

    assert.equal(tradeEngine.getActiveWorkingOrdersCount('A'), 2);

    // 3rd order must throw error
    assert.throws(() => {
      tradeEngine.createWorkingOrder({ playerId: 'A', playerLetter: 'A', side: 'BUY', price: 21, round: 1 });
    }, /at most 2 active working orders/);
  });

  test('Cancelling working order frees up slot', () => {
    const pos = new PositionEngine();
    const pnl = new PnlEngine();
    const tradeEngine = new TradeEngine(pos, pnl);

    pos.initPlayer('A');

    const ord1 = tradeEngine.createWorkingOrder({ playerId: 'A', playerLetter: 'A', side: 'BUY', price: 20, round: 1 });
    assert.equal(tradeEngine.getActiveWorkingOrdersCount('A'), 1);

    tradeEngine.cancelWorkingOrder(ord1.id, 'A');
    assert.equal(ord1.status, 'CANCELLED');
    assert.equal(tradeEngine.getActiveWorkingOrdersCount('A'), 0);
  });
});

describe('BotEngine & Fair Value Strategy', () => {
  test('Bot evaluates proposal without knowing future digits', () => {
    const pos = new PositionEngine();
    const pnl = new PnlEngine();
    const tradeEngine = new TradeEngine(pos, pnl);
    const botEngine = new BotEngine(tradeEngine, pos);

    pos.initPlayer('bot1');
    const bot = { id: 'bot1', letter: 'B', botType: 'BOT_FAIR_VALUE' };

    // With revealed digits [5, 7] -> EV = 12 + 4 * 4.5 = 30
    const proposal1 = { side: 'BUY', price: 32 }; // Human wants to buy @ 32 (bot sells above EV)
    const decision1 = botEngine.evaluateProposal(bot, proposal1, [5, 7]);
    assert.equal(decision1, 'ACCEPT');

    const proposal2 = { side: 'BUY', price: 25 }; // Human wants to buy @ 25 (bot would sell below EV)
    const decision2 = botEngine.evaluateProposal(bot, proposal2, [5, 7]);
    assert.equal(decision2, 'REJECT');
  });
});
