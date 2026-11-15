(function () {
  'use strict';
  const E = window.NimEngine;
  const $ = id => document.getElementById(id);
  const refs = { board: $('board'), controls: $('move-controls'), setup: $('setup-controls'), opponent: $('opponent-controls'), title: $('game-title'), description: $('game-description'), turn: $('turn-label'), status: $('status'), history: $('move-history'), hint: $('hint-text'), answer: $('answer-text'), graph: $('graph') };
  const games = {
    round1: { title: 'One pile', initial: [12], description: 'Take 1–3 coins. Last coin wins. Click a coin to take it and all coins after it.' },
    round3: { title: 'Two piles', initial: [4, 7], description: 'Take from one pile, or equally from both. Last coin wins. Click a coin to take it and all coins after it.' }
  };
  let game = 'round1', position = [], start = [], difficulty = 'flawed', takeMode = 'one', busy = false, ended = false, timer = null, message = '', history = [];
  const isEmpty = p => p.every(n => n === 0);
  const amount = n => n + ' ' + (n === 1 ? 'coin' : 'coins');
  const positionLabel = p => p.length === 1 ? String(p[0]) : '(' + p.join(', ') + ')';
  function hideHint(){ refs.hint.hidden=true; $('hint-btn').setAttribute('aria-expanded','false'); }
  function reset(nextGame, nextStart) {
    clearTimeout(timer);
    if (nextGame && nextGame !== game) { game=nextGame; start=games[game].initial.slice(); }
    if (nextStart) start=nextStart.slice();
    if (!start.length) start=games[game].initial.slice();
    position=start.slice(); busy=false; ended=false; takeMode='one'; message='Your turn'; history=[];
    hideHint(); renderSetup(); render();
  }
  function renderSetup() {
    const labels=game==='round1'?['Coins']:['Pile A','Pile B'];
    refs.setup.innerHTML='<form class="setup-form"><span class="setup-heading">Position</span>'+labels.map((label,i)=>'<label class="setup-label">'+label+'<input class="setup-input" type="number" min="0" max="30" step="1" required value="'+start[i]+'" aria-label="'+label+' starting position"></label>').join('')+'<button class="setup-apply" type="submit">Set</button></form>';
    refs.opponent.innerHTML='<label class="opponent-field">Opponent <select aria-label="Opponent difficulty"><option value="flawed"'+(difficulty==='flawed'?' selected':'')+'>Flawed</option><option value="perfect"'+(difficulty==='perfect'?' selected':'')+'>Perfect</option></select></label>';
  }
  function pile(n, index) {
    const label=game==='round1'?'COINS':index===0?'PILE A':'PILE B';
    const max=game==='round1'?Math.min(3,n):takeMode==='both'?Math.min(...position):n;
    const coins=Array.from({length:n},(_,i)=>{
      const k=n-i; const enabled=!busy&&!ended&&k<=max;
      return '<button type="button" class="coin" style="--i:'+i+'" data-pile="'+index+'" data-take="'+k+'" aria-label="Take '+amount(k)+(game==='round3'?(takeMode==='both'?' from each pile':' from pile '+(index===0?'A':'B')):'')+'" title="Take '+k+'"'+(enabled?'':' disabled')+'><span aria-hidden="true">✦</span></button>';
    }).join('');
    return '<div class="pile"><div class="pile-label"><span>'+label+'</span><strong>'+n+'</strong></div><div class="coin-row">'+(coins || '<span class="empty-pile">Empty</span>')+'</div></div>';
  }
  function renderGraph() {
    if (refs.answer.hidden || !window.NimGraph) return;
    window.NimGraph.render(refs.graph,game,position);
    if (busy) refs.graph.querySelector('.nim-graph-result').insertAdjacentHTML('afterbegin','<span>Opponent to move · </span>');
  }
  function render() {
    document.querySelectorAll('[data-game]').forEach(tab=>{const active=tab.dataset.game===game;tab.classList.toggle('active',active);tab.setAttribute('aria-pressed',String(active));});
    refs.title.textContent=games[game].title;
    refs.description.textContent=games[game].description;
    refs.turn.textContent=ended?'GAME OVER':busy?'OPPONENT’S TURN':'YOUR TURN';
    refs.status.textContent=message;
    refs.board.setAttribute('aria-label',game==='round1'?position[0]+' coins remain':'Pile A: '+position[0]+', pile B: '+position[1]);
    refs.board.innerHTML=position.map(pile).join('');
    refs.controls.innerHTML=game==='round3'&&!ended?'<div class="take-mode" aria-label="Move type"><span>TAKE FROM</span><button type="button" data-take-mode="one" aria-pressed="'+(takeMode==='one')+'" class="'+(takeMode==='one'?'selected':'')+'">One pile</button><button type="button" data-take-mode="both" aria-pressed="'+(takeMode==='both')+'" class="'+(takeMode==='both'?'selected':'')+'"'+(Math.min(...position)===0?' disabled':'')+'>Both piles</button></div>':'';
    refs.history.innerHTML=history.length?'<ol>'+history.slice().reverse().map(h=>'<li><strong>'+h.who+'</strong> '+h.text+' <span>→ '+positionLabel(h.pos)+'</span></li>').join('')+'</ol>':'<p>No moves yet.</p>';
    if(!refs.hint.hidden) updateHint();
    renderGraph();
  }
  function updateHint() {
    if(ended){refs.hint.textContent='Set a position or restart to play again.';return;}
    if(busy){refs.hint.textContent='The opponent is thinking.';return;}
    if(E.isLosing(game,position)){refs.hint.textContent='No forced win from here. Watch for an opponent mistake.';return;}
    const target=E.bestMove(game,position);
    refs.hint.textContent=E.describeMove(game,position,target)+' Leave '+positionLabel(target)+'.';
  }
  function take(pileIndex, n) {
    if(busy||ended)return;
    const next=position.slice();
    if(game==='round3'&&takeMode==='both'){next[0]-=n;next[1]-=n;}else next[pileIndex]-=n;
    if(!E.moves(game,position).some(p=>p.every((v,i)=>v===next[i])))return;
    const prev=position.slice();position=next;history.push({who:'You',text:E.describeMove(game,prev,next),pos:next.slice()});hideHint();
    if(isEmpty(next)){ended=true;message='You win!';render();return;}
    busy=true;message='Opponent is thinking…';render();
    timer=setTimeout(()=>{
      const previous=position.slice();position=E.chooseMove(game,position,difficulty);const desc=E.describeMove(game,previous,position);
      history.push({who:'Opponent',text:desc,pos:position.slice()});busy=false;
      if(isEmpty(position)){ended=true;message='Opponent wins.';}else message='Opponent: '+desc+' Your turn.';
      if(takeMode==='both' && game==='round3' && Math.min(...position)===0)takeMode='one';
      render();
    },500);
  }
  document.querySelectorAll('[data-game]').forEach(tab=>tab.addEventListener('click',()=>{if(tab.dataset.game!==game)reset(tab.dataset.game);}));
  refs.board.addEventListener('click',event=>{const button=event.target.closest('button[data-take]');if(button)take(Number(button.dataset.pile),Number(button.dataset.take));});
  function highlight(event,on){const button=event.target.closest('button[data-take]');if(!button||button.disabled)return;const k=Number(button.dataset.take),pileIndex=button.dataset.pile;refs.board.querySelectorAll('button.coin').forEach(c=>{const same=takeMode==='both'&&game==='round3'||c.dataset.pile===pileIndex;c.classList.toggle('selected',on&&same&&Number(c.dataset.take)<=k);});}
  refs.board.addEventListener('pointerover',e=>highlight(e,true));refs.board.addEventListener('pointerout',e=>highlight(e,false));refs.board.addEventListener('focusin',e=>highlight(e,true));refs.board.addEventListener('focusout',e=>highlight(e,false));
  refs.controls.addEventListener('click',e=>{const b=e.target.closest('[data-take-mode]');if(b){takeMode=b.dataset.takeMode;render();}});
  refs.setup.addEventListener('submit',event=>{event.preventDefault();const inputs=[...refs.setup.querySelectorAll('input')];if(inputs.some(input=>!input.validity.valid)){inputs.find(input=>!input.validity.valid).reportValidity();return;}const values=inputs.map(input=>Number(input.value));if(isEmpty(values)){message='Choose a position with at least one coin.';refs.status.textContent=message;return;}reset(game,values);});
  refs.opponent.addEventListener('change',event=>{if(event.target.matches('select'))difficulty=event.target.value;});
  $('reset-btn').addEventListener('click',()=>reset());
  $('hint-btn').addEventListener('click',()=>{refs.hint.hidden=!refs.hint.hidden;$('hint-btn').setAttribute('aria-expanded',String(!refs.hint.hidden));if(!refs.hint.hidden)updateHint();});
  $('answer-btn').addEventListener('click',()=>{refs.answer.hidden=!refs.answer.hidden;$('answer-btn').setAttribute('aria-expanded',String(!refs.answer.hidden));renderGraph();});
  reset();
})();