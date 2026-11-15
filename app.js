(function () {
  'use strict';
  const E = window.NimEngine;
  const $ = id => document.getElementById(id);
  const refs = { board: $('board'), controls: $('move-controls'), setup: $('setup-controls'), opponent: $('opponent-controls'), title: $('game-title'), description: $('game-description'), turn: $('turn-label'), status: $('status'), history: $('move-history'), hint: $('hint-text'), answer: $('answer-text'), graph: $('graph') };
  const games = {
    round1: { title: 'One pile', initial: [12], description: 'Take 1–3 coins. Last coin wins. Click a coin to take it and all coins after it.' },
    round3: { title: 'Two piles', initial: [4, 7], description: 'Take from one pile, or equally from both. Last coin wins. Click a coin to take it and all coins after it.' }
  };
  let game = 'round1', position = [], start = [], difficulty = 'flawed', takeMode = 'one', busy = false, ended = false, timer = null, message = '', history = [], shiftDown = false;
  const bothPiles = extra => game==='round3' && (takeMode==='both' || shiftDown || !!extra);
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
    refs.opponent.innerHTML='<div class="opponent-field"><span class="opponent-label" id="opponent-label">Opponent</span><button type="button" class="opponent-trigger" aria-labelledby="opponent-label opponent-current" aria-haspopup="menu" aria-expanded="false" aria-controls="opponent-menu"><span class="opponent-current" id="opponent-current">'+(difficulty==='flawed'?'Flawed':'Perfect')+'</span><span class="opponent-chevron" aria-hidden="true">⌄</span></button><div id="opponent-menu" class="opponent-menu" role="menu" aria-label="Opponent difficulty" hidden><button type="button" class="opponent-option" role="menuitemradio" aria-checked="'+(difficulty==='flawed')+'" data-difficulty="flawed"><span>Flawed</span></button><button type="button" class="opponent-option" role="menuitemradio" aria-checked="'+(difficulty==='perfect')+'" data-difficulty="perfect"><span>Perfect</span></button></div></div>';
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
    refs.controls.innerHTML=game==='round3'&&!ended?'<div class="take-mode" aria-label="Move type"><span>TAKE FROM</span><button type="button" data-take-mode="one" aria-pressed="'+(takeMode==='one')+'" class="'+(takeMode==='one'?'selected':'')+'">One pile</button><button type="button" data-take-mode="both" aria-pressed="'+(takeMode==='both')+'" class="'+(takeMode==='both'?'selected':'')+'"'+(Math.min(...position)===0?' disabled':'')+'>Both piles</button></div><p class="shift-tip">Hold <kbd class="shift-key">Shift</kbd> to take from both piles</p>':'';
    refreshShiftUi();
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
  function take(pileIndex, n, keyboard, shiftKey) {
    if(busy||ended)return;
    const next=position.slice();
    if(bothPiles(shiftKey)){
      if(n>Math.min(...position)){message='Both piles need at least '+amount(n)+'.';refs.status.textContent=message;return;}
      next[0]-=n;next[1]-=n;
    }else next[pileIndex]-=n;
    if(!E.moves(game,position).some(p=>p.every((v,i)=>v===next[i])))return;
    const prev=position.slice();position=next;history.push({who:'You',text:E.describeMove(game,prev,next),pos:next.slice()});hideHint();
    if(isEmpty(next)){ended=true;message='You win!';render();if(keyboard)$('reset-btn').focus();return;}
    busy=true;message='Opponent is thinking…';render();
    if(keyboard){refs.status.tabIndex=-1;refs.status.focus();}
    timer=setTimeout(()=>{
      const previous=position.slice();position=E.chooseMove(game,position,difficulty);const desc=E.describeMove(game,previous,position);
      history.push({who:'Opponent',text:desc,pos:position.slice()});busy=false;
      if(isEmpty(position)){ended=true;message='Opponent wins.';}else message='Opponent: '+desc+' Your turn.';
      if(takeMode==='both' && game==='round3' && Math.min(...position)===0)takeMode='one';
      const restoreFocus=keyboard && document.activeElement===refs.status;
      render();
      if(restoreFocus){const coins=refs.board.querySelectorAll('button.coin:not(:disabled)');(coins[coins.length-1]||$('reset-btn')).focus();}
    },500);
  }
  document.querySelectorAll('[data-game]').forEach(tab=>tab.addEventListener('click',()=>{if(tab.dataset.game!==game)reset(tab.dataset.game);}));
  refs.board.addEventListener('click',event=>{const button=event.target.closest('button[data-take]');if(button)take(Number(button.dataset.pile),Number(button.dataset.take),event.detail===0,event.shiftKey);});
  function highlight(event,on){
    const button=event.target.closest('button[data-take]');
    refs.board.querySelectorAll('button.coin').forEach(c=>c.classList.remove('selected'));
    if(!on||!button||button.disabled)return;
    const k=Number(button.dataset.take),pileIndex=button.dataset.pile,both=bothPiles(event.shiftKey);
    if(both&&k>Math.min(...position))return;
    refs.board.querySelectorAll('button.coin').forEach(c=>{const same=both||c.dataset.pile===pileIndex;c.classList.toggle('selected',same&&Number(c.dataset.take)<=k);});
  }
  function refreshShiftUi(){
    if(game!=='round3')return;
    const both=bothPiles(false), max=Math.min(...position);
    refs.board.querySelectorAll('button.coin').forEach(coin=>{
      const n=Number(coin.dataset.take), label=both?' from each pile':' from pile '+(coin.dataset.pile==='0'?'A':'B');
      const invalid=both&&n>max;
      coin.setAttribute('aria-label','Take '+amount(n)+label);
      coin.title='Take '+n+(both?' from each pile':'');
      coin.classList.toggle('shift-invalid',shiftDown&&takeMode!=='both'&&invalid);
      if(invalid&&!coin.disabled)coin.setAttribute('aria-disabled','true');else coin.removeAttribute('aria-disabled');
    });
    const tip=refs.controls.querySelector('.shift-tip'), bothButton=refs.controls.querySelector('[data-take-mode="both"]');
    if(tip)tip.classList.toggle('shift-active',shiftDown);
    if(bothButton)bothButton.classList.toggle('shift-override',shiftDown&&takeMode!=='both');
    const hover=refs.board.querySelector('button.coin:hover'),focused=refs.board.contains(document.activeElement)?document.activeElement:null;
    const active=hover||focused;
    if(active&&active.matches('button.coin'))highlight({target:active,shiftKey:shiftDown},true);
    else refs.board.querySelectorAll('button.coin.selected').forEach(c=>c.classList.remove('selected'));
  }
  refs.board.addEventListener('pointerover',e=>highlight(e,true));refs.board.addEventListener('pointerout',e=>highlight(e,false));refs.board.addEventListener('focusin',e=>highlight(e,true));refs.board.addEventListener('focusout',e=>highlight(e,false));
  document.addEventListener('keydown',event=>{
    if(event.key!=='Shift'||event.repeat||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    shiftDown=true;refreshShiftUi();
  });
  document.addEventListener('keyup',event=>{if(event.key==='Shift'){shiftDown=event.shiftKey;refreshShiftUi();}});
  window.addEventListener('blur',()=>{shiftDown=false;refreshShiftUi();});
  refs.controls.addEventListener('click',e=>{const b=e.target.closest('[data-take-mode]');if(b){const keyboard=e.detail===0;takeMode=b.dataset.takeMode;render();if(keyboard)refs.controls.querySelector('[data-take-mode="'+takeMode+'"]').focus();}});
  refs.setup.addEventListener('submit',event=>{event.preventDefault();const inputs=[...refs.setup.querySelectorAll('input')];if(inputs.some(input=>!input.validity.valid)){inputs.find(input=>!input.validity.valid).reportValidity();return;}const values=inputs.map(input=>Number(input.value));if(isEmpty(values)){message='Choose a position with at least one coin.';refs.status.textContent=message;return;}reset(game,values);});
  function closeOpponentMenu(restoreFocus) {
    const trigger=refs.opponent.querySelector('.opponent-trigger'), menu=refs.opponent.querySelector('.opponent-menu');
    if(!trigger || !menu || menu.hidden)return;
    menu.hidden=true;trigger.setAttribute('aria-expanded','false');
    if(restoreFocus)trigger.focus();
  }
  function openOpponentMenu() {
    const trigger=refs.opponent.querySelector('.opponent-trigger'), menu=refs.opponent.querySelector('.opponent-menu');
    menu.hidden=false;trigger.setAttribute('aria-expanded','true');
    menu.querySelector('[aria-checked="true"]').focus();
  }
  refs.opponent.addEventListener('click',event=>{
    const trigger=event.target.closest('.opponent-trigger'), choice=event.target.closest('[data-difficulty]');
    if(trigger){const menu=refs.opponent.querySelector('.opponent-menu');if(menu.hidden)openOpponentMenu();else closeOpponentMenu(true);return;}
    if(choice){difficulty=choice.dataset.difficulty;refs.opponent.querySelector('.opponent-current').textContent=difficulty==='flawed'?'Flawed':'Perfect';refs.opponent.querySelectorAll('[data-difficulty]').forEach(item=>item.setAttribute('aria-checked',String(item.dataset.difficulty===difficulty)));closeOpponentMenu(true);}
  });
  refs.opponent.addEventListener('keydown',event=>{
    const menu=refs.opponent.querySelector('.opponent-menu'), trigger=refs.opponent.querySelector('.opponent-trigger');
    if(event.key==='Escape'&&!menu.hidden){event.preventDefault();closeOpponentMenu(true);return;}
    if(event.key==='Tab'&&!menu.hidden){closeOpponentMenu(true);return;}
    if((event.key==='ArrowDown'||event.key==='ArrowUp')&&document.activeElement===trigger){event.preventDefault();openOpponentMenu();return;}
    if(!menu.hidden && ['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();const choices=[...menu.querySelectorAll('[data-difficulty]')];const current=choices.indexOf(document.activeElement);let next=event.key==='Home'?0:event.key==='End'?choices.length-1:event.key==='ArrowDown'?(current+1)%choices.length:(current-1+choices.length)%choices.length;choices[next].focus();
    }
  });
  document.addEventListener('click',event=>{if(!refs.opponent.contains(event.target))closeOpponentMenu(false);});
  $('reset-btn').addEventListener('click',()=>reset());
  $('hint-btn').addEventListener('click',()=>{refs.hint.hidden=!refs.hint.hidden;$('hint-btn').setAttribute('aria-expanded',String(!refs.hint.hidden));if(!refs.hint.hidden)updateHint();});
  $('answer-btn').addEventListener('click',()=>{refs.answer.hidden=!refs.answer.hidden;$('answer-btn').setAttribute('aria-expanded',String(!refs.answer.hidden));renderGraph();});
  reset();
})();