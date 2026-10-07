import { GameEngine } from '../engines/gameEngine.js';

// In-memory store for active games: roomCode -> GameEngine
export const activeGames = new Map();

// Helper to generate a 6-character alphanumeric room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    let currentRoomCode = null;
    let currentPlayerId = null;

    console.log(`[Socket] Client connected: ${socket.id}`);

    // Helper to broadcast updated state to all clients in a room
    const broadcastRoomState = (game) => {
      for (const player of game.players) {
        if (player.socketId) {
          const clientState = game.getClientState(player.id);
          io.to(player.socketId).emit('game:sync', clientState);
        }
      }
    };

    /**
     * CREATE ROOM
     */
    socket.on('room:create', ({ nickname, isPracticeMode = false, isDeterministicDemo = false, roundDurationSeconds = 90, maxPlayers = 6 }, callback) => {
      try {
        let code;
        do {
          code = generateRoomCode();
        } while (activeGames.has(code));

        const game = new GameEngine({
          roomCode: code,
          hostId: socket.id,
          isPracticeMode,
          isDeterministicDemo,
          roundDurationSeconds,
          maxPlayers,
          emitEvent: (eventName, data) => {
            io.to(code).emit(eventName, data);
            // On major transitions, sync individual states
            if (['game:start', 'game:roundStart', 'game:roundEnd', 'game:settlement'].includes(eventName)) {
              broadcastRoomState(game);
            }
          }
        });

        // Add creator as Player A (Host)
        const hostPlayer = game.addPlayer({
          nickname: nickname?.trim() || 'Host',
          socketId: socket.id,
          isHost: true
        });

        activeGames.set(code, game);
        currentRoomCode = code;
        currentPlayerId = hostPlayer.id;

        socket.join(code);

        const response = {
          success: true,
          roomCode: code,
          player: hostPlayer,
          gameState: game.getClientState(hostPlayer.id)
        };

        if (typeof callback === 'function') callback(response);
        socket.emit('room:created', response);
      } catch (err) {
        console.error('[Socket] room:create error:', err);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    /**
     * JOIN ROOM
     */
    socket.on('room:join', ({ roomCode, nickname }, callback) => {
      try {
        const code = roomCode?.trim().toUpperCase();
        const game = activeGames.get(code);

        if (!game) {
          const errRes = { success: false, error: 'Room not found. Check the room code and try again.' };
          if (typeof callback === 'function') callback(errRes);
          return;
        }

        if (game.status !== 'LOBBY' && game.status !== 'INSTRUCTIONS') {
          const errRes = { success: false, error: 'Game is already in progress.' };
          if (typeof callback === 'function') callback(errRes);
          return;
        }

        const newPlayer = game.addPlayer({
          nickname: nickname?.trim() || `Player`,
          socketId: socket.id,
          isHost: false
        });

        currentRoomCode = code;
        currentPlayerId = newPlayer.id;
        socket.join(code);

        const response = {
          success: true,
          roomCode: code,
          player: newPlayer,
          gameState: game.getClientState(newPlayer.id)
        };

        if (typeof callback === 'function') callback(response);
        socket.emit('room:joined', response);

        // Notify other room members
        socket.to(code).emit('room:playerJoined', {
          player: newPlayer,
          players: game.getPublicPlayers()
        });

        broadcastRoomState(game);
      } catch (err) {
        console.error('[Socket] room:join error:', err);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    /**
     * RECONNECT
     */
    socket.on('room:reconnect', ({ roomCode, playerId }, callback) => {
      try {
        const code = roomCode?.trim().toUpperCase();
        const game = activeGames.get(code);

        if (!game) {
          if (typeof callback === 'function') callback({ success: false, error: 'Room no longer exists' });
          return;
        }

        const player = game.players.find(p => p.id === playerId);
        if (!player) {
          if (typeof callback === 'function') callback({ success: false, error: 'Player not recognized in this room' });
          return;
        }

        player.socketId = socket.id;
        player.connected = true;
        currentRoomCode = code;
        currentPlayerId = playerId;
        socket.join(code);

        const clientState = game.getClientState(playerId);
        const res = { success: true, player, gameState: clientState };
        if (typeof callback === 'function') callback(res);
        socket.emit('room:reconnected', res);

        socket.to(code).emit('room:playerReconnected', {
          playerId,
          players: game.getPublicPlayers()
        });
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    /**
     * INSTRUCTIONS VIEW
     */
    socket.on('game:showInstructions', () => {
      if (!currentRoomCode) return;
      const game = activeGames.get(currentRoomCode);
      if (game) {
        game.showInstructions();
        broadcastRoomState(game);
      }
    });

    /**
     * START GAME
     */
    socket.on('game:start', () => {
      if (!currentRoomCode) return;
      const game = activeGames.get(currentRoomCode);
      if (game) {
        game.startGame();
        broadcastRoomState(game);
      }
    });

    /**
     * PROPOSE TRADE (Bilateral)
    /**
     * PLACE BROADCASTED WORKING ORDER
     */
    socket.on('order:place', ({ side, price }, callback) => {
      try {
        if (!currentRoomCode || !currentPlayerId) throw new Error("Not in an active game");
        const game = activeGames.get(currentRoomCode);
        if (!game) throw new Error("Game not found");

        const order = game.createWorkingOrder(currentPlayerId, side, price);
        if (typeof callback === 'function') callback({ success: true, order });
        broadcastRoomState(game);
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    /**
     * TAKE AN OPEN WORKING ORDER (1-click execution against table order)
     */
    socket.on('order:take', ({ orderId }, callback) => {
      try {
        if (!currentRoomCode || !currentPlayerId) throw new Error("Not in an active game");
        const game = activeGames.get(currentRoomCode);
        if (!game) throw new Error("Game not found");

        const result = game.takeOrder(currentPlayerId, orderId);
        if (typeof callback === 'function') callback({ success: true, result });
        broadcastRoomState(game);
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    /**
     * CANCEL WORKING ORDER
     */
    socket.on('order:cancel', ({ orderId }, callback) => {
      try {
        if (!currentRoomCode || !currentPlayerId) throw new Error("Not in an active game");
        const game = activeGames.get(currentRoomCode);
        if (!game) throw new Error("Game not found");

        const order = game.cancelOrder(currentPlayerId, orderId);
        if (typeof callback === 'function') callback({ success: true, order });
        broadcastRoomState(game);
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    /**
     * PROPOSE TRADE (Bilateral backward compatibility)
     */
    socket.on('trade:propose', ({ toPlayerLetter, side, price }, callback) => {
      try {
        if (!currentRoomCode || !currentPlayerId) throw new Error("Not in an active game");
        const game = activeGames.get(currentRoomCode);
        if (!game) throw new Error("Game not found");

        const proposal = game.createProposal(currentPlayerId, toPlayerLetter, side, price);

        if (typeof callback === 'function') callback({ success: true, proposal });

        // Update states for players
        broadcastRoomState(game);
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    /**
     * ACCEPT TRADE PROPOSAL
     */
    socket.on('trade:accept', ({ proposalId }, callback) => {
      try {
        if (!currentRoomCode || !currentPlayerId) throw new Error("Not in an active game");
        const game = activeGames.get(currentRoomCode);
        if (!game) throw new Error("Game not found");

        const result = game.acceptProposal(proposalId, currentPlayerId);

        if (typeof callback === 'function') callback({ success: true, result });
        broadcastRoomState(game);
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    /**
     * REJECT TRADE PROPOSAL
     */
    socket.on('trade:reject', ({ proposalId }, callback) => {
      try {
        if (!currentRoomCode || !currentPlayerId) throw new Error("Not in an active game");
        const game = activeGames.get(currentRoomCode);
        if (!game) throw new Error("Game not found");

        const proposal = game.rejectProposal(proposalId, currentPlayerId);

        if (typeof callback === 'function') callback({ success: true, proposal });
        broadcastRoomState(game);
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    /**
     * CANCEL WORKING ORDER
     */
    socket.on('trade:cancel', ({ proposalId }, callback) => {
      try {
        if (!currentRoomCode || !currentPlayerId) throw new Error("Not in an active game");
        const game = activeGames.get(currentRoomCode);
        if (!game) throw new Error("Game not found");

        const proposal = game.cancelProposal(proposalId, currentPlayerId);

        if (typeof callback === 'function') callback({ success: true, proposal });
        broadcastRoomState(game);
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    /**
     * HOST / DEV CONTROLS
     */
    socket.on('game:pause', () => {
      const game = activeGames.get(currentRoomCode);
      if (game) {
        game.roundManager.pause();
        io.to(currentRoomCode).emit('game:paused');
      }
    });

    socket.on('game:resume', () => {
      const game = activeGames.get(currentRoomCode);
      if (game) {
        game.roundManager.resume();
        io.to(currentRoomCode).emit('game:resumed');
      }
    });

    socket.on('game:nextRound', () => {
      const game = activeGames.get(currentRoomCode);
      if (game) {
        game.nextRound();
        broadcastRoomState(game);
      }
    });

    socket.on('game:reset', () => {
      const game = activeGames.get(currentRoomCode);
      if (game) {
        game.destroy();
        activeGames.delete(currentRoomCode);
        io.to(currentRoomCode).emit('game:reset');
      }
    });

    /**
     * DISCONNECT
     */
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      if (currentRoomCode && currentPlayerId) {
        const game = activeGames.get(currentRoomCode);
        if (game) {
          const player = game.players.find(p => p.id === currentPlayerId);
          if (player) {
            player.connected = false;
            io.to(currentRoomCode).emit('room:playerLeft', {
              playerId: currentPlayerId,
              players: game.getPublicPlayers()
            });
          }
        }
      }
    });
  });
}
