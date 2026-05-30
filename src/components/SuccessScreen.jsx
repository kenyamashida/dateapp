import { useEffect, useRef } from 'react';

const CONFETTI_COLORS = [
  '#e040fb', '#ff4081', '#f8bbd0', '#00e676', '#69f0ae',
  '#ff6e40', '#ffd740', '#40c4ff', '#ea80fc',
];

function createConfetti(container) {
  const count = 80;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left     = Math.random() * 100 + 'vw';
    el.style.width    = (6 + Math.random() * 8) + 'px';
    el.style.height   = (6 + Math.random() * 8) + 'px';
    el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.animationDuration  = (2 + Math.random() * 3) + 's';
    el.style.animationDelay     = (Math.random() * 1.5) + 's';
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

export default function SuccessScreen({ result }) {
  const confettiRef = useRef(null);

  useEffect(() => {
    if (confettiRef.current) {
      createConfetti(confettiRef.current);
      const t = setTimeout(() => {
        if (confettiRef.current) createConfetti(confettiRef.current);
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  const times = result?.times;
  const htmlLink = result?.htmlLink;
  const planDetails = result?.planDetails;

  return (
    <>
      {/* Confetti */}
      <div className="confetti-container" ref={confettiRef} />

      <div className="glass-card success-screen">
        <span className="success-emoji">🎉</span>

        <h1 className="success-title">Ela disse Sim!</h1>
        <p className="success-subtitle">Nosso encontro foi agendado com sucesso!</p>

        <div className="success-divider" />

        {/* Event Details Card */}
        <div className="event-card">
          <div className="event-card-row">
            <span className="event-card-icon">📅</span>
            <span className="event-card-label">Quando</span>
            <span className="event-card-value">
              {times?.dateStr
                ? times.dateStr.charAt(0).toUpperCase() + times.dateStr.slice(1)
                : 'Próximo sábado'}
            </span>
          </div>
          <div className="event-card-row">
            <span className="event-card-icon">⏰</span>
            <span className="event-card-label">Horário</span>
            <span className="event-card-value">{times?.timeStr || '19h00 – 21h00'}</span>
          </div>

          {planDetails && (
            <>
              <div className="event-card-row">
                <span className="event-card-icon">🎯</span>
                <span className="event-card-label">Plano</span>
                <span className="event-card-value">{planDetails.activityLabel} — {planDetails.subActivity}</span>
              </div>
              <div className="event-card-row">
                <span className="event-card-icon">🚗</span>
                <span className="event-card-label">Logística</span>
                <span className="event-card-value">{planDetails.meetingText}</span>
              </div>
            </>
          )}

          <div className="event-card-row">
            <span className="event-card-icon">🔔</span>
            <span className="event-card-label">Lembrete</span>
            <span className="event-card-value">Enviado por e-mail & adicionado na agenda</span>
          </div>
        </div>

        {htmlLink && (
          <a
            id="btn-open-calendar"
            className="btn-calendar-link"
            href={htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            📅 Abrir no Google Agenda
          </a>
        )}
      </div>
    </>
  );
}
