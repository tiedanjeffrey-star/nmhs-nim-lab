(function () {
  'use strict';
  const E = window.NimEngine;
  const $ = id => document.getElementById(id);
  const refs = { board: $('board'), controls: $('move-controls'), title: $('game-title'), description: $('game-description'), turn: $('turn-label'), status: $('status'), history: $('move-history'), hint: $('hint-text'), answer: $('answer-text') };
  const games = {
    round1: { title: 'The 13-coin challenge', start: [13], opening: [12], description: 'Start with 13 coins. On each turn, take 1, 2, or 3 coins. Whoever takes the last coin wins.' },
    round3: { title: 'The two-pile challenge', start: [5, 8], opening: [4, 7], description: 'Start with piles of 5 and 8. Take any number from one pile, or the same number from both. Whoever takes the last coin or coins wins.' }
  };
  let game = 'round1', mode = 'challenger', position = [], history = [], busy = false, ended = false, timer = null, lastMove = '';
  const countLabel = n => n + ' ' + (n === 1 ? 'coin' : 'coins');
  const formatPosition = p => p.length === 1 ? countLabel(p[0]) : p[0] + ' and ' + p[1] + ' coins';
  const isEmpty = p => p.every(n => n === 0);
  function reveal(el, button, content) { el.innerHTML = content; el.hidden = false; button.setAttribute('aria-expanded', 'true'); }
  function hide(el, button) { el.hidden = true; button.setAttribute('aria-expanded', 'false'); }
  function reset(nextGame, nextMode) {
    clearTimeout(timer); game = nextGame || game; mode = nextMode || mode; busy = false; ended = false;
    const config = games[game];
    position = (mode === 'challenger' ? config.opening : config.start).slice();
    history = [];
    if (mode === 'challenger') {
      lastMove = E.describeMove(game, config.start, position);
      history.push({who:'Opponent opened', text:lastMove, pos:position.slice()});
    } else lastMove = '';
    hide(refs.hint, $('hint-btn')); hide(refs.answer, $('answer-btn'));
    render();
  }
  function coins(n, label) {
    return '<div class="pile"><div class="pile-label">' + label + ' <strong>' + n + '</strong></div><div class="coin-row" aria-hidden="true">' + Array.from({length:n}, (_,i) => '<span class="coin" style="--i:' + i + '"><span>✦</span></span>').join('') + (n === 0 ? '<span class="empty-pile">Empty</span>' : '') + '</div></div>';
  }
  function render() {
    document.querySelectorAll('[data-game]').forEach(tab => { const on=tab.dataset.game===game; tab.classList.toggle('active',on); tab.setAttribute('aria-pressed',String(on)); });
    refs.title.textContent=games[game].title;
    refs.description.textContent=games[game].description;
    refs.turn.textContent=ended ? 'GAME OVER' : busy ? 'OPPONENT IS THINKING' : 'YOUR TURN';
    refs.board.setAttribute('aria-label', game==='round1' ? formatPosition(position)+' remaining' : 'Pile A: '+position[0]+' coins. Pile B: '+position[1]+' coins.');
    refs.board.innerHTML= game==='round1' ? coins(position[0],'COINS LEFT') : coins(position[0],'PILE A')+coins(position[1],'PILE B');
    if (ended) refs.status.textContent = lastMove;
    else if (busy) refs.status.textContent='Your opponent is choosing a move…';
    else if (history.length===1 && mode==='challenger') refs.status.textContent='Opponent opened: '+history[0].text+' Your turn with '+formatPosition(position)+'.';
    else refs.status.textContent=lastMove ? 'Opponent: '+lastMove+' Your turn.' : 'You go first. Choose a move below.';
    const switcher='<div class="mode-selector" aria-label="Practice side"><span>PLAY AS</span><button type="button" data-mode="challenger" aria-pressed="'+(mode==='challenger')+'" class="'+(mode==='challenger'?'selected':'')+'">Challenger</button><button type="button" data-mode="winning" aria-pressed="'+(mode==='winning')+'" class="'+(mode==='winning'?'selected':'')+'">First player</button></div><p class="mode-explainer">'+(mode==='challenger' ? 'The opponent opens first, leaving you a losing position against perfect play.' : 'You move first from the handout’s example setup.')+'</p>';
    let buttons='';
    if (!ended) {
      const disabled = busy ? ' disabled' : '';
      if (game==='round1') {
        buttons='<div class="move-group"><span class="move-label">TAKE COINS</span><div class="move-buttons">'+E.moves(game,position).map(p=>'<button type="button" data-to="'+p.join(',')+'"'+disabled+'>Take '+(position[0]-p[0])+'</button>').join('')+'</div></div>';
      } else {
        const a=position[0], b=position[1];
        function group(label, max, make) { return max ? '<div class="move-group"><span class="move-label">'+label+'</span><div class="move-buttons">'+Array.from({length:max},(_,i)=>{const k=i+1;return '<button type="button" data-to="'+make(k).join(',')+'" aria-label="'+label.toLowerCase()+' '+k+' '+(k===1?'coin':'coins')+'"'+disabled+'>'+k+'</button>';}).join('')+'</div></div>' : ''; }
        buttons=group('TAKE FROM PILE A',a,k=>[a-k,b])+group('TAKE FROM PILE B',b,k=>[a,b-k])+group('TAKE FROM EACH PILE',Math.min(a,b),k=>[a-k,b-k]);
      }
    }
    refs.controls.innerHTML=switcher+buttons;
    refs.history.innerHTML=history.length ? '<ol>'+history.slice().reverse().map(item=>'<li><strong>'+item.who+'</strong><span>'+item.text+' → '+formatPosition(item.pos)+'</span></li>').join('')+'</ol>' : '<p>Your moves will show up here.</p>';
    if (!refs.hint.hidden) updateHint();
  }
  function updateHint() {
    if (ended) { refs.hint.textContent='Start over to explore another line of play.'; return; }
    if (busy) { refs.hint.textContent='Wait for your opponent’s move, then check again.'; return; }
    if (E.isLosing(game, position)) {
      refs.hint.innerHTML='<strong>This is a losing position for the player to move.</strong> There is no guaranteed winning move against perfect play. Try any legal move and watch where your opponent returns the board.';
    } else {
      const target=E.bestMove(game,position);
      refs.hint.innerHTML='<strong>Look for a position your opponent cannot force a win from.</strong> One move to try: '+E.describeMove(game,position,target)+' That leaves '+formatPosition(target)+'.';
    }
  }
  function answerContent() {
    return game==='round1'
      ? '<strong>The pattern: multiples of 4.</strong><br>With 0, 4, 8, or 12 coins left, the player to move is in a losing position against perfect play. From 13, take 1 to leave 12. After your opponent takes 1, 2, or 3, take 3, 2, or 1 so the two moves total 4. Keep leaving 8, then 4, then 0.'
      : '<strong>Leave a losing pair.</strong><br>With perfect play, key losing positions include (0, 0), (1, 2), (3, 5), (4, 7), and (6, 10), in either order. From (5, 8), take 1 from each pile to leave (4, 7). After each opponent move, look for a legal move back to a losing pair. A losing position has no guaranteed winning move for the player whose turn it is.';
  }
  function take(next) {
    if (busy || ended || !E.moves(game,position).some(p=>p.every((n,i)=>n===next[i]))) return;
    const prev=position.slice(); position=next; const desc=E.describeMove(game,prev,position);
    history.push({who:'You',text:desc,pos:position.slice()}); hide(refs.hint,$('hint-btn'));
    if (isEmpty(position)) {ended=true;lastMove='You took the last coin'+(game==='round3'?' or coins':'')+' — you win!';render();return;}
    busy=true; render();
    timer=setTimeout(()=>{
      const prev=position.slice(); position=E.bestMove(game,position); lastMove=E.describeMove(game,prev,position); history.push({who:'Opponent',text:lastMove,pos:position.slice()}); busy=false;
      if (isEmpty(position)) {ended=true;lastMove='Opponent took the last coin'+(game==='round3'?' or coins':'')+'. Try switching sides to explore the winning strategy.';}
      render();
    },550);
  }
  document.querySelectorAll('[data-game]').forEach(tab=>tab.addEventListener('click',()=>reset(tab.dataset.game,mode)));
  refs.controls.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.mode){reset(game,button.dataset.mode);return;}if(button.dataset.to)take(button.dataset.to.split(',').map(Number));});
  $('reset-btn').addEventListener('click',()=>reset());
  $('hint-btn').addEventListener('click',()=>{if(!refs.hint.hidden){hide(refs.hint,$('hint-btn'));return;}reveal(refs.hint,$('hint-btn'),'');updateHint();});
  $('answer-btn').addEventListener('click',()=>{if(!refs.answer.hidden){hide(refs.answer,$('answer-btn'));return;}reveal(refs.answer,$('answer-btn'),answerContent());});
  reset();
})();