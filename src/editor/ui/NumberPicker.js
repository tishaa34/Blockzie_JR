import React, { useEffect, useState } from 'react';
import '../../css/NumberPicker.css';

export default function NumberPicker({ isOpen, onClose, onSelect, currentValue = 1 }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (isOpen) setDisplay(String(currentValue));
  }, [isOpen, currentValue]);

  if (!isOpen) return null;

  const pushDigit = (d) => {
    const next = `${display}${d}`;
    const n = parseInt(next || '0', 10);
    if (n >= 1 && n <= 99) setDisplay(String(n));
  };
  const back = () => {
    const next = display.slice(0, -1);
    setDisplay(next.length ? next : '1');
  };
  const clear = () => setDisplay('1');
  const ok = () => {
    const n = Math.max(1, Math.min(99, parseInt(display || '1', 10)));
    onSelect(n);
    onClose();
  };

  return (
    <div className="np-overlay" onMouseDown={onClose}>
      <div className="np-box" onMouseDown={(e) => e.stopPropagation()}>
        <div className="np-title">How many times?</div>
        <div className="np-screen"><span>{display}</span></div>
        <div className="np-grid">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="np-btn" onClick={() => pushDigit(n)}>{n}</button>
          ))}
          <button className="np-btn np-clear" onClick={clear}>Clear</button>
          <button className="np-btn" onClick={() => pushDigit(0)}>0</button>
          <button className="np-btn np-back" onClick={back}>⌫</button>
        </div>
        <div className="np-actions">
          <button className="np-cancel" onClick={onClose}>Cancel</button>
          <button className="np-ok" onClick={ok}>OK</button>
        </div>
        <div className="np-range">Range 1–99</div>
      </div>
    </div>
  );
}
