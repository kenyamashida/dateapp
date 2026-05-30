import { useState, useEffect, useCallback, useRef } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL;
const OWNER_PHONE = import.meta.env.VITE_OWNER_PHONE;

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
    locationLabel: "Escolha o parque ideal: 📍",
    subOptions: [
      { label: "Piquenique 🧺", locations: [
        "Parque Ibirapuera 🌳 (gramados perfeitos)",
        "Parque da Independência 🏛️ (muito charmoso)",
        "Parque da Água Branca 🌿 (tranquilo e verde)",
        "Parque Villa-Lobos 🍃 (espaçoso e acolhedor)"
      ]},
      { label: "Caminhada + conversa 🚶‍♂️", locations: [
        "Parque Ibirapuera 🌳 (trilhas e lago lindo)",
        "Jardim Botânico de SP 🌸 (muito especial)",
        "Parque Estadual da Cantareira 🌲 (Mata Atlântica real)",
        "Parque Trianon 🌿 (no coração da Paulista)"
      ]},
      { label: "Andar de bicicleta 🚲", locations: [
        "Parque Villa-Lobos 🚲 (ciclovia excelente)",
        "Parque Ibirapuera 🚴 (circuito interno)",
        "Parque Linear Aricanduva 🚲 (longa ciclovia)",
        "Parque do Povo 🚴 (ótimo para casais)"
      ]},
      { label: "Ver o pôr do sol 🌅", locations: [
        "Parque Estadual da Cantareira 🌄 (vista incrível)",
        "Pico do Jaraguá 🌅 (ponto mais alto de SP)",
        "Parque da Independência 🏛️ (terraço panorâmico)",
        "Mirante do Parque Estadual do Jaraguá 🌇"
      ]},
      { label: "Passear com café na mão ☕", locations: [
        "Vila Madalena 🎨 (bairro artístico e charmoso)",
        "Pinheiros 🌿 (casas de café incríveis)",
        "Bairro do Pacaembu 🏡 (calmo e chique)",
        "Jardins 🌸 (elegante e com bons cafés)"
      ]}
    ]
  },
  cafe_conversa: {
    label: "Café e Conversa ☕",
    emoji: "☕",
    subLabel: "Qual o cenário ideal? 💭",
    locationLabel: "Sugestão de lugar: 📍",
    subOptions: [
      { label: "Cafeteria chique ✨", locations: [
        "Coffee Lab ☕ (café de especialidade de excelência)",
        "Santo Grão 🌟 (clássico e elegante)",
        "Botanikafé Jardins 🌿 (design lindo e menu sofisticado)",
        "Moustache 🍷 (ambiente intimista e premium)"
      ]},
      { label: "Café histórico 🏛️", locations: [
        "Café Girondino 🏛️ (em frente ao Mosteiro São Bento)",
        "Casa Godinho ☕ (fundada em 1888, patrimônio histórico)",
        "Café Martinelli 🏙️ (no 1º arranha-céu de SP)",
        "Café do Pateo 🕌 (no Pateo do Colégio, berço de SP)"
      ]},
      { label: "Brunch instagramável 📸", locations: [
        "Botanikafé 🌿 (icônico para brunch em SP)",
        "Café Cherie 🩷 (estética europeia cor-de-rosa)",
        "HM Food Café 🥚 (ovos beneditinos incríveis)",
        "Nouzin ☀️ (brunch all day, super fotogênico)"
      ]},
      { label: "Café + livraria 📚", locations: [
        "Cuia Café (Livraria Megafauna no Copan) 📖",
        "Bibla 📚 (Vila Madalena, minimalista e charmosa)",
        "Livraria da Tarde 🍵 (Pinheiros, eventos literários)",
        "Barouche 📗 (café + bar + livraria)"
      ]},
      { label: "Café + passeio 🚶‍♀️", locations: [
        "Jardins (café + lojas chiques) 🌸",
        "Vila Madalena (arte + café + grafites) 🎨",
        "Pinheiros (mercado + cafeterias) 🌿",
        "Bairro da Liberdade (café + cultura japonesa) 🎎"
      ]}
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
    locationLabel: "Onde vamos? 📍",
    subOptions: [
      { label: "Jogos de tabuleiro 🎲", locations: [
        "Ludus Luderia 🎲 (100+ jogos, o clássico de SP)",
        "Café Gamers 🎯 (ambiente descontraído em Pinheiros)",
        "Dungeon Pub 🐉 (temática medieval e drinks)",
        "Fan Hour 🕹️ (hambúrguer + boardgames + videogames retrô)"
      ]},
      { label: "Karaokê 🎤", locations: [
        "Arena Karaokê & Bar 🎤 (11 salas privativas, Bom Retiro)",
        "Siga La Vaca 🎶 (clássico e animado, Santa Cecília)",
        "Curtiça Bar 🎵 (pet-friendly, intimista, Vila Madalena)",
        "Kara a Kara 🎤 (dedicado ao karaokê, Santa Cecília)"
      ]},
      { label: "Boliche 🎳", locations: [
        "Villa Bowling Shopping Eldorado 🎳 (moderno e bem equipado)",
        "SP Diversões Butantã 🎳 (+ fliperama e kart)",
        "Dutch Food & Beer Anália Franco 🎳 (boliche + arcade)",
        "Garagem 55 Mooca 🎳 (espaço amplo e divertido)"
      ]},
      { label: "Escape room 🔑", locations: [
        "Escape 60' ⏱️ (referência no Brasil, salas temáticas)",
        "Escape Hotel 🏨 (salas ultra-imersivas)",
        "Escape Time 🔒 (várias unidades em SP)",
        "Gravity VR 🥽 (escape room em realidade virtual)"
      ]},
      { label: "Fliperama retrô 👾", locations: [
        "Bário Bar 👾 (maior barcade da América Latina, Pinheiros)",
        "Lord's Diversões 🕹️ (histórico e nostálgico, Tatuapé)",
        "Fan Hour 🎮 (videogames retrô + hambúrgueres, Pinheiros)",
        "Retro SP Arcade 👾 (muito jogo antigo!)"
      ]},
      { label: "Minigolfe ⛳", locations: [
        "Mini Golf Experience 🏌️ (SP, indoor e temático)",
        "Play City ⛳ (várias unidades em shoppings)",
        "Parque da Mônica ⛳ (Ibirapuera, ao ar livre)",
        "Hopi Hari ⛳ (combo com outras atrações)"
      ]},
      { label: "Sinuca 🎱", locations: [
        "Bário Bar 🎱 (mesas de sinuca + fliperamas)",
        "Lord's Diversões 🎱 (ambiente retrô, Tatuapé)",
        "Red Billiards Club 🎱 (especializado, Moema)",
        "Bar do Arante 🎱 (clássico e aconchegante)"
      ]},
      { label: "Realidade virtual 🥽", locations: [
        "Gravity VR 🥽 (arena multiplayer livre, Moema)",
        "InfinityQuest 🌐 (escape rooms VR, Parque da Cidade)",
        "VR Zone SP 🎮 (vasta seleção de jogos imersivos)",
        "Zero Latency SP 🥽 (VR sem fio, experiência épica)"
      ]}
    ]
  },
  cultural: {
    label: "Cultural 🎭",
    emoji: "🎭",
    subLabel: "Qual o programa cultural hoje? 🎨",
    locationLabel: "Sugestão de local: 📍",
    subOptions: [
      { label: "Museu 🖼️", locations: [
        "MASP 🎨 (ícone da Paulista, acervo imperdível)",
        "Pinacoteca 🖼️ (uma das mais belas de SP)",
        "Museu do Ipiranga 🏰 (recém restaurado, lindo!)",
        "Museu da Língua Portuguesa 📖 (interativo e moderno)",
        "MIS — Museu da Imagem e do Som 📸"
      ]},
      { label: "Exposição 🎨", locations: [
        "MASP 🎨 (exposições temporárias incríveis)",
        "IMS Paulista 📷 (foco em fotografia e cinema)",
        "Sesc Paulista 🎭 (programação cultural gratuita)",
        "Japan House 🎎 (cultura japonesa contemporânea)",
        "Centro Cultural Fiesp 🏛️ (entrada gratuita)"
      ]},
      { label: "Planetário 🌌", locations: [
        "Planetário do Ibirapuera 🌌 (dentro do parque)",
        "Museu de Astronomia e Ciências Afins 🔭",
        "Museu Catavento 🔬 (ciência e astronomia interativa)",
        "USP – Instituto de Astronomia 🌟 (visitas abertas)"
      ]},
      { label: "Centro cultural 🏛️", locations: [
        "Itaú Cultural 🎭 (ampla programação gratuita)",
        "Centro Cultural Banco do Brasil 🏛️ (exposições top)",
        "Sesc 24 de Maio 🌆 (terraço e programação incrível)",
        "Centro Cultural São Paulo 🎶 (gigante e gratuito)"
      ]},
      { label: "Teatro 🎭", locations: [
        "Theatro Municipal 🏛️ (óperas e grandes espetáculos)",
        "Teatro Santander 🎭 (musicais de grande porte)",
        "Teatro Porto 🎬 (curadoria de excelência)",
        "Sesc Consolação 🎭 (programação acessível e variada)"
      ]},
      { label: "Show de jazz 🎷", locations: [
        "JazzB 🎷 (tradicional, jazz e bossa nova, República)",
        "Bourbon Street Music Club 🎸 (blues e jazz, Moema)",
        "Madeleine Jazz Bar 🥂 (intimista e charmoso, Vila Madalena)",
        "All of Jazz 🎺 (pub clássico desde 1995, Vila Nova Conceição)"
      ]},
      { label: "Feira de arte 🖼️", locations: [
        "Feira da Liberdade 🎎 (domingo, arte + cultura japonesa)",
        "Feira da Benedito Calixto 🌿 (sábado, Pinheiros — imperdível!)",
        "Feira de Arte da Praça da República 🎨 (domingo no centro)",
        "Feira do Bixiga 🍷 (domingo, cultura italiana e arte)"
      ]}
    ]
  },
  diferentao: {
    label: "Diferentão 👽",
    emoji: "👽",
    subLabel: "Qual vai ser a nossa aventura incomum? 🌠",
    locationLabel: "Onde vamos fazer isso? 📍",
    subOptions: [
      { label: "Observar estrelas no planetário 🌠", locations: [
        "Planetário do Ibirapuera 🌌 (dentro do parque)",
        "Museu Catavento 🔭 (ciência interativa)",
        "Pico do Jaraguá 🌟 (ponto mais alto de SP, sem poluição)"
      ]},
      { label: "Fazer um piquenique noturno 🌙", locations: [
        "Parque Ibirapuera 🌙 (iluminado à noite, lindo!)",
        "Parque da Independência 🌃 (vista da cidade)",
        "Parque Trianon 🌿 (centro da cidade, charmoso)"
      ]},
      { label: "Assistir ao nascer do sol 🌅", locations: [
        "Pico do Jaraguá 🌄 (mais alto de SP, épico!)",
        "Mirante do Parque Estadual do Jaraguá 🌅",
        "Parque da Independência 🌇 (vista belíssima)"
      ]},
      { label: "Visitar uma feira gastronômica 🍕", locations: [
        "Mercadão de SP 🧀 (Mercado Municipal histórico)",
        "Feira da Liberdade 🍱 (domingo, Liberdade)",
        "Feira de Gastronomia do Ibirapuera 🌮 (edições periódicas)",
        "Expo Gastronomia SP 🍜 (grandes edições no Anhembi)"
      ]},
      { label: "Passeio fotográfico pela cidade 📸", locations: [
        "Vila Madalena + Beco do Batman 🎨 (grafites icônicos)",
        "Centro Histórico de SP 🏛️ (arquitetura impressionante)",
        "Avenida Paulista 🌆 (o coração de SP)",
        "Bairro da Liberdade 🎎 (cultura e estética japonesa)"
      ]},
      { label: "Caça ao tesouro pela Paulista 🗺️", locations: [
        "Avenida Paulista 🌟 (ponto de partida)",
        "Beco do Batman + Vila Madalena 🎨 (roteiro criativo)",
        "Centro Histórico SP 🏛️ (cheio de segredos)"
      ]},
      { label: "Tour de cafeterias ☕", locations: [
        "Rota: Pinheiros → Vila Madalena → Jardins ☕",
        "Rota: Itaim Bibi → Moema → Jardins 🌟",
        "Rota: Consolação → Bela Vista → Centro 🏙️"
      ]},
      { label: "Escolher um bairro aleatório e explorar juntos 🗺️", locations: [
        "Vila Madalena 🎨 (arte, bares, cafés)",
        "Bairro da Liberdade 🎎 (cultura asiática)",
        "Pinheiros 🌿 (gastronomia e cultura indie)",
        "Lapa 🎸 (música, botecos e tradição)",
        "Sortear no dado! 🎲 (roleta da aventura)"
      ]},
      { label: "Encontrar o melhor pastel de São Paulo 🥟", locations: [
        "Mercadão de SP 🏛️ (pastel de bacalhau famoso)",
        "Feira da Liberdade 🥟 (pastéis japoneses únicos)",
        "Feira da Benedito Calixto 🌿 (pastéis artesanais)",
        "Feira da Lapa 🎸 (pastéis de diferentes recheios)"
      ]},
      { label: "Competição de quem monta o melhor roteiro de R$50 💰", locations: [
        "Ponto de partida: Metrô Brigadeiro 💡",
        "Ponto de partida: Metrô Vila Madalena 🎨",
        "Ponto de partida: Metrô Sé (Centro) 🏛️",
        "Ponto de partida: Metrô Consolação 🌆"
      ]}
    ]
  }
};

