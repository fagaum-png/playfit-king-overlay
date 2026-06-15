// Configurações Globais
let peer;
let conn;
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

// Estado do Placar
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

// --- FUNÇÃO PARA O OVERLAY (PRISM / OBS) ---
function initOverlay() {
    if (!roomId) {
        document.body.innerHTML = "<h1 style='color:white; background:red;'>ERRO: Adicione ?room=NOME na URL</h1>";
        return;
    }

    peer = new Peer(roomId);

    peer.on('open', () => console.log("Overlay pronto na sala: " + roomId));
    
    peer.on('connection', (c) => {
        conn = c;
        conn.on('data', (data) => {
            state = data;
            renderOverlay();
        });
    });
}

// --- FUNÇÃO PARA O CONTROLE (SEU CELULAR) ---
function initControl() {
    if (!roomId) {
        document.body.innerHTML = "<h1 style='color:white;'>ERRO: Use o link com ?room=NOME</h1>";
        return;
    }

    renderControl(); // Desenha a tela primeiro para não ficar em branco

    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(roomId);
        conn.on('open', () => {
            document.getElementById('status').innerText = "CONECTADO ✅";
            document.getElementById('status').style.color = "lime";
        });
    });

    // Loop do Cronômetro
    setInterval(() => {
        if (state.timerRunning && state.timer > 0) {
            state.timer--;
            updateTimerDisplay();
            if (conn && conn.open) conn.send(state);
        }
    }, 1000);
}

// --- ATUALIZAÇÃO DA TELA DO CONTROLE ---
function renderControl() {
    const container = document.getElementById('ranking-controls');
    if (!container) return;

    container.innerHTML = "";
    state.challengers.forEach((team, index) => {
        const div = document.createElement('div');
        div.className = "card";
        div.innerHTML = `
            <input type="text" value="${team.name}" oninput="updateTeam(${index}, this.value)">
            <div style="display:flex; gap:10px; margin-top:5px;">
                <button onclick="changeScore(${index}, 1)">+1 Ponto</button>
                <button onclick="promoteToKing(${index})" style="background:gold; color:black;">Tornar REI 👑</button>
            </div>
            <p>Pontos: ${team.score}</p>
        `;
        container.appendChild(div);
    });
    
    document.getElementById('king-name-input').value = state.king.name;
    document.getElementById('king-score-label').innerText = state.king.score;
    updateTimerDisplay();
}

// --- FUNÇÕES DE AÇÃO ---
function updateTeam(idx, name) { state.challengers[idx].name = name; sync(); }

function changeScore(idx, val) {
    if (idx === 'king') state.king.score = Math.max(0, state.king.score + val);
    else state.challengers[idx].score = Math.max(0, state.challengers[idx].score + val);
    renderControl();
    sync();
}

function promoteToKing(idx) {
    const oldKing = { ...state.king };
    state.king = { ...state.challengers[idx] };
    state.challengers[idx] = oldKing;
    renderControl();
    sync();
}

function sync() {
    if (conn && conn.open) conn.send(state);
}

function timerAction(act) {
    if (act === 'start') state.timerRunning = true;
    if (act === 'pause') state.timerRunning = false;
    if (act === 'reset') { state.timerRunning = false; state.timer = 900; }
    updateTimerDisplay();
    sync();
}

function updateTimerDisplay() {
    const min = Math.floor(state.timer / 60);
    const sec = state.timer % 60;
    const timeStr = `${min}:${sec < 10 ? '0'+sec : sec}`;
    const el = document.getElementById('display-timer');
    if (el) el.innerText = timeStr;
}

// --- ATUALIZAÇÃO DO OVERLAY ---
function renderOverlay() {
    document.getElementById('display-event').innerText = state.event;
    document.getElementById('display-king-name').innerText = state.king.name;
    document.getElementById('display-king-score').innerText = state.king.score;
    updateTimerDisplay();
    
    const rank = document.getElementById('display-ranking');
    if (rank) {
        const all = [state.king, ...state.challengers].sort((a,b) => b.score - a.score);
        rank.innerHTML = "";
        all.slice(0,5).forEach((t, i) => {
            rank.innerHTML += `<div class="rank-item"><span>${i+1}. ${t.name}</span> <b>${t.score}</b></div>`;
        });
    }
}