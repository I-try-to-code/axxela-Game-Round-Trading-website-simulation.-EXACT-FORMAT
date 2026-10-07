/**
 * PositionEngine
 * 
 * Enforces the strict -2 to +2 open position limits.
 * There is NO restriction on total completed transactions.
 */
export class PositionEngine {
  static MAX_POSITION = 2;
  static MIN_POSITION = -2;

  constructor() {
    // Map of playerId -> { units: number, lots: Array<{ price: number, side: 'BUY'|'SELL', timestamp: number }> }
    this.positions = new Map();
  }

  initPlayer(playerId) {
    if (!this.positions.has(playerId)) {
      this.positions.set(playerId, {
        units: 0,
        lots: []
      });
    }
  }

  getPosition(playerId) {
    this.initPlayer(playerId);
    return this.positions.get(playerId).units;
  }

  getLots(playerId) {
    this.initPlayer(playerId);
    return [...this.positions.get(playerId).lots];
  }

  canBuy(playerId, quantity = 1) {
    const current = this.getPosition(playerId);
    return current + quantity <= PositionEngine.MAX_POSITION;
  }

  canSell(playerId, quantity = 1) {
    const current = this.getPosition(playerId);
    return current - quantity >= PositionEngine.MIN_POSITION;
  }

  canExecuteTrade(buyerId, sellerId, quantity = 1) {
    return this.canBuy(buyerId, quantity) && this.canSell(sellerId, quantity);
  }

  /**
   * Applies an executed trade to positions.
   * Buyer position increases by +quantity.
   * Seller position decreases by -quantity.
   */
  applyTrade(buyerId, sellerId, price, quantity = 1) {
    if (!this.canExecuteTrade(buyerId, sellerId, quantity)) {
      throw new Error(`Trade violates position limits: Buyer ${buyerId} or Seller ${sellerId}`);
    }

    const buyerData = this.positions.get(buyerId);
    const sellerData = this.positions.get(sellerId);

    buyerData.units += quantity;
    sellerData.units -= quantity;

    return {
      buyerPosition: buyerData.units,
      sellerPosition: sellerData.units
    };
  }

  reset() {
    this.positions.clear();
  }
}