const CUISINES = {
  asiatica: {
    label: "Culinária Asiática 🥢",
    styles: ["Japonesa 🍣", "Coreana 🇰🇷", "Tailandesa 🇹🇭", "Chinesa 🇨🇳"],
    suggestions: ["Restaurante Sapporo 🍣", "Djapa Moema 🍣", "Kiichi Jardins 🍣", "Outro/Surpresa ✨"]
  },
  arabe: {
    label: "Culinária Árabe 🧆",
    styles: ["Esfihas e kibes 🧆", "Comida libanesa 🇱🇧", "Comida síria 🇸🇾"],
    suggestions: ["Almanara 🧆", "Saj 🥙", "Outro/Surpresa ✨"]
  },
  italiana: {
    label: "Culinária Italiana 🍝",
    styles: ["Massas artesanais 🍝", "Pizza napolitana 🍕", "Jantar romântico 🍷"],
    suggestions: ["Terraço Itália 🍷 (Sugestão Romântica)", "Fasano 🍝", "Outro/Surpresa ✨"]
  }
};

// Helper: get locations for current sub-activity
function getSubLocations(activityType, subActivityLabel) {
  const act = ACTIVITY_OPTIONS[activityType];
  if (!act || act.isGastronomic || !act.subOptions) return null;
  const sub = act.subOptions.find(s => s.label === subActivityLabel);
  return sub?.locations || null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BookingForm({ onSuccess, onBack }) {
  // Steps: 1 (Estilo) → 2 (Quiz) → 3 (Aprovação) → 4 (Logística) → 5 (Agendamento)
  const [step, setStep] = useState(1);
  
  // Passo 1: Estilo do Date
  const [activityType, setActivityType] = useState('');
  const [subActivity,  setSubActivity]  = useState('');
  const [selectedLoc,  setSelectedLoc]  = useState('');
  
  // Gastronômico específico
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [selectedStyle,   setSelectedStyle]   = useState('');
  const [cuisineSugg,     setCuisineSugg]     = useState('');

  // Passo 2: Perguntas Finais
  const [quizIntencao, setQuizIntencao] = useState('');
  const [quizAventura, setQuizAventura] = useState('');
  const [quizFilme,    setQuizFilme]    = useState('');
  const [quizSobremesa, setQuizSobremesa] = useState('');
  const [quizRestricao, setQuizRestricao] = useState('');

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
    setSelectedLoc('');
    setSelectedCuisine('');
    setSelectedStyle('');
    setCuisineSugg('');
  }, [activityType]);

  // Reset location when sub-activity changes
  useEffect(() => {
    setSelectedLoc('');
  }, [subActivity]);

  useEffect(() => {
    setSelectedStyle('');
    setCuisineSugg('');
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
      return !!(selectedCuisine && selectedStyle && cuisineSugg);
    }
    
    const hasSubs = act.subOptions && act.subOptions.length > 0;
    if (hasSubs && !subActivity) return false;
    
    // Check if the selected sub-activity has locations that must be chosen
    if (subActivity) {
      const subLocs = getSubLocations(activityType, subActivity);
      if (subLocs && subLocs.length > 0 && !selectedLoc) return false;
    }
    
    return true;
  };

  const isStep2Valid = () => {
    return !!(quizIntencao && quizAventura && quizFilme && quizSobremesa);
  };

  const isStep3Valid = () => {
    // Requires at least the approved badge status to be active to proceed!
    return appStatus;
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

      if (chosenActivity.isGastronomic) {
        const cuisine = CUISINES[selectedCuisine];
        formattedActivity = `Date Gastronômico 🍽️`;
        chosenDetails = `${cuisine.label} (${selectedStyle}) — Sugestão: ${cuisineSugg}`;
      } else {
        chosenDetails = `${subActivity}${selectedLoc ? ` em: ${selectedLoc}` : ''}`;
      }
      
      const startStr = `${selectedDate.replace(/-/g, '')}T${String(selectedSlot.hour).padStart(2, '0')}0000`;
      const endStr = `${selectedDate.replace(/-/g, '')}T${String(selectedSlot.hour + 2).padStart(2, '0')}0000`;

      // Build event description
      let descriptionText = `Você disse sim! 🎉 Esse momento foi marcado com muito carinho.\\n\\n`;
      descriptionText += `✨ PROGRAMAÇÃO ESCOLHIDA:\\n`;
      descriptionText += `• Tipo de encontro: ${formattedActivity}\\n`;
      descriptionText += `• Detalhes: ${chosenDetails}\\n\\n`;
      descriptionText += `📋 PERGUNTAS FINAIS:\\n`;
      descriptionText += `• Intenção: ${quizIntencao}\\n`;
      descriptionText += `• Nível de aventura: ${quizAventura}\\n`;
      descriptionText += `• Filme do Encontro: ${quizFilme}\\n`;
      descriptionText += `• Dividir sobremesa: ${quizSobremesa}\\n`;
      descriptionText += `• Restrições/Alergias: ${quizRestricao.trim() || 'Nenhuma restrição alimentar! 🌱'}\\n\\n`;
      descriptionText += `🚗 LOGÍSTICA:\\n• ${meetingType === 'busco' ? `Te busco em casa: ${address} 🚗` : `Nos encontramos lá! 🚶‍♂️`}\\n\\n`;
      descriptionText += `🏆 CRITÉRIOS DE APROVAÇÃO: Todos aceitos! 🏅`;

      const eventTitle = `💕 Encontro Especial: ${formattedActivity.split(' ')[0]} - ${chosenActivity.isGastronomic ? CUISINES[selectedCuisine].label.split(' ')[1] : subActivity.split(' ')[0]}`;

      // Google Calendar Template URL
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(descriptionText)}&ctz=America/Sao_Paulo`;

      // WhatsApp Message URL
      let whatsappMessage = `Oi amor! Aceitei seu convite para o nosso encontro dos sonhos! 🥰\n\n`;
      whatsappMessage += `📅 QUANDO: ${formatDateDisplay(selectedDate)} às ${selectedSlot.label}\n`;
      whatsappMessage += `🎯 O QUE VAMOS FAZER: ${formattedActivity} (${chosenDetails})\n`;
      whatsappMessage += `🚗 LOGÍSTICA: ${meetingType === 'busco' ? `Você me busca no endereço: ${address} 🚗` : `Nos encontramos lá! 🚶‍♂️`}\n\n`;
      whatsappMessage += `📋 MEU PERFIL DO DATE:\n`;
      whatsappMessage += `• Minha Intenção: ${quizIntencao}\n`;
      whatsappMessage += `• Nível de Aventura: ${quizAventura}\n`;
      whatsappMessage += `• Gênero de Filme: ${quizFilme}\n`;
      whatsappMessage += `• Dividir Sobremesa: ${quizSobremesa}\n`;
      whatsappMessage += `• Alergia/Restrição: ${quizRestricao.trim() || 'Nenhuma restrição! 🌱'}\n\n`;
      whatsappMessage += `✅ TERMOS DE APROVAÇÃO: Todos os critérios foram cumpridos e aceitos! 🐕🍕⏱️🚶‍♀️🚫\n`;
      whatsappMessage += `🏆 STATUS: Aprovado para um primeiro encontro em São Paulo!\n\n`;
      whatsappMessage += `Mal posso esperar! Mal vejo a hora de estarmos juntos! 💖`;

      const formattedPhone = OWNER_PHONE ? OWNER_PHONE.replace(/\D/g, '') : '';
      const whatsappUrl = formattedPhone 
        ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(whatsappMessage)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

      onSuccess({
        htmlLink: calendarUrl,
        whatsappUrl: whatsappUrl,
        times: {
          dateStr: formatDateDisplay(selectedDate),
          timeStr: `${selectedSlot.label} – ${String(selectedSlot.hour + 2).padStart(2, '0')}:00`,
        },
        planDetails: {
          activityLabel: formattedActivity,
          subActivity: chosenDetails,
          meetingText: meetingType === 'busco' ? `🚗 Te busco em casa: ${address}` : `🚶‍♂️ Nos encontramos lá!`,
          quizAnswers: {
            quizIntencao,
            quizAventura,
            quizFilme,
            quizSobremesa,
            quizRestricao
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
          <p className="question-subtitle">Passo 1 de 5 • Estilo do Encontro</p>
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
                      <option key={i} value={sub.label}>{sub.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Seleção de Local — dinâmica por sub-opção */}
              {subActivity && (() => {
                const subLocs = getSubLocations(activityType, subActivity);
                if (!subLocs || subLocs.length === 0) return null;
                return (
                  <div className="form-group fade-in">
                    <label className="date-label">{ACTIVITY_OPTIONS[activityType].locationLabel}</label>
                    <select
                      className="date-input"
                      value={selectedLoc}
                      onChange={(e) => setSelectedLoc(e.target.value)}
                    >
                      <option value="">Escolha onde vamos...</option>
                      {subLocs.map((loc, i) => (
                        <option key={i} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                );
              })()}
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

              {/* 3. Selecionar Sugestão de Local */}
              {selectedCuisine && selectedStyle && (
                <div className="form-group fade-in">
                  <label className="date-label">📍 Sugestões de restaurantes:</label>
                  <select
                    className="date-input"
                    value={cuisineSugg}
                    onChange={(e) => setCuisineSugg(e.target.value)}
                  >
                    <option value="">Escolha um restaurante...</option>
                    {CUISINES[selectedCuisine].suggestions.map((sugg, i) => (
                      <option key={i} value={sugg}>{sugg}</option>
                    ))}
                  </select>
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
              <span className="quiz-question">🎯 Qual sua intenção?</span>
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
          <div className="status-badge-wrap">
            <div className={`status-badge ${appStatus ? 'approved' : 'pending'}`}>
              <span className="status-badge-icon">{appStatus ? "🏆" : "🔒"}</span>
              <span className="status-badge-text">
                STATUS: {appStatus ? "Aprovado para um primeiro encontro em São Paulo!" : "Aguardando aceitação dos termos..."}
              </span>
            </div>
          </div>

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
