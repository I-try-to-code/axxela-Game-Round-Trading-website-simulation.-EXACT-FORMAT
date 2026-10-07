import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import { soundManager } from './audio/soundEffects';
import { GameTableView } from './components/GameTableView';
import { TradingPanel } from './components/TradingPanel';
import { WorkingOrders } from './components/WorkingOrders';
import { TradesHistory } from './components/TradesHistory';
import { Leaderboard } from './components/Leaderboard';
import { ProposalNotification } from './components/ProposalNotification';
import { InstructionsModal } from './components/InstructionsModal';
import { ResultsModal } from './components/ResultsModal';
import { PostGameReplay } from './components/PostGameReplay';
import { LobbyView } from './components/LobbyView';
import { HostControls } from './components/HostControls';
import { Volume2, VolumeX, BookOpen, AlertCircle, Sparkles, Plus, LogIn } from 'lucide-react';

export default function App() {
  // Connection & Room state
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [roomCode, setRoomCode] = useState('');
  const [myPlayer, setMyPlayer] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [targetOrder, setTargetOrder] = useState(null);

  // Modals & UI View states
  const [showInstructions, setShowInstructions] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);

  // Home Screen Creation Form
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [numPlayers, setNumPlayers] = useState(6);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [isDeterministicDemo, setIsDeterministicDemo] = useState(false);
  const [roundDuration, setRoundDuration] = useState(90);
  const [joinError, setJoinError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Newly revealed digit index for animation
  const [newlyRevealedIndex, setNewlyRevealedIndex] = useState(-1);

  // Fetch network sharing info & check URL params
  useEffect(() => {
    fetch('/api/info')
      .then(res => res.json())
      .then(data => setNetworkInfo(data))
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    if (joinParam) {
      setJoinCode(joinParam.toUpperCase());
      setIsJoinModalOpen(true);
    }
  }, []);

  // Initialize socket listeners & session restore
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      // Attempt session reconnection if stored
      const savedCode = sessionStorage.getItem('trading_game_code');
      const savedPlayerId = sessionStorage.getItem('trading_game_player_id');
      if (savedCode && savedPlayerId) {
        socket.emit('room:reconnect', { roomCode: savedCode, playerId: savedPlayerId }, (res) => {
          if (res?.success) {
            setRoomCode(savedCode);
            setMyPlayer(res.player);
            setGameState(res.gameState);
          } else {
            sessionStorage.removeItem('trading_game_code');
            sessionStorage.removeItem('trading_game_player_id');
          }
        });
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomCreated(data) {
      setRoomCode(data.roomCode);
      setMyPlayer(data.player);
      setGameState(data.gameState);
      sessionStorage.setItem('trading_game_code', data.roomCode);
      sessionStorage.setItem('trading_game_player_id', data.player.id);
      setShowInstructions(true); // Open instructions first
    }

    function onRoomJoined(data) {
      setRoomCode(data.roomCode);
      setMyPlayer(data.player);
      setGameState(data.gameState);
      sessionStorage.setItem('trading_game_code', data.roomCode);
      sessionStorage.setItem('trading_game_player_id', data.player.id);
      setShowInstructions(true);
    }

    function onGameSync(updatedState) {
      setGameState(updatedState);
      if (updatedState.myPlayer) {
        setMyPlayer(updatedState.myPlayer);
      }
    }

    function onGameStart(data) {
      soundManager.playRoundStart();
      setShowInstructions(false);
    }

    function onRoundStart(data) {
      soundManager.playDigitReveal();
      soundManager.playRoundStart();
      setNewlyRevealedIndex(data.revealedDigits?.length - 1);
    }

    function onTimer(data) {
      setGameState(prev => {
        if (!prev) return null;
        if (data.timeRemaining <= 10 && data.timeRemaining > 0 && prev.timeRemaining !== data.timeRemaining) {
          soundManager.playWarningTick();
        }
        return {
          ...prev,
          currentRound: data.round,
          timeRemaining: data.timeRemaining,
          status: data.state
        };
      });
    }

    function onTradeExecuted(data) {
      soundManager.playTradeExecuted();
    }

    function onSettlement(data) {
      soundManager.playGameOver();
    }

    function onGameReset() {
      sessionStorage.removeItem('trading_game_code');
      sessionStorage.removeItem('trading_game_player_id');
      setRoomCode('');
      setMyPlayer(null);
      setGameState(null);
      setSelectedPartner(null);
      setShowInstructions(false);
      setShowReplay(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:created', onRoomCreated);
    socket.on('room:joined', onRoomJoined);
    socket.on('game:sync', onGameSync);
    socket.on('game:start', onGameStart);
    socket.on('game:roundStart', onRoundStart);
    socket.on('game:timer', onTimer);
    socket.on('trade:executed', onTradeExecuted);
    socket.on('game:settlement', onSettlement);
    socket.on('game:reset', onGameReset);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:created', onRoomCreated);
      socket.off('room:joined', onRoomJoined);
      socket.off('game:sync', onGameSync);
      socket.off('game:start', onGameStart);
      socket.off('game:roundStart', onRoundStart);
      socket.off('game:timer', onTimer);
      socket.off('trade:executed', onTradeExecuted);
      socket.off('game:settlement', onSettlement);
      socket.off('game:reset', onGameReset);
    };
  }, []);

  // Room Actions
  const handleCreateRoom = (e) => {
    e.preventDefault();
    setJoinError('');
    socket.emit('room:create', {
      nickname: nickname || 'Host',
      isPracticeMode,
      isDeterministicDemo,
      roundDurationSeconds: Number(roundDuration) || 90,
      maxPlayers: Number(numPlayers) || 6
    }, (res) => {
      if (!res?.success) {
        setJoinError(res?.error || 'Failed to create room');
      } else {
        setIsCreateModalOpen(false);
      }
    });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    setJoinError('');
    if (!joinCode) {
      setJoinError('Please enter a room code');
      return;
    }
    socket.emit('room:join', {
      roomCode: joinCode.trim().toUpperCase(),
      nickname: nickname || 'Player'
    }, (res) => {
      if (!res?.success) {
        setJoinError(res?.error || 'Failed to join room');
      } else {
        setIsJoinModalOpen(false);
      }
    });
  };

  const handleStartGame = () => {
    socket.emit('game:start');
    setShowInstructions(false);
  };

  const handlePlaceWorkingOrder = ({ side, price }) => {
    socket.emit('order:place', { side, price });
  };

  const handleTakeOrder = (orderId) => {
    socket.emit('order:take', { orderId });
  };

  const handleCancelOrder = (orderId) => {
    socket.emit('order:cancel', { orderId });
  };

  const handleProposeTrade = ({ toPlayerLetter, side, price }) => {
    socket.emit('trade:propose', { toPlayerLetter, side, price });
  };

  const handleAcceptProposal = (proposalId) => {
    socket.emit('trade:accept', { proposalId });
  };

  const handleRejectProposal = (proposalId) => {
    socket.emit('trade:reject', { proposalId });
  };

  // Sound Toggle
  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Format timer MM:SS
  const formatTime = (seconds) => {
    const s = Math.max(0, seconds || 0);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Available trading partners (all players except self)
  const otherPlayers = gameState?.players?.filter(p => p.id !== myPlayer?.id) || [];

  // Default partner selection
  useEffect(() => {
    if (!selectedPartner && otherPlayers.length > 0) {
      setSelectedPartner(otherPlayers[0]);
    } else if (selectedPartner && !otherPlayers.some(p => p.id === selectedPartner.id)) {
      setSelectedPartner(otherPlayers[0] || null);
    }
  }, [otherPlayers.length]);

  // Derived state
  const isFinished = gameState?.status === 'FINISHED';
  const isLobby = gameState?.status === 'LOBBY';
  const isTrading = gameState?.status === 'TRADING';
  const isHost = myPlayer?.isHost;

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="round-badge">
            {gameState ? `Round ${gameState.currentRound}` : 'Trading Game'}
          </div>
          {roomCode && (
            <div className="room-badge">
              ROOM: {roomCode}
            </div>
          )}
        </div>

        {/* Center: Authoritative Timer */}
        <div className="top-bar-center">
          {gameState && (
            <div className={`timer-container ${gameState.timeRemaining <= 10 ? 'warning' : ''}`}>
              <span className="timer-text">
                {formatTime(gameState.timeRemaining)}
              </span>
            </div>
          )}
        </div>

        {/* Right: P/L and Open Positions cards */}
        <div className="top-bar-right">
          {gameState && (
            <>
              <div className={`status-pill ${
                (gameState.myRealizedPnL || 0) > 0
                  ? 'pnl-positive'
                  : (gameState.myRealizedPnL || 0) < 0
                  ? 'pnl-negative'
                  : ''
              }`}>
                P/L: {(gameState.myRealizedPnL || 0) > 0 ? `+${gameState.myRealizedPnL}` : gameState.myRealizedPnL || 0}
              </div>

              <div className={`status-pill ${gameState.myPosition !== 0 ? 'positions-active' : ''}`}>
                Open Positions: {gameState.myPosition || 0}
              </div>
            </>
          )}

          {/* Action buttons */}
          <button
            className="icon-btn"
            onClick={handleToggleMute}
            title={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            className="icon-btn"
            onClick={() => setShowInstructions(true)}
            title="View Rules & Instructions"
          >
            <BookOpen size={18} />
          </button>

          {isHost && (
            <HostControls
              isHost={isHost}
              onPause={() => socket.emit('game:pause')}
              onResume={() => socket.emit('game:resume')}
              onNextRound={() => socket.emit('game:nextRound')}
              onResetGame={() => socket.emit('game:reset')}
              isPaused={gameState?.status === 'PAUSED'}
              isTrading={isTrading}
            />
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {!gameState ? (
        /* Home Landing Screen (Create / Join Room) */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'linear-gradient(135deg, rgba(36, 0, 50, 0.9), rgba(18, 0, 26, 0.95))',
            border: '2px solid var(--magenta-primary)',
            borderRadius: '20px',
            padding: '36px',
            boxShadow: '0 0 50px var(--magenta-glow)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div>
              <div style={{
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '3px',
                color: 'var(--cyan-primary)',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                PRACTICE SIMULATOR
              </div>
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', letterSpacing: '1px' }}>
                DIGIT SUM TRADING
              </h1>
              <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '6px' }}>
                Authentic multiplayer practice for the currency note digit-sum recruitment trading game.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus size={20} />
                Create Practice Room
              </button>

              <button
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
                onClick={() => setIsJoinModalOpen(true)}
              >
                <LogIn size={20} />
                Join Existing Room
              </button>
            </div>


            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              6 rounds • 90-second trading windows • Bilateral trade agreements • Max open position ±2
            </div>
          </div>
        </div>
      ) : (
        /* In-Game Split View: Table Area + Trading Sidebar */
        <main className="main-game-layout">
          {/* Central Oval Table Area */}
          <GameTableView
            revealedDigits={gameState.revealedDigits}
            newlyRevealedIndex={newlyRevealedIndex}
            players={gameState.players}
            myPlayer={myPlayer}
            selectedPartner={selectedPartner}
            onSelectPartner={setSelectedPartner}
            openTableOrders={gameState.openTableOrders || []}
            onSelectOrder={(ord, player) => {
              setTargetOrder({
                ...ord,
                playerLetter: player.letter,
                playerNickname: player.nickname
              });
              setSelectedPartner(player);
            }}
            isFinished={isFinished}
            practiceStats={gameState.practiceStats}
            isPracticeMode={gameState.isPracticeMode}
          />

          {/* Right Sidebar: Controls & Live Data */}
          <aside className="trading-sidebar">
            {/* Top Stat Pills matching Screenshot */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className={`status-pill ${
                (gameState.myRealizedPnL || 0) > 0
                  ? 'pnl-positive'
                  : (gameState.myRealizedPnL || 0) < 0
                  ? 'pnl-negative'
                  : ''
              }`} style={{ textAlign: 'center', justifyContent: 'center', padding: '8px 10px', fontSize: '13px' }}>
                P/L: {(gameState.myRealizedPnL || 0) > 0 ? `+${gameState.myRealizedPnL}` : gameState.myRealizedPnL || 0}
              </div>

              <div className={`status-pill ${gameState.myPosition !== 0 ? 'positions-active' : ''}`}
                style={{ textAlign: 'center', justifyContent: 'center', padding: '8px 10px', fontSize: '13px' }}>
                Open Positions: {gameState.myPosition || 0}
              </div>
            </div>

            {/* Trading Action Controls */}
            <TradingPanel
              targetOrder={targetOrder}
              onClearTargetOrder={() => setTargetOrder(null)}
              myPosition={gameState.myPosition}
              myWorkingOrdersCount={gameState.workingOrders?.length || 0}
              onPlaceWorkingOrder={handlePlaceWorkingOrder}
              onTakeOrder={handleTakeOrder}
              isTradingWindowOpen={isTrading}
            />

            {/* Outstanding Working Orders */}
            <WorkingOrders
              workingOrders={gameState.workingOrders || []}
              onCancelOrder={handleCancelOrder}
            />

            {/* Executed Trades History */}
            <TradesHistory
              trades={gameState.myTrades || []}
            />

            {/* Leaderboard */}
            <Leaderboard
              leaderboard={gameState.leaderboard}
              currentUserId={myPlayer?.id}
            />
          </aside>
        </main>
      )}

      {/* Pre-Game Lobby Modal (before game start) */}
      {gameState && isLobby && (
        <LobbyView
          roomCode={roomCode}
          players={gameState.players}
          myPlayer={myPlayer}
          isHost={isHost}
          onStartGame={handleStartGame}
          onShowInstructions={() => setShowInstructions(true)}
          isPracticeMode={gameState.isPracticeMode}
          isDeterministicDemo={gameState.isDeterministicDemo}
          roundDurationSeconds={gameState.roundDurationSeconds}
          maxPlayers={gameState.players?.length || numPlayers}
          networkInfo={networkInfo}
        />
      )}

      {/* Screenshot-Accurate Instructions Modal */}
      <InstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        isHost={isHost}
        onStartGame={handleStartGame}
        roomCode={roomCode}
        playerLetter={myPlayer?.letter}
      />

      {/* Game Over Settlement Results Modal */}
      <ResultsModal
        isOpen={isFinished && !showReplay}
        finalDigits={gameState?.revealedDigits}
        finalSum={gameState?.revealedDigits?.reduce((a, b) => a + b, 0)}
        settlementResults={gameState?.settlementResults}
        leaderboard={gameState?.leaderboard}
        currentUser={myPlayer}
        onReplay={() => setShowReplay(true)}
        onPlayAgain={() => socket.emit('game:reset')}
      />

      {/* Post-Game Replay Modal */}
      <PostGameReplay
        isOpen={showReplay}
        onClose={() => setShowReplay(false)}
        finalDigits={gameState?.revealedDigits}
        allTrades={gameState?.allTrades || gameState?.myTrades}
        players={gameState?.players}
      />

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">Create Practice Game</h2>
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Your Nickname</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Trader A"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Number of Players / Seats</label>
                <select
                  className="form-input"
                  value={numPlayers}
                  onChange={(e) => setNumPlayers(Number(e.target.value))}
                >
                  <option value="2">2 Players (1-on-1 Duel)</option>
                  <option value="3">3 Players</option>
                  <option value="4">4 Players</option>
                  <option value="5">5 Players</option>
                  <option value="6">6 Players (Standard Recruitment Game)</option>
                  <option value="8">8 Players (Extended Room)</option>
                  <option value="10">10 Players (Large Practice Room)</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Seats not filled by human friends will be occupied by AI bots.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Round Duration</label>
                <select
                  className="form-input"
                  value={roundDuration}
                  onChange={(e) => setRoundDuration(e.target.value)}
                >
                  <option value="90">90 Seconds (Official Default)</option>
                  <option value="45">45 Seconds (Fast Practice)</option>
                  <option value="30">30 Seconds (Blitz Practice)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isPracticeMode}
                    onChange={(e) => setIsPracticeMode(e.target.checked)}
                  />
                  <span>
                    <strong>Practice Assistant Mode</strong> (Displays Expected Fair Value HUD)
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isDeterministicDemo}
                    onChange={(e) => setIsDeterministicDemo(e.target.checked)}
                  />
                  <span>
                    <strong>Deterministic Demo Seed</strong> (Fixed digits 5-7-2-4-1-8 = 27)
                  </span>
                </label>
              </div>

              {joinError && (
                <div style={{ color: '#ff5252', fontSize: '12px' }}>{joinError}</div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {isJoinModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">Join Practice Game</h2>
            <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">6-Character Room Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. X7P2KA"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  autoFocus
                  style={{ letterSpacing: '2px', fontFamily: 'var(--font-mono)', fontSize: '18px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Your Nickname</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Trader B"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>

              {joinError && (
                <div style={{ color: '#ff5252', fontSize: '12px' }}>{joinError}</div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsJoinModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Join Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
