import { useState, useEffect, useRef } from 'react';

const CONFETTI_COLORS = [
  '#e040fb', '#ff4081', '#f8bbd0', '#00e676', '#69f0ae',
  '#ff6e40', '#ffd740', '#40c4ff', '#ea80fc',
];

function createConfetti(container) {
  const count = 100;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left     = Math.random() * 100 + 'vw';
    el.style.width    = 'auto';
    el.style.height   = 'auto';
    el.innerHTML      = Math.random() > 0.4 ? '❤️' : (Math.random() > 0.5 ? '🌸' : '🎉');
    el.style.fontSize = (12 + Math.random() * 16) + 'px';
    el.style.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    el.style.animationDuration  = (2 + Math.random() * 3.5) + 's';
    el.style.animationDelay     = (Math.random() * 2) + 's';
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

function getPersonalizedPhrase(answers) {
  const phrases = [];

  if (answers) {
    if (answers.quizAventura === 'Seguro') {
      phrases.push("Aparentemente você gosta de dates tranquilos e sem sustos. Perfeito para conversar! ☕");
      phrases.push("Você prefere a segurança de um bom planejamento. Zero chances de terminarmos perdidos! 🗺️");
    } else if (answers.quizAventura === 'Vamos improvisar') {
      phrases.push("Você parece o tipo de pessoa que adora improvisar e deixar espaço para a magia do momento! ✨");
      phrases.push("Aventura moderada detectada! Prepare-se para boas risadas e momentos espontâneos. 🧭");
    } else if (answers.quizAventura === 'Se terminarmos numa feira medieval, faz parte') {
      phrases.push("Nível de aventura lendário! Há 87% de chance de este date terminar em uma história épica. ⚔️");
      phrases.push("Você tem um espírito livre e corajoso. Com você, até um improviso vira uma grande aventura! 🐉");
    }

    if (answers.quizIntencao === 'Romance') {
      phrases.push("Alerta de romance no ar! O clima promete ser digno de uma linda comédia romântica. 💕");
      phrases.push("Seu coração está aberto para momentos doces e conexões verdadeiras. Romance garantido! 🕯️");
    }

    if (answers.quizSobremesa === 'Sim' || answers.quizSobremesa === 'Depende da sobremesa') {
      phrases.push("Seu date perfeito tem 87% de chance de terminar com duas colheres e uma sobremesa dividida. 🍰");
    } else if (answers.quizSobremesa === 'Não' || answers.quizSobremesa === 'Absolutamente não, peça a sua') {
      phrases.push("Respeito sagrado à sobremesa individual: a base de uma convivência madura e feliz! 🛑🍰");
    }

    if (answers.quizTrilha?.trim()) {
      phrases.push("Sua trilha sonora demonstra que você tem um gosto musical impecável. O som do carro está garantido! 🎵");
    }
  }

  // Fallbacks
  phrases.push("Seu date perfeito tem 100% de chance de terminar com um sorriso bobo no rosto. 😊");
  phrases.push("Aparentemente, temos aqui uma pessoa de muito bom gosto para programações de lazer! 🌟");
  phrases.push("Previsão do tempo para o nosso encontro: 100% de chance de sintonia, risadas e conexão. ☀️");

  // Deterministically choose one based on answers length
  const seed = (answers?.quizIntencao?.length || 0) + (answers?.quizAventura?.length || 0) + (answers?.quizFilme?.length || 0) + 7;
  return phrases[seed % phrases.length];
}

export default function SuccessScreen({ result }) {
  const confettiRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const playConfettiSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      const playNote = (freq, start, duration) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gainNode.gain.setValueAtTime(0.08, start);
        gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51];
      notes.forEach((freq, index) => {
        playNote(freq, now + index * 0.05, 0.4);
      });
    } catch (e) {
      console.warn("AudioContext failed:", e);
    }
  };

  useEffect(() => {
    if (confettiRef.current) {
      createConfetti(confettiRef.current);
      playConfettiSound();
      const t = setTimeout(() => {
        if (confettiRef.current) createConfetti(confettiRef.current);
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  const times = result?.times;
  const htmlLink = result?.htmlLink;
  const planDetails = result?.planDetails;

  useEffect(() => {
    if (!times?.targetIso) return;

    const calculateTime = () => {
      const targetTime = new Date(times.targetIso).getTime();
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft('🎉 É HOJE! 💕');
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [times?.targetIso]);

  return (
    <>
      {/* Confetti */}
      <div className="confetti-container" ref={confettiRef} />

      <div className="glass-card success-screen">
        <span className="success-emoji">🎉</span>

        <h1 className="success-title">
          {planDetails?.guestName ? `${planDetails.guestName} disse Sim!` : 'Ela disse Sim!'}
        </h1>
        <p className="success-subtitle">Date com o Ken 💖</p>

        {/* Match Compatibility Badge */}
        {(() => {
          let score = 90;
          if (planDetails?.quizAnswers) {
            const q = planDetails.quizAnswers;
            if (q.quizIntencao) score += 2;
            if (q.quizFilme) score += 2;
            if (q.quizMood) score += 2;
            if (q.quizTrilha?.trim()) score += 2;
            if (q.quizSobremesa === 'Sim' || q.quizSobremesa === 'Depende da sobremesa') score += 2;
          }
          const finalScore = Math.min(score, 100);

          return (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              margin: '0.5rem auto 1rem auto',
              padding: '0.4rem 1rem',
              background: 'rgba(255, 64, 129, 0.1)',
              border: '1px solid rgba(255, 64, 129, 0.3)',
              borderRadius: '20px',
              color: '#ff4081',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              textShadow: '0 0 10px rgba(255, 64, 129, 0.3)',
              animation: 'pulse 2s infinite ease-in-out'
            }}>
              <span>💖 Compatibilidade do Date:</span>
              <span style={{ fontSize: '1rem', color: '#fff', background: '#ff4081', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>
                {finalScore}%
              </span>
            </div>
          );
        })()}

        <div className="success-divider" />

        {/* Countdown Timer */}
        {timeLeft && (
          <div className="countdown-wrap" style={{
            margin: '0.25rem 0 1.25rem 0',
            padding: '1rem',
            background: 'rgba(255, 105, 180, 0.08)',
            border: '1px solid rgba(255, 105, 180, 0.2)',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 0 15px rgba(255, 105, 180, 0.1)',
            backdropFilter: 'blur(10px)',
            animation: 'pulse 3s infinite ease-in-out'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              💖 Contagem Regressiva:
            </span>
            <div style={{ fontSize: '1.6rem', color: 'var(--color-text-primary)', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '1px', textShadow: '0 0 10px rgba(255, 64, 129, 0.5)' }}>
              {timeLeft}
            </div>
          </div>
        )}

        {/* Ticket Instagramável "Seu Date Ideal" */}
        {planDetails && (
          <div style={{
            margin: '0.5rem 0 1.5rem 0',
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '2px dashed var(--color-primary)',
            borderRadius: '16px',
            position: 'relative',
            boxShadow: '0 8px 32px 0 rgba(224, 64, 251, 0.15)',
            backdropFilter: 'blur(8px)',
            color: 'var(--color-text-primary)'
          }}>
            {/* Circle notches on sides to make it look like a real ticket */}
            <div style={{ position: 'absolute', top: '50%', left: '-10px', transform: 'translateY(-50%)', width: '20px', height: '20px', background: '#0e0b16', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', top: '50%', right: '-10px', transform: 'translateY(-50%)', width: '20px', height: '20px', background: '#0e0b16', borderRadius: '50%' }} />

            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#ff4081', margin: 0, fontFamily: 'var(--font-script)', textShadow: '0 0 10px rgba(255, 64, 129, 0.3)' }}>
                💘 Seu Date Ideal
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '0.2rem' }}>
                Recibo Oficial de Amor
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.95rem', borderBottom: '1px dashed rgba(255, 255, 255, 0.15)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✨</span>
                <span><strong>Encontro:</strong> {planDetails.activityLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📍</span>
                <span><strong>Detalhes:</strong> {planDetails.subActivity}</span>
              </div>
              {planDetails.quizAnswers?.quizAventura && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>❤️</span>
                  <span><strong>Aventura:</strong> {planDetails.quizAnswers.quizAventura}</span>
                </div>
              )}
              {planDetails.quizAnswers?.quizMood && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🕯️</span>
                  <span><strong>Estilo:</strong> {planDetails.quizAnswers.quizMood}</span>
                </div>
              )}
            </div>

            {/* Personalized Phrase / Analysis */}
            <div style={{
              textAlign: 'center',
              fontStyle: 'italic',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              color: 'var(--color-primary)',
              padding: '0.5rem',
              background: 'rgba(224, 64, 251, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(224, 64, 251, 0.15)'
            }}>
              "{getPersonalizedPhrase(planDetails.quizAnswers)}"
            </div>
          </div>
        )}

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
              {planDetails.quizAnswers && (
                <>
                  <div className="event-card-row">
                    <span className="event-card-icon">🎭</span>
                    <span className="event-card-label">Perfil</span>
                    <span className="event-card-value">
                      O que procura: {planDetails.quizAnswers.quizIntencao || 'Sem preferência 🤷'} | Aventura: {planDetails.quizAnswers.quizAventura || 'Sem preferência 🤷'}
                    </span>
                  </div>
                  <div className="event-card-row">
                    <span className="event-card-icon">🍿</span>
                    <span className="event-card-label">Filme/Doce</span>
                    <span className="event-card-value">
                      Filme: {planDetails.quizAnswers.quizFilme || 'Sem preferência 🤷'} | Sobremesa: {planDetails.quizAnswers.quizSobremesa || 'Sem preferência 🤷'}
                    </span>
                  </div>
                  {planDetails.quizAnswers.quizMood && (
                    <div className="event-card-row">
                      <span className="event-card-icon">🕯️</span>
                      <span className="event-card-label">Mood/Style</span>
                      <span className="event-card-value">{planDetails.quizAnswers.quizMood}</span>
                    </div>
                  )}
                  {planDetails.quizAnswers.quizTrilha?.trim() && (
                    <div className="event-card-row">
                      <span className="event-card-icon">🎵</span>
                      <span className="event-card-label">Trilha Sonora</span>
                      <span className="event-card-value">{planDetails.quizAnswers.quizTrilha}</span>
                    </div>
                  )}
                  {planDetails.quizAnswers.quizRestricao.trim() && (
                    <div className="event-card-row">
                      <span className="event-card-icon">🍎</span>
                      <span className="event-card-label">Restrições</span>
                      <span className="event-card-value">{planDetails.quizAnswers.quizRestricao}</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div className="event-card-row">
            <span className="event-card-icon">🏅</span>
            <span className="event-card-label">Status</span>
            <span className="event-card-value" style={{ color: '#00e676', fontWeight: 'bold' }}>
              Aprovado para um primeiro encontro em São Paulo! 🏆
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          {htmlLink && (
            <a
              id="btn-open-calendar"
              className="btn-calendar-link"
              href={htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              📅 Adicionar ao Google Agenda
            </a>
          )}

          {result?.whatsappUrl && (
            <a
              id="btn-confirm-whatsapp"
              className="btn-whatsapp-link"
              href={result.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              💬 Confirmar no WhatsApp
            </a>
          )}
        </div>
      </div>
    </>
  );
}
