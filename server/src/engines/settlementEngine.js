/**
 * SettlementEngine
 * 
 * Settles any remaining open positions after the 6th digit is revealed,
 * based on the final serial number sum.
 */
export class SettlementEngine {
  /**
   * Settles all open positions against the final sum.
   * 
   * @param {number} finalSum - The sum of all six digits
   * @param {Map|Object} playerOpenLots - Map of playerId -> Array of open lots
   * @param {Map|Object} playerRealizedPnL - Map of playerId -> realized PnL
   * @returns {Object} Settlement breakdown per player
   */
  static settleAll(finalSum, playerOpenLots, playerRealizedPnL) {
    const results = {};

    for (const [playerId, lots] of playerOpenLots.entries()) {
      let settlementPnl = 0;
      const lotBreakdowns = [];

      for (const lot of lots) {
        let profit = 0;
        if (lot.side === 'BUY') {
          // Long position settled at finalSum: S - buyPrice
          profit = finalSum - lot.price;
        } else if (lot.side === 'SELL') {
          // Short position settled at finalSum: sellPrice - S
          profit = lot.price - finalSum;
        }
        settlementPnl += profit;
        lotBreakdowns.push({
          side: lot.side,
          price: lot.price,
          profit
        });
      }

      const realized = playerRealizedPnL.get(playerId) || 0;
      const finalPnl = realized + settlementPnl;

      results[playerId] = {
        playerId,
        finalSum,
        openUnitsBeforeSettlement: lots.length * (lots[0]?.side === 'SELL' ? -1 : 1),
        lotBreakdowns,
        settlementPnl,
        realizedPnl: realized,
        finalPnl,
        finalPosition: 0
      };
    }

    return results;
  }
}
