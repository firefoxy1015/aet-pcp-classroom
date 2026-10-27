export const STORAGE_KEY='aet-pcp-study-v1';
export function emptyState(){return {schema:1,completed:[],bookmarks:[],notes:{},practice:{},last:null};}
export function normalizeState(input,lessons){
 const state=emptyState();if(!input||input.schema!==1)return state;
 const map=new Map(lessons.map(l=>[l.id,l]));
 state.completed=[...new Set(Array.isArray(input.completed)?input.completed:[])].filter(id=>map.has(id));
 state.bookmarks=(Array.isArray(input.bookmarks)?input.bookmarks:[]).filter(b=>b&&map.has(b.lesson)&&Number.isInteger(b.slide)&&b.slide>=1&&b.slide<=map.get(b.lesson).slides.length).filter((b,i,all)=>all.findIndex(x=>x.lesson===b.lesson&&x.slide===b.slide)===i).slice(0,1000).map(b=>({lesson:b.lesson,slide:b.slide}));
 for(const [id,text]of Object.entries(input.notes||{}))if(map.has(id)&&typeof text==='string')Object.defineProperty(state.notes,id,{value:text.slice(0,4000),enumerable:true,writable:true,configurable:true});
 const keys=new Set(lessons.flatMap(l=>l.practice.map(p=>`${l.id}/${p.id}`)));
 for(const [key,value]of Object.entries(input.practice||{}))if(keys.has(key)&&['known','review'].includes(value))Object.defineProperty(state.practice,key,{value,enumerable:true,writable:true,configurable:true});
 if(input.last&&map.has(input.last.lesson)&&Number.isInteger(input.last.slide)&&input.last.slide>=1&&input.last.slide<=map.get(input.last.lesson).slides.length)state.last={lesson:input.last.lesson,slide:input.last.slide};
 return state;
}
export function toggleComplete(state,id){return {...state,completed:state.completed.includes(id)?state.completed.filter(x=>x!==id):[...state.completed,id]};}
export function toggleBookmark(state,lesson,slide){const exists=state.bookmarks.some(b=>b.lesson===lesson&&b.slide===slide);return {...state,bookmarks:exists?state.bookmarks.filter(b=>b.lesson!==lesson||b.slide!==slide):[...state.bookmarks,{lesson,slide}]};}
export function weekProgress(state,lessons,week){const rows=lessons.filter(l=>l.week===week);return {done:rows.filter(l=>state.completed.includes(l.id)).length,total:rows.length};}
export function searchRecords(lessons){return lessons.flatMap(l=>[
 ...l.slides.map((s,i)=>({lesson:l.id,week:l.week,slide:i+1,title:s.title,text:[l.title,l.titleZh,s.title,...s.segments.flatMap(p=>[p.en,p.zh])].join('\n')})),
 ...l.reading.map(r=>({lesson:l.id,week:l.week,slide:1,reader:r.id,title:r.title,text:[l.title,r.title,r.titleZh,...r.pairs.flat()].join('\n')}))
 ].map(r=>({...r,lower:r.text.toLocaleLowerCase()})));}
export function search(records,query,limit=20){const q=query.trim().toLocaleLowerCase();if(q.length<2)return {count:0,rows:[]};const found=records.filter(r=>r.lower.includes(q));return {count:found.length,rows:found.slice(0,limit).map(r=>{const i=r.lower.indexOf(q);return {...r,snippet:r.text.slice(Math.max(0,i-45),i+120).replace(/\n/g,' ')};})};}
