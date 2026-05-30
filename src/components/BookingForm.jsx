import { useState, useEffect, useCallback, useRef } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL;
const OWNER_PHONE = import.meta.env.VITE_OWNER_PHONE;
const GUEST_NAME = new URLSearchParams(window.location.search).get('name') || import.meta.env.VITE_GUEST_NAME || '';

// ── Slot generation ────────────────────────────────────────────────────────────
function generateSlots(startHour = 9, endHour = 21, durationH = 2) {
  const slots = [];
  for (let h = startHour; h + durationH <= endHour; h++) {
    slots.push({ hour: h, label: `${String(h).padStart(2, '0')}:00` });
  }
  return slots;
}

function toISO(dateStr, hour) {
  return new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00`).toISOString();
}

function overlaps(slotStart, slotEnd, busyPeriods) {
  const s = new Date(slotStart).getTime();
  const e = new Date(slotEnd).getTime();
  return busyPeriods.some(({ start, end }) => {
    const bs = new Date(start).getTime();
    const be = new Date(end).getTime();
    return s < be && e > bs; // overlap
  });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

// ── Expanded Activity Options ──
const ACTIVITY_OPTIONS = {
  ao_ar_livre: {
    label: "Ar ao Livre 🌳",
    emoji: "🌳",
    subLabel: "O que vamos fazer lá fora? ☀️",
    subOptions: [
      "Piquenique 🧺",
      "Caminhada + conversa 🚶‍♂️",
      "Andar de bicicleta 🚲",
      "Ver o pôr do sol 🌅",
      "Passear com café na mão ☕"
    ]
  },
  cafe_conversa: {
    label: "Café e Conversa ☕",
    emoji: "☕",
    subLabel: "Qual o cenário ideal? 💭",
    subOptions: [
      "Cafeteria chique ✨",
      "Café histórico 🏛️",
      "Brunch instagramável 📸",
      "Café + livraria 📚",
      "Café + passeio 🚶‍♀️"
    ]
  },
  gastronomico: {
    label: "Gastronômico 🍽️",
    emoji: "🍽️",
    subLabel: "Qual tipo de culinária você prefere? 😋",
    isGastronomic: true
  },
  divertido: {
    label: "Divertido 🎮",
    emoji: "🎮",
    subLabel: "Qual vai ser a nossa diversão? 🥳",
    subOptions: [
      "Jogos de tabuleiro 🎲",
      "Karaokê 🎤",
      "Boliche 🎳",
      "Escape room 🔑",
      "Fliperama retrô 👾",
      "Minigolfe ⛳",
      "Sinuca 🎱",
      "Realidade virtual 🥽"
    ]
  },
  cultural: {
    label: "Cultural 🎭",
    emoji: "🎭",
    subLabel: "Qual o programa cultural hoje? 🎨",
    subOptions: [
      "Museu 🖼️",
      "Exposição 🎨",
      "Planetário 🌌",
      "Centro cultural 🏛️",
      "Teatro 🎭",
      "Show de jazz 🎷",
      "Feira de arte 🖼️"
    ]
  },
  shopping: {
    label: "Shopping 🛍️",
    emoji: "🛍️",
    subLabel: "O que vamos fazer no Shopping? 🛍️",
    subOptions: [
      "Compras e vitrines 🛍️",
      "Comer na praça de alimentação 🍕",
      "Jogar boliche ou fliperama 🎳",
      "Apenas passear e bater papo 🚶‍♀️"
    ]
  },
  cinema: {
    label: "Cinema 🎬",
    emoji: "🎬",
    subLabel: "Qual tipo de filme vamos assistir? 🍿",
    subOptions: [
      "Filme de Ação / Aventura 🍿",
      "Comédia Romântica 💕",
      "Terror / Suspense 😱",
      "Drama / Cult 🎭",
      "Animação / Fantasia 🦄"
    ]
  },
  diferentao: {
    label: "Diferentão 👽",
    emoji: "👽",
    subLabel: "Qual vai ser a nossa aventura incomum? 🌠",
    subOptions: [
      "Observar estrelas no planetário 🌠",
      "Fazer um piquenique noturno 🌙",
      "Assistir ao nascer do sol 🌅",
      "Visitar uma feira gastronômica 🍕",
      "Passeio fotográfico pela cidade 📸",
      "Caça ao tesouro pela Paulista 🗺️",
      "Tour de cafeterias ☕",
      "Escolher um bairro aleatório e explorar juntos 🗺️",
      "Encontrar o melhor pastel de São Paulo 🥟",
      "Competição de roteiro de R$50 💰"
    ]
  }
};

const CUISINES = {
  asiatica: {
    label: "Culinária Asiática 🥢",
    styles: ["Japonesa 🍣", "Coreana 🇰🇷", "Tailandesa 🇹🇭", "Chinesa 🇨🇳"]
  },
  arabe: {
    label: "Culinária Árabe 🧆",
    styles: ["Esfihas e kibes 🧆", "Comida libanesa 🇱🇧", "Comida síria 🇸🇾"]
  },
  italiana: {
    label: "Culinária Italiana 🍝",
    styles: ["Massas artesanais 🍝", "Pizza napolitana 🍕", "Jantar romântico 🍷"]
  }
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function BookingForm({ onSuccess, onBack }) {
  // Steps: 1 (Estilo) → 2 (Quiz) → 3 (Aprovação) → 4 (Logística) → 5 (Agendamento)
  const [step, setStep] = useState(1);
  
  // Passo 1: Estilo do Date
  const [activityType, setActivityType] = useState('');
  const [subActivity,  setSubActivity]  = useState('');
  const [locationPreference, setLocationPreference] = useState(''); // 'surprise' | 'suggest'
  const [customLocation,     setCustomLocation]     = useState('');
  
  // Gastronômico específico
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [selectedStyle,   setSelectedStyle]   = useState('');

  // Passo 2: Perguntas Finais
  const [quizIntencao, setQuizIntencao] = useState('');
  const [quizAventura, setQuizAventura] = useState('');
  const [quizFilme,    setQuizFilme]    = useState('');
  const [quizSobremesa, setQuizSobremesa] = useState('');
  const [quizRestricao, setQuizRestricao] = useState('');
  const [quizTrilha,    setQuizTrilha]    = useState('');
  const [quizMood,      setQuizMood]      = useState('');

  // Passo 3: Critérios de Aprovação
  const [appDogs,      setAppDogs]      = useState(false);
  const [appFood,      setAppFood]      = useState(false);
  const [appSelect,    setAppSelect]    = useState(false);
  const [appWalk,      setAppWalk]      = useState(false);
  const [appWhatever,  setAppWhatever]  = useState(false);
  const [appStatus,    setAppStatus]    = useState(false); // Selo de aprovado

  // Passo 4: Logística
  const [meetingType,  setMeetingType]  = useState('encontro'); // 'encontro' | 'busco'
  const [address,      setAddress]      = useState('');

  // Passo 5: Data e Horário
  const [selectedDate, setSelectedDate] = useState('');
  const [busyPeriods,  setBusyPeriods]  = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Auth & General States
  const [creating,     setCreating]     = useState(false);
  const [error,        setError]        = useState('');



  const fetchedDate = useRef('');
  const ALL_SLOTS = generateSlots(9, 21, 2);

  // Reset nested options when category changes
  useEffect(() => {
    setSubActivity('');
    setSelectedCuisine('');
    setSelectedStyle('');
    setLocationPreference('');
    setCustomLocation('');
  }, [activityType]);

  // Reset location when sub-activity changes
  useEffect(() => {
    setLocationPreference('');
    setCustomLocation('');
  }, [subActivity]);

  useEffect(() => {
    setSelectedStyle('');
    setLocationPreference('');
    setCustomLocation('');
  }, [selectedCuisine]);

  // Auto-check approved status if all criteria are ticked!
  useEffect(() => {
    if (appDogs && appFood && appSelect && appWalk && appWhatever) {
      setAppStatus(true);
    } else {
      setAppStatus(false);
    }
  }, [appDogs, appFood, appSelect, appWalk, appWhatever]);

  // ── Step Validations ────────────────────────────────────────────────────
  const isStep1Valid = () => {
    if (!activityType) return false;
    const act = ACTIVITY_OPTIONS[activityType];
    
    if (act.isGastronomic) {
      if (!selectedCuisine || !selectedStyle) return false;
    } else {
      const hasSubs = act.subOptions && act.subOptions.length > 0;
      if (hasSubs && !subActivity) return false;
    }
    
    if (!locationPreference) return false;
    if (locationPreference === 'suggest' && !customLocation.trim()) return false;
    
    return true;
  };

  const isStep2Valid = () => {
    return true;
  };

  const isStep3Valid = () => {
    return true;
  };

  const isStep4Valid = () => {
    if (meetingType === 'busco' && !address.trim()) return false;
    return true;
  };

  const isStep5Valid = () => {
    return !!(selectedDate && selectedSlot);
  };

  // ── Navigation Handlers ──
  const nextStep = () => {
    setError('');
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setError('');
    if (step === 1) {
      onBack();
    } else {
      setStep((prev) => Math.max(prev - 1, 1));
    }
  };

  // ── Fetch Busy periods from Google Calendar ──
  const fetchBusy = useCallback(async (date) => {
    if (!date || fetchedDate.current === date) return;
    fetchedDate.current = date;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError('');

    if (!API_KEY || API_KEY === 'sua-api-key-do-google-cloud' || !OWNER_EMAIL || OWNER_EMAIL.includes('seu-email')) {
      setBusyPeriods([]);
      setLoadingSlots(false);
      return;
    }

    try {
      const timeMin = encodeURIComponent(`${date}T00:00:00-03:00`);
      const timeMax = encodeURIComponent(`${date}T23:59:59-03:00`);
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(OWNER_EMAIL)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&key=${API_KEY}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao consultar a API pública da agenda.');
      }
      const data = await response.json();
      
      const busy = (data.items ?? []).map(event => ({
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
      }));
      setBusyPeriods(busy);
    } catch (e) {
      console.error(e);
      setError('Não foi possível verificar a agenda real. Mostrando todos os horários livres.');
      setBusyPeriods([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate && step === 5) {
      fetchBusy(selectedDate);
    }
  }, [selectedDate, step, fetchBusy]);

  const availableSlots = selectedDate ? ALL_SLOTS.map((slot) => {
    const slotStart = toISO(selectedDate, slot.hour);
    const slotEnd   = toISO(selectedDate, slot.hour + 2);
    return {
      ...slot,
      available: !overlaps(slotStart, slotEnd, busyPeriods),
    };
  }) : [];

  const hasAvailable = availableSlots.length > 0 && availableSlots.some((s) => s.available);

  // ── Submit selections & schedule event ────────────────────────────────────
  const handleConfirm = () => {
    if (!isStep1Valid() || !isStep2Valid() || !isStep3Valid() || !isStep4Valid() || !isStep5Valid()) return;
    setCreating(true);
    setError('');
    
    try {
      const chosenActivity = ACTIVITY_OPTIONS[activityType];
      let formattedActivity = chosenActivity.label;
      let chosenDetails = '';

      const locationText = locationPreference === 'surprise'
        ? 'Surpresa! 🎁'
        : `Sugerido: ${customLocation}`;

      if (chosenActivity.isGastronomic) {
        const cuisine = CUISINES[selectedCuisine];
        formattedActivity = `Date Gastronômico 🍽️`;
        chosenDetails = `${cuisine.label} (${selectedStyle}) — Lugar: ${locationText}`;
      } else {
        chosenDetails = `${subActivity} — Lugar: ${locationText}`;
      }
      
      const startStr = `${selectedDate.replace(/-/g, '')}T${String(selectedSlot.hour).padStart(2, '0')}0000`;
      const endStr = `${selectedDate.replace(/-/g, '')}T${String(selectedSlot.hour + 2).padStart(2, '0')}0000`;

      // Build event description
      let descriptionText = `${GUEST_NAME || 'Você'} aceitou o convite! 🎉 Encontro marcado com sucesso.\\n\\n`;
      descriptionText += `✨ PROGRAMAÇÃO ESCOLHIDA:\\n`;
      descriptionText += `• Tipo de encontro: ${formattedActivity}\\n`;
      descriptionText += `• Detalhes: ${chosenDetails}\\n\\n`;
      
      let quizText = '';
      if (quizIntencao) quizText += `• O que procura: ${quizIntencao}\\n`;
      if (quizAventura) quizText += `• Nível de aventura: ${quizAventura}\\n`;
      if (quizFilme) quizText += `• Filme do Encontro: ${quizFilme}\\n`;
      if (quizSobremesa) quizText += `• Dividir sobremesa: ${quizSobremesa}\\n`;
      if (quizMood) quizText += `• Mood ideal: ${quizMood}\\n`;
      if (quizTrilha.trim()) quizText += `• Trilha Sonora sugerida: ${quizTrilha.trim()}\\n`;
      if (quizRestricao.trim()) quizText += `• Restrições/Alergias: ${quizRestricao.trim()}\\n`;

      if (quizText) {
        descriptionText += `📋 PERGUNTAS FINAIS:\\n${quizText}\\n`;
      }
      
      descriptionText += `🚗 LOGÍSTICA:\\n• ${meetingType === 'busco' ? `Te busco em casa: ${address} 🚗` : `Nos encontramos lá! 🚶‍♂️`}\\n\\n`;

      const checkedCount = [appDogs, appFood, appSelect, appWalk, appWhatever].filter(Boolean).length;
      let statusText = "Aprovado com Flexibilidade Máxima! 🌟";
      if (checkedCount === 5) statusText = "Super Aprovado com Louvor! 🏆";
      else if (checkedCount > 0) statusText = `Aprovado! (${checkedCount}/5 Termos Alinhados) 🤝`;

      descriptionText += `🏆 CRITÉRIOS DE APROVAÇÃO: ${statusText}`;

      const eventTitle = `💕 Encontro Especial: Ken & ${GUEST_NAME || 'Parceira'} - ${formattedActivity.split(' ')[0]}`;

      // Google Calendar Template URL
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(descriptionText)}&ctz=America/Sao_Paulo`;

      // WhatsApp Message URL
      let whatsappMessage = `Oi! Aqui é a ${GUEST_NAME || 'sua parceira'}. Aceitei seu convite para o nosso encontro! 🥰\n\n`;
      whatsappMessage += `📅 QUANDO: ${formatDateDisplay(selectedDate)} às ${selectedSlot.label}\n`;
      whatsappMessage += `🎯 O QUE VAMOS FAZER: ${formattedActivity} (${chosenDetails})\n`;
      whatsappMessage += `🚗 LOGÍSTICA: ${meetingType === 'busco' ? `Você me busca no endereço: ${address} 🚗` : `Nos encontramos lá! 🚶‍♂️`}\n\n`;
      
      let quizWaText = '';
      if (quizIntencao) quizWaText += `• O que procuro: ${quizIntencao}\n`;
      if (quizAventura) quizWaText += `• Nível de Aventura: ${quizAventura}\n`;
      if (quizFilme) quizWaText += `• Gênero de Filme: ${quizFilme}\n`;
      if (quizSobremesa) quizWaText += `• Dividir Sobremesa: ${quizSobremesa}\n`;
      if (quizMood) quizWaText += `• Mood do Date: ${quizMood}\n`;
      if (quizTrilha.trim()) quizWaText += `• Playlist/Som: ${quizTrilha.trim()}\n`;
      if (quizRestricao.trim()) quizWaText += `• Alergia/Restrição: ${quizRestricao.trim()}\n`;

      if (quizWaText) {
        whatsappMessage += `📋 MEU PERFIL DO DATE:\n${quizWaText}\n`;
      }
      
      const waCheckedCount = [appDogs, appFood, appSelect, appWalk, appWhatever].filter(Boolean).length;
      let waStatusText = "Aprovado com Flexibilidade Máxima! 🌟";
      if (waCheckedCount === 5) waStatusText = "Super Aprovado com Louvor! 🏆";
      else if (waCheckedCount > 0) waStatusText = `Aprovado! (${waCheckedCount}/5 Termos Alinhados) 🤝`;

      whatsappMessage += `✅ TERMOS DE APROVAÇÃO: Todos os critérios foram cumpridos e aceitos! 🐕🍕⏱️🚶‍♀️🚫\n`;
      whatsappMessage += `🏆 STATUS: ${waStatusText}\n\n`;
      whatsappMessage += `Até lá! Mal posso esperar! 💖`;

      const formattedPhone = OWNER_PHONE ? OWNER_PHONE.replace(/\D/g, '') : '';
      const whatsappUrl = formattedPhone 
        ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(whatsappMessage)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

      // Enviar e-mail de notificação automático via FormSubmit
      if (OWNER_EMAIL && !OWNER_EMAIL.includes('seu-email')) {
        fetch(`https://formsubmit.co/ajax/${OWNER_EMAIL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            _subject: `🎉 ${GUEST_NAME || 'Ela'} disse SIM! Novo Encontro Marcado! 💕`,
            "Quem agendou": GUEST_NAME || `Sua parceira(o) no DateApp`,
            "Quando": `${formatDateDisplay(selectedDate)} às ${selectedSlot.label}`,
            "Atividade": formattedActivity,
            "Escolha": chosenDetails,
            "Logística / Transporte": meetingType === 'busco' ? `🚗 Te busco no endereço: ${address}` : `🚶‍♂️ Nos encontramos lá!`,
            "Minha Intenção": quizIntencao,
            "Nível de Aventura": quizAventura,
            "Gênero de Filme": quizFilme,
            "Dividir Sobremesa": quizSobremesa,
            "Mood do Date": quizMood,
            "Trilha Sonora": quizTrilha.trim() || 'Sem preferência! 🎵',
            "Restrição Alimentar": quizRestricao.trim() || 'Nenhuma restrição! 🌱',
            _honey: "",
            _template: "table"
          })
        }).catch(err => console.error("Erro ao enviar e-mail de notificação:", err));
      }

      onSuccess({
        htmlLink: calendarUrl,
        whatsappUrl: whatsappUrl,
        times: {
          dateStr: formatDateDisplay(selectedDate),
          timeStr: `${selectedSlot.label} – ${String(selectedSlot.hour + 2).padStart(2, '0')}:00`,
          targetIso: toISO(selectedDate, selectedSlot.hour)
        },
        planDetails: {
          guestName: GUEST_NAME,
          activityLabel: formattedActivity,
          subActivity: chosenDetails,
          meetingText: meetingType === 'busco' ? `🚗 Te busco em casa: ${address}` : `🚶‍♂️ Nos encontramos lá!`,
          quizAnswers: {
            quizIntencao,
            quizAventura,
            quizFilme,
            quizSobremesa,
            quizRestricao,
            quizMood,
            quizTrilha
          }
        }
      });
    } catch (e) {
      console.error(e);
      setError('Erro ao preparar os detalhes do encontro: ' + (e.message || 'Tente novamente.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="glass-card booking-card">
      {creating && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p className="loading-text">
            Preparando nosso encontro dos sonhos... 💕
          </p>
        </div>
      )}

      {/* Header */}
      <button className="btn-back" onClick={prevStep} aria-label="Voltar">
        ← voltar
      </button>

      {/* Grand Title: Date com o Ken */}
      <div style={{ textAlign: 'center', marginBottom: '1.25rem', marginTop: '0.25rem' }}>
        <h1 style={{ fontFamily: 'var(--font-script)', fontSize: '2.8rem', color: 'var(--color-text-primary)', textShadow: '0 0 30px var(--color-primary-glow)', margin: 0 }}>
          Date com o Ken 💖
        </h1>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar-fill" style={{ width: `${((step - 1) / 4) * 100}%` }} />
        <div className="progress-dots">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={`progress-dot ${s <= step ? 'active' : ''} ${s === step ? 'current' : ''}`}
              title={`Passo ${s}`}
            >
              {s === 1 && "🍕"}
              {s === 2 && "🎬"}
              {s === 3 && "🏆"}
              {s === 4 && "🚗"}
              {s === 5 && "📆"}
            </div>
          ))}
        </div>
      </div>
      
      {/* ── PASSO 1: Estilo do Date ── */}
      {step === 1 && (
        <div className="wizard-step fade-in">
          <h2 className="question-title-small">Como seria o date perfeito?</h2>
          
          <div className="activity-grid">
            {Object.entries(ACTIVITY_OPTIONS).map(([key, opt]) => (
              <button
                key={key}
                type="button"
                className={`activity-card ${activityType === key ? 'active' : ''}`}
                onClick={() => setActivityType(key)}
              >
                <span className="activity-card-emoji">{opt.emoji}</span>
                <span className="activity-card-label">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Opções Normais (Ar Livre, Café, etc.) */}
          {activityType && !ACTIVITY_OPTIONS[activityType].isGastronomic && (
            <div className="sub-options-section fade-in" style={{ marginTop: '1.5rem' }}>
              
              {/* Seleção de Sub-opção */}
              {ACTIVITY_OPTIONS[activityType].subOptions && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="date-label">{ACTIVITY_OPTIONS[activityType].subLabel}</label>
                  <select
                    className="date-input"
                    value={subActivity}
                    onChange={(e) => setSubActivity(e.target.value)}
                  >
                    <option value="">Selecione uma opção incrível...</option>
                    {ACTIVITY_OPTIONS[activityType].subOptions.map((sub, i) => (
                      <option key={i} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Opções Gastronômicas Complexas */}
          {activityType && ACTIVITY_OPTIONS[activityType].isGastronomic && (
            <div className="sub-options-section fade-in" style={{ marginTop: '1.5rem' }}>
              
              {/* 1. Selecionar culinária */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="date-label">🍕 Tipo de culinária:</label>
                <select
                  className="date-input"
                  value={selectedCuisine}
                  onChange={(e) => setSelectedCuisine(e.target.value)}
                >
                  <option value="">Escolha a culinária...</option>
                  {Object.entries(CUISINES).map(([key, cuisine]) => (
                    <option key={key} value={key}>{cuisine.label}</option>
                  ))}
                </select>
              </div>

              {/* 2. Selecionar Estilo específico da Culinária */}
              {selectedCuisine && (
                <div className="form-group fade-in" style={{ marginBottom: '1.25rem' }}>
                  <label className="date-label">🍜 O que você gostaria de comer?</label>
                  <select
                    className="date-input"
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                  >
                    <option value="">Selecione uma opção...</option>
                    {CUISINES[selectedCuisine].styles.map((style, i) => (
                      <option key={i} value={style}>{style}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Quer sugerir algum lugar ou prefere surpresa? */}
          {((activityType && !ACTIVITY_OPTIONS[activityType].isGastronomic && subActivity) ||
            (activityType && ACTIVITY_OPTIONS[activityType].isGastronomic && selectedCuisine && selectedStyle)) && (
            <div className="location-preference-section fade-in" style={{ marginTop: '1.5rem' }}>
              <label className="date-label">📍 Você quer sugerir algum lugar ou prefere surpresa?</label>
              <div className="transport-toggle-grid" style={{ marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  className={`transport-btn ${locationPreference === 'surprise' ? 'active' : ''}`}
                  onClick={() => {
                    setLocationPreference('surprise');
                    setCustomLocation('');
                  }}
                >
                  <span className="transport-icon">🎁</span>
                  <span className="transport-text">Surpresa!</span>
                </button>
                <button
                  type="button"
                  className={`transport-btn ${locationPreference === 'suggest' ? 'active' : ''}`}
                  onClick={() => setLocationPreference('suggest')}
                >
                  <span className="transport-icon">✍️</span>
                  <span className="transport-text">Quero sugerir</span>
                </button>
              </div>

              {locationPreference === 'suggest' && (
                <div className="form-group fade-in">
                  <label className="date-label" htmlFor="custom-location-input">💡 Onde você gostaria de ir?</label>
                  <input
                    id="custom-location-input"
                    type="text"
                    className="date-input"
                    placeholder="Digite o nome do restaurante, shopping, parque, cinema..."
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <button
              className="btn-yes"
              style={{ width: '100%' }}
              onClick={nextStep}
              disabled={!isStep1Valid()}
            >
              Avançar para o Quiz ➡️
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 2: Perguntas Finais ── */}
      {step === 2 && (
        <div className="wizard-step fade-in">
          <p className="question-subtitle">Passo 2 de 5 • Perguntas Finais</p>
          <h2 className="question-title-small">Sobre você e o date...</h2>

          <div className="quiz-container">
            
            {/* 1. Intenção */}
            <div className="form-group-quiz">
              <span className="quiz-question">🎯 O que você procura agora?</span>
              <div className="quiz-radio-grid">
                {[
                  ["Apenas conhecer alguém legal ✌️", "Apenas conhecer alguém legal"],
                  ["Fazer uma amizade 👋", "Fazer uma amizade"],
                  ["Romance 💕", "Romance"],
                  ["Casamento (sem pressão) 💍", "Casamento (sem pressão)"]
                ].map(([label, val]) => (
                  <label key={val} className={`quiz-radio-btn ${quizIntencao === val ? 'checked' : ''}`}>
                    <input 
                      type="radio" 
                      name="quizIntencao" 
                      value={val} 
                      checked={quizIntencao === val}
                      onChange={() => setQuizIntencao(val)} 
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Nível de aventura */}
            <div className="form-group-quiz">
              <span className="quiz-question">🧭 Nível de aventura do date:</span>
              <div className="quiz-radio-grid">
                {[
                  ["Seguro 🛡️", "Seguro"],
                  ["Vamos improvisar 🧭", "Vamos improvisar"],
                  ["Se terminarmos numa feira medieval, faz parte ⚔️", "Se terminarmos numa feira medieval, faz parte"]
                ].map(([label, val]) => (
                  <label key={val} className={`quiz-radio-btn ${quizAventura === val ? 'checked' : ''}`}>
                    <input 
                      type="radio" 
                      name="quizAventura" 
                      value={val} 
                      checked={quizAventura === val}
                      onChange={() => setQuizAventura(val)} 
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 3. Se o date fosse um filme */}
            <div className="form-group-quiz">
              <span className="quiz-question">🎬 Se o date fosse um filme:</span>
              <div className="quiz-radio-grid">
                {[
                  ["Comédia romântica 🍿", "Comédia romântica"],
                  ["Aventura 🤠", "Aventura"],
                  ["Drama 🎭", "Drama"],
                  ["Suspense 🕵️", "Suspense"],
                  ["Documentário sobre duas pessoas escolhendo onde comer 🍽️", "Documentário sobre duas pessoas escolhendo onde comer"]
                ].map(([label, val]) => (
                  <label key={val} className={`quiz-radio-btn ${quizFilme === val ? 'checked' : ''}`}>
                    <input 
                      type="radio" 
                      name="quizFilme" 
                      value={val} 
                      checked={quizFilme === val}
                      onChange={() => setQuizFilme(val)} 
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 4. Dividir sobremesa */}
            <div className="form-group-quiz">
              <span className="quiz-question">🍰 Aceita dividir a sobremesa?</span>
              <div className="quiz-radio-grid">
                {[
                  ["Sim 🍰", "Sim"],
                  ["Não 🙅", "Não"],
                  ["Depende da sobremesa 🍮", "Depende da sobremesa"],
                  ["Absolutamente não, peça a sua 🛑", "Absolutamente não, peça a sua"]
                ].map(([label, val]) => (
                  <label key={val} className={`quiz-radio-btn ${quizSobremesa === val ? 'checked' : ''}`}>
                    <input 
                      type="radio" 
                      name="quizSobremesa" 
                      value={val} 
                      checked={quizSobremesa === val}
                      onChange={() => setQuizSobremesa(val)} 
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Seletor de Mood / Dress Code */}
            <div className="form-group-quiz">
              <span className="quiz-question">🕯️ Qual o 'mood' / vestimenta ideal?</span>
              <div className="quiz-radio-grid">
                {[
                  ["Casual e Confortável 👟", "Casual e Confortável"],
                  ["Elegante e Perfumado 🍷", "Elegante e Perfumado"],
                  ["Surpresa (me avisa antes!) 🤫", "Surpresa (me avisa antes!)"]
                ].map(([label, val]) => (
                  <label key={val} className={`quiz-radio-btn ${quizMood === val ? 'checked' : ''}`}>
                    <input 
                      type="radio" 
                      name="quizMood" 
                      value={val} 
                      checked={quizMood === val}
                      onChange={() => setQuizMood(val)} 
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Playlist / Trilha Sonora */}
            <div className="form-group-quiz">
              <label htmlFor="trilha-input" className="quiz-question">🎵 Qual música ou playlist não pode faltar no caminho?</label>
              <input
                id="trilha-input"
                type="text"
                className="date-input"
                placeholder="Ex: Seu artista favorito, uma música romântica ou link do Spotify... (opcional)"
                value={quizTrilha}
                onChange={(e) => setQuizTrilha(e.target.value)}
              />
            </div>

            {/* 5. Restrição alimentar (Pergunta Carinhosa) */}
            <div className="form-group-quiz">
              <label htmlFor="allergy-input" className="quiz-question">🍎 Alguma restrição alimentar, alergia ou preferência?</label>
              <textarea
                id="allergy-input"
                className="date-input quiz-textarea"
                rows={2}
                placeholder="Ex: Sou vegetariana, intolerante a lactose, não gosto de pimenta, etc. (ou deixe em branco)..."
                value={quizRestricao}
                onChange={(e) => setQuizRestricao(e.target.value)}
              />
            </div>

          </div>

          <div style={{ marginTop: '2rem' }}>
            <button
              className="btn-yes"
              style={{ width: '100%' }}
              onClick={nextStep}
              disabled={!isStep2Valid()}
            >
              Avançar para Termos de Aprovação ➡️
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 3: Critérios de Aprovação ── */}
      {step === 3 && (
        <div className="wizard-step fade-in">
          <p className="question-subtitle">Passo 3 de 5 • Critérios de Aprovação</p>
          <h2 className="question-title-small">Termos de Compromisso</h2>
          <p className="step-description">O encontro só será agendado e aprovado se as seguintes cláusulas forem aceitas e cumpridas:</p>

          <div className="checkbox-container">
            <label className={`custom-checkbox-row ${appDogs ? 'active' : ''}`}>
              <input 
                type="checkbox" 
                checked={appDogs} 
                onChange={(e) => setAppDogs(e.target.checked)}
              />
              <span className="checkbox-box" />
              <span className="checkbox-text">Gostar de cachorros 🐶</span>
            </label>

            <label className={`custom-checkbox-row ${appFood ? 'active' : ''}`}>
              <input 
                type="checkbox" 
                checked={appFood} 
                onChange={(e) => setAppFood(e.target.checked)}
              />
              <span className="checkbox-box" />
              <span className="checkbox-text">Gostar de comida boa 🍕</span>
            </label>

            <label className={`custom-checkbox-row ${appSelect ? 'active' : ''}`}>
              <input 
                type="checkbox" 
                checked={appSelect} 
                onChange={(e) => setAppSelect(e.target.checked)}
              />
              <span className="checkbox-box" />
              <span className="checkbox-text">Conseguir escolher um restaurante em menos de 30 minutos ⏱️</span>
            </label>

            <label className={`custom-checkbox-row ${appWalk ? 'active' : ''}`}>
              <input 
                type="checkbox" 
                checked={appWalk} 
                onChange={(e) => setAppWalk(e.target.checked)}
              />
              <span className="checkbox-box" />
              <span className="checkbox-text">Topar andar sem reclamar por pelo menos 15 minutos 🚶‍♀️</span>
            </label>

            <label className={`custom-checkbox-row ${appWhatever ? 'active' : ''}`}>
              <input 
                type="checkbox" 
                checked={appWhatever} 
                onChange={(e) => setAppWhatever(e.target.checked)}
              />
              <span className="checkbox-box" />
              <span className="checkbox-text">Não responder "tanto faz" para todas as perguntas 🚫</span>
            </label>
          </div>

          {/* Interactive approved status badge */}
          {(() => {
            const checkedCount = [appDogs, appFood, appSelect, appWalk, appWhatever].filter(Boolean).length;
            let statusText = "Aprovado com Flexibilidade Máxima! 🌟";
            let statusIcon = "🌟";
            if (checkedCount === 5) {
              statusText = "Super Aprovado com Louvor! 🏆";
              statusIcon = "🏆";
            } else if (checkedCount > 0) {
              statusText = `Aprovado! (${checkedCount}/5 Termos Alinhados) 🤝`;
              statusIcon = "🤝";
            }

            return (
              <div className="status-badge-wrap">
                <div className="status-badge approved">
                  <span className="status-badge-icon">{statusIcon}</span>
                  <span className="status-badge-text">
                    STATUS: {statusText}
                  </span>
                </div>
              </div>
            );
          })()}

          <div style={{ marginTop: '2rem' }}>
            <button
              className="btn-yes"
              style={{ width: '100%' }}
              onClick={nextStep}
              disabled={!isStep3Valid()}
            >
              Definir Logística ➡️
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 4: Logística ── */}
      {step === 4 && (
        <div className="wizard-step fade-in">
          <p className="question-subtitle">Passo 4 de 5 • Como nos veremos?</p>
          <h2 className="question-title-small">Defina a Logística</h2>

          <div className="fun-form-section" style={{ marginTop: '1.5rem' }}>
            {/* Transport Type */}
            <div className="form-group">
              <label className="date-label">🚗 Como nos veremos?</label>
              <div className="transport-toggle-grid">
                <button
                  type="button"
                  className={`transport-btn ${meetingType === 'encontro' ? 'active' : ''}`}
                  onClick={() => setMeetingType('encontro')}
                >
                  <span className="transport-icon">🚶‍♂️</span>
                  <span className="transport-text">Te encontro lá!</span>
                </button>
                <button
                  type="button"
                  className={`transport-btn ${meetingType === 'busco' ? 'active' : ''}`}
                  onClick={() => setMeetingType('busco')}
                >
                  <span className="transport-icon">🚗</span>
                  <span className="transport-text">Te busco em casa</span>
                </button>
              </div>
            </div>

            {/* Address */}
            {meetingType === 'busco' && (
              <div className="form-group fade-in">
                <label className="date-label" htmlFor="address-input">🏠 Qual o endereço para eu te buscar?</label>
                <input
                  id="address-input"
                  type="text"
                  className="date-input"
                  placeholder="Digite o endereço com muito carinho..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            )}
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            <button
              className="btn-yes"
              style={{ width: '100%' }}
              onClick={nextStep}
              disabled={!isStep4Valid()}
            >
              Escolher Data e Horário ➡️
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 5: Agendamento ── */}
      {step === 5 && (
        <div className="wizard-step fade-in">
          <p className="question-subtitle">Passo 5 de 5 • Agenda da Agenda</p>
          <h2 className="question-title-small">Selecione o Dia e Horário</h2>

          {/* Date Picker */}
          <div className="date-picker-wrap" style={{ marginTop: '1.5rem' }}>
            <label className="date-label" htmlFor="date-input">
              📆 Selecione o dia
            </label>
            <input
              id="date-input"
              type="date"
              className="date-input"
              min={todayStr()}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null);
              }}
            />
          </div>

          {/* Slots selection */}
          {selectedDate && (
            <div className="slots-section fade-in">
              <p className="slots-title">
                {loadingSlots
                  ? 'Consultando disponibilidades...'
                  : hasAvailable
                  ? 'Escolha um horário livre (blocos de 2h)'
                  : 'Nenhum horário livre na agenda para este dia!'}
              </p>
              
              {loadingSlots ? (
                <div className="slots-loading">
                  <div className="spinner" style={{ width: 32, height: 32 }} />
                </div>
              ) : (
                <div className="slots-grid">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.hour}
                      className={`slot-btn ${!slot.available ? 'slot-busy' : ''} ${selectedSlot?.hour === slot.hour ? 'slot-selected' : ''}`}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot.label}
                      {!slot.available && <span className="slot-busy-tag">ocupado</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="error-msg">{error}</p>}

          {/* Confirm */}
          {selectedSlot && (
            <div className="confirm-section fade-in">
              <p className="confirm-preview">
                ✨ Confirmado: {formatDateDisplay(selectedDate)} às {selectedSlot.label}
              </p>
              <button
                id="btn-confirm"
                className="btn-yes"
                style={{ marginTop: '0.5rem', width: '100%' }}
                onClick={handleConfirm}
                disabled={creating}
              >
                💕 Marcar Encontro Perfeito!
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
