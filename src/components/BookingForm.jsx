import { useState, useEffect, useCallback, useRef } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL;
const OWNER_PHONE = import.meta.env.VITE_OWNER_PHONE;
const GUEST_NAME = import.meta.env.VITE_GUEST_NAME || new URLSearchParams(window.location.search).get('name') || '';

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
        "Parque Ceret — Tatuapé 🌳 (10 min, perto de casa!)",
        "Parque Piqueri — Tatuapé 🌿 (10 min, arborizado e tranquilo)",
        "Parque do Carmo — Itaquera 🍃 (20 min, bosque lindo + cerejeiras)",
        "Parque da Vila Prudente 🌸 (15 min, gramado com lago japonês)"
      ]},
      { label: "Caminhada + conversa 🚶‍♂️", locations: [
        "Parque Piqueri — Tatuapé 🌿 (10 min, trilhas e natureza)",
        "Parque Ceret — Tatuapé 🌳 (10 min, pistas e muito verde)",
        "Parque Ecológico do Tietê 🦋 (20 min, natureza intocada)",
        "Parque do Carmo — Itaquera 🌲 (20 min, trilhas na mata)"
      ]},
      { label: "Andar de bicicleta 🚲", locations: [
        "Parque Ceret — Tatuapé 🚲 (10 min, ciclovia completa)",
        "Parque Ecológico do Tietê 🚴 (20 min, ciclovia extensa)",
        "Parque Linear Aricanduva 🚲 (15 min, longa ciclovia na Zona Leste)",
        "Parque do Carmo — Itaquera 🚴 (20 min, circuito interno)"
      ]},
      { label: "Ver o pôr do sol 🌅", locations: [
        "Parque Piqueri — Tatuapé 🌇 (10 min, horário dourado)",
        "Parque do Carmo — Itaquera 🌅 (20 min, vista aberta e bonita)",
        "Parque da Independência — Ipiranga 🏛️ (20 min, terraço histórico)",
        "Pico do Jaraguá 🌄 (40 min, ponto mais alto de SP — vale a viagem!)"
      ]},
      { label: "Passear com café na mão ☕", locations: [
        "Tatuapé (bares e cafés charmosos) ☕ (10 min)",
        "Mooca (cultura italiana + cafeterias) 🍕 (15 min)",
        "Vila Prudente (bairro acolhedor e calmo) 🌿 (15 min)",
        "Jardins (elegante, mais longe mas vale!) 🌸 (30 min)"
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
        "Zero11SP — Tatuapé ✨ (café premium + espaço moderno, pertíssimo!)",
        "Cafés no Shopping Anália Franco ☕ (10 min, várias opções)",
        "Cafés no Boulevard Tatuapé 🌟 (ao lado do metrô)",
        "Santo Grão — Jardins 🌟 (30 min, vale a viagem!)"
      ]},
      { label: "Café histórico 🏛️", locations: [
        "Casa do Tatuapé 🏛️ (10 min, construção do século XVII!)",
        "Café Girondino — Centro 🏛️ (30 min, em frente ao Mosteiro São Bento)",
        "Casa Godinho — Centro ☕ (30 min, fundada em 1888)",
        "Café do Pateo — Centro 🕌 (30 min, berço de São Paulo)"
      ]},
      { label: "Brunch instagramável 📸", locations: [
        "Casa Rios — Tatuapé 🍽️ (pertíssimo! gastronomia autoral fotogênica)",
        "Restaurantes badalados do Tatuapé 📸 (10 min, várias opções)",
        "Botanikafé — Jardins 🌿 (30 min, ícone do brunch em SP)",
        "Café Cherie — Jardins 🩷 (30 min, estética europeia cor-de-rosa)"
      ]},
      { label: "Café + livraria 📚", locations: [
        "Livrarias do Shopping Anália Franco 📚 (10 min!)",
        "Livrarias do Boulevard Tatuapé 📖 (10 min, ao lado do metrô)",
        "Cuia Café na Megafauna (Copan) 📖 (25 min, experiência única)",
        "Bibla — Vila Madalena 📚 (30 min, minimalista e charmosa)"
      ]},
      { label: "Café + passeio 🚶‍♀️", locations: [
        "Tatuapé (café + comércio de rua charmoso) 🛍️ (10 min!)",
        "Mooca (café + cultura italiana) 🍕 (15 min)",
        "Bairro da Liberdade (café + cultura japonesa) 🎎 (25 min)",
        "Vila Madalena (arte + café + grafites) 🎨 (30 min)"
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
        "Ludus Luderia — Tatuapé 🎲 (pertíssimo! 100+ jogos de tabuleiro)",
        "Cafés com jogos no Shopping Anália Franco 🎯 (10 min)",
        "Dungeon Pub — Vila Madalena 🐉 (30 min, temática medieval + drinks)",
        "Fan Hour — Pinheiros 🕹️ (30 min, boardgames + videogames retrô)"
      ]},
      { label: "Karaokê 🎤", locations: [
        "Janela Bar — Tatuapé 🎤 (pertíssimo! karaokê às quartas e domingos)",
        "Bário Bar — Tatuapé 🎵 (10 min, ambiente animado e divertido)",
        "Arena Karaokê & Bar 🎤 (25 min, 11 salas privativas, Bom Retiro)",
        "Siga La Vaca 🎶 (25 min, clássico animado, Santa Cecília)"
      ]},
      { label: "Boliche 🎳", locations: [
        "Dutch Food & Beer — Anália Franco 🎳 (10 min! boliche + arcade + drinks)",
        "Garagem 55 — Mooca 🎳 (15 min, espaço amplo e animado)",
        "Villa Bowling — Shopping Eldorado 🎳 (30 min, moderno)",
        "SP Diversões — Butantã 🎳 (35 min, + kart e fliperama)"
      ]},
      { label: "Escape room 🔑", locations: [
        "Escape Time — verificar unidade Zona Leste 🔒 (mais próxima)",
        "Escape 60' — verificar unidade mais próxima ⏱️",
        "Escape Hotel — Centro 🏨 (25 min, ultra-imersivo)",
        "Gravity VR — Moema 🥽 (25 min, escape room em realidade virtual)"
      ]},
      { label: "Fliperama retrô 👾", locations: [
        "Lord's Diversões — Tatuapé 🕹️ (pertíssimo! histórico e nostálgico)",
        "Bário Bar — Tatuapé 👾 (10 min, maior barcade da América Latina!)",
        "Fan Hour — Pinheiros 🎮 (30 min, consoles retrô + hambúrgueres)",
        "SP Diversões — Butantã 👾 (35 min, enorme complexo)"
      ]},
      { label: "Minigolfe ⛳", locations: [
        "Play City — Shopping Anália Franco ⛳ (10 min, pertíssimo!)",
        "Play City — Shopping Tatuapé ⛳ (10 min)",
        "Play City — outras unidades em shoppings de SP ⛳",
        "Hopi Hari — Vinhedo ⛳ (mais longe, mas uma aventura e tanto!)"
      ]},
      { label: "Sinuca 🎱", locations: [
        "Lord's Diversões — Tatuapé 🎱 (pertíssimo! ambiente retrô clássico)",
        "Bário Bar — Tatuapé 🎱 (10 min, sinuca + fliperama + drinks)",
        "Red Billiards Club — Moema 🎱 (20 min, especializado)",
        "Botecos tradicionais da Mooca 🎱 (15 min, autêntico)"
      ]},
      { label: "Realidade virtual 🥽", locations: [
        "Gravity VR — Moema 🥽 (20 min, arena multiplayer livre)",
        "InfinityQuest — Shopping Parque da Cidade 🌐 (25 min, VR imersivo)",
        "Zero Latency SP 🥽 (verificar localização mais próxima)",
        "VR Zone SP 🎮 (vasta seleção de jogos imersivos)"
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
        "Museu da Imigração — Mooca 🏛️ (15 min! gratuito aos sábados)",
        "Casa do Tatuapé 🏰 (10 min, museu da cidade, século XVII)",
        "Museu do Ipiranga 🏛️ (20 min, recém restaurado, lindíssimo!)",
        "MASP — Paulista 🎨 (30 min, ícone de São Paulo)"
      ]},
      { label: "Exposição 🎨", locations: [
        "Sesc Belenzinho 🎭 (10 min! exposições + teatro + atividades)",
        "Museu da Imigração — Mooca 📸 (15 min, exposições imersivas)",
        "Centro Cultural da Penha 🏛️ (15 min, programação gratuita)",
        "MASP — Paulista 🎨 (30 min, exposições temporárias incríveis)"
      ]},
      { label: "Planetário 🌌", locations: [
        "Parque do Carmo — Planetário 🌟 (20 min, Itaquera)",
        "Museu Catavento — Centro 🔬 (25 min, ciência interativa)",
        "Planetário do Ibirapuera 🌌 (30 min, sessões mágicas)",
        "USP — Instituto de Astronomia 🔭 (30 min, visitas abertas)"
      ]},
      { label: "Centro cultural 🏛️", locations: [
        "Sesc Belenzinho 🎭 (10 min! o melhor da Zona Leste, teatro + arte)",
        "Centro Cultural da Penha 🏛️ (15 min, Teatro Martins Pena)",
        "Casa de Cultura Raul Seixas — Itaquera 🎸 (20 min, oficinas de arte)",
        "Itaú Cultural — Paulista 🎭 (30 min, programação gratuita variada)"
      ]},
      { label: "Teatro 🎭", locations: [
        "Sesc Belenzinho — Teatro 🎭 (10 min! programação de excelência)",
        "Teatro Fernando Torres — Tatuapé 🎬 (10 min, 690 lugares)",
        "Centro Cultural da Penha — Teatro Martins Pena 🎭 (15 min)",
        "Teatro Santander — Centro 🎭 (25 min, musicais de grande porte)"
      ]},
      { label: "Show de jazz 🎷", locations: [
        "Bar Mooca 🎷 (15 min! música ao vivo diária, autêntico)",
        "Quintal do Espeto — Tatuapé 🎵 (10 min, ao ar livre + música)",
        "Bourbon Street — Moema 🎸 (25 min, blues e jazz clássico)",
        "JazzB — República 🎷 (30 min, tradicional bossa nova e jazz)"
      ]},
      { label: "Feira de arte 🖼️", locations: [
        "Feira da Mooca (domingos na Rua da Mooca) 🍕 (15 min!)",
        "Feira do Tatuapé 🛍️ (fim de semana, artesanato local)",
        "Feira da Liberdade 🎎 (25 min, domingo, arte + cultura japonesa)",
        "Feira da Benedito Calixto 🌿 (30 min, sábado em Pinheiros)"
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
        "Parque do Carmo — Itaquera 🌟 (20 min, área aberta sem poluição)",
        "Museu Catavento — Centro 🔬 (25 min, sessões de planetário)",
        "Planetário do Ibirapuera 🌌 (30 min, experiência inesquecível)",
        "Pico do Jaraguá 🌟 (40 min, céu limpo e altitude — épico!)"
      ]},
      { label: "Fazer um piquenique noturno 🌙", locations: [
        "Parque Ceret — Tatuapé 🌙 (10 min, tem iluminação à noite)",
        "Parque Piqueri — Tatuapé 🌿 (10 min, tranquilo e arborizado)",
        "Parque do Carmo — Itaquera 🌳 (20 min, espaços gramados enormes)",
        "Parque da Independência — Ipiranga 🌃 (20 min, vista da cidade)"
      ]},
      { label: "Assistir ao nascer do sol 🌅", locations: [
        "Parque Ceret — Tatuapé 🌅 (10 min, se sair cedinho!)",
        "Parque do Carmo — Itaquera 🌄 (20 min, espaço aberto e lindo)",
        "Parque da Independência — Ipiranga 🌇 (20 min, vista panorâmica)",
        "Pico do Jaraguá 🌄 (40 min, épico — vale MUITO a viagem!)"
      ]},
      { label: "Visitar uma feira gastronômica 🍕", locations: [
        "Feira da Mooca (domingos) 🍕 (15 min! pertíssimo)",
        "Feira do Tatuapé 🛍️ (fim de semana, pertíssimo)",
        "Mercadão de SP — Centro 🧀 (25 min, histórico e delicioso)",
        "Feira da Liberdade 🍱 (25 min, domingo, culinária asiática)"
      ]},
      { label: "Passeio fotográfico pela cidade 📸", locations: [
        "Tatuapé + arredores históricos 📸 (pertíssimo, começa aqui!)",
        "Mooca (arquitetura italiana + muros grafitados) 🎨 (15 min)",
        "Centro Histórico de SP 🏛️ (25 min, arquitetura impressionante)",
        "Vila Madalena + Beco do Batman 🎨 (30 min, grafites icônicos)"
      ]},
      { label: "Caça ao tesouro pela Paulista 🗺️", locations: [
        "Ponto de partida: Metrô Tatuapé 🗺️ (aqui do lado!)",
        "Ponto de partida: Metrô Belém 🚇 (10 min de casa)",
        "Ponto de partida: Metrô Brás 🏛️ (20 min, cheio de pistas)",
        "Ponto de partida: Avenida Paulista 🌆 (30 min, clássico)"
      ]},
      { label: "Tour de cafeterias ☕", locations: [
        "Rota: Tatuapé → Mooca → Belém ☕ (toda na Zona Leste!)",
        "Rota: Tatuapé → Liberdade → Centro Histórico 🏛️",
        "Rota: Mooca → Ipiranga → Vila Mariana ☕",
        "Rota: Tatuapé → Pinheiros → Jardins 🌿 (aventura completa de SP)"
      ]},
      { label: "Escolher um bairro aleatório e explorar juntos 🗺️", locations: [
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
    suggestions: [
      "Domo Sushi Bar — Tatuapé 🍣 (pertíssimo! premium e moderno)",
      "Ikeda Sushi — Tatuapé 🍱 (rodízio variado, ambiente lindo)",
      "Hojiro Sushi — Tatuapé 🍣 (completo, inclui sobremesa no rodízio)",
      "Cho Sun Gal Bi — Tatuapé 🇰🇷 (churrasco coreano incrível — wagyu!)",
      "Kenichi Sushi — Mooca 🍣 (tradicional e clássico, 15 min)"
    ]
  },
  arabe: {
    label: "Culinária Árabe 🧆",
    styles: ["Esfihas e kibes 🧆", "Comida libanesa 🇱🇧", "Comida síria 🇸🇾"],
    suggestions: [
      "Zain Restaurante — Tatuapé 🧆 (pertíssimo! contemporâneo e animado)",
      "Mazbut Culinária Árabe — Tatuapé 🥙 (receitas de família, autêntico)",
      "Esfiha Imigrantes — Tatuapé 🧆 (tradicional e acessível)",
      "Ryad — Tatuapé 🌙 (ambiente elegante e imersivo)",
      "Outro/Surpresa! ✨"
    ]
  },
  italiana: {
    label: "Culinária Italiana 🍝",
    styles: ["Massas artesanais 🍝", "Pizza napolitana 🍕", "Jantar romântico 🍷"],
    suggestions: [
      "Bráz Pizzaria — Tatuapé 🍕 (pertíssimo! premiada e referência em SP)",
      "La Pergoletta — Tatuapé 🍝 (massas artesanais, selo de autenticidade italiana)",
      "Verttoni — Tatuapé 🍝 (cantina clássica com massas incríveis)",
      "A Pizza da Mooca 🍕 (15 min, reconhecida como uma das melhores de SP!)",
      "Di Cunto — Mooca 🍮 (15 min, confeitaria centenária + restaurante)"
    ]
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
      let descriptionText = `${GUEST_NAME || 'Você'} disse sim! 🎉 Esse momento foi marcado com muito carinho.\\n\\n`;
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

      const eventTitle = `💕 Encontro Especial: Ken & ${GUEST_NAME || 'Parceira'} - ${formattedActivity.split(' ')[0]}`;

      // Google Calendar Template URL
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(descriptionText)}&ctz=America/Sao_Paulo`;

      // WhatsApp Message URL
      let whatsappMessage = `Oi amor! É a ${GUEST_NAME || 'sua parceira'}. Aceitei seu convite para o nosso encontro dos sonhos! 🥰\n\n`;
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
