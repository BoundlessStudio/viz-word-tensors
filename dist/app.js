(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const state = {word:'', sentence:'', scene:null, baseline:null, limit:5};
  const focus = $('focus-word'), sentence = $('sentence');
  const suggestions = $('suggestions'), browseWords = $('browse-words'), wordForm = $('word-form');
  const featuredWords = AtlasReference.featuredWords;
  const tints = {'Live show':'#ac97f4','Classical':'#9db9ff','In concert':'#68cdb5','Sound production':'#e59dca','Concert pitch':'#9db9ff'};
  let retryInput=null;
  let demoPending=new URLSearchParams(location.search).get('demo')==='concert-contexts';
  let comparisonOn=false, comparisonJob=0, comparisonAbort=null;
  const comparisonCache=new Map();
  let selection = -1, matches = [], request = 0, controller = null;
  let measuring = false;
  const byGroup = (id, scene=state.scene) => (scene?.groups || []).find(g=>g.id===id);
  const color = group => byGroup(group)?.color || '#8e95ac';

  const plot = AtlasPlot.create($('space-plot'), {onCompare(text){void explore(state.word,text);}, onViewChange({mode}) {
    $('mode3').setAttribute('aria-pressed',String(mode==='3d'));
    $('mode2').setAttribute('aria-pressed',String(mode==='2d'));
    $('gesture').textContent = mode==='3d' ? 'Drag to rotate' : 'Drag to pan';
  }});
  $('mode3').onclick = () => plot.setMode('3d');
  $('mode2').onclick = () => plot.setMode('2d');
  $('zoom-in').onclick = () => plot.zoomBy(1.2);
  $('zoom-out').onclick = () => plot.zoomBy(1/1.2);
  $('reset-view').onclick = () => plot.resetView();

  function status(text='', error=false) {
    const box = $('status');
    box.hidden = !text;
    box.textContent = text;
    box.classList.toggle('error',error);
  }
  function containsWord(text, word) {
    const pattern = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?:^|[^\\p{L}\\p{M}\\p{N}_])'+pattern+'(?=$|[^\\p{L}\\p{M}\\p{N}_])','iu').test(text);
  }
  function updateApply() {
    const text = sentence.value.trim();
    const matchesScene = text === state.sentence && focus.value.trim().toLowerCase() === state.word;
    $('apply').disabled = matchesScene;
    $('compare').disabled = measuring || Boolean(retryInput) || !state.scene || !matchesScene;
    $('clear').hidden = !text && !state.sentence;
  }
  function updateControls(word, activeSentence, groups) {
    focus.value = word;
    sentence.value = activeSentence;
    sentence.placeholder = 'Write a sentence containing “'+word+'”…';
    updateApply();
    const list = $('examples');
    list.replaceChildren();
    const examples = [{label:'Word alone',sentence:''},...AtlasReference.examples(word)];
    examples.forEach((example,i)=>{
      const button = el('button'), marker=el('i','dot');
      marker.style.setProperty('--swatch', example.color || tints[example.label] || (i ? (groups[(i-1)%Math.max(1,groups.length)]?.color || '#a296cc') : '#f4c075'));
      button.classList.toggle('active', activeSentence===example.sentence);
      button.setAttribute('aria-pressed',String(activeSentence===example.sentence));
      button.title = example.sentence || 'Inspect the word in isolation';
      button.append(marker,document.createTextNode(example.label));
      button.onclick = () => {
        sentence.value = example.sentence;
        updateApply();
        void explore(word,example.sentence);
      };
      list.append(button);
    });
    $('compare').hidden=examples.length<3;
    if (examples.length===1) list.append(el('span','example-hint','Type your own sentence above.'));
  }
  function renderLegend() {
    const box = $('legend');
    box.replaceChildren();
    const items = [{label:'Focus word',color:'#f4c075'},...state.scene.groups];
    items.forEach((g,i)=>{
      const key = el('span','key'+(i===0?' focus':''));
      const mark = el('i','mark');mark.style.setProperty('--swatch',g.color);
      key.append(mark,document.createTextNode(g.label));box.append(key);
    });
  }
  function renderRanks() {
    const container=$('neighbors'), s=state.scene;
    container.replaceChildren();
    const ranked=s.rankings.slice(0,state.limit);
    for(let i=0;i<ranked.length;i++){
      const item=ranked[i], row=el('button','nr'), n=el('span','nword'), mark=el('i','mark');
      row.style.setProperty('--swatch',color(item.group));
      row.title='Explore '+item.word+' as the focus word';
      n.append(mark,document.createTextNode(item.word));
      const bar=el('span','nbar'), fill=el('i');
      fill.style.width=Math.min(100,Math.abs(item.score)*100)+'%';
      bar.append(fill);
      if(state.sentence){
        const old=state.baseline.get(item.word);
        const diff=old===undefined?0:old-(i+1);
        if(diff) {
          const jump=el('span','jump',(diff>0?'↑':'↓')+Math.abs(diff).toLocaleString());
          jump.title='Position changed from '+old+' to '+(i+1);
          n.append(jump);
        }
      }
      row.append(el('span','rank',String(i+1).padStart(2,'0')),n,bar,el('span','score',item.score.toFixed(3)));
      row.onmouseenter=() => plot.highlight(item.word);
      row.onmouseleave=() => plot.highlight(null);
      row.onfocus=() => plot.highlight(item.word);
      row.onblur=() => plot.highlight(null);
      row.onclick=() => {void explore(item.word);};
      container.append(row);
    }
    $('candidate-count').textContent = (s.candidateCount ?? s.rankings.length).toLocaleString()+' reference words';
    $('more').hidden = s.rankings.length<=5;
    $('more').textContent = state.limit===5?'Show more':'Show fewer';
  }
  $('more').onclick = () => {state.limit=state.limit===5?20:5;renderRanks();};

  function renderFingerprint() {
    const s=state.scene;
    if(!s || $('explorer').hidden)return;
    const canvas=$('fingerprint'), width=canvas.clientWidth, height=canvas.clientHeight;
    if (!width || !height) return;
    const ratio=window.devicePixelRatio||1;
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    const ctx=canvas.getContext('2d');
    ctx.scale(ratio,ratio);
    const v=s.vector,b=s.baseVector;
    const max=Math.max(...v.map(Math.abs),...b.map(Math.abs),.000001);
    const center=height/2, columns=Math.min(v.length,Math.max(32,Math.floor(width/2)));
    const dx=width/columns;
    const y=value=>center-value/max*(center-4);
    ctx.strokeStyle='#3b3c4d';ctx.lineWidth=1;
    ctx.setLineDash([2,3]);for(const line of [center/2,center*1.5]){ctx.beginPath();ctx.moveTo(0,line);ctx.lineTo(width,line);ctx.stroke();}
    ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(0,center);ctx.lineTo(width,center);ctx.stroke();
    for(let col=0;col<columns;col++){
      const start=Math.floor(col*v.length/columns),end=Math.floor((col+1)*v.length/columns);
      // When the screen is narrow, preserve the signed min and max in each bin.
      let lo=0,hi=0;for(let j=start;j<end;j++){lo=Math.min(lo,v[j]);hi=Math.max(hi,v[j]);}
      ctx.fillStyle='#b6a0f5';
      ctx.fillRect(col*dx,y(hi),Math.max(1,dx*.64),Math.max(.8,center-y(hi)));
      if(lo<0){ctx.fillStyle='#71618f';ctx.fillRect(col*dx,center,Math.max(1,dx*.64),y(lo)-center);}
    }
    canvas.setAttribute('aria-label',s.dimension+' components of '+s.word+', range '+Math.min(...v).toFixed(3)+' to '+Math.max(...v).toFixed(3));
    $('dim-badge').textContent=s.dimension+'D';
    $('last-dim').textContent=String(s.dimension);
    $('base-score').textContent=s.contextSimilarity.toFixed(3);
    $('vector-caption').textContent='Final-layer token components, normalized after pooling the focus word’s pieces.';
    const pieces=$('pieces');pieces.hidden=!s.tokens;pieces.replaceChildren();
    if(s.tokens){pieces.append(document.createTextNode('Selected tokens'));s.tokens.forEach(t=>pieces.append(el('code','',t)));}
  }
  new ResizeObserver(renderFingerprint).observe($('fingerprint'));

  function clearComparison() {
    comparisonOn=false;comparisonJob++;
    comparisonAbort?.abort();comparisonAbort=null;
    $('comparison').hidden=true;
    $('compare').setAttribute('aria-expanded','false');
    $('compare').querySelector('span').textContent='Compare contexts';
    plot.setComparisons?.([]);
  }
  async function renderComparison() {
    if(!comparisonOn)return;
    const task=++comparisonJob;
    comparisonAbort?.abort();comparisonAbort=new AbortController();
    const {word,scene}=state;
    const examples=AtlasReference.examples(word);
    if(examples.length<2){clearComparison();return;}
    $('compare').setAttribute('aria-expanded','true');
    $('compare').querySelector('span').textContent='Hide context comparison';
    $('comparison').hidden=false;
    $('comparison-desc').textContent='Measuring example sentences…';
    $('compare-rows').replaceChildren();
    let items=comparisonCache.get(word);
    try{
      if(!items){
        items=[];
        const panel=AtlasReference.getPanel(word);
        for(const [i,ex] of examples.entries()){
          if(task!==comparisonJob)return;
          const s=await AtlasNeural.getScene(word,ex.sentence,panel,undefined,{signal:comparisonAbort.signal});
          const color=ex.color||tints[ex.label]||scene.groups[i%Math.max(1,scene.groups.length)]?.color||'#bfadf0';
          items.push({...ex, ...s.target, vector:s.vector, baseline:s.contextSimilarity, color});
        }
        if(task!==comparisonJob)return;
        if(comparisonCache.size>=20)comparisonCache.delete(comparisonCache.keys().next().value);
        comparisonCache.set(word,items);
      }
      if(task!==comparisonJob)return;
      plot.setComparisons?.(items);
      $('comparison-desc').textContent='Each diamond shows “'+word+'” in a different sentence. Scores are cosine similarities in all '+scene.dimension+' dimensions.';
      for(const item of items){
        const row=el('tr'),cell=el('td'),button=el('button'),mark=el('i','diamond'),label=el('span','compare-label',item.label);
        mark.style.setProperty('--swatch',item.color);
        button.title='Use this sentence';button.onclick=()=>void explore(word,item.sentence);
        button.append(mark,label,el('span','compare-sentence',item.sentence));cell.append(button);
        const sim=Math.max(-1,Math.min(1,scene.vector.reduce((v,x,i)=>v+x*item.vector[i],0)));
        row.append(cell,el('td','c-score',item.baseline.toFixed(3)),el('td','c-score',sim.toFixed(3)));
        if(item.sentence===state.sentence)row.classList.add('current');
        $('compare-rows').append(row);
      }
    }catch(e){
      if(task===comparisonJob && e.name!=='AbortError'){clearComparison();status('Could not measure the example sentences. '+e.message,true);}
    }
  }
  $('compare').onclick=()=>{if(comparisonOn)clearComparison();else{comparisonOn=true;void renderComparison();}};
  $('hide-comparison').onclick=clearComparison;
  function showMeasurementStatus(message, error=false, percent=null) {
    if(state.scene){
      status(message,error);
      return;
    }
    const meter=$('startup-meter'), detail=$('startup-detail');
    $('startup-title').textContent=error?'Couldn’t open the word map':'Loading MiniLM';
    $('startup-hint').hidden=error;
    if(detail.textContent!==message)detail.textContent=message;
    meter.hidden=error;
    if(Number.isFinite(percent))meter.value=percent;
    else meter.removeAttribute('value');
    $('startup-percent').textContent=Number.isFinite(percent) ? percent+'%' : '';
    $('startup-retry').hidden=!error;
  }
  async function explore(rawWord, rawSentence='') {
    closeSuggestions();
    const word=String(rawWord).trim().toLowerCase(), text=rawSentence.trim();
    const task=++request;
    if(word!=='concert' || text)demoPending=false;
    controller?.abort();
    controller=new AbortController();
    retryInput=null;
    $('retry').hidden=true;
    if(!word || (text && !containsWord(text,word))){
      measuring=false;
      updateApply();
      showMeasurementStatus(word ? 'Include “'+word+'” as a whole word in the sentence.' : 'Enter a focus word to explore.',true);
      return false;
    }
    measuring=true;
    $('compare').disabled=true;
    const progress=(message,percent)=>{if(request===task)showMeasurementStatus(message,false,percent);};
    progress(state.scene?'Measuring “'+word+'”…':'Starting the word encoder…');
    try {
      const panel=AtlasReference.getPanel(word);
      if(word!==state.word)clearComparison();
      updateControls(word,text,panel.groups);
      const s=await AtlasNeural.getScene(word,text,panel,progress,{signal:controller.signal});
      if(task!==request)return false;
      const isolatedOrder=[...s.rankings].sort((a,b)=>b.baseScore-a.baseScore || a.word.localeCompare(b.word));
      const initialScene=!state.scene;
      Object.assign(state,{word:s.word,sentence:text,scene:s,limit:5,baseline:new Map(isolatedOrder.map((item,i)=>[item.word,i+1]))});
      if(initialScene)view();
      plot.setScene(s);
      $('projection-meta').textContent=s.points.length+' landmarks · PCA';
      renderLegend();renderRanks();renderFingerprint();
      updateApply();
      const notes=[];
      if(text)notes.push('Measured the first occurrence of “'+word+'” in this sentence.');
      if(panel.general)notes.push('Comparing “'+word+'” with the general reference panel.');
      status(notes.join(' '));
      if(demoPending){demoPending=false;comparisonOn=true;}
      if(comparisonOn)void renderComparison();
      return true;
    } catch(error) {
      if(task!==request || error.name==='AbortError')return false;
      retryInput={word,sentence:text};
      $('retry').hidden=!state.scene;
      showMeasurementStatus(error.message+(state.scene?' The map still shows the previous measurement.':''),true);
      return false;
    } finally {
      if(task===request){
        measuring=false;
        updateApply();
      }
    }
  }
  $('startup-retry').onclick=$('retry').onclick=()=>{
    if(retryInput)void explore(retryInput.word,retryInput.sentence);
  };
  function setMenuOpen(open) {
    suggestions.hidden = !open;
    focus.setAttribute('aria-expanded', String(open));
    browseWords.setAttribute('aria-expanded', String(open));
    focus.removeAttribute('aria-activedescendant');
    selection = -1;
  }
  function closeSuggestions() {
    setMenuOpen(false);
    matches = [];
  }
  function updateSuggestions(showAll = false) {
    const term = focus.value.trim().toLowerCase();
    if (showAll || !term) {
      matches = featuredWords;
    } else {
      const featured = featuredWords.filter(word => word.startsWith(term));
      const other = AtlasReference.words.filter(word => word.startsWith(term));
      const candidates = new Set([...featured, ...other, ...AtlasNeural.suggest(term)]);
      matches = [...candidates].filter(word => AtlasReference.examples(word).length);
    }
    suggestions.replaceChildren();
    setMenuOpen(matches.length > 0);
    suggestions.scrollTop = 0;
    matches.forEach((word, i) => {
      const option = el('button', '', word);
      option.type = 'button';
      option.id = 'suggest-' + i;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(word === state.word));
      option.tabIndex = -1;
      option.onpointerdown = event => { if (event.pointerType === 'mouse') event.preventDefault(); };
      option.onclick = () => void explore(word);
      suggestions.append(option);
    });
  }
  focus.oninput = () => { updateSuggestions(); updateApply(); };
  focus.onfocus = () => { focus.select(); updateSuggestions(true); };
  focus.onclick = () => { if (suggestions.hidden) updateSuggestions(true); };
  browseWords.onpointerdown = event => event.preventDefault();
  browseWords.onclick = () => {
    const opening = suggestions.hidden;
    focus.focus();
    if (opening) updateSuggestions(true);
    else closeSuggestions();
  };
  document.addEventListener('pointerdown', event => {
    if (!wordForm.contains(event.target) && !suggestions.hidden) closeSuggestions();
  });
  wordForm.addEventListener('focusout', event => {
    if (event.relatedTarget && !wordForm.contains(event.relatedTarget)) closeSuggestions();
  });
  focus.onkeydown = event => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      closeSuggestions();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (suggestions.hidden) updateSuggestions(focus.value.trim().toLowerCase() === state.word);
    if (!matches.length) return;
    const next = event.key === 'ArrowDown' ? selection + 1 : (selection < 0 ? matches.length - 1 : selection - 1);
    selection = (next + matches.length) % matches.length;
    Array.from(suggestions.children).forEach((option, i) => option.setAttribute('aria-selected', String(i === selection)));
    const active = suggestions.children[selection];
    focus.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({block:'nearest'});
  };
  wordForm.onsubmit = event => {
    event.preventDefault();
    void explore(selection >= 0 ? matches[selection] : focus.value);
  };
  $('apply').onclick=()=>void explore(focus.value,sentence.value);
  sentence.oninput=updateApply;
  sentence.onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void explore(focus.value,sentence.value);}};
  $('clear').onclick=()=>{sentence.value='';void explore(focus.value);};
  function view() {
    const notes=location.hash==='#notes';
    $('notes').hidden=!notes;
    $('startup').hidden=notes || Boolean(state.scene);
    $('explorer').hidden=notes || !state.scene;
    [['notes-nav',notes],['explore-nav',!notes]].forEach(([id,active])=>{
      $(id).classList.toggle('active',active);
      if(active)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');
    });
    if(!notes)requestAnimationFrame(renderFingerprint);
  }
  window.addEventListener('hashchange',view);
  view();
  const firstWord = demoPending ? 'concert' : featuredWords[Math.floor(Math.random() * featuredWords.length)];
  void explore(firstWord);
})();
