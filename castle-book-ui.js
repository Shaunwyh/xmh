import {showDialog} from './castle-dialogs.js?v=castle-26';
import {clockState} from './castle-clock.js?v=castle-26';
import {BOOKS,SPREADS,startOfBook} from './castle-book-stories.js?v=castle-26';

const card=document.getElementById('album-art'),sheet=document.getElementById('book-library');
const storageKey='castle-book-reading-v1';
let saved={selected:BOOKS[0].id,positions:{}};
try{const value=JSON.parse(localStorage.getItem(storageKey));if(value&&BOOKS.some(b=>b.id===value.selected)){saved.selected=value.selected;saved.positions=value.positions||{};}}catch{}
const savedPage=id=>{const b=BOOKS.find(b=>b.id===id),p=Number(saved.positions[id]);return Number.isInteger(p)?Math.max(0,Math.min(b.pages.length-1,p)):0;};
let bedtime=clockState().isBedtime;
export const initialChapter=startOfBook(saved.selected);
let index=initialChapter;
const pageButtons=document.getElementById('book-page-dots');
for(let i=0;i<4;i++){
  const button=document.createElement('button');button.type='button';button.dataset.page=String(i);button.setAttribute('aria-label',`第${i+1}页`);
  button.addEventListener('click',()=>request(startOfBook(SPREADS[index].bookId)+i));pageButtons.append(button);
}
const covers=document.getElementById('book-library-list');
for(const [i,book] of BOOKS.entries()){
  const entry=document.createElement('div');entry.className='story-cover-entry';
  const button=document.createElement('button');button.className=`story-cover tone-${book.tone}`;button.type='button';button.dataset.book=book.id;
  const illustration=document.createElement('span');illustration.className='story-cover-art';
  const image=document.createElement('img');image.src=`assets/storybook/cover-${book.id}.webp`;image.alt='';image.loading='lazy';illustration.append(image);
  const number=document.createElement('span');number.className='story-cover-number';number.textContent=String(i+1).padStart(2,'0');illustration.append(number);
  const title=document.createElement('strong');title.textContent=book.title;
  const summary=document.createElement('span');summary.className='story-cover-summary';summary.textContent=book.summary;
  const progress=document.createElement('span');progress.className='story-cover-progress';
  const resume=document.createElement('button');resume.className='story-resume';resume.type='button';resume.dataset.resume=book.id;resume.hidden=true;
  button.append(illustration,title,summary,progress);entry.append(button,resume);covers.append(entry);
  button.addEventListener('click',()=>{if(request(startOfBook(book.id),true))sheet.close();});
  resume.addEventListener('click',()=>{if(request(startOfBook(book.id)+savedPage(book.id),true))sheet.close();});
}
function request(target,switchStory=false){
  if(window.castleStorybook?.state.busy)return false;
  window.dispatchEvent(new CustomEvent('book-request',{detail:{target,switchStory}}));return true;
}
function renderLibrary(){
  document.querySelectorAll('.story-cover[data-book]').forEach(button=>{
    const id=button.dataset.book,book=BOOKS.find(b=>b.id===id),p=savedPage(id);
    button.setAttribute('aria-pressed',String(id===SPREADS[index].bookId));
    button.querySelector('.story-cover-progress').textContent=id===SPREADS[index].bookId?`正在读 · 第 ${SPREADS[index].pageIndex+1} / ${book.pages.length} 页`:`从第一幕开始 · ${book.pages.length} 页`;
    const resume=button.parentElement.querySelector('.story-resume');resume.hidden=p===0||(id===SPREADS[index].bookId&&p===SPREADS[index].pageIndex);resume.textContent=`继续上次 · 第 ${p+1} 页 →`;resume.setAttribute('aria-label',`${book.title}，继续上次读到的第${p+1}页`);
  });
}
function renderChapter(next,{remember=true}={}){
  index=next;const page=SPREADS[index],book=BOOKS[page.bookIndex],isEnd=page.pageIndex===book.pages.length-1;
  card.dataset.chapter=String(index);card.dataset.book=book.id;
  card.dataset.night=String(document.documentElement.dataset.theme==='dark'||bedtime||page.night===true);
  document.getElementById('book-current-title').textContent=book.title;
  document.getElementById('book-switch').setAttribute('aria-label',`当前故事：${book.title}，切换故事`);
  document.getElementById('chapter-title').textContent=page.title;
  document.getElementById('chapter-description').textContent=page.description;
  document.getElementById('chapter-index').textContent=`${String(page.pageIndex+1).padStart(2,'0')} / ${String(book.pages.length).padStart(2,'0')}`;
  document.getElementById('book-stage').setAttribute('aria-label',`${book.title}，第${page.pageIndex+1}页，共${book.pages.length}页，左右滑动翻页`);
  document.querySelectorAll('[data-page]').forEach(button=>{if(Number(button.dataset.page)===page.pageIndex)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
  document.getElementById('book-previous').disabled=page.pageIndex===0;
  document.getElementById('book-next').disabled=isEnd;
  const end=document.getElementById('book-ending');end.hidden=!isEnd;
  const image=document.getElementById('book-fallback-art');image.src=`assets/storybook/spread-${index}.webp`;image.alt=`${book.title}：${page.title}`;
  const copy=document.querySelector('.book-chapter-copy');copy.classList.remove('changing');requestAnimationFrame(()=>copy.classList.add('changing'));
  saved.selected=book.id;if(remember)saved.positions[book.id]=page.pageIndex;try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}
  renderLibrary();
}
function appearance(){card.dataset.bedtime=String(bedtime);card.dataset.night=String(document.documentElement.dataset.theme==='dark'||bedtime||SPREADS[index].night===true);
  window.dispatchEvent(new CustomEvent('book-appearance',{detail:{night:document.documentElement.dataset.theme==='dark'||bedtime,bedtime}}));}
window.addEventListener('theme-change',appearance);
window.addEventListener('castle-clock-change',event=>{bedtime=event.detail.isBedtime;appearance();});
window.addEventListener('book-chapter',event=>{const changed=index!==event.detail.index;renderChapter(event.detail.index,{remember:changed});if(changed)document.getElementById('gesture-hint').classList.add('used');});
document.getElementById('book-switch').addEventListener('click',()=>{renderLibrary();showDialog(sheet);});
document.getElementById('book-another').addEventListener('click',()=>{renderLibrary();showDialog(sheet);});
document.getElementById('book-restart').addEventListener('click',()=>request(startOfBook(SPREADS[index].bookId)));
document.getElementById('book-previous').addEventListener('click',()=>request(index-1));
document.getElementById('book-next').addEventListener('click',()=>request(index+1));
document.querySelectorAll('[data-book-actor]').forEach(button=>button.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('book-character',{detail:{actor:button.dataset.bookActor}}))));
renderChapter(index,{remember:false});appearance();
