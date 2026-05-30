import { useState, useEffect, useCallback, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL;
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';

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

// ── Google API helpers ────────────────────────────────────────────────────────

function loadGapi() {
  return new Promise((resolve, reject) => {
    if (window.gapi?.client) { resolve(); return; }
    const check = setInterval(() => {
      if (window.gapi) {
        clearInterval(check);
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            });
            resolve();
          } catch (e) { reject(e); }
        });
      }
    }, 100);
    setTimeout(() => { clearInterval(check); reject(new Error('gapi timeout')); }, 10000);
  });
}

function requestToken() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services não carregou. Verifique sua conexão.'));
      return;
    }
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error_description || resp.error));
        else resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

const ACTIVITY_OPTIONS = {
  jantar: {
    label: "Jantar 🍽️",
    subLabel: "O que vamos comer? 😋",
    subOptions: [
      "Comida japonesa 🍣",
      "Comida árabe 🥙",
      "Hamburgueria artesanal 🍔",
      "Pizza italiana 🍕",
      "Rodízio de massas 🍝"
    ]
  },
  parque: {
    label: "Parque 🌳",
    subLabel: "Qual parque vamos passear? 🍃",
    subOptions: [
      "Parque Ibirapuera 🌳 (Clássico paulistano!)",
      "Parque Villa-Lobos 🍃 (Ótimo para andar de bike/patins!)",
      "Parque do Povo 🚶‍♂️ (Super charmoso!)",
      "Horto Florestal 🌲 (Muito verde e tranquilidade!)"
    ]
  },
  museu: {
    label: "Museu 🖼️",
    subLabel: "Qual exposição vamos ver? 🎨",
    subOptions: [
      "MASP 🎨 (Ver os cavaletes de cristal!)",
      "Pinacoteca 🖼️ (E depois um café no parque da Luz!)",
      "Museu do Ipiranga 🏰 (Lindo demais após a reforma!)",
      "MIS - Museu da Imagem e do Som 📸 (Exposições interativas!)"
    ]
  }
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function BookingForm({ onSuccess, onBack }) {
  // Step navigation: 1 (Custom options) → 2 (Date & Time slots)
  const [step, setStep] = useState(1);
  
  // Custom Fun Options States
  const [activityType, setActivityType] = useState('');
  const [subActivity,  setSubActivity]  = useState('');
  const [meetingType,  setMeetingType]  = useState('encontro'); // 'encontro' | 'busco'
  const [address,      setAddress]      = useState('');

  // Date and Time selection States (Step 2)
  const [selectedDate, setSelectedDate] = useState('');
  const [busyPeriods,  setBusyPeriods]  = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Auth & General States
  const [accessToken,  setAccessToken]  = useState(null);
  const [loadingAuth,  setLoadingAuth]  = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [error,        setError]        = useState('');

  const fetchedDate = useRef('');
  const ALL_SLOTS = generateSlots(9, 21, 2);

  // Reset subActivity when activityType changes
  useEffect(() => {
    setSubActivity('');
  }, [activityType]);

  // ── Step 1 Validation ────────────────────────────────────────────────────
  const isStep1Valid = () => {
    if (!activityType || !subActivity) return false;
    if (meetingType === 'busco' && !address.trim()) return false;
    return true;
  };

  // ── Transition to Step 2 & Request Auth to check calendar availability ──
  const handleGoToStep2 = async () => {
    if (!isStep1Valid()) return;
    if (!CLIENT_ID || CLIENT_ID.startsWith('SEU_CLIENT_ID')) {
      setError('⚠️ Configure o VITE_GOOGLE_CLIENT_ID no arquivo .env.');
      return;
    }

    setLoadingAuth(true);
    setError('');
    try {
      await loadGapi();
      const token = await requestToken();
      setAccessToken(token);
      setStep(2);
    } catch (err) {
      console.error(err);
      setError('Conexão recusada ou erro ao autenticar com o Google.');
    } finally {
      setLoadingAuth(false);
    }
  };

  // ── Fetch Busy periods from OWNER'S Google Calendar API ──────────────────
  const fetchBusy = useCallback(async (date) => {
    if (!date || fetchedDate.current === date || !accessToken) return;
    fetchedDate.current = date;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError('');
    try {
      window.gapi.client.setToken({ access_token: accessToken });
      const timeMin = `${date}T00:00:00-03:00`;
      const timeMax = `${date}T23:59:59-03:00`;
      
      // Target calendar to check availability is OWNER_EMAIL (your email!)
      const targetCalendarId = OWNER_EMAIL && OWNER_EMAIL !== 'seu-email-aqui@gmail.com' ? OWNER_EMAIL : 'primary';

      const resp = await window.gapi.client.request({
        path: 'https://www.googleapis.com/calendar/v3/freeBusy',
        method: 'POST',
        body: JSON.stringify({
          timeMin,
          timeMax,
          timeZone: 'America/Sao_Paulo',
          items: [{ id: targetCalendarId }],
        }),
      });

      const busy = resp.result?.calendars?.[targetCalendarId]?.busy ?? [];
      setBusyPeriods(busy);
    } catch (e) {
      console.error(e);
      setError('Não foi possível verificar suas disponibilidades reais. Mostrando todos os horários.');
      setBusyPeriods([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (selectedDate && step === 2) {
      fetchBusy(selectedDate);
    }
  }, [selectedDate, step, fetchBusy]);

  // ── Compute available slots dynamically based on your Google Calendar ─────
  const availableSlots = selectedDate ? ALL_SLOTS.map((slot) => {
    const slotStart = toISO(selectedDate, slot.hour);
    const slotEnd   = toISO(selectedDate, slot.hour + 2);
    return {
      ...slot,
      available: !overlaps(slotStart, slotEnd, busyPeriods),
    };
  }) : [];

  const hasAvailable = availableSlots.length > 0 && availableSlots.some((s) => s.available);

  // Validation before allowing event completion (Step 2)
  const isFormValid = () => {
    return isStep1Valid() && selectedDate && selectedSlot;
  };

  // ── Submit selections & schedule event ────────────────────────────────────
  const handleConfirm = async () => {
    if (!isFormValid() || !accessToken) return;
    setCreating(true);
    setError('');
    try {
      window.gapi.client.setToken({ access_token: accessToken });

      const startISO = toISO(selectedDate, selectedSlot.hour);
      const endISO   = toISO(selectedDate, selectedSlot.hour + 2);

      const chosenActivity = ACTIVITY_OPTIONS[activityType];
      
      let descriptionText = `Você disse sim! 🎉 Esse momento foi marcado com muito carinho.\n\n`;
      descriptionText += `✨ PROGRAMAÇÃO ESCOLHIDA:\n`;
      descriptionText += `• Tipo de atividade: ${chosenActivity.label}\n`;
      descriptionText += `• Escolha: ${subActivity}\n\n`;
      descriptionText += `🚗 LOGÍSTICA:\n• ${meetingType === 'busco' ? `Te busco em casa: ${address} 🚗` : `Nos encontramos lá! 🚶‍♂️`}\n`;

      // Automatically invite host/owner's email so it links both calendars!
      const attendees = [];
      if (OWNER_EMAIL && OWNER_EMAIL !== 'seu-email-aqui@gmail.com') {
        attendees.push({ email: OWNER_EMAIL });
      }

      const event = {
        summary: `💕 Encontro Especial: ${chosenActivity.label.split(' ')[0]} - ${subActivity.split(' ')[0]}`,
        description: descriptionText,
        start: { dateTime: startISO, timeZone: 'America/Sao_Paulo' },
        end:   { dateTime: endISO,   timeZone: 'America/Sao_Paulo' },
        colorId: '11', // red
        attendees: attendees.length > 0 ? attendees : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 1440 },
          ],
        },
      };

      const response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all',
      });

      onSuccess({
        htmlLink: response.result.htmlLink,
        times: {
          dateStr: formatDateDisplay(selectedDate),
          timeStr: `${selectedSlot.label} – ${String(selectedSlot.hour + 2).padStart(2, '0')}:00`,
        },
        planDetails: {
          activityLabel: chosenActivity.label,
          subActivity,
          meetingText: meetingType === 'busco' ? `🚗 Te busco em casa: ${address}` : `🚶‍♂️ Nos encontramos lá!`
        }
      });
    } catch (e) {
      console.error(e);
      setError('Erro ao marcar encontro: ' + (e.message || 'Tente novamente.'));
    } finally {
      setCreating(false);
    }
  };

  const handleBackStep = () => {
    if (step === 2) {
      setStep(1);
    } else {
      onBack();
    }
  };

  return (
    <div className="glass-card booking-card">
      {(loadingAuth || creating) && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p className="loading-text">
            {loadingAuth ? "Conectando ao Google... ✨" : "Agendando nosso encontro dos sonhos... 💕"}
          </p>
        </div>
      )}

      {/* Header */}
      <button className="btn-back" onClick={handleBackStep} aria-label="Voltar">
        ← voltar
      </button>

      <span className="question-emoji" style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}>
        💖
      </span>
      
      {step === 1 ? (
        <>
          <p className="question-subtitle">Planeje nosso dia dos sonhos</p>
          <h2 className="question-title" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
            Monte o Encontro Perfeito
          </h2>

          {/* Fun Plan Form */}
          <div className="fun-form-section">
            
            {/* 1. Activity Type */}
            <div className="form-group">
              <label className="date-label">🍕 O que vamos fazer?</label>
              <select 
                className="date-input"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
              >
                <option value="">Selecione uma aventura...</option>
                {Object.entries(ACTIVITY_OPTIONS).map(([key, opt]) => (
                  <option key={key} value={key}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 2. Sub Activity */}
            {activityType && (
              <div className="form-group fade-in">
                <label className="date-label">{ACTIVITY_OPTIONS[activityType].subLabel}</label>
                <select
                  className="date-input"
                  value={subActivity}
                  onChange={(e) => setSubActivity(e.target.value)}
                >
                  <option value="">Selecione uma opção bem legal...</option>
                  {ACTIVITY_OPTIONS[activityType].subOptions.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Transport Type */}
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

            {/* 4. Address (If Pick up selected) */}
            {meetingType === 'busco' && (
              <div className="form-group fade-in">
                <label className="date-label" htmlFor="address-input">🏠 Qual o endereço para eu te buscar?</label>
                <input
                  id="address-input"
                  type="text"
                  className="date-input"
                  placeholder="Digite o endereço com carinho..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            )}
          </div>

          {error && <p className="error-msg">{error}</p>}

          <div style={{ marginTop: '1.5rem' }}>
            <button
              className="btn-yes"
              style={{ width: '100%' }}
              onClick={handleGoToStep2}
              disabled={!isStep1Valid()}
            >
              Avançar ➡️
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="question-subtitle">Agenda conectada com sucesso!</p>
          <h2 className="question-title" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
            Que dia e horário?
          </h2>

          {/* Date Picker */}
          <div className="date-picker-wrap">
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

          {/* Slots selection querying your Google Calendar API */}
          {selectedDate && (
            <div className="slots-section fade-in">
              <p className="slots-title">
                {loadingSlots
                  ? 'Verificando disponibilidades reais...'
                  : hasAvailable
                  ? 'Escolha um horário livre (blocos de 2h)'
                  : 'Nenhum horário disponível na minha agenda para este dia!'}
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
            <div className="confirm-section">
              <p className="confirm-preview">
                ✨ {formatDateDisplay(selectedDate)} às {selectedSlot.label}
              </p>
              <button
                id="btn-confirm"
                className="btn-yes"
                style={{ marginTop: '0.5rem', width: '100%' }}
                onClick={handleConfirm}
                disabled={creating}
              >
                💕 Marcar Encontro!
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
