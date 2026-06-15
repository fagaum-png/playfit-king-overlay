// Gerenciamento de Estado
let state = {
    comp: { name: "KING OF THE COURT", event: "ETAPA NACIONAL", duration: 15 },
    styles: { primary: "#0f172a", accent: "#f59e0b", text: "#ffffff", opacity: 0.85 },
    teams: [
        { id: 1, name: "DUPLA A", points: 0, color: "#f59e0b" },
        { id: 2, name: "DUPLA B", points: 0, color: "#3b82f6" },
        { id: 3, name: "DUPLA C", points: 0, color: "#10b981" },
        { id: 4, name: "DUPLA D", points: 0, color: "#ef4444" },
        { id: 5, name: "DUPLA E", points: 0, color: "#8b5cf6" }
    ],
    kingId: 1,
    timer: { remaining: 900, running: false }
};

const bc = new BroadcastChannel('kotc_channel');

// Inicialização
window.onload = () => {
    const saved = localStorage.getItem('kotc_state');
    if (saved) state = JSON.parse(saved);
    
    if (document.querySelector('.admin-body')) {
        renderAdmin();
    }
    updateUI();
    
    // Loop do Cronômetro
    setInterval(() => {
        if (state.timer.running && state.timer.remaining > 0) {
            state.timer.remaining--;
            sync();
            updateUI();
        }
    }, 1000);
};

// Sincronização entre abas
bc.onmessage = (ev) => {
    state = ev.data;
    updateUI();
};

function sync() {
    bc.postMessage(state);
    localStorage.setItem('kotc_state', JSON.stringify(state));
}

// Funções de Controle
function updateSettings() {
    state.comp.name = document.getElementById('cfg-comp-name').value;
    state.comp.event = document.getElementById('cfg-event-name').value;
    state.styles.primary = document.getElementById('clr-primary').value;
    state.styles.accent = document.getElementById('clr-accent').value;
    state.styles.text = document.getElementById('clr-text').value;
    state.styles.opacity = document.getElementById('cfg-opacity').value;
    sync();
    updateUI();
}

function timerControl(action) {
    if (action === 'start') state.timer.running = true;
    if (action === 'pause') state.timer.running = false;
    if (action === 'reset') {
        state.timer.running = false;
        state.timer.remaining = state.comp.duration * 60;
    }
    sync();
    updateUI();
}

function adjustScore(val) {
    const king = state.teams.find(t => t.id === state.kingId);
    if (king) {
        king.points = Math.max(0, king.points + val);
        sync();
        updateUI();
    }
}

function setKing(id) {
    state.kingId = parseInt(id);
    sync();
    updateUI();
}

function updateTeamName(id, name) {
    const team = state.teams.find(t => t.id === id);
    if (team) team.name = name;
    sync();
}

function updateTeamColor(id, color) {
    const team = state.teams.find(t => t.id === id);
    if (team) team.color = color;
    sync();
    updateUI();
}

// Renderização da UI
function updateUI() {
    // Aplicar Cores Globais
    document.documentElement.style.setProperty('--primary', state.styles.primary);
    document.documentElement.style.setProperty('--accent', state.styles.accent);
    document.documentElement.style.setProperty('--text', state.styles.text);
    document.documentElement.style.setProperty('--bg-card', `rgba(${hexToRgb(state.styles.primary)}, ${state.styles.opacity})`);

    // Overlay Elements
    if (document.getElementById('display-comp-name')) {
        document.getElementById('display-comp-name').innerText = state.comp.name;
        document.getElementById('display-event-name').innerText = state.comp.event;
        
        const king = state.teams.find(t => t.id === state.kingId);
        document.getElementById('king-name').innerText = king ? king.name : "---";
        document.getElementById('king-score').innerText = king ? king.points : "0";
        document.getElementById('king-color-indicator').style.backgroundColor = king ? king.color : "transparent";

        // Timer
        const mins = Math.floor(state.timer.remaining / 60);
        const secs = state.timer.remaining % 60;
        const timerDisp = document.getElementById('timer-display');
        timerDisp.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        const progress = (state.timer.remaining / (state.comp.duration * 60)) * 100;
        document.getElementById('timer-progress').style.width = `${progress}%`;
        
        if (state.timer.remaining < 60) timerDisp.classList.add('low-time');
        else timerDisp.classList.remove('low-time');

        // Ranking
        const sortedTeams = [...state.teams].sort((a, b) => b.points - a.points).slice(0, 5);
        const list = document.getElementById('ranking-list');
        list.innerHTML = sortedTeams.map((team, idx) => `
            <div class="rank-item ${idx === 0 ? 'leader' : ''}">
                <div class="rank-pos">${idx + 1}</div>
                <div class="rank-name" style="color: ${team.color}">${team.name}</div>
                <div class="rank-score">${team.points}</div>
            </div>
        `).join('');
    }

    // Admin Elements
    if (document.getElementById('admin-teams-list')) {
        renderAdminInputs();
    }
}

function renderAdmin() {
    document.getElementById('cfg-comp-name').value = state.comp.name;
    document.getElementById('cfg-event-name').value = state.comp.event;
    document.getElementById('clr-primary').value = state.styles.primary;
    document.getElementById('clr-accent').value = state.styles.accent;
    document.getElementById('clr-text').value = state.styles.text;
    document.getElementById('cfg-opacity').value = state.styles.opacity;
}

function renderAdminInputs() {
    const teamsList = document.getElementById('admin-teams-list');
    teamsList.innerHTML = state.teams.map(team => `
        <div class="team-edit-row">
            <input type="text" value="${team.name}" onchange="updateTeamName(${team.id}, this.value)">
            <input type="color" value="${team.color}" onchange="updateTeamColor(${team.id}, this.value)">
            <input type="number" value="${team.points}" onchange="updateScoreDirect(${team.id}, this.value)">
        </div>
    `).join('');

    const selector = document.getElementById('admin-king-selector');
    selector.innerHTML = `
        <label>👑 Selecionar Rei</label>
        <select onchange="setKing(this.value)" style="width:100%; padding:10px; background:#0f172a; color:white; border-radius:8px;">
            ${state.teams.map(t => `<option value="${t.id}" ${t.id === state.kingId ? 'selected' : ''}>${t.name}</option>`).join('')}
        </select>
    `;
}

function updateScoreDirect(id, pts) {
    const team = state.teams.find(t => t.id === id);
    if (team) team.points = parseInt(pts);
    sync();
    updateUI();
}

function resetAllPoints() {
    if(confirm("Zerar pontuação de todos?")) {
        state.teams.forEach(t => t.points = 0);
        sync();
        updateUI();
    }
}

function addNewTeam() {
    const id = Date.now();
    state.teams.push({ id, name: "NOVA DUPLA", points: 0, color: "#ffffff" });
    sync();
    updateUI();
}

// Helper: Hex to RGB
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}