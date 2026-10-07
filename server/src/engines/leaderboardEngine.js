/**
 * LeaderboardEngine
 * 
 * Computes and sorts real-time player rankings based on current PnL.
 */
export class LeaderboardEngine {
  /**
   * Generates a sorted leaderboard.
   * 
   * @param {Array<Object>} players - List of player objects ({ id, letter, nickname, isBot })
   * @param {PnlEngine} pnlEngine
   * @param {Object} [settlementResults] - Optional final settlement data
   * @returns {Array<Object>} Sorted list of leaderboard entries
   */
  static getLeaderboard(players, pnlEngine, settlementResults = null) {
    const list = players.map(p => {
      let pnl = 0;
      if (settlementResults && settlementResults[p.id]) {
        pnl = settlementResults[p.id].finalPnl;
      } else {
        pnl = pnlEngine.getRealizedPnL(p.id);
      }

      return {
        id: p.id,
        letter: p.letter,
        nickname: p.nickname,
        isBot: p.isBot,
        pnl: Math.round(pnl * 100) / 100,
        formattedPnl: pnl > 0 ? `+${pnl}` : `${pnl}`
      };
    });

    // Sort descending by PnL
    list.sort((a, b) => b.pnl - a.pnl);

    // Add rank
    return list.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }
}
