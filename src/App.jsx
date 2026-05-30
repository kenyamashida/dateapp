import { useState } from 'react';
import './App.css';
import QuestionCard  from './components/QuestionCard';
import BookingForm   from './components/BookingForm';
import SuccessScreen from './components/SuccessScreen';

// ── Floating particles ────────────────────────────────────────────────────────
const PARTICLES = ['💕', '✨', '🌸', '💫', '🌷', '💖', '⭐', '🌙', '💗'];

function Particles() {
  return (
    <div className="particles" aria-hidden="true">
      {PARTICLES.map((emoji, i) => (
        <span
          key={i}
          className="particle"
          style={{
            left:              `${(i / PARTICLES.length) * 100 + Math.random() * 8}%`,
            animationDuration: `${8 + i * 1.5}s`,
            animationDelay:    `${i * 0.9}s`,
            fontSize:          `${0.8 + Math.random() * 0.8}rem`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
// Screens: 'question' → 'booking' → 'success'

export default function App() {
  const [screen, setScreen] = useState('question');
  const [result, setResult] = useState(null);

  const handleYes = () => {
    setScreen('booking');
  };

  const handleSuccess = (calendarResult) => {
    setResult(calendarResult);
    setScreen('success');
  };

  const handleBack = () => {
    setScreen('question');
  };

  return (
    <>
      <div className="bg-canvas" aria-hidden="true" />
      <Particles />

      <main className="app-container">
        {screen === 'question' && (
          <QuestionCard onYes={handleYes} />
        )}
        {screen === 'booking' && (
          <BookingForm
            onSuccess={handleSuccess}
            onBack={handleBack}
          />
        )}
        {screen === 'success' && (
          <SuccessScreen result={result} />
        )}
      </main>
    </>
  );
}
