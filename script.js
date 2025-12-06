// Ultimate Tic-Tac-Toe with optional Minimax AI for "hard" difficulty.
// Features: 2-player or vs AI (easy/medium/hard), scoreboard (localStorage), responsive, accessible, sound effects, move history, light/dark theme.

document.addEventListener('DOMContentLoaded', ()=> {
  // DOM refs
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const turnEl = document.getElementById('turn');
  const newGameBtn = document.getElementById('newGame');
  const resetScoreBtn = document.getElementById('resetScore');
  const youScoreEl = document.getElementById('youScore');
  const aiScoreEl = document.getElementById('aiScore');
  const drawScoreEl = document.getElementById('drawScore');
  const modeInputs = document.querySelectorAll('input[name="mode"]');
  const diffWrap = document.getElementById('difficultyWrap');
  const difficultySel = document.getElementById('difficulty');
  const playerSymbolSel = document.getElementById('playerSymbol');
  const soundToggleBtn = document.getElementById('soundToggle');
  const themeToggleBtn = document.getElementById('themeToggle');
  const historyListEl = document.getElementById('historyList');
  const gamesPlayedEl = document.getElementById('gamesPlayed');
  const winRateEl = document.getElementById('winRate');
  
  // Audio elements
  const placeSound = document.getElementById('placeSound');
  const winSound = document.getElementById('winSound');
  const drawSound = document.getElementById('drawSound');

  // game state
  let board = Array(9).fill(null); // index 0..8
  let current = 'X';
  let playing = true;
  let vsAI = false;
  let aiDifficulty = 'hard';
  let playerSymbol = 'X'; // human choice
  let scores = { you:0, ai:0, draw:0 };
  let moveHistory = [];
  let gamesPlayed = 0;
  let soundEnabled = true;
  let lightTheme = false;
  
  const WIN_COMBOS = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  // init
  function init() {
    loadScores();
    loadSettings();
    renderBoard();
    attachEvents();
    updateStatus();
    updateStats();
  }

  function loadScores(){
    const s = localStorage.getItem('ttt_scores');
    if(s) {
      const parsed = JSON.parse(s);
      scores = parsed.scores || { you:0, ai:0, draw:0 };
      gamesPlayed = parsed.gamesPlayed || 0;
    }
    updateScoreUI();
  }
  
  function loadSettings() {
    const settings = localStorage.getItem('ttt_settings');
    if(settings) {
      const parsed = JSON.parse(settings);
      soundEnabled = parsed.soundEnabled !== false; // default to true
      lightTheme = parsed.lightTheme || false;
      
      // Apply settings
      if(lightTheme) {
        document.body.classList.add('light-theme');
        themeToggleBtn.textContent = '☀️ Light Mode';
      }
      
      soundToggleBtn.textContent = soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
    }
  }
  
  function saveScores(){
    const data = {
      scores: scores,
      gamesPlayed: gamesPlayed
    };
    localStorage.setItem('ttt_scores', JSON.stringify(data));
  }
  
  function saveSettings() {
    const settings = {
      soundEnabled: soundEnabled,
      lightTheme: lightTheme
    };
    localStorage.setItem('ttt_settings', JSON.stringify(settings));
  }
  
  function updateScoreUI(){
    youScoreEl.textContent = scores.you;
    aiScoreEl.textContent = scores.ai;
    drawScoreEl.textContent = scores.draw;
    updateStats();
  }
  
  function updateStats() {
    gamesPlayedEl.textContent = gamesPlayed;
    const totalGames = scores.you + scores.ai + scores.draw;
    const winRate = totalGames > 0 ? Math.round((scores.you / totalGames) * 100) : 0;
    winRateEl.textContent = `${winRate}%`;
  }

  function renderBoard(){
    boardEl.innerHTML = '';
    board.forEach((v,i)=> {
      const cell = document.createElement('button');
      cell.className = `cell ${v ? v.toLowerCase() : ''}`;
      cell.setAttribute('role','gridcell');
      cell.setAttribute('aria-label', `Cell ${i+1}${v ? ` (${v})` : ''}`);
      cell.dataset.idx = i;
      cell.type = 'button';
      cell.innerHTML = v ? v : '';
      if(v) cell.setAttribute('aria-disabled','true');
      boardEl.appendChild(cell);
    });
  }

  function attachEvents(){
    boardEl.addEventListener('click', onBoardClick);
    boardEl.addEventListener('keydown', onBoardKey);
    newGameBtn.addEventListener('click', newGame);
    resetScoreBtn.addEventListener('click', resetScore);
    modeInputs.forEach(i=> i.addEventListener('change', onModeChange));
    difficultySel.addEventListener('change', ()=> {
      aiDifficulty = difficultySel.value;
    });
    playerSymbolSel.addEventListener('change', ()=> playerSymbol = playerSymbolSel.value);
    soundToggleBtn.addEventListener('click', toggleSound);
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  function onModeChange(e){
    vsAI = e.target.value === 'ai';
    diffWrap.style.display = vsAI ? 'block' : 'none';
    // If switching to AI and AI goes first, let AI move
    if(vsAI && current !== playerSymbol && playing){
      // small timeout to allow UI update
      setTimeout(()=> aiMove(), 300);
    }
  }

  function onBoardKey(e){
    // allow enter/space to play when focused
    if(e.key === 'Enter' || e.key === ' '){
      const cell = e.target;
      if(cell && cell.classList.contains('cell')) {
        placeCell(cell.dataset.idx);
      }
    }
  }

  function onBoardClick(e){
    const button = e.target.closest('.cell');
    if(!button || !playing) return;
    const idx = Number(button.dataset.idx);
    // if occupied, ignore
    if(board[idx]) return;
    // if vsAI and it's AI's turn, ignore clicks
    if(vsAI && current !== playerSymbol) return;
    placeMove(idx, current);
    addToHistory(current, idx);
    playSound(placeSound);
    checkFlow();
  }

  function placeMove(idx, symbol){
    board[idx] = symbol;
    renderBoard();
    animateCell(idx);
  }

  function animateCell(idx){
    const cell = boardEl.querySelector(`[data-idx="${idx}"]`);
    if(!cell) return;
    cell.animate([{transform:'scale(.9)'},{transform:'scale(1.03)'},{transform:'scale(1)'}],{duration:280,easing:'ease-out'});
  }

  function placeCell(idx){
    // helper for keyboard events
    if(board[idx] || !playing) return;
    if(vsAI && current !== playerSymbol) return;
    placeMove(idx, current);
    addToHistory(current, idx);
    playSound(placeSound);
    checkFlow();
  }

  function addToHistory(player, position) {
    const positionNames = [
      'Top Left', 'Top Center', 'Top Right',
      'Middle Left', 'Center', 'Middle Right',
      'Bottom Left', 'Bottom Center', 'Bottom Right'
    ];
    
    moveHistory.push({
      player: player,
      position: position,
      positionName: positionNames[position]
    });
    
    // Update history display
    updateHistoryDisplay();
  }
  
  function updateHistoryDisplay() {
    historyListEl.innerHTML = '';
    
    // Show last 5 moves
    const recentMoves = moveHistory.slice(-5);
    
    recentMoves.forEach(move => {
      const moveEl = document.createElement('div');
      moveEl.className = 'history-move';
      moveEl.textContent = `${move.player} at ${move.positionName}`;
      historyListEl.appendChild(moveEl);
    });
    
    // Scroll to bottom
    historyListEl.scrollTop = historyListEl.scrollHeight;
  }
  
  function clearHistory() {
    moveHistory = [];
    updateHistoryDisplay();
  }

  function checkFlow(){
    const winner = checkWinner(board);
    if(winner){
      playing = false;
      highlightWin(winner.combo);
      const winnerSymbol = winner.player;
      gamesPlayed++;
      
      if(vsAI){
        if(winnerSymbol === playerSymbol) { 
          scores.you++; 
          toast('🎉 You win!'); 
          playSound(winSound);
        }
        else { 
          scores.ai++; 
          toast('🤖 AI wins'); 
          playSound(winSound);
        }
      } else {
        toast(`🏆 ${winnerSymbol} wins`);
        playSound(winSound);
      }
      
      saveScores(); 
      updateScoreUI();
      updateStatus(`${winnerSymbol} wins`);
      return;
    }
    
    if(board.every(Boolean)){
      playing = false;
      scores.draw++;
      gamesPlayed++;
      saveScores(); 
      updateScoreUI();
      toast('🤝 Draw');
      playSound(drawSound);
      updateStatus('Draw');
      return;
    }
    
    // continue
    current = (current === 'X') ? 'O' : 'X';
    updateStatus();
    
    // if AI and it's AI's turn -> move
    if(vsAI && current !== playerSymbol && playing){
      setTimeout(()=> aiMove(), 300);
    }
  }

  function updateStatus(msg){
    if(msg){
      statusEl.textContent = msg;
      turnEl.textContent = '';
    } else {
      statusEl.innerHTML = `Turn: <strong id="turn">${current}</strong>`;
    }
  }

  function checkWinner(b){
    for(const combo of WIN_COMBOS){
      const [a,b1,c] = combo;
      if(board[a] && board[a] === board[b1] && board[a] === board[c]){
        return { player: board[a], combo };
      }
    }
    return null;
  }

  function highlightWin(combo){
    combo.forEach(i => {
      const cell = boardEl.querySelector(`[data-idx="${i}"]`);
      if(cell) {
        cell.style.boxShadow = '0 10px 30px rgba(124,92,255,0.22)';
        cell.classList.add('winning-cell');
      }
    });
  }

  function newGame(){
    board = Array(9).fill(null);
    current = 'X';
    playing = true;
    clearHistory();
    renderBoard();
    updateStatus();
    
    // If vsAI and AI is set to go first
    if(vsAI && current !== playerSymbol){
      setTimeout(()=> aiMove(), 300);
    }
  }

  function resetScore(){
    scores = { you:0, ai:0, draw:0 };
    gamesPlayed = 0;
    saveScores(); 
    updateScoreUI();
    toast('📊 Scores reset');
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    soundToggleBtn.textContent = soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
    saveSettings();
  }
  
  function toggleTheme() {
    lightTheme = !lightTheme;
    document.body.classList.toggle('light-theme', lightTheme);
    themeToggleBtn.textContent = lightTheme ? '☀️ Light Mode' : '🌙 Dark Mode';
    saveSettings();
  }
  
  function playSound(audioElement) {
    if(soundEnabled && audioElement) {
      // Reset and play
      audioElement.currentTime = 0;
      audioElement.play().catch(e => console.log('Audio play failed:', e));
    }
  }

  // Simple toast (temporary)
  function toast(msg){
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.position='fixed';
    t.style.right='14px'; t.style.bottom='18px';
    t.style.padding='10px 14px'; t.style.background='rgba(0,0,0,0.6)';
    t.style.border='1px solid rgba(255,255,255,0.04)'; t.style.borderRadius='8px';
    t.style.zIndex='1000';
    t.style.fontWeight='bold';
    document.body.appendChild(t);
    setTimeout(()=> { t.style.opacity='0'; t.addEventListener('transitionend', ()=> t.remove()); }, 1500);
  }

  // AI logic:
  function aiMove(){
    if(!playing) return;
    
    let idx;
    
    if(aiDifficulty === 'easy') {
      // random empty cell
      const empties = board.map((v,i)=> v ? null : i).filter(v=> v!==null);
      idx = empties[Math.floor(Math.random()*empties.length)];
    } 
    else if(aiDifficulty === 'medium') {
      // 50% chance of best move, 50% chance of random
      if(Math.random() > 0.5) {
        const empties = board.map((v,i)=> v ? null : i).filter(v=> v!==null);
        idx = empties[Math.floor(Math.random()*empties.length)];
      } else {
        const aiPlayer = current;
        const human = (aiPlayer === 'X') ? 'O' : 'X';
        const best = minimax(board.slice(), aiPlayer, aiPlayer, human);
        idx = best.index;
      }
    }
    else { // Hard -> Minimax
      const aiPlayer = current;
      const human = (aiPlayer === 'X') ? 'O' : 'X';
      const best = minimax(board.slice(), aiPlayer, aiPlayer, human);
      idx = best.index;
    }
    
    placeMove(idx, current);
    addToHistory(current, idx);
    playSound(placeSound);
    checkFlow();
  }

  // Minimax returns { index: number, score: number }
  function minimax(newBoard, player, aiPlayer, human){
    // Check terminal states
    const winner = getWinnerSimple(newBoard);
    if(winner === aiPlayer) return { score: 10 };
    if(winner === human) return { score: -10 };
    if(newBoard.every(Boolean)) return { score: 0 };

    const avail = newBoard.map((v,i)=> v ? null : i).filter(v=> v!==null);
    const moves = [];

    for(const i of avail){
      const move = {};
      move.index = i;
      newBoard[i] = player;

      const nextPlayer = (player === aiPlayer) ? human : aiPlayer;
      const result = minimax(newBoard, nextPlayer, aiPlayer, human);
      move.score = result.score;

      newBoard[i] = null;
      moves.push(move);
    }

    // choose best move for current player
    let bestMove;
    if(player === aiPlayer){
      let bestScore = -Infinity;
      for(const m of moves) if(m.score > bestScore){ bestScore = m.score; bestMove = m; }
    } else {
      let bestScore = Infinity;
      for(const m of moves) if(m.score < bestScore){ bestScore = m.score; bestMove = m; }
    }
    return bestMove;
  }

  // helper - check win quickly
  function getWinnerSimple(b){
    for(const combo of WIN_COMBOS){
      const [a,b1,c] = combo;
      if(b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    }
    return null;
  }

  // init board cells (create visual cells)
  function bootstrapBoard(){
    board = Array(9).fill(null);
    renderBoard();
  }

  // initial bootstrap
  bootstrapBoard();
  init();
});
