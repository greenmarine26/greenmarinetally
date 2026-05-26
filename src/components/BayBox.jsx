import React from 'react';
import { buildBayRenderData, bayKey, STANDARD_DECK, STANDARD_HOLD } from '../lib/bayRender.js';

/**
 * 1개 베이 시각화 (= 베이플랜)
 * @param {Object} bay - shipDict의 BayEntry
 * @param {boolean} showTitle - 베이 제목 표시 (BAY 11 등)
 * @param {number} count - 컨테이너 카운트 (있으면 우측 상단 표시)
 */
export default function BayBox({ bay, showTitle = true, count = null }) {
  if (!bay) return null;
  const data = buildBayRenderData(bay);
  if (!data) return null;
  const { rowPos, deckRows, holdRows } = data;

  // 짝수 단독 베이 = 페어 짝수가 없을 때만 표시되는 케이스 (드물지만 가능)
  // → showSection은 deckTiers 또는 holdTiers가 있을 때만
  const hasDeck = data.deckTiers.length > 0;
  const hasHold = data.holdTiers.length > 0;

  return (
    <div className="bay-box" style={{ minWidth: 300 }}>
      {showTitle && (
        <div className="bay-title">
          BAY {bayKey(bay)}
          {count != null && <span style={{ marginLeft: 8, fontWeight: 'normal', color: '#666' }}>{count}</span>}
        </div>
      )}
      <div className="bay-section">
        {/* DECK 영역 */}
        {hasDeck && (
          <div className="bay-area bay-deck">
            <div className="bay-grid-wrap">
              <div className="bay-grid">
                {deckRows.map((row, ri) => (
                  <div key={ri} className={`bay-tier-row${row.invisible ? ' invisible' : ''}`}>
                    {row.cells.map((cell, ci) => (
                      <span key={ci} className={cell.active ? 'bay-cell' : 'bay-cell empty'}>
                        {cell.active ? '' : ''}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <div className="bay-tier-labels">
                {STANDARD_DECK.map(t => (
                  <span key={t} className={data.deckTiers.includes(t) ? '' : 'invisible'}>
                    {String(t).padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DECK-HOLD 구분선 */}
        {hasDeck && hasHold && <div className="bay-deck-hold-divider"></div>}

        {/* HOLD 영역 */}
        {hasHold && (
          <div className="bay-area bay-hold">
            <div className="bay-grid-wrap">
              <div className="bay-grid">
                {holdRows.map((row, ri) => (
                  <div key={ri} className={`bay-tier-row${row.invisible ? ' invisible' : ''}`}>
                    {row.cells.map((cell, ci) => (
                      <span key={ci} className={cell.active ? 'bay-cell' : 'bay-cell empty'}>
                        {cell.active ? '' : ''}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <div className="bay-tier-labels">
                {STANDARD_HOLD.map(t => (
                  <span key={t} className={data.holdTiers.includes(t) ? '' : 'invisible'}>
                    {String(t).padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
            {/* row 라벨 (hold 하단) */}
            <div className="bay-row-labels">
              {rowPos.map((r, i) => <span key={i}>{r}</span>)}
            </div>
          </div>
        )}

        {/* deck만 있고 hold 없으면 row 라벨은 deck 하단 */}
        {hasDeck && !hasHold && (
          <div className="bay-row-labels">
            {rowPos.map((r, i) => <span key={i}>{r}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}
