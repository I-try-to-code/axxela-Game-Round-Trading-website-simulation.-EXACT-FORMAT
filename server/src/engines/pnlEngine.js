/**
 * PnlEngine
 * 
 * Computes realized P&L using standard FIFO lot matching.
 * Also tracks open lots for final settlement calculations.
 */
export class PnlEngine {
  constructor() {
    // Map of playerId -> { realizedPnl: number, openLots: Array<{ side: 'BUY'|'SELL', price: number, timestamp: number }> }
    this.playerPnL = new Map();
  }

  initPlayer(playerId) {
    if (!this.playerPnL.has(playerId)) {
      this.playerPnL.set(playerId, {
        realizedPnl: 0,
        openLots: []
      });
    }
  }

  getRealizedPnL(playerId) {
    this.initPlayer(playerId);
    return this.playerPnL.get(playerId).realizedPnl;
  }

  getOpenLots(playerId) {
    this.initPlayer(playerId);
    return [...this.playerPnL.get(playerId).openLots];
  }

  /**
   * Processes an executed trade for both Buyer and Seller.
   * Quantity is typically 1.
   */
  processTrade(buyerId, sellerId, price, quantity = 1, timestamp = Date.now()) {
    this.initPlayer(buyerId);
    this.initPlayer(sellerId);

    const buyerData = this.playerPnL.get(buyerId);
    const sellerData = this.playerPnL.get(sellerId);

    let buyerRealizedDelta = 0;
    let sellerRealizedDelta = 0;

    // Process Buyer (increasing long / covering short)
    for (let i = 0; i < quantity; i++) {
      const shortIndex = buyerData.openLots.findIndex(lot => lot.side === 'SELL');
      if (shortIndex !== -1) {
        // Covering a short position: profit = entry short price - buy price
        const coveredLot = buyerData.openLots.splice(shortIndex, 1)[0];
        const profit = coveredLot.price - price;
        buyerData.realizedPnl += profit;
        buyerRealizedDelta += profit;
      } else {
        // Adding a long position
        buyerData.openLots.push({ side: 'BUY', price, timestamp });
      }
    }

    // Process Seller (increasing short / closing long)
    for (let i = 0; i < quantity; i++) {
      const longIndex = sellerData.openLots.findIndex(lot => lot.side === 'BUY');
      if (longIndex !== -1) {
        // Closing a long position: profit = sell price - entry buy price
        const closedLot = sellerData.openLots.splice(longIndex, 1)[0];
        const profit = price - closedLot.price;
        sellerData.realizedPnl += profit;
        sellerRealizedDelta += profit;
      } else {
        // Adding a short position
        sellerData.openLots.push({ side: 'SELL', price, timestamp });
      }
    }

    return {
      buyerId,
      sellerId,
      buyerRealizedDelta,
      sellerRealizedDelta,
      buyerTotalRealized: buyerData.realizedPnl,
      sellerTotalRealized: sellerData.realizedPnl,
      buyerOpenLotsCount: buyerData.openLots.length,
      sellerOpenLotsCount: sellerData.openLots.length
    };
  }

  reset() {
    this.playerPnL.clear();
  }
}
