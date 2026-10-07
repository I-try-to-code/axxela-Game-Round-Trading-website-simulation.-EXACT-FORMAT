import React, { useState, useEffect } from 'react';
import { ArrowRightCircle, X } from 'lucide-react';
import { soundManager } from '../audio/soundEffects';

export function TradingPanel({
  targetOrder,
  onClearTargetOrder,
  myPosition = 0,
  myWorkingOrdersCount = 0,
  onPlaceWorkingOrder,
  onTakeOrder,
  isTradingWindowOpen = true
}) {
  const [price, setPrice] = useState('');
  const [side, setSide] = useState('BUY'); // 'BUY' or 'SELL'
  const [errorMsg, setErrorMsg] = useState('');

  // Sync inputs if a target order was clicked on the table
  useEffect(() => {
    if (targetOrder) {
      setPrice(String(targetOrder.price));
      // Red means selling, Green means buying from us.
      // If target maker wants to BUY, we SELL to them!
      // If target maker wants to SELL, we BUY from them!
      if (targetOrder.side === 'BUY') {
        setSide('SELL');
      } else {
        setSide('BUY');
      }
      setErrorMsg('');
    }
  }, [targetOrder]);

  const canBuy = myPosition < 2;
  const canSell = myPosition > -2;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isTradingWindowOpen) {
      setErrorMsg('Trading window is currently closed');
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMsg('Please enter a valid price');
      return;
    }

    // If taking an existing order from the table:
    if (targetOrder) {
      if (side === 'BUY' && !canBuy) {
        setErrorMsg('Cannot BUY: max open position (+2) reached');
        return;
      }
      if (side === 'SELL' && !canSell) {
        setErrorMsg('Cannot SELL: min open position (-2) reached');
        return;
      }

      soundManager.playTradeExecuted();
      onTakeOrder(targetOrder.id);
      if (typeof onClearTargetOrder === 'function') onClearTargetOrder();
      setPrice('');
      return;
    }

    // Otherwise placing a new working order on the table:
    if (myWorkingOrdersCount >= 2) {
      setErrorMsg('At a time you can only have 2 active working orders');
      return;
    }

    if (side === 'BUY' && !canBuy) {
      setErrorMsg('Cannot place BUY: max open position (+2) reached');
      return;
    }

    if (side === 'SELL' && !canSell) {
      setErrorMsg('Cannot place SELL: min open position (-2) reached');
      return;
    }

    soundManager.playOrderPlaced();
    onPlaceWorkingOrder({
      side,
      price: numPrice
    });

    setPrice('');
  };

  return (
    <div className="trading-panel-card">
      {/* Target order indicator banner */}
      {targetOrder && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: targetOrder.side === 'BUY' ? 'rgba(213,0,0,0.2)' : 'rgba(0,200,83,0.2)',
          border: `1px solid ${targetOrder.side === 'BUY' ? 'var(--sell-red)' : 'var(--buy-green)'}`,
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: '700',
          color: '#fff'
        }}>
          <span>
            {targetOrder.side === 'BUY'
              ? `Selling to ${targetOrder.playerLetter} @ ${targetOrder.price}`
              : `Buying from ${targetOrder.playerLetter} @ ${targetOrder.price}`}
          </span>
          <button
            type="button"
            onClick={onClearTargetOrder}
            style={{ background: 'transparent', color: '#fff', display: 'flex' }}
            title="Cancel targeting"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Row 1: Price Input and Buy/Sell Pills */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            className="price-input"
            placeholder="30"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setErrorMsg('');
            }}
            disabled={!isTradingWindowOpen}
            style={{ flex: 1, padding: '8px 12px', fontSize: '18px' }}
          />

          <button
            type="button"
            className={`btn-side side-buy ${side === 'BUY' ? 'active' : ''}`}
            onClick={() => {
              setSide('BUY');
              if (targetOrder && targetOrder.side !== 'SELL') onClearTargetOrder();
            }}
            disabled={!isTradingWindowOpen || !canBuy}
            style={{ padding: '8px 16px', borderRadius: '8px' }}
          >
            Buy
          </button>

          <button
            type="button"
            className={`btn-side side-sell ${side === 'SELL' ? 'active' : ''}`}
            onClick={() => {
              setSide('SELL');
              if (targetOrder && targetOrder.side !== 'BUY') onClearTargetOrder();
            }}
            disabled={!isTradingWindowOpen || !canSell}
            style={{ padding: '8px 16px', borderRadius: '8px' }}
          >
            Sell
          </button>
        </div>

        {/* Row 2: Wide Place Order Button */}
        <button
          type="submit"
          className={`btn-place-order ${side === 'BUY' ? 'buy' : 'sell'}`}
          disabled={!isTradingWindowOpen || !price || (side === 'BUY' && !canBuy) || (side === 'SELL' && !canSell)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderRadius: '8px'
          }}
        >
          <span>Place Order</span>
          <ArrowRightCircle size={20} />
        </button>

        {errorMsg && (
          <div style={{ color: '#ff5252', fontSize: '11px', textAlign: 'center', fontWeight: '600' }}>
            {errorMsg}
          </div>
        )}
      </form>
    </div>
  );
}
