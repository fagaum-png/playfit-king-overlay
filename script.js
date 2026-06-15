// Configuração de Comunicação
const bc = new BroadcastChannel('kotc_channel'); // Para teste no mesmo aparelho
let peer;
let conn;

// Estado Inicial
let state = {
    event: "KING OF THE COURT",
    sponsor: "PLAYFIT",
    king: { name: "DUPLA REI", score: 0 },
    challengers: [
        { name: "DUPLA 2", score: 0 },
        { name: "DUPLA 3", score: 0 },
        { name: "DUPLA 4", score: 0 },
        { name: "DUPLA 5", score: 0 }
    ],
    timer: 900,
    timerRunning: false
};

// Pega o ID da sala pela URL (?room=NOME)
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

// --- INICIALIZAÇÃO DO OVERLAY (TELA DA LIVE) ---
function initOverlay() {
    if (!roomId) { alert("ERRO: Falta o ?room=NOME na URL"); return; }
    
    peer = new Peer(roomId); // O Overlay É o dono da sala

    peer.on('open', (id) => {
        console.log('Overlay pronto na sala: ' + id);
    });

    peer.on('connection', (c) => {
        conn = c;
        console.log("Controle Conectado!");
        conn.on('data', (data) => {
            state = data;
            renderOverlay();
        });
    });

    // Fallback para BroadcastChannel (se estiver no mesmo navegador)
    bc.onmessage = (ev) => { state = ev.data; renderOverlay(); };
}

// --- INICIALIZAÇÃO DO CONTROLE (CELULAR DO PLACAR) ---
function initControl() {
    if (!roomId) { alert("ERRO: Falta o ?room=NOME na URL"); return; }
    
    peer = new Peer(); // O controle ganha um ID aleatório

    peer.on('open', () => {
        // Tenta conectar no ID da sala (que é o overlay)
        conn = peer.connect(roomId);
        
        conn.on('open', () => {
            document.getElementById('status').innerText = "CONECTADO ✅";
            document.getElementById('status').style.color = "lightgreen";
            // Envia o estado inicial ao conectar
            pushUpdate();
        });
    });

    setInterval(() => {
        if (state.timerRunning && state.timer > 0) {
            state.timer--;
            updateTimerDisplay();
            pushUpdate();
        }
    }, 1000);
}

function pushUpdate() {
    // Atualiza o texto do Rei e pontos no próprio painel de controle
    document.getElementById('king-score-label').innerText = state.king.score;
    
    // Envia via P2P (Para o PRISM)
    if (conn && conn.open) {
        conn.send(state);
    }
    // Envia via Broadcast (Para teste na mesma aba)
    bc.postMessage(state);
}

// Funções de Interface
function renderOverlay() {
    document.getElementById('display-event').innerText = state.event;
    document.getElementById('display-sponsor').innerText = state.sponsor;
    document.getElementById('display-king-name').innerText = state.king.name;
    document.getElementById('display-king-score').innerText = state.king.score;
    updateTimerDisplay();

    const allTeams = [state.king, ...state.challengers].sort((a, b) => b.score - a.score);
    const rankContainer = document.getElementById('display-ranking');
    if(rankContainer) {
        rankContainer.innerHTML = '';
        allTeams.slice(0, 5).forEach((team, idx) => {
            const div = document.createElement('div');
            div.className = `rank-item ${idx === 0 ? 'leader' : ''}`;
            div.innerHTML = `<span>${idx + 1}. ${team.name}</span><span>${team.score}</span>`;
            rankContainer.appendChild(div);
        });
    }
}

function updateTimerDisplay() {
    const min = Math.floor(state.timer / 60);
    const sec = state.timer % 60;
    const timeStr = `${min}:${sec < 10 ? '0'+sec : sec}`;
    const timerEl = document.getElementById('display-timer');
    if(timerEl) timerEl.innerText = timeStr;
}

// Botões do Painel
function changeScore(target, val) {
    if (target === 'king') state.king.score = Math.max(0, state.king.score + val);
    else state.challengers[target].score = Math.max(0, state.challengers[target].score + val);
    pushUpdate();
}

function promoteToKing(index) {
    const oldKin
