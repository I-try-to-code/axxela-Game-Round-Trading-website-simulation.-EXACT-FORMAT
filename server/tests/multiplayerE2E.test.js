import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ClientIO } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

function createClient() {
  return ClientIO(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  });
}

describe('End-to-End Multiplayer Trading Game Simulation', () => {
  let hostSocket;
  let playerBSocket;
  let roomCode;
  let hostPlayerId;
  let playerBId;

  test('Host creates a practice room and gets Player A', async () => {
    hostSocket = createClient();
    await new Promise((resolve) => hostSocket.on('connect', resolve));

    const createRes = await new Promise((resolve) => {
      hostSocket.emit('room:create', {
        nickname: 'Trader Alpha',
        isPracticeMode: true,
        isDeterministicDemo: true, // 5 7 2 4 1 8 = 27
        roundDurationSeconds: 90
      }, resolve);
    });

    assert.equal(createRes.success, true);
    assert.equal(createRes.player.letter, 'A');
    assert.equal(createRes.player.isHost, true);
    assert.equal(createRes.gameState.currentRound, 1);
    assert.deepEqual(createRes.gameState.revealedDigits, []); // Round 1: 0 digits

    roomCode = createRes.roomCode;
    hostPlayerId = createRes.player.id;
  });

  test('Second human player joins and is allotted letter B', async () => {
    playerBSocket = createClient();
    await new Promise((resolve) => playerBSocket.on('connect', resolve));

    const joinRes = await new Promise((resolve) => {
      playerBSocket.emit('room:join', {
        roomCode,
        nickname: 'Trader Bravo'
      }, resolve);
    });

    assert.equal(joinRes.success, true);
    assert.equal(joinRes.player.letter, 'B');
    assert.equal(joinRes.gameState.players.length, 2);
    playerBId = joinRes.player.id;

    // Small delay to allow initial join broadcasts to settle
    await new Promise(r => setTimeout(r, 100));
  });

  test('Host starts game: empty seats filled with bots C, D, E, F; Round 1 begins with 0 digits revealed', async () => {
    const startPromise = new Promise((resolve) => {
      hostSocket.once('game:start', resolve);
    });

    hostSocket.emit('game:start');
    const startData = await startPromise;

    assert.equal(startData.round, 1);
    assert.equal(startData.players.length, 6);
    assert.deepEqual(startData.revealedDigits, []); // Round 1 must NOT reveal any digit

    // Letters A through F are present
    const letters = startData.players.map(p => p.letter).sort();
    assert.deepEqual(letters, ['A', 'B', 'C', 'D', 'E', 'F']);
  });

  test('Direct Bilateral Trade: Player A proposes BUY @ 24 to Player B, Player B accepts', async () => {
    // Player A proposes to buy from B at 24
    const propRes = await new Promise((resolve) => {
      hostSocket.emit('trade:propose', {
        toPlayerLetter: 'B',
        side: 'BUY',
        price: 24
      }, resolve);
    });

    assert.equal(propRes.success, true);
    assert.equal(propRes.proposal.side, 'BUY');
    assert.equal(propRes.proposal.price, 24);

    // Player B accepts proposal
    const acceptRes = await new Promise((resolve) => {
      playerBSocket.emit('trade:accept', {
        proposalId: propRes.proposal.id
      }, resolve);
    });

    assert.equal(acceptRes.success, true);
    assert.equal(acceptRes.result.trade.price, 24);
    assert.equal(acceptRes.result.posResult.buyerPosition, 1); // A has +1
    assert.equal(acceptRes.result.posResult.sellerPosition, -1); // B has -1
  });

  test('Selling first: Player B proposes SELL @ 28 to Player A, Player A accepts', async () => {
    // Player B proposes to sell to A at 28
    const propRes = await new Promise((resolve) => {
      playerBSocket.emit('trade:propose', {
        toPlayerLetter: 'A',
        side: 'SELL',
        price: 28
      }, resolve);
    });

    assert.equal(propRes.success, true);

    // Player A accepts: Player A buys at 28, Player B sells at 28
    const acceptRes = await new Promise((resolve) => {
      hostSocket.emit('trade:accept', {
        proposalId: propRes.proposal.id
      }, resolve);
    });

    assert.equal(acceptRes.success, true);
    // B was -1, sold another -> B is now -2
    // A was +1, bought another -> A is now +2
    assert.equal(acceptRes.result.posResult.buyerPosition, 2); // A
    assert.equal(acceptRes.result.posResult.sellerPosition, -2); // B
  });

  test('Position limit +2 / -2 is strictly enforced', async () => {
    // Player A is at +2. Attempting to BUY again should be rejected!
    const overBuyRes = await new Promise((resolve) => {
      hostSocket.emit('trade:propose', {
        toPlayerLetter: 'B',
        side: 'BUY',
        price: 25
      }, resolve);
    });

    assert.equal(overBuyRes.success, false);
    assert.match(overBuyRes.error, /maximum position limit/i);
  });

  test('Closing positions realizes FIFO PnL correctly', async () => {
    // Player A (at +2, lots bought @ 24 and @ 28) sells 1 @ 30 to Player B (at -2)
    const propRes = await new Promise((resolve) => {
      hostSocket.emit('trade:propose', {
        toPlayerLetter: 'B',
        side: 'SELL',
        price: 30
      }, resolve);
    });

    const acceptRes = await new Promise((resolve) => {
      playerBSocket.emit('trade:accept', {
        proposalId: propRes.proposal.id
      }, resolve);
    });

    assert.equal(acceptRes.success, true);
    // A closes oldest lot bought @ 24 with sell @ 30 -> Realized PnL = 30 - 24 = +6!
    assert.equal(acceptRes.result.pnlResult.sellerTotalRealized, 6); // A is seller
    assert.equal(acceptRes.result.posResult.sellerPosition, 1); // A is now +1
    assert.equal(acceptRes.result.posResult.buyerPosition, -1); // B is now -1
  });

  test('Reconnection restores exact player identity, positions, and trades', async () => {
    const reconnectSocket = createClient();
    await new Promise((resolve) => reconnectSocket.on('connect', resolve));

    const reconRes = await new Promise((resolve) => {
      reconnectSocket.emit('room:reconnect', {
        roomCode,
        playerId: hostPlayerId
      }, resolve);
    });

    assert.equal(reconRes.success, true);
    assert.equal(reconRes.player.letter, 'A');
    assert.equal(reconRes.gameState.myPosition, 1);
    assert.equal(reconRes.gameState.myRealizedPnL, 6);
    assert.equal(reconRes.gameState.myTrades.length, 3);

    reconnectSocket.disconnect();
  });

  test('Host advances rounds: Round 2 reveals 1 digit [5], Round 3 reveals 2 digits [5, 7]', async () => {
    // Advance to Round 2
    const r2Promise = new Promise((resolve) => {
      hostSocket.once('game:roundStart', resolve);
    });
    hostSocket.emit('game:nextRound');
    const r2Data = await r2Promise;

    assert.equal(r2Data.round, 2);
    assert.deepEqual(r2Data.revealedDigits, [5]); // Exactly 1 digit revealed

    // Advance to Round 3
    const r3Promise = new Promise((resolve) => {
      hostSocket.once('game:roundStart', resolve);
    });
    hostSocket.emit('game:nextRound');
    const r3Data = await r3Promise;

    assert.equal(r3Data.round, 3);
    assert.deepEqual(r3Data.revealedDigits, [5, 7]); // Exactly 2 digits revealed
  });

  test('Fast-forward through Round 6 to Game End: final 6th digit revealed, settlement sum = 27', async () => {
    // Round 4
    hostSocket.emit('game:nextRound');
    await new Promise(r => setTimeout(r, 100));

    // Round 5
    hostSocket.emit('game:nextRound');
    await new Promise(r => setTimeout(r, 100));

    // Round 6
    hostSocket.emit('game:nextRound');
    await new Promise(r => setTimeout(r, 100));

    // Final finish: triggers settlement
    const settlementPromise = new Promise((resolve) => {
      hostSocket.once('game:settlement', resolve);
    });

    hostSocket.emit('game:nextRound');
    const settlementData = await settlementPromise;

    assert.deepEqual(settlementData.finalDigits, [5, 7, 2, 4, 1, 8]);
    assert.equal(settlementData.finalSum, 27);

    // Player A had 1 remaining open lot bought @ 28.
    // Settled at 27: profit = 27 - 28 = -1.
    // Realized was +6. Total final PnL = 6 + (-1) = +5!
    const playerAResult = settlementData.settlementResults[hostPlayerId];
    assert.equal(playerAResult.realizedPnl, 6);
    assert.equal(playerAResult.settlementPnl, -1);
    assert.equal(playerAResult.finalPnl, 5);
    assert.equal(playerAResult.finalPosition, 0);

    // Leaderboard is sorted by final PnL
    assert.equal(settlementData.leaderboard.length, 6);
    for (let i = 0; i < settlementData.leaderboard.length - 1; i++) {
      assert.ok(settlementData.leaderboard[i].pnl >= settlementData.leaderboard[i + 1].pnl);
    }

    hostSocket.disconnect();
    playerBSocket.disconnect();
  });
});
