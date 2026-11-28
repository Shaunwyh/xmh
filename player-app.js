import {showDialog} from './castle-dialogs.js?v=castle-26';
import {isRecentUpload, formatLibraryTimestamp, RECENT_UPLOAD_MS} from './castle-time.js?v=castle-19';

(() => {
  'use strict';
  // Pointer interaction never inherits the outline from a programmatic focus.
  // Keyboard navigation still gets an explicit, accessible focus indicator.
  document.addEventListener('pointerdown',()=>{document.documentElement.dataset.inputMethod='pointer';},{capture:true,passive:true});
  document.addEventListener('keydown',e=>{if(['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))document.documentElement.dataset.inputMethod='keyboard';},{capture:true});
  const $ = id => document.getElementById(id), tracks = window.CASTLE_LIBRARY || [];
  const audio = $('audio'), player = $('player-sheet'), reader = $('player-reader');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'little-castle-player-v1', themeKey = 'little-castle-theme';
  const sharedStoryId = document.querySelector('meta[name="castle-shared-story"]')?.content;
  const names = {sequential:'顺序播放',repeat:'列表循环',single:'单曲循环',random:'随机播放'};
  const modeIcons = {sequential:'order',repeat:'repeat',single:'repeat-one',random:'shuffle'};
  let saved = {}; try {saved = JSON.parse(localStorage.getItem(storageKey) || '{}');} catch (_) {}
  let positions = saved.positions && typeof saved.positions === 'object' ? saved.positions : {};
  let category = 'all', query = '', current = null, position = 0, pendingSeek = null;
  let sort = ['newest','oldest','sequence'].includes(saved.sortOrder) ? saved.sortOrder : 'newest';
  let mode = ({list:'repeat',shuffle:'random'})[saved.playMode] || saved.playMode || 'repeat';
  if (!names[mode]) mode = 'repeat';
  let speed = [0.5,1,1.5,2].includes(saved.speed) ? saved.speed : 1;
  let reading = saved.reading === 'full' ? 'full' : 'immersive', following = reading === 'immersive';
  let cueElements = [], activeCue = -1, queue = [], shuffleBag = [], shuffleHistory = [], shuffleCursor = -1;
  let closingFromHistory = false, lastSave = 0, toastTimer, badgeTimer;
  const icon = name => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const format = n => {n = Math.max(0,Math.floor(n || 0));return String(Math.floor(n/60)).padStart(2,'0') + ':' + String(n%60).padStart(2,'0');};
  const date = t => formatLibraryTimestamp(t.fileTimestamp);
  const isNew = t => isRecentUpload(t.publishedAt);
  const badge = () => {const b=document.createElement('span');b.className='new-badge';b.textContent='新';b.setAttribute('aria-label','上传未满6小时');return b;};
  const notify = text => {$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(() => $('toast').hidden=true,4000);};
  if (!tracks.length) {notify('内容未能加载，请刷新后重试。');return;}
  const eligible = () => tracks.filter(t => (category==='all'||t.category===category) && (!query||(t.title+' '+(t.category==='letter'?'letter':'故事')+' '+String(t.sequence).padStart(2,'0')).toLowerCase().includes(query))).sort((a,b) => {
    if(sort==='sequence')return a.category===b.category?a.sequence-b.sequence:a.category==='letter'?-1:1;
    return (Date.parse(a.fileTimestamp)-Date.parse(b.fileTimestamp))*(sort==='newest'?-1:1) || a.id.localeCompare(b.id);
  });
  const ready = () => !!current && audio.readyState>0 && audio.currentSrc === new URL(current.audio,location.href).href;
  const playbackPosition = () => pendingSeek !== null ? pendingSeek : ready() ? audio.currentTime : position;
  const duration = () => ready() && Number.isFinite(audio.duration) ? audio.duration : current?.duration || 0;
  function persist() {
    if(current)positions[current.id]=playbackPosition();
    try {localStorage.setItem(storageKey,JSON.stringify({current:current?.id,positions,speed,volume:audio.volume,sortOrder:sort,playMode:({repeat:'list',random:'shuffle'})[mode]||mode,reading}));} catch (_) {}
  }
  function resetShuffle() {shuffleBag=[];shuffleHistory=current?[current.id]:[];shuffleCursor=current?0:-1;}
  function adoptQueue(items) {const ids=items.map(t=>t.id);if(!current||ids.includes(current.id)){queue=ids;resetShuffle();}updateQueue();}
  function render() {
    const items=eligible();$('list-name').textContent=query?'搜索结果':category==='letter'?'letter 💌合集':category==='story'?'故事合集':'全部内容';
    $('count').textContent=items.length+' 篇';$('tracks').replaceChildren();$('empty').hidden=items.length>0;$('clear').hidden=!query;
    for(const t of items) {
      const row=document.createElement('button');row.type='button';row.className='track-row';row.dataset.track=t.id;
      row.setAttribute('aria-label','播放《'+t.title+'》');
      const art=document.createElement('span');art.className='track-art '+(t.category==='letter'?'is-letter':'tone-'+t.sequence%5);art.setAttribute('aria-hidden','true');
      art.innerHTML=t.category==='letter'?icon('letter'):String(t.sequence).padStart(2,'0');
      const info=document.createElement('span');info.className='track-info';
      const name=document.createElement('span');name.className='track-name';const title=document.createElement('span');title.className='track-title';title.textContent=t.title;name.append(title);if(isNew(t))name.append(badge());
      const meta=document.createElement('time');meta.className='track-meta';meta.dateTime=t.fileTimestamp;meta.textContent=date(t);
      info.append(name,meta);const length=document.createElement('span');length.className='track-length';length.textContent=format(Math.round(t.duration));
      row.append(art,info,length);const item=document.createElement('div');item.setAttribute('role','listitem');item.append(row);$('tracks').append(item);
      row.addEventListener('click',() => {queue=items.map(x=>x.id);select(t);resetShuffle();openPlayer();play();});
    }
    updateRows();
  }
  function updateRows() {
    document.querySelectorAll('.track-row').forEach(row => {
      const t=tracks.find(t=>t.id===row.dataset.track);const selected=t.id===current?.id;
      if(selected)row.setAttribute('aria-current','true');else row.removeAttribute('aria-current');
      const art=row.querySelector('.track-art');
      art.innerHTML=t.category==='letter'?icon('letter'):String(t.sequence).padStart(2,'0');
      if(selected&&!audio.paused)art.insertAdjacentHTML('beforeend','<span class="cover-playing" aria-hidden="true"><i></i><i></i><i></i></span>');
    });
  }
  function titleFor(id) {$(id).textContent=current.title;if(isNew(current))$(id).append(badge());}
  function renderReader() {
    reader.replaceChildren();cueElements=[];activeCue=-1;let previous,paragraph;
    for(const [i,cue] of (current.cues||[]).entries()) {
      if(cue.paragraph!==previous||!paragraph){paragraph=document.createElement('div');paragraph.className='reader-paragraph'+(cue.style==='note'?' reader-note':'');reader.append(paragraph);previous=cue.paragraph;}
      const line=document.createElement('button');line.type='button';line.className='reader-cue'+(cue.style==='closing'?' closing-cue':'');line.textContent=cue.text;line.dataset.cue=i;
      line.setAttribute('aria-label',format(cue.start)+'，'+cue.text+'，从这里播放');
      line.addEventListener('click',() => {seekTo(cue.start);if(reading==='immersive')following=true;updateFollow();play();});paragraph.append(line);cueElements.push(line);
    }
    reader.scrollTop=0;
  }
  function scrollCurrent(smooth=true) {
    const line=cueElements[activeCue];if(!line||!player.open)return;
    const center=reading==='full'?reader.clientHeight*.25:reader.clientHeight*.5;
    const top=line.getBoundingClientRect().top-reader.getBoundingClientRect().top+reader.scrollTop+line.offsetHeight/2-center;
    reader.scrollTo({top:Math.max(0,top),behavior:motion.matches||!smooth?'auto':'smooth'});
  }
  function refreshReader(t,force=false) {
    const cues=current?.cues||[];let lo=0,hi=cues.length-1,index=0;
    while(lo<=hi){const mid=(lo+hi)>>1;if(cues[mid].start<=t+.03){index=mid;lo=mid+1;}else hi=mid-1;}
    if(index!==activeCue||force){cueElements[activeCue]?.classList.remove('active');cueElements[activeCue]?.removeAttribute('aria-current');activeCue=index;const line=cueElements[index];if(line){line.classList.add('active');line.setAttribute('aria-current','true');if(following||force)scrollCurrent(!force);}}
  }
  function updateFollow() {$('reader-follow').textContent=following?'跟随播放':'回到当前';$('reader-follow').setAttribute('aria-pressed',String(following));}
  function setReading(next) {reading=next;following=next==='immersive';player.dataset.reading=next;document.querySelectorAll('button[data-reading]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reading===next)));updateFollow();requestAnimationFrame(()=>refreshReader(playbackPosition(),true));persist();}
  function updateCurrent() {
    renderReader();for(const id of ['mini-title','now-title','player-title'])titleFor(id);
    const mark=String(current.sequence).padStart(2,'0');$('mini-cover').innerHTML=current.category==='letter'?icon('letter'):mark;$('player-mark').innerHTML=current.category==='letter'?icon('letter'):mark;
    $('now-meta').textContent=(current.category==='letter'?'letter':'故事')+' '+mark+' · '+format(Math.round(current.duration));
    $('player-category').textContent=current.category==='letter'?'letter 💌合集':'故事合集 · '+mark;$('player-date').textContent=date(current);
    if('mediaSession' in navigator && 'MediaMetadata' in window)navigator.mediaSession.metadata=new MediaMetadata({title:current.title,artist:'迷湖公主的蛋糕城堡',album:current.category==='letter'?'letter 💌合集':'故事合集'});
    updateProgress();updateRows();updateQueue();
  }
  function updateProgress() {
    if(!current)return;const t=playbackPosition(),total=duration(),progress=total?t/total*100:0;
    for(const p of ['desktop','player']){const seek=$(p+'-seek');seek.max=total;seek.value=t;seek.style.setProperty('--progress',progress+'%');seek.setAttribute('aria-valuetext',format(t)+'，共 '+format(Math.round(total)));}
    for(const p of ['now','player']){$(p+'-elapsed').textContent=format(t);$(p+'-duration').textContent=format(Math.round(total));}
    $('mini-detail').textContent=(current.category==='letter'?'letter':'故事')+' '+String(current.sequence).padStart(2,'0')+' · '+(audio.paused?'继续听':'正在播放');$('mini-progress').style.width=progress+'%';refreshReader(t);
  }
  function updatePlay() {
    const playing=!audio.paused&&!audio.ended;document.body.classList.toggle('is-playing',playing);
    for(const id of ['play','player-play']){$(id).innerHTML=icon(playing?'pause':'play');$(id).setAttribute('aria-label',playing?'暂停音频':'播放音频');}
    if('mediaSession' in navigator)navigator.mediaSession.playbackState=playing?'playing':'paused';updateProgress();updateRows();
  }
  function select(t,reset=false) {
    if(current?.id===t.id&&!reset)return;
    if(current){persist();audio.pause();}current=t;
    const remembered=reset?0:Number(positions[t.id])||0;position=remembered>=t.duration-2?0:Math.max(0,Math.min(remembered,t.duration));pendingSeek=position;
    if(!queue.includes(t.id))queue=eligible().map(t=>t.id);audio.src=t.audio;audio.load();audio.playbackRate=speed;updateCurrent();updatePlay();
    if(player.open&&location.hash.startsWith('#listen='))history.replaceState(history.state,'','#listen='+encodeURIComponent(current.id));persist();
  }
  function seekTo(t) {
    position=Math.max(0,Math.min(duration(),Number(t)||0));if(ready()){pendingSeek=null;audio.currentTime=position;}else pendingSeek=position;
    updateProgress();refreshReader(position,true);persist();
  }
  async function play() {
    const requested=current.id;$('toast').hidden=true;
    if(audio.error){position=playbackPosition();pendingSeek=position;audio.load();}else if(audio.ended)seekTo(0);
    try{await audio.play();}catch(e){if(e.name!=='AbortError'&&requested===current.id)notify('音频暂时无法播放，请再点一次播放。');}
  }
  function togglePlay() {if(audio.paused)play();else audio.pause();}
  function updateQueue() {
    const i=queue.indexOf(current?.id),short=queue.length<2;
    $('prev').disabled=short||(mode==='sequential'&&i===0)||(mode==='random'&&shuffleCursor<=0);
    for(const id of ['next','player-next'])$(id).disabled=short||(mode==='sequential'&&i===queue.length-1);
  }
  function next(delta=1,ended=false) {
    if(!queue.length)return;let id;
    if(ended&&mode==='single'){seekTo(0);play();return;}
    if(mode==='random') {
      if(delta<0){if(shuffleCursor<=0)return;id=shuffleHistory[--shuffleCursor];}
      else if(shuffleCursor<shuffleHistory.length-1)id=shuffleHistory[++shuffleCursor];
      else {
        shuffleBag=shuffleBag.filter(x=>queue.includes(x)&&x!==current.id);
        if(!shuffleBag.length){shuffleBag=queue.filter(x=>x!==current.id);for(let j=shuffleBag.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[shuffleBag[j],shuffleBag[k]]=[shuffleBag[k],shuffleBag[j]];}}
        id=shuffleBag.pop()||current.id;shuffleHistory=shuffleHistory.slice(0,shuffleCursor+1);shuffleHistory.push(id);shuffleCursor=shuffleHistory.length-1;
      }
    }else {
      const i=queue.indexOf(current.id),j=i+delta;if(mode==='sequential'&&(j<0||j>=queue.length))return;id=queue[(j+queue.length)%queue.length];
    }
    const t=tracks.find(t=>t.id===id);if(t){select(t,ended);updateQueue();play();}
  }
  function openPlayer(push=true) {
    if(!player.open){if(push&&!location.hash.startsWith('#listen='))history.pushState({castlePlayer:true},'','#listen='+encodeURIComponent(current.id));showDialog(player);document.body.classList.add('player-open');}
    requestAnimationFrame(()=>refreshReader(playbackPosition(),true));
  }
  async function shareCurrentStory() {
    if(!current)return;
    const url=new URL('share/'+encodeURIComponent(current.id)+'/',document.baseURI).href;
    const excerpt=(current.cues||[]).slice(0,3).map(c=>c.text).join('').slice(0,150);
    if(navigator.share&&!/MicroMessenger/i.test(navigator.userAgent)) {
      try {await navigator.share({title:current.title,text:excerpt,url});return;}
      catch(e) {if(e.name==='AbortError')return;}
    }
    let copied=false;
    try {await navigator.clipboard.writeText(url);copied=true;} catch (_) {}
    if(!copied) {
      const field=document.createElement('textarea');field.value=url;field.setAttribute('readonly','');field.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';document.body.append(field);field.select();
      try {copied=document.execCommand('copy');} catch (_) {} field.remove();
    }
    notify(copied?'这篇内容的专属链接已复制，可以发给朋友了。':'请复制这个故事链接：'+url);
  }
  $('share-story').addEventListener('click',shareCurrentStory);
  player.addEventListener('close',() => {
    document.body.classList.remove('player-open');if(closingFromHistory){closingFromHistory=false;return;}
    if(location.hash.startsWith('#listen=')){if(history.state?.castlePlayer)history.back();else history.replaceState(null,'',location.pathname+location.search);}
  });
  function linkedTrack() {try{return tracks.find(t=>t.id===decodeURIComponent(location.hash.replace(/^#listen=/,'')));}catch(_){return null;}}
  window.addEventListener('popstate',() => {const t=location.hash.startsWith('#listen=')?linkedTrack():null;if(t){select(t);openPlayer(false);}else if(player.open){closingFromHistory=true;player.close();}});
  audio.addEventListener('loadedmetadata',() => {if(!ready())return;if(pendingSeek!==null){audio.currentTime=Math.min(pendingSeek,Math.max(0,audio.duration-.05));pendingSeek=null;}audio.playbackRate=speed;updateProgress();refreshReader(audio.currentTime,true);});
  audio.addEventListener('play',updatePlay);audio.addEventListener('pause',() => {updatePlay();persist();});
  audio.addEventListener('timeupdate',() => {updateProgress();if(Date.now()-lastSave>4000){persist();lastSave=Date.now();}if('mediaSession' in navigator&&navigator.mediaSession.setPositionState&&ready())try{navigator.mediaSession.setPositionState({duration:audio.duration,position:audio.currentTime,playbackRate:audio.playbackRate});}catch(_){} });
  audio.addEventListener('error',() => {if(current)notify('音频加载失败，请点击播放重试。');});audio.addEventListener('ended',() => {positions[current.id]=0;updatePlay();next(1,true);});
  for(const id of ['play','player-play'])$(id).addEventListener('click',togglePlay);
  for(const id of ['next','player-next'])$(id).addEventListener('click',()=>next());$('prev').addEventListener('click',()=>next(-1));
  $('rewind').addEventListener('click',()=>seekTo(playbackPosition()-15));$('forward').addEventListener('click',()=>seekTo(playbackPosition()+15));
  for(const id of ['desktop-seek','player-seek'])$(id).addEventListener('input',e=>seekTo(e.target.value));
  // Scene replies are explicit taps; start playback in the same user gesture.
  window.addEventListener('castle-play-request',() => {
    if(current&&!audio.paused&&!audio.ended){openPlayer();return;}
    const stories=tracks.filter(t=>t.category==='story').sort((a,b)=>Date.parse(b.fileTimestamp)-Date.parse(a.fileTimestamp));
    if(!stories.length)return;
    if(current?.category!=='story')select(stories[0]);
    queue=stories.map(t=>t.id);resetShuffle();updateQueue();openPlayer();play();
  });
  $('play-all').addEventListener('click',() => {const items=eligible();if(!items.length)return;queue=items.map(t=>t.id);mode='sequential';select(items[0],true);resetShuffle();updateMode();openPlayer();play();});
  $('shuffle-all').addEventListener('click',() => {const items=eligible();if(!items.length)return;queue=items.map(t=>t.id);mode='random';select(items[Math.floor(Math.random()*items.length)]);resetShuffle();updateMode();openPlayer();play();});
  $('open-player').addEventListener('click',()=>openPlayer());
  for(const id of ['open-queue','player-queue'])$(id).addEventListener('click',()=>{const reveal=()=>$('section-title').scrollIntoView({behavior:motion.matches?'auto':'smooth'});if(player.open){player.addEventListener('close',()=>requestAnimationFrame(reveal),{once:true});player.close();}else reveal();});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
  document.querySelectorAll('.sheet').forEach(sheet=>sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom||e.clientX<r.left||e.clientX>r.right)sheet.close();}}));
  function showSheet(id,opener) {showDialog($(id));opener.setAttribute('aria-expanded','true');}
  for(const [button,sheet] of [['sort','sort-sheet'],['speed','speed-sheet'],['mode','mode-sheet'],['volume-button','volume-sheet']]){$(button).addEventListener('click',()=>showSheet(sheet,$(button)));$(sheet).addEventListener('close',()=>{$(button).setAttribute('aria-expanded','false');$(button).focus({preventScroll:true});});}
  function updateSort() {const labels={newest:'最新在前',oldest:'最早在前',sequence:'按编号'};$('sort').innerHTML='<span>'+labels[sort]+'</span>'+icon('down');document.querySelectorAll('[data-sort]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sort===sort)));}
  document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{sort=b.dataset.sort;updateSort();render();adoptQueue(eligible());persist();$('sort-sheet').close();}));
  function updateSpeed() {audio.defaultPlaybackRate=speed;audio.playbackRate=speed;$('speed').innerHTML=icon('speed')+'<span class="option-label">倍速 '+speed+'×</span>';$('speed').setAttribute('aria-label','播放速度 '+speed+' 倍，点击选择');document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===speed)));}
  document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>{speed=Number(b.dataset.speed);updateSpeed();persist();$('speed-sheet').close();}));
  function updateMode() {$('mode').innerHTML=icon(modeIcons[mode])+'<span class="option-label">'+names[mode]+'</span>';$('mode').setAttribute('aria-label','播放模式，当前'+names[mode]);document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));updateQueue();persist();}
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;resetShuffle();updateMode();$('mode-sheet').close();}));
  document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();adoptQueue(eligible());}));
  $('search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render();});$('clear').addEventListener('click',()=>{$('search').value='';query='';render();$('search').focus();});
  audio.volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):1;
  function updateVolume() {$('volume').value=audio.volume;$('volume').style.setProperty('--progress',audio.volume*100+'%');$('volume-value').textContent=Math.round(audio.volume*100)+'%';}
  $('volume').addEventListener('input',e=>{audio.volume=Number(e.target.value);updateVolume();persist();});
  let manualTheme=false;
  function setTheme(theme,remember=false) {document.documentElement.dataset.theme=theme;document.querySelectorAll('button[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===theme)));document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#1d2220':'#faf8f5';if(remember){manualTheme=true;try{localStorage.setItem(themeKey,theme);}catch(_){}}window.dispatchEvent(new Event('theme-change'));}
  let initialTheme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';try{const value=localStorage.getItem(themeKey);if(['light','dark'].includes(value)){initialTheme=value;manualTheme=true;}}catch(_){}
  document.querySelectorAll('button[data-theme]').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.theme,true)));setTheme(initialTheme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',e=>{if(!manualTheme)setTheme(e.matches?'dark':'light');});
  document.querySelectorAll('button[data-reading]').forEach(b=>b.addEventListener('click',()=>setReading(b.dataset.reading)));
  $('reader-follow').addEventListener('click',()=>{following=!following;updateFollow();if(following)scrollCurrent();});
  for(const name of ['wheel','touchmove'])reader.addEventListener(name,()=>{if(following){following=false;updateFollow();}},{passive:true});
  reader.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key)){following=false;updateFollow();}});
  new ResizeObserver(()=>{if(player.open&&following)scrollCurrent(false);}).observe(reader);
  ['gesturestart','gesturechange','gestureend'].forEach(name=>document.addEventListener(name,e=>e.preventDefault(),{passive:false}));
  document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});document.addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault();},{passive:false});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['+','-','=','0'].includes(e.key)){e.preventDefault();return;}if(['INPUT','BUTTON','TEXTAREA'].includes(document.activeElement?.tagName)||document.querySelector('.sheet[open]'))return;if(e.code==='Space'){e.preventDefault();togglePlay();}if(e.key==='ArrowLeft'){e.preventDefault();seekTo(playbackPosition()-15);}if(e.key==='ArrowRight'){e.preventDefault();seekTo(playbackPosition()+15);}});
  if('mediaSession' in navigator)Object.entries({play,pause:()=>audio.pause(),previoustrack:()=>next(-1),nexttrack:()=>next(),seekto:e=>seekTo(e.seekTime),seekbackward:e=>seekTo(playbackPosition()-(e.seekOffset||15)),seekforward:e=>seekTo(playbackPosition()+(e.seekOffset||15))}).forEach(([name,fn])=>{try{navigator.mediaSession.setActionHandler(name,fn);}catch(_){}});
  function refreshFreshness() {
    // Update badges without replacing rows or disturbing focus and scroll position.
    document.querySelectorAll('.track-row').forEach(row=>{
      const track=tracks.find(t=>t.id===row.dataset.track),name=row.querySelector('.track-name'),existing=name.querySelector('.new-badge');
      if(isNew(track)){if(!existing)name.append(badge());}else existing?.remove();
    });
    if(current)for(const id of ['mini-title','now-title','player-title'])titleFor(id);
    clearTimeout(badgeTimer);
    const now=Date.now(),changes=tracks.flatMap(t=>{const uploaded=Date.parse(t.publishedAt);return [uploaded,uploaded+RECENT_UPLOAD_MS];}).filter(time=>Number.isFinite(time)&&time>now);
    if(changes.length)badgeTimer=setTimeout(refreshFreshness,Math.max(1,Math.min(...changes)-now+10));
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();else refreshFreshness();});window.addEventListener('pagehide',persist);
  const letters=tracks.filter(t=>t.category==='letter').length,stories=tracks.length-letters,minutes=Math.round(tracks.reduce((sum,t)=>sum+t.duration,0)/60);
  document.querySelector('.album-caption>span').textContent=letters+' 封信件 · '+stories+' 个故事';$('total-duration').textContent=Math.floor(minutes/60)+' 小时 '+minutes%60+' 分钟';
  document.querySelectorAll('[data-category]>span').forEach(span=>span.textContent=span.parentElement.dataset.category==='all'?tracks.length:span.parentElement.dataset.category==='letter'?letters:stories);
  queue=eligible().map(t=>t.id);const linked=location.hash.startsWith('#listen=')?linkedTrack():null,shared=sharedStoryId?tracks.find(t=>t.id===sharedStoryId):null;
  select(linked||shared||tracks.find(t=>t.id===saved.current)||eligible()[0]);resetShuffle();updateSort();updateSpeed();updateVolume();setReading(reading);render();updateMode();updatePlay();refreshFreshness();if(linked||shared)openPlayer(false);
})();
