<div align="center">

# 💕 DateApp — O Convite Interativo para o Date Perfeito

**Uma aplicação web gamificada e encantadora para convidar alguém especial para sair.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Google Calendar API](https://img.shields.io/badge/Google_Calendar-API-4285F4?logo=google-calendar&logoColor=white)](https://developers.google.com/calendar)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[🚀 Demo](#-como-funciona) · [⚙️ Instalação](#️-instalação-e-configuração) · [🏗️ Arquitetura](#️-arquitetura) · [✨ Features](#-features)

</div>

---

## 📖 Sobre o Projeto

O **DateApp** transforma um simples convite para sair em uma **experiência interativa e memorável**. Em vez de mandar uma mensagem comum, você envia um link personalizado onde a pessoa responde a um quiz divertido, escolhe o tipo de date ideal, e agenda tudo automaticamente — com direito a confetes, sons, contagem regressiva e um "recibo de amor" instagramável.

> **Ideia central:** E se pedir alguém para sair fosse tão divertido quanto o próprio date?

---

## 🎬 Como Funciona

O app guia o convidado por uma jornada de **3 telas principais**, cada uma projetada para surpreender:

### 1️⃣ A Pergunta — *"Você quer sair comigo?"*
- Card glassmorphism com partículas flutuantes (💕 ✨ 🌸)
- O botão **"Não"** foge do cursor/toque — é literalmente impossível recusar 😄
- Mensagem divertida aparece: *"O botão Não está tendo um probleminha técnico 🙃"*
- Nome personalizado via `?name=NomeDaPessoa` na URL

### 2️⃣ O Wizard — 5 Etapas de Planejamento
Um formulário gamificado com **barra de progresso animada** (`❤️ Etapa X de 5`):

| Etapa | Conteúdo | Destaques |
|-------|----------|-----------|
| **1. Estilo** | Escolha entre 8 categorias de date | Ar livre, Café, Gastronômico, Divertido, Cultural, Shopping, Cinema, Diferentão |
| **2. Quiz** | 7 perguntas opcionais de personalidade | Intenção, aventura, filme, sobremesa, mood, trilha sonora, restrições |
| **3. Aprovação** | Termos de compromisso lúdicos | Checkboxes divertidos, selo de "Aprovado" |
| **4. Logística** | Como vão se encontrar | "Nos encontramos lá" ou "Te busco" (com campo de endereço) |
| **5. Agendar** | Data e horário com integração Google Calendar | Slots com verificação de disponibilidade em tempo real |

### 3️⃣ Tela de Sucesso — A Celebração
- 🎊 **Confetes** com emojis de coração, flores e festa
- 🎵 **Efeito sonoro** de arpejo ascendente (Web Audio API)
- ⏱️ **Contagem regressiva** ao vivo até o date
- 💘 **Ticket "Seu Date Ideal"** — visual estilo recibo para print/stories
- 🧠 **Frase personalizada** baseada nas respostas do quiz
- 💖 **Badge de compatibilidade** com porcentagem calculada
- 📅 Botão para adicionar ao Google Agenda
- 💬 Botão para confirmar via WhatsApp (mensagem pré-formatada)

---

## ✨ Features

### 🎮 Gamificação
- **Botão "Não" que foge** — detecção de proximidade por mouse e touch
- **Barra de progresso** com porcentagem e indicador de etapa
- **Sons interativos** — chimes no clique e arpejo na celebração final
- **Confetes animados** com emojis temáticos

### 🎨 Design Premium
- **Glassmorphism** — cards com `backdrop-filter: blur()` e bordas translúcidas
- **Partículas flutuantes** — emojis animados no background
- **Gradientes dinâmicos** — fundo com animação infinita de cores
- **Tipografia premium** — Google Fonts: Outfit (UI) + Dancing Script (acentos)
- **Scrollbar customizado** — estilo translúcido e minimalista

### 📱 Responsividade
- Layout mobile-first com `min-height: 100vh`
- Cards com `max-height: 92vh` e rolagem interna inteligente
- Media queries para telas compactas (≤ 380px)
- Touch events para a interação do botão "Não"

### 🔗 Integrações
- **Google Calendar API** — cria eventos diretamente na agenda do anfitrião
- **Google FreeBusy API** — verifica slots disponíveis em tempo real
- **WhatsApp Deep Link** — mensagem personalizada com resumo do date
- **URL Params** — personalização via `?name=` na URL

### 🧠 Personalização Inteligente
- **Análise de personalidade** com frases baseadas nas respostas do quiz
- **Compatibilidade calculada** (90-100%) baseada no preenchimento
- **Mensagens dinâmicas** que omitem campos não preenchidos
- **8 categorias de date** com sub-opções detalhadas (40+ opções no total)

---

## 🏗️ Arquitetura

```
dateapp/
├── index.html              # Entry point com meta tags SEO e Google API scripts
├── vite.config.js           # Configuração do Vite
├── package.json             # Dependências e scripts
├── .env.example             # Template de variáveis de ambiente
│
├── public/
│   └── heart.svg            # Favicon
│
└── src/
    ├── main.jsx             # Bootstrap do React
    ├── App.jsx              # Router de telas + partículas flutuantes
    ├── App.css              # Design system completo (27KB de CSS artesanal)
    ├── index.css             # CSS global (reset)
    │
    └── components/
        ├── QuestionCard.jsx  # Tela 1: Pergunta interativa + botão que foge
        ├── BookingForm.jsx   # Tela 2: Wizard de 5 etapas (1100 linhas)
        └── SuccessScreen.jsx # Tela 3: Celebração com confetes e ticket
```

### Fluxo de Navegação

```
QuestionCard ──[Sim!]──► BookingForm ──[Agendar]──► SuccessScreen
     │                    │                          │
     │                    ├── Etapa 1: Estilo         ├── Confetes 🎊
     │                    ├── Etapa 2: Quiz           ├── Som 🎵
     │                    ├── Etapa 3: Aprovação      ├── Countdown ⏱️
     │                    ├── Etapa 4: Logística      ├── Ticket 💘
     │                    └── Etapa 5: Agenda         ├── Google Calendar 📅
     │                                                └── WhatsApp 💬
     └──[Não]──► Botão foge para posição aleatória 😄
```

---

## ⚙️ Instalação e Configuração

### Pré-requisitos

- **Node.js** ≥ 18
- **npm** ≥ 9
- Uma conta **Google Cloud** com a Calendar API habilitada

### 1. Clone o repositório

```bash
git clone https://github.com/kenyamashida/dateapp.git
cd dateapp
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Chave da API do Google Cloud (com Calendar API habilitada)
VITE_GOOGLE_API_KEY=sua-api-key-do-google-cloud

# Seu e-mail (para receber os agendamentos)
VITE_OWNER_EMAIL=seu-email@gmail.com

# Seu WhatsApp (formato internacional sem +)
VITE_OWNER_PHONE=5511999999999

# Nome padrão do convidado (pode ser sobrescrito via ?name= na URL)
VITE_GUEST_NAME=NomeDaPessoa
```

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

O app estará disponível em `http://localhost:5173`

### 5. Personalize a URL para enviar

Adicione o parâmetro `name` para personalizar o convite:

```
http://localhost:5173/?name=Carol
```

---

## 🔑 Configuração do Google Calendar

<details>
<summary><strong>Clique para expandir o guia passo a passo</strong></summary>

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google Calendar API** em *APIs & Services > Library*
4. Crie uma **API Key** em *APIs & Services > Credentials*
5. Configure o **OAuth consent screen** (tipo External)
6. Adicione `http://localhost:5173` às origens autorizadas
7. Copie a API Key para o seu `.env`

> **Nota:** Para produção, restrinja a API Key ao domínio do seu deploy.

</details>

---

## 🚀 Deploy

### Build de Produção

```bash
npm run build
```

Os arquivos estáticos serão gerados em `dist/`. Faça deploy em qualquer hosting estático:

| Plataforma | Comando |
|-----------|---------|
| **Vercel** | `npx vercel --prod` |
| **Netlify** | Arraste a pasta `dist/` no painel |
| **GitHub Pages** | Configure o workflow de CI/CD |
| **Firebase** | `firebase deploy` |

---

## 🛠️ Tech Stack

| Tecnologia | Uso |
|-----------|-----|
| **React 19** | UI com hooks (`useState`, `useEffect`, `useRef`, `useCallback`) |
| **Vite 8** | Bundler ultra-rápido com HMR |
| **CSS3 Artesanal** | 27KB de estilos com glassmorphism, gradientes e animações |
| **Web Audio API** | Síntese de som em tempo real (sem dependência de arquivos .mp3) |
| **Google Calendar API** | Criação de eventos e verificação de disponibilidade |
| **Google Fonts** | Outfit (UI) + Dancing Script (decorativo) |

### Sem dependências externas de UI

O projeto **não usa** bibliotecas de componentes como Material UI, Chakra ou Tailwind. Todo o design é **CSS artesanal puro**, demonstrando domínio completo de:

- CSS Custom Properties (design tokens)
- `@keyframes` animations
- `backdrop-filter` (glassmorphism)
- CSS Grid & Flexbox
- Media queries responsivas
- Scrollbar customization

---

## 📄 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento com HMR |
| `npm run build` | Gera o build de produção otimizado |
| `npm run preview` | Preview local do build de produção |
| `npm run lint` | Executa o ESLint no código-fonte |

---

## 🎯 Decisões de Design

### Por que CSS artesanal em vez de Tailwind?
Para demonstrar domínio profundo de CSS e criar uma experiência visual única, impossível de alcançar com utilitários pré-definidos. Cada animação, gradiente e efeito de glassmorphism foi cuidadosamente calibrado.

### Por que Web Audio API em vez de arquivos de áudio?
Elimina a necessidade de hospedar/carregar arquivos `.mp3`, reduz o tamanho do bundle e permite síntese em tempo real com controle preciso de frequência, duração e envelope.

### Por que não usar um backend?
O app opera 100% no client-side, integrando diretamente com a API do Google Calendar. Isso elimina custos de servidor e simplifica o deploy para qualquer hosting estático.

### Por que o botão "Não" foge?
Porque a resposta certa sempre foi "Sim" 💕

---

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📝 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

---

## 👨‍💻 Autor

**Kenya Mashida** — [GitHub](https://github.com/kenyamashida)

---

<div align="center">

*Feito com muito ❤️ e um pouco de loucura criativa.*

**Se este projeto te inspirou, deixe uma ⭐ no repositório!**

</div>
