import { randomUUID } from 'node:crypto';

/**
 * TradeEngine
 * 
 * Supports both broadcasted Working Orders (with a max of 2 active orders per player)
 * and direct order matching (taking another player's working order).
 */
export class TradeEngine {
  static MAX_WORKING_ORDERS_PER_PLAYER = 2;

  constructor(positionEngine, pnlEngine) {
    this.positionEngine = positionEngine;
    this.pnlEngine = pnlEngine;
    // Map of orderId -> Order
    this.workingOrders = new Map();
    // Array of executed Trades
    this.executedTrades = [];
  }

  /**
   * Returns count of active working orders for a player.
   */
  getActiveWorkingOrdersCount(playerId) {
    let count = 0;
    for (const order of this.workingOrders.values()) {
      if (order.playerId === playerId && order.status === 'OPEN') {
        count++;
      }
    }
    return count;
  }

  /**
   * Creates a broadcasted working order visible to everyone on the table.
   * Maximum 2 active working orders per player at a time!
   */
  createWorkingOrder({ playerId, playerLetter, side, price, round }) {
    if (this.getActiveWorkingOrdersCount(playerId) >= TradeEngine.MAX_WORKING_ORDERS_PER_PLAYER) {
      throw new Error("You can only have at most 2 active working orders at a time");
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0 || numPrice > 100) {
      throw new Error("Price must be a valid number between 0 and 100");
    }

    // Validate position limit
    if (side === 'BUY') {
      if (!this.positionEngine.canBuy(playerId, 1)) {
        throw new Error("Cannot place BUY: maximum position limit (+2) reached");
      }
    } else if (side === 'SELL') {
      if (!this.positionEngine.canSell(playerId, 1)) {
        throw new Error("Cannot place SELL: minimum position limit (-2) reached");
      }
    } else {
      throw new Error(`Invalid side: ${side}`);
    }

    const order = {
      id: randomUUID(),
      playerId,
      playerLetter,
      side, // 'BUY' (green) or 'SELL' (red)
      price: numPrice,
      quantity: 1,
      round,
      status: 'OPEN', // OPEN, FILLED, CANCELLED, EXPIRED
      createdAt: Date.now()
    };

    this.workingOrders.set(order.id, order);
    return order;
  }

  /**
   * Takes (executes against) an existing open working order on the table.
   */
  takeWorkingOrder(orderId, takerId, takerLetter) {
    const order = this.workingOrders.get(orderId);
    if (!order) {
      throw new Error("Order not found or no longer available");
    }

    if (order.status !== 'OPEN') {
      throw new Error("Order is no longer open");
    }

    if (order.playerId === takerId) {
      throw new Error("Cannot trade with yourself");
    }

    let buyerId, sellerId, buyerLetter, sellerLetter;
    if (order.side === 'BUY') {
      // Maker wants to BUY; Taker is SELLING to Maker
      buyerId = order.playerId;
      buyerLetter = order.playerLetter;
      sellerId = takerId;
      sellerLetter = takerLetter;
    } else {
      // Maker wants to SELL; Taker is BUYING from Maker
      sellerId = order.playerId;
      sellerLetter = order.playerLetter;
      buyerId = takerId;
      buyerLetter = takerLetter;
    }

    // Validate both parties' position constraints
    if (!this.positionEngine.canBuy(buyerId, 1)) {
      throw new Error(`Buyer (${buyerLetter}) has reached the maximum position limit (+2)`);
    }
    if (!this.positionEngine.canSell(sellerId, 1)) {
      throw new Error(`Seller (${sellerLetter}) has reached the minimum position limit (-2)`);
    }

    // Atomic execution
    order.status = 'FILLED';
    order.filledAt = Date.now();
    order.filledBy = takerId;

    const posResult = this.positionEngine.applyTrade(buyerId, sellerId, order.price, 1);
    const pnlResult = this.pnlEngine.processTrade(buyerId, sellerId, order.price, 1, order.filledAt);

    const trade = {
      id: randomUUID(),
      orderId: order.id,
      round: order.round,
      buyerId,
      buyerLetter,
      sellerId,
      sellerLetter,
      price: order.price,
      quantity: 1,
      executedAt: order.filledAt
    };

    this.executedTrades.push(trade);

    return {
      order,
      trade,
      posResult,
      pnlResult
    };
  }

  /**
   * Cancels a pending working order.
   */
  cancelWorkingOrder(orderId, cancellingPlayerId) {
    const order = this.workingOrders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== 'OPEN') {
      throw new Error("Order is no longer open");
    }

    if (order.playerId !== cancellingPlayerId) {
      throw new Error("Only the order creator can cancel it");
    }

    order.status = 'CANCELLED';
    order.cancelledAt = Date.now();
    return order;
  }

  /**
   * Expire all open working orders for a round when the round finishes.
   */
  expireRoundOrders(round) {
    const expired = [];
    for (const order of this.workingOrders.values()) {
      if (order.round === round && order.status === 'OPEN') {
        order.status = 'EXPIRED';
        order.expiredAt = Date.now();
        expired.push(order);
      }
    }
    return expired;
  }

  /**
   * Get all currently open working orders across all players (for rendering on table).
   */
  getAllOpenWorkingOrders() {
    const open = [];
    for (const o of this.workingOrders.values()) {
      if (o.status === 'OPEN') {
        open.push({
          id: o.id,
          playerId: o.playerId,
          playerLetter: o.playerLetter,
          side: o.side,
          price: o.price,
          round: o.round,
          createdAt: o.createdAt
        });
      }
    }
    return open;
  }

  /**
   * Get active working orders created by a specific player (for their own sidebar).
   */
  getWorkingOrdersForPlayer(playerId) {
    const orders = [];
    for (const o of this.workingOrders.values()) {
      if (o.playerId === playerId && o.status === 'OPEN') {
        orders.push({
          id: o.id,
          side: o.side,
          price: o.price,
          round: o.round,
          createdAt: o.createdAt
        });
      }
    }
    return orders;
  }

  /**
   * Get completed trades involving a player.
   */
  getTradesForPlayer(playerId) {
    return this.executedTrades
      .filter(t => t.buyerId === playerId || t.sellerId === playerId)
      .map(t => {
        const isBuyer = t.buyerId === playerId;
        return {
          id: t.id,
          round: t.round,
          partnerLetter: isBuyer ? t.sellerLetter : t.buyerLetter,
          partnerId: isBuyer ? t.sellerId : t.buyerId,
          action: isBuyer ? 'BUY' : 'SELL',
          price: t.price,
          quantity: t.quantity,
          executedAt: t.executedAt
        };
      });
  }

  /**
   * Get all completed trades in the entire game.
   */
  getAllTrades() {
    return [...this.executedTrades];
  }

  // --- Backward compatibility methods for tests ---
  proposeTrade({ fromPlayerId, fromPlayerLetter, side, price, round }) {
    return this.createWorkingOrder({ playerId: fromPlayerId, playerLetter: fromPlayerLetter, side, price, round });
  }

  acceptProposal(orderId, acceptingPlayerId, acceptingPlayerLetter = 'B') {
    return this.takeWorkingOrder(orderId, acceptingPlayerId, acceptingPlayerLetter);
  }

  cancelProposal(orderId, cancellingPlayerId) {
    return this.cancelWorkingOrder(orderId, cancellingPlayerId);
  }

  expireRoundProposals(round) {
    return this.expireRoundOrders(round);
  }

  getIncomingProposalsForPlayer() {
    return [];
  }
}
