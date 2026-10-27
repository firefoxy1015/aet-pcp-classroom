import {STORAGE_KEY,emptyState,normalizeState,toggleComplete,toggleBookmark,weekProgress,searchRecords,search} from './study-state.mjs';
const course=window.AET_COURSE;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=emptyState(),storageAvailable=true;
try{state=normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)),course.lessons);}catch{storageAvailable=false;}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{storageAvailable=false;$('storage-message').textContent='Browser storage unavailable; export a backup before leaving. 浏览器无法保存，请导出备份。';}}
function current(){const h=new URLSearchParams(location.hash.slice(1));const lesson=course.lessons.find(l=>l.id===h.get('lesson'))||course.lessons[0];return {lesson,slide:Math.max(1,Math.min(lesson.slides.length,Number(h.get('slide'))||1))};}
const panel=document.createElement('section');panel.className='study-hub';panel.setAttribute('aria-label','Study tools');
panel.innerHTML=`<div class="hub-heading"><div><p class="hub-kicker">YOUR WEEKLY CLASSROOM</p><h2>每周课堂 · Learn, practise, remember</h2></div><div class="progress-total"><strong id="overall-progress"></strong><small>仅个人学习记录 · Not school credit</small></div></div><progress id="overall-bar" max="${course.lessons.length}" value="0" aria-label="Personal course progress"></progress><div class="hub-navigation"><label>周末 / Weekend<select id="week-picker"><option value="0">全部课程 / All weeks</option>${Array.from({length:17},(_,i)=>`<option value="${i+1}">Week ${i+1}</option>`).join('')}</select></label><button id="resume-study" type="button">继续上次 / Resume</button><button id="export-study" type="button">导出记录 / Export</button><label class="import-study">导入记录 / Import<input id="import-study" type="file" accept="application/json,.json"></label></div><label class="search-label" for="course-search">搜索课件与中英阅读 / Search lessons and readings</label><input id="course-search" type="search" placeholder="例如：CPAP、同意、ECG…" autocomplete="off"><p id="search-summary" role="status"></p><div id="search-results"></div><p id="storage-message">网页公开；学习记录、书签及笔记仅保存在此浏览器，不上传。不要填写真实患者信息。</p><details class="bookmark-panel"><summary>我的书签 / My bookmarks <span id="bookmark-count"></span></summary><div id="bookmark-list"></div></details>`;
document.querySelector('main').prepend(panel);
const tools=document.createElement('div');tools.className='lesson-study-tools';tools.innerHTML='<button id="complete-lesson" type="button"></button><button id="bookmark-slide" type="button"></button><span id="week-study-progress"></span>';$('lecture').before(tools);
const notes=document.createElement('details');notes.className='study-notes';notes.innerHTML='<summary>本讲笔记 / My lecture notes</summary><label for="lesson-note">仅保存在此浏览器，不填写患者信息。4000 characters maximum.</label><textarea id="lesson-note" maxlength="4000" rows="5" placeholder="用自己的话解释：为什么这样做？什么时候改变方案？"></textarea><p id="note-status" role="status"></p>';$('practice').before(notes);
let selectedLesson='',searchIndex=null,searchTimer;
function remember(){const {lesson,slide}=current();state.last={lesson:lesson.id,slide};save();}
function applyWeek(){const selected=Number($('week-picker').value);document.querySelectorAll('#lessons button[data-lesson]').forEach(b=>{b.hidden=!!selected&&course.lessons[Number(b.dataset.lesson)].week!==selected;});document.querySelectorAll('#lessons .eyebrow').forEach(p=>{p.hidden=!!selected&&!p.innerText.endsWith(String(selected).padStart(2,'0'));});}
function renderBookmarks(){$('bookmark-count').textContent=`(${state.bookmarks.length})`;$('bookmark-list').innerHTML=state.bookmarks.length?state.bookmarks.map(b=>{const l=course.lessons.find(l=>l.id===b.lesson);return `<a href="#lesson=${encodeURIComponent(b.lesson)}&slide=${b.slide}">W${l.week} · ${esc(l.title)}<small>${b.slide}. ${esc(l.slides[b.slide-1].title)}</small></a>`;}).join(''):'暂无书签 / No bookmarks yet.';}
function sync(){
 const {lesson,slide}=current(),done=state.completed.includes(lesson.id),bookmarked=state.bookmarks.some(b=>b.lesson===lesson.id&&b.slide===slide),wp=weekProgress(state,course.lessons,lesson.week);
 $('overall-progress').textContent=`${state.completed.length} / ${course.lessons.length} 讲`;$('overall-bar').value=state.completed.length;
 $('complete-lesson').textContent=done?'✓ 已学完 / Mark unfinished':'标记本讲学完 / Mark complete';$('complete-lesson').setAttribute('aria-pressed',String(done));
 $('bookmark-slide').textContent=bookmarked?'★ 已收藏此页 / Remove bookmark':'☆ 收藏此页 / Bookmark';$('bookmark-slide').setAttribute('aria-pressed',String(bookmarked));
 $('week-study-progress').textContent=`Week ${lesson.week} · ${wp.done}/${wp.total} 讲已学`;
 $('resume-study').disabled=!state.last;
 if(selectedLesson!==lesson.id){selectedLesson=lesson.id;$('lesson-note').value=state.notes[lesson.id]||'';$('note-status').textContent='';}
 for(const detail of $('practice').querySelectorAll('details[data-practice]')){
  const key=`${lesson.id}/${detail.dataset.practice}`;let rating=detail.querySelector('.self-rating');
  if(!rating){rating=document.createElement('div');rating.className='self-rating';rating.innerHTML='<span>自评 / Self-check:</span><button type="button" data-rating="known">已掌握 / Got it</button><button type="button" data-rating="review">需复习 / Review</button>';detail.append(rating);}
  rating.dataset.key=key;for(const b of rating.querySelectorAll('button'))b.setAttribute('aria-pressed',String(state.practice[key]===b.dataset.rating));
 }
 applyWeek();renderBookmarks();
}
$('complete-lesson').addEventListener('click',()=>{state=toggleComplete(state,current().lesson.id);remember();sync();});
$('bookmark-slide').addEventListener('click',()=>{const {lesson,slide}=current();state=toggleBookmark(state,lesson.id,slide);save();sync();});
$('week-picker').addEventListener('change',()=>{applyWeek();const b=document.querySelector('#lessons button[data-lesson]:not([hidden])');if(b)b.click();});
$('resume-study').addEventListener('click',()=>{if(!state.last)return;const last={...state.last};$('week-picker').value='0';location.hash=`lesson=${encodeURIComponent(last.lesson)}&slide=${last.slide}`;});
$('lesson-note').addEventListener('input',()=>{state.notes[current().lesson.id]=$('lesson-note').value;save();$('note-status').textContent=storageAvailable?'已自动保存在此浏览器 / Saved in this browser':'无法自动保存，请导出 / Export a backup';});
$('practice').addEventListener('click',e=>{const b=e.target.closest('[data-rating]');if(!b)return;state.practice[b.closest('.self-rating').dataset.key]=b.dataset.rating;save();sync();});
$('export-study').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`aet-study-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('import-study').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw new Error('File too large');const parsed=JSON.parse(await file.text());if(parsed.schema!==1)throw new Error('Unrecognized format');state=normalizeState(parsed,course.lessons);save();selectedLesson='';sync();$('storage-message').textContent='学习记录已导入，仅保存在此浏览器。Imported locally.';}catch{$('storage-message').textContent='无法导入：请选择本网站导出的学习记录JSON。Import failed.';}e.target.value='';});
$('course-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{
 const query=$('course-search').value;if(query.trim().length<2){$('search-results').replaceChildren();$('search-summary').textContent='';return;}
 searchIndex??=searchRecords(course.lessons);const result=search(searchIndex,query);$('search-summary').textContent=`${result.count} 个匹配 / matches${result.count>20?' · 显示前20项':''}`;
 $('search-results').innerHTML=result.rows.map((r,i)=>`<button type="button" data-search-result="${i}"><strong>W${r.week} · ${esc(r.title)}</strong><span>${esc(r.snippet)}</span></button>`).join('');$('search-results').onclick=e=>{const b=e.target.closest('[data-search-result]');if(!b)return;const r=result.rows[Number(b.dataset.searchResult)];$('week-picker').value='0';location.hash=`lesson=${encodeURIComponent(r.lesson)}&slide=${r.slide}`;$('course-search').value='';$('search-results').replaceChildren();$('search-summary').textContent='';if(r.reader)requestAnimationFrame(()=>{if(!document.body.classList.contains('reading-on'))$('reading-mode').click();requestAnimationFrame(()=>document.getElementById(`reading-${r.reader}`)?.scrollIntoView({block:'start'}));});};
 },150);});
new MutationObserver(sync).observe($('lecture'),{childList:true});new MutationObserver(sync).observe($('slide-title'),{childList:true});
document.addEventListener('click',e=>{if(e.target.closest('#lessons [data-lesson],#previous,#next,#segment-buttons button'))queueMicrotask(remember);});
$('audio').addEventListener('play',remember);window.addEventListener('hashchange',()=>{remember();sync();});
sync();
