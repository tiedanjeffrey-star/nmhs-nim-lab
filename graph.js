// Strategy graph for both Nim games. Call render(container, game, position) after each change.
(function (root) {
  'use strict';
  const stateByContainer = new WeakMap();
  let serial = 0;
  const plural = n => n === 1 ? 'coin' : 'coins';
  const tuple = p => p.length === 1 ? String(p[0]) : '(' + p.join(', ') + ')';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function targets(game, position) {
    return root.NimEngine.moves(game, position).filter(p => root.NimEngine.isLosing(game,p));
  }
  function plot(game, position, max, id) {
    const E=root.NimEngine, options=targets(game, position), chosen=options[0];
    const width=560, height=game==='round1'?155:560;
    const left=51, right=528, top=25, bottom=game==='round1'?83:500, side=right-left;
    const x=n=>left+n*side/max, y=n=>bottom-n*(bottom-top)/max;
    const tick=max<=20?1:max<=35?2:5;
    let svg='<svg class="nim-graph-svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+esc(game==='round1' ? 'Number line of coin counts. Filled plum circles are losing positions. The current count is ringed; a green arrow points to a winning move when one exists.' : 'Position graph. Horizontal axis is pile A; vertical axis is pile B. Plum circles are losing positions, the current position is ringed, and a green arrow points to a winning move when one exists.')+'">';
    svg+='<defs><marker id="'+id+'" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7z" fill="#2d8060"/></marker></defs>';
    if(game==='round1') {
      svg+='<line x1="'+left+'" y1="'+bottom+'" x2="'+right+'" y2="'+bottom+'" stroke="#cbbfca" stroke-width="2"/>';
      for(let n=0;n<=max;n++) {
        const losing=E.isLosing(game,[n]), selected=n===position[0], target=options.some(p=>p[0]===n);
        if(n%tick===0||n===max) svg+='<text x="'+x(n)+'" y="'+(bottom+25)+'" text-anchor="middle" class="ng-axis">'+n+'</text>';
        svg+='<circle cx="'+x(n)+'" cy="'+bottom+'" r="'+(losing?6:3)+'" fill="'+(losing?'#68406f':'#cfc7cf')+'"/>';
        if(target) svg+='<circle cx="'+x(n)+'" cy="'+bottom+'" r="10" fill="none" stroke="#2d8060" stroke-width="3"/>';
        if(selected) svg+='<circle cx="'+x(n)+'" cy="'+bottom+'" r="13" fill="none" stroke="#c16a33" stroke-width="3"/>';
      }
      if(chosen) {
        let a=x(position[0]), b=x(chosen[0]);
        svg+='<path d="M '+a+' '+(bottom-15)+' Q '+((a+b)/2)+' '+(bottom-55)+' '+b+' '+(bottom-15)+'" fill="none" stroke="#2d8060" stroke-width="3" marker-end="url(#'+id+')"/>';
      }
      svg+='<text x="'+((left+right)/2)+'" y="145" text-anchor="middle" class="ng-axis ng-axis-title">COINS LEFT</text>';
    } else {
      for(let n=0;n<=max;n++) if(n%tick===0||n===max) {
        svg+='<line x1="'+x(n)+'" y1="'+top+'" x2="'+x(n)+'" y2="'+bottom+'" stroke="#e8e1e7" stroke-width="1"/><line x1="'+left+'" y1="'+y(n)+'" x2="'+right+'" y2="'+y(n)+'" stroke="#e8e1e7" stroke-width="1"/>';
        svg+='<text x="'+x(n)+'" y="'+(bottom+18)+'" text-anchor="middle" class="ng-axis">'+n+'</text><text x="'+(left-12)+'" y="'+(y(n)+3)+'" text-anchor="end" class="ng-axis">'+n+'</text>';
      }
      for(let a=0;a<=max;a++)for(let b=0;b<=max;b++) {
        const losing=E.isLosing(game,[a,b]);
        svg+='<circle cx="'+x(a)+'" cy="'+y(b)+'" r="'+(losing?4.7:1.8)+'" fill="'+(losing?'#68406f':'#cfc7cf')+'"/>';
      }
      options.forEach(p=>{ svg+='<circle cx="'+x(p[0])+'" cy="'+y(p[1])+'" r="8" fill="none" stroke="#2d8060" stroke-width="2.5"/>'; });
      if(chosen){const sx=x(position[0]),sy=y(position[1]),tx=x(chosen[0]),ty=y(chosen[1]),d=Math.hypot(tx-sx,ty-sy),ux=(tx-sx)/d,uy=(ty-sy)/d;svg+='<line x1="'+(sx+ux*11)+'" y1="'+(sy+uy*11)+'" x2="'+(tx-ux*11)+'" y2="'+(ty-uy*11)+'" stroke="#2d8060" stroke-width="2.8" marker-end="url(#'+id+')"/>';}
      svg+='<circle cx="'+x(position[0])+'" cy="'+y(position[1])+'" r="9" fill="#fff8eb" stroke="#c16a33" stroke-width="3"/>';
      svg+='<text x="'+((left+right)/2)+'" y="550" text-anchor="middle" class="ng-axis ng-axis-title">PILE A</text><text x="13" y="'+((top+bottom)/2)+'" text-anchor="middle" transform="rotate(-90 13 '+((top+bottom)/2)+')" class="ng-axis ng-axis-title">PILE B</text>';
    }
    return svg+'</svg>';
  }
  function render(container, game, position) {
    if(!container || !root.NimEngine || !Array.isArray(position)) return;
    if(game!=='round1' && game!=='round3') return;
    const pos=position.map(Number);
    if(pos.length!==(game==='round1'?1:2) || pos.some(n=>!Number.isInteger(n)||n<0))return;
    let s=stateByContainer.get(container);
    if(!s){s={limit:20,scale:100,id:'nim-graph-arrow-'+(++serial),game,pos};stateByContainer.set(container,s);}
    s.game=game;s.pos=pos;
    const floor=Math.max(10,...pos), upper=Math.max(40,floor);s.limit=Math.max(floor,Math.min(upper,s.limit));
    const options=targets(game,pos), terminal=pos.every(n=>n===0), losing=root.NimEngine.isLosing(game,pos);
    const summary=terminal ? '<strong>No coins left.</strong> The previous player wins.' : losing ? '<strong>No winning move.</strong> This is a losing position against perfect play.' : '<strong>'+esc(root.NimEngine.describeMove(game,pos,options[0]))+'</strong> Leave '+esc(tuple(options[0]))+'.';
    container.innerHTML='<div class="nim-graph-header"><div><span class="nim-graph-kicker">STRATEGY MAP</span><h3>Find your move</h3></div><span class="nim-graph-current">NOW '+esc(tuple(pos))+'</span></div><div class="nim-graph-result" role="status">'+summary+'</div><div class="nim-graph-legend"><span><i class="ng-key losing"></i>Losing</span><span><i class="ng-key current"></i>Current</span><span><i class="ng-key target"></i>Winning move</span></div><div class="nim-graph-viewport"><div class="nim-graph-figure" style="width:'+s.scale+'%">'+plot(game,pos,s.limit,s.id)+'</div></div><div class="nim-graph-controls"><label>Graph size <output class="ng-size-output">'+s.scale+'%</output><input class="ng-size" type="range" min="80" max="180" step="10" value="'+s.scale+'" aria-label="Graph size"></label><label>Show through <output>'+s.limit+'</output><input class="ng-limit" type="range" min="'+floor+'" max="'+upper+'" step="1" value="'+s.limit+'" aria-label="Largest position shown"></label></div><p class="nim-graph-note">Losing means the player to move cannot force a win. Green rings mark moves to leave a losing position.</p>';
    container.querySelector('.ng-size').addEventListener('input',e=>{s.scale=Number(e.target.value);container.querySelector('.nim-graph-figure').style.width=s.scale+'%';container.querySelector('.ng-size-output').textContent=s.scale+'%';});
    container.querySelector('.ng-limit').addEventListener('input',e=>{e.target.previousElementSibling.textContent=e.target.value;});
    container.querySelector('.ng-limit').addEventListener('change',e=>{const focused=document.activeElement===e.target;s.limit=Number(e.target.value);render(container,s.game,s.pos);if(focused)container.querySelector('.ng-limit').focus();});
  }
  root.NimGraph=Object.freeze({render});
})(typeof globalThis!=='undefined'?globalThis:window);
