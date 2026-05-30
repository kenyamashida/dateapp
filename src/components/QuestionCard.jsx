import { useEffect, useRef, useState, useCallback } from 'react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRandomPosition(btnWidth = 140, btnHeight = 48) {
  const margin = 20;
  const maxX = window.innerWidth  - btnWidth  - margin;
  const maxY = window.innerHeight - btnHeight - margin;
  return {
    x: Math.max(margin, Math.random() * maxX),
    y: Math.max(margin, Math.random() * maxY),
  };
}

function distance(ax, ay, bx, by) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuestionCard({ onYes }) {
  const [noPos, setNoPos]         = useState({ x: 0, y: 0 });
  const [noPosReady, setNoPosReady] = useState(false);
  const [hasMoved, setHasMoved]   = useState(false); // Track if the button has fled
  
  const btnNoRef    = useRef(null);
  const ghostRef    = useRef(null);
  const initialized = useRef(false);

  // Read VITE_GUEST_NAME from environment or "name" query parameter from URL (e.g. ?name=Carol)
  const name = import.meta.env.VITE_GUEST_NAME || new URLSearchParams(window.location.search).get('name') || '';

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      const playNote = (freq, start, duration) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gainNode.gain.setValueAtTime(0.15, start);
        gainNode.gain.exponentialRampToValueAtTime(0.01, start + duration);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playNote(523.25, now, 0.4);
      playNote(659.25, now + 0.1, 0.4);
      playNote(784.00, now + 0.2, 0.4);
      playNote(1046.50, now + 0.3, 0.6);
    } catch (e) {
      console.warn("AudioContext failed:", e);
    }
  };

  // ── Initial position: align "Não" on top of the ghost spacer ─────────────
  useEffect(() => {
    if (!initialized.current && ghostRef.current) {
      initialized.current = true;
      const rect = ghostRef.current.getBoundingClientRect();
      setNoPos({ x: rect.left, y: rect.top });
      setNoPosReady(true);
    }
  }, []);

  // ── Mouse proximity detector ──────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (!btnNoRef.current) return;
    const rect = btnNoRef.current.getBoundingClientRect();
    const btnCX = rect.left + rect.width  / 2;
    const btnCY = rect.top  + rect.height / 2;
    if (distance(e.clientX, e.clientY, btnCX, btnCY) < 130) {
      setNoPos(getRandomPosition(rect.width, rect.height));
      setHasMoved(true); // Toggle funny message visibility on first flee!
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // ── Touch proximity (mobile) ──────────────────────────────────────────────
  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    if (!touch || !btnNoRef.current) return;
    const rect = btnNoRef.current.getBoundingClientRect();
    const btnCX = rect.left + rect.width  / 2;
    const btnCY = rect.top  + rect.height / 2;
    if (distance(touch.clientX, touch.clientY, btnCX, btnCY) < 150) {
      setNoPos(getRandomPosition(rect.width, rect.height));
      setHasMoved(true); // Toggle funny message visibility on first flee!
    }
  }, []);

  useEffect(() => {
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => window.removeEventListener('touchmove', handleTouchMove);
  }, [handleTouchMove]);

  return (
    <>
      {/* Floating "Não" button — hidden until position is ready */}
      <button
        ref={btnNoRef}
        id="btn-no"
        className="btn-no"
        style={{
          left: `${noPos.x}px`,
          top: `${noPos.y}px`,
          opacity: noPosReady ? 1 : 0,
          pointerEvents: noPosReady ? 'auto' : 'none',
        }}
        onClick={() => {
          setNoPos(getRandomPosition(140, 48));
          setHasMoved(true);
        }}
        aria-label="Não"
      >
        Não 😶
      </button>

      {/* Question Card */}
      <div className="glass-card">
        <span className="question-emoji">💕</span>
        <p className="question-subtitle">Date com o Ken 💖</p>
        
        <h1 className="question-title">
          {name ? `${name}, você quer sair comigo?` : "Você quer sair comigo?"}
        </h1>
        
        <p className="question-desc">
          Pense bem antes de responder...
          {hasMoved && (
            <span className="fade-in" style={{ display: 'block', marginTop: '0.6rem', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: '500' }}>
              (O botão Não está tendo um probleminha técnico 🙃)
            </span>
          )}
        </p>

        <div className="btn-group">
          <button
            id="btn-yes"
            className="btn-yes"
            onClick={() => {
              playChime();
              setTimeout(onYes, 250);
            }}
          >
            ✨ Sim!
          </button>
          {/* Ghost spacer — used to anchor initial position of "Não" button */}
          <span ref={ghostRef} style={{ width: '140px', height: '48px', display: 'inline-block' }} />
        </div>
      </div>
    </>
  );
}
