(() => {
  'use strict';
  const course = window.AET_COURSE;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pairs = rows => `<div class="pairs">${rows.map(([en,zh]) => `<div class="pair"><p>${esc(en)}</p><p lang="zh-Hans">${esc(zh)}</p></div>`).join('')}</div>`;
  const figure = s => s.figure ? `<figure class="teaching-figure"><img src="${esc(s.figure.file)}" alt="${esc(s.figure.alt)}"><figcaption>${esc(s.figure.captionEn)}<br><span lang="zh-Hans">${esc(s.figure.captionZh)}</span><br><a class="figure-fullsize" href="${esc(s.figure.file)}" target="_blank" rel="noopener">Open diagram at full size / 查看大图</a></figcaption></figure>` : '';
  const readingNavigation = entries => entries.length ? `<nav class="reading-jumps" aria-label="Reading guide index"><h2>Reading guide index / 阅读目录</h2>${entries.map(r => `<button type="button" data-reading-target="reading-${esc(r.id)}">${esc(r.title)}<small lang="zh-Hans">${esc(r.titleZh)}</small></button>`).join('')}</nav>` : '';
  const readingBody = r => {
    if (!r.sections?.length) return pairs(r.pairs);
    let cursor = 0;
    for (const s of r.sections) {
      if (!Number.isInteger(s.start) || !Number.isInteger(s.end) || s.start < cursor || s.end <= s.start || s.end > r.pairs.length) throw new Error(`Invalid reading section ${r.id}/${s.id}`);
      cursor = s.end;
    }
    const sectionId = s => `reading-${r.id}-round-${s.id}`;
    let end = 0;
    const body = r.sections.map((s, i) => {
      const before = pairs(r.pairs.slice(end, s.start));
      end = s.end;
      return `${before}<section class="reading-round" id="${esc(sectionId(s))}"><h4>${i+1}. ${esc(s.title)}<span lang="zh-Hans">${esc(s.titleZh)}</span></h4>${s.codes?.length ? `<p class="muted">${s.codes.map(esc).join(' · ')}</p>` : ''}${pairs(r.pairs.slice(s.start, s.end))}<button class="round-top" type="button" data-reading-target="reading-${esc(r.id)}-round-index">Back to rounds / 返回轮次目录</button></section>`;
    }).join('');
    return `<details class="reading-round-index" id="reading-${esc(r.id)}-round-index" open><summary>Clinical rounds / 临床轮次 (${r.sections.length})</summary><nav class="reading-jumps" aria-label="${esc(r.title)} clinical rounds">${r.sections.map((s,i) => `<button type="button" data-reading-target="${esc(sectionId(s))}">${i+1}. ${esc(s.title)}<small lang="zh-Hans">${esc(s.titleZh)}</small></button>`).join('')}</nav></details>${body}${pairs(r.pairs.slice(end))}`;
  };
  const audio = $('audio');
  const verifiedReadings = new Set(course.readingCoverage.partial.filter(r => r.status === 'assigned_requirement_verified_with_recorded_source_differences').map(r => r.id));
  const readingNotice = r => !r.assignmentIds?.length ? '' : `<p class="muted">${r.assignmentIds.every(id => verifiedReadings.has(id)) ? 'Assigned requirement reviewed; recorded source/version differences remain visible. / 指定学习要求已核验；保留来源及版本差异。' : 'Source-read bilingual guide; full assigned-requirement review is pending. / 已源读双语讲解；指定学习要求的完整核验待完成。'}</p>`;
  let lessonIndex = 0, slideIndex = 0, segmentIndex = 0, reading = false;
  let pendingSeek = null;
  const lesson = () => course.lessons[lessonIndex];
  const slide = () => lesson().slides[slideIndex];
  const lessonFromHash = () => {
    const h = new URLSearchParams(location.hash.slice(1));
    const i = course.lessons.findIndex(l => l.id === h.get('lesson'));
    lessonIndex = i < 0 ? 0 : i;
    slideIndex = Math.max(0, Math.min(lesson().slides.length - 1, Number(h.get('slide') || 1) - 1));
    if (!Number.isFinite(slideIndex)) slideIndex = 0;
  };
  const writeHash = () => history.replaceState(null, '', `#lesson=${lesson().id}&slide=${slideIndex+1}`);
  function safeSourceLink(source) {
    if (!source.url || !/^https?:\/\//.test(source.url)) return esc(source.title);
    return `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>`;
  }
  const sourceNote = source => `<p>${safeSourceLink(source)}${source.locator ? `<br>${esc(source.locator)}` : ''}${source.checked ? ` · checked ${esc(source.checked)}` : ''}${source.note ? `<br>${esc(source.note)}` : ''}</p>`;
  function renderLesson() {
    audio.pause();
    $('week-label').textContent = `WEEKEND ${String(lesson().week).padStart(2,'0')}`;
    $('week-title').textContent = lesson().week === 1 ? 'Foundations' : lesson().week === 2 ? 'Airway and medication' : `School weekend ${lesson().week}`;
    pendingSeek = null;
    if (lesson().audioReady && lesson().audioTrack) { audio.src = lesson().audioTrack; audio.load(); }
    else { audio.removeAttribute('src'); audio.load(); }
    $('lessons').innerHTML = course.lessons.map((l,i) => `${i===0||course.lessons[i-1].week!==l.week?`<p class="eyebrow">WEEKEND ${String(l.week).padStart(2,'0')}</p>`:''}<button data-lesson="${i}" aria-current="${i===lessonIndex}">${esc(l.title)}<small>${esc(l.subtitle)} · ${l.audioReady ? `${Math.round(l.audioSeconds/60)} min audio` : 'Audio pending'}</small></button>`).join('');
    const nav = $('lessons');
    const selected = nav.querySelector('[aria-current="true"]');
    if (selected && window.matchMedia('(max-width:700px)').matches) {
      nav.scrollLeft = Math.max(0, selected.offsetLeft - nav.offsetLeft - 8);
    }
    $('lecture').innerHTML = `<h1>${esc(lesson().title)}</h1><p>${esc(lesson().subtitle)} · ${esc(lesson().titleZh)}</p>`;
    $('practice').innerHTML = `<h2>Original practice / 原创练习</h2><p class="muted">Answer aloud or in your own notes before opening the reasoning. These are not school exam questions.</p>${lesson().practice.map(p => `<details data-practice="${esc(p.id)}"><summary>${esc(p.promptEn)}<span class="question-zh" lang="zh-Hans">${esc(p.promptZh)}</span></summary><p>${esc(p.answerEn)}</p><p lang="zh-Hans">${esc(p.answerZh)}</p></details>`).join('')}`;
    $('study-reading').innerHTML = `<h2>Full bilingual explanation / 完整中英讲解</h2>${lesson().slides.map((s,i) => `<article class="reading-slide"><small>${i+1} / ${lesson().slides.length}</small><h3>${esc(s.title)}</h3>${figure(s)}${pairs(s.segments.map(p => [p.en,p.zh]))}</article>`).join('')}<h2>Reading integration and planning aids / 阅读整合及规划辅助</h2>${lesson().reading.map(r => `<article class="reading-slide" id="reading-${esc(r.id)}"><h3>${esc(r.title)}</h3><p lang="zh-Hans">${esc(r.titleZh)}</p>${readingNotice(r)}${readingBody(r)}${r.sources?.length?`<details class="reading-source-notes"><summary>Sources and scope / 来源及核读范围</summary>${r.sources.map(id=>sourceNote(course.sources[id])).join('')}</details>`:''}${r.fields ? `<div class="worksheet"><p class="muted">Original blank aid, not the official AET form. Text entered here is not sent to any server. Print or save your own notes before leaving this page.</p>${r.fields.map((f,i) => `<label for="field-${i}">${esc(Array.isArray(f) ? f.join(' / ') : f)}</label><textarea id="field-${i}"></textarea>`).join('')}</div>` : ''}</article>`).join('')}`;
    $('study-reading').insertAdjacentHTML('afterbegin', readingNavigation(lesson().reading));
    $('sources-body').innerHTML = `<h3>School learning goals</h3><ul>${lesson().goals.map(g => `<li>${esc(g.en)}<br><span lang="zh-Hans">${esc(g.zh)}</span></li>`).join('')}</ul><h3>Assigned teaching sections represented</h3><ul>${lesson().sourceSections.map(s => `<li>${s.number}. ${esc(s.title)}</li>`).join('')}</ul><h3>Sources</h3>${lesson().sources.map(id => sourceNote(course.sources[id])).join('')}<h3>Editorial / source cautions</h3><ul>${lesson().reviewNotes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`;
    renderSlide();
  }
  function renderSlide(fromTimeline = false) {
    if (!fromTimeline) audio.pause();
    if (!fromTimeline) segmentIndex = 0;
    const s = slide();
    $('slide-label').textContent = lesson().subtitle;
    $('slide-count').textContent = `${slideIndex+1} / ${lesson().slides.length}`;
    $('slide-title').textContent = s.title;
    $('slide-content').className = s.layout;
    $('slide-content').innerHTML = s.items.map(([label,text],i) => s.layout==='steps' ? `<div class="step"><span class="step-number">${i+1}</span><div><h3>${esc(label)}</h3><p>${esc(text)}</p></div></div>` : `<div class="card"><h3>${esc(label)}</h3><p>${esc(text)}</p></div>`).join('');
    $('slide-figure').innerHTML = figure(s);
    $('teaching-slide').scrollTop = 0;
    $('transcript-body').innerHTML = pairs(s.segments.map(p=>[p.en,p.zh]));
    $('transcript').open = false;
    $('previous').disabled = slideIndex === 0;
    $('next').disabled = slideIndex === lesson().slides.length - 1;
    writeHash();
    if (fromTimeline) showCaption(segmentIndex);
    else setSegment(0, false);
    if (!fromTimeline) window.scrollTo(0, 0);
  }
  function showCaption(index) {
    segmentIndex = index;
    const segment = slide().segments[index];
    $('caption-en').textContent = segment.en;
    $('caption-zh').textContent = segment.zh;
    $('segment-buttons').innerHTML = slide().segments.map((_,i)=>`<button data-segment="${i}" class="${i===index?'active':''}" aria-label="Narration segment ${i+1}" aria-pressed="${i===index}">${i+1}</button>`).join('');
    $('clip-note').textContent = lesson().audioReady && lesson().audioTrack
      ? `Passage ${index+1} / ${slide().segments.length} · Continuous English audio; Chinese subtitles follow measured audio boundaries. AI-generated voice: ${course.voice}.`
      : `Passage ${index+1} / ${slide().segments.length} · Audio assembly pending in this internal build. Captions can be read, but incomplete clips are not presented as a continuous lecture.`;
  }
  function setSegment(index, play) {
    audio.pause();
    showCaption(index);
    const segment = slide().segments[index];
    if (lesson().audioReady && lesson().audioTrack && Number.isFinite(segment.start)) {
      // A deep link can render before the replacement track has metadata.
      pendingSeek = segment.start;
      if (audio.readyState >= 1) audio.currentTime = pendingSeek;
    }
    else { audio.removeAttribute('src'); audio.load(); return; }
    audio.playbackRate = Number($('speed').value);
    if (play) audio.play().catch(()=>{$('clip-note').textContent='Press Play to continue. Browser autoplay permission is required.';});
  }
  function syncTimeline(force = false) {
    if (!lesson().audioReady || !lesson().cues?.length) return;
    if (pendingSeek !== null) {
      // A replacement track can emit reset-time events while its seek is settling.
      if (audio.readyState < 1 || audio.seeking || Math.abs(audio.currentTime - pendingSeek) > 0.05) return;
      pendingSeek = null;
    }
    if (audio.seeking) return;
    const time = audio.currentTime;
    const currentEnd = slide().segments.at(-1).end;
    if (!force && !$('continuous').checked && !audio.paused && !audio.seeking && time >= currentEnd && slideIndex < lesson().slides.length-1) {
      audio.pause();
      audio.currentTime = Math.max(slide().segments[0].start, currentEnd - 0.02);
      showCaption(slide().segments.length-1);
      return;
    }
    // Media seeking may quantize a requested boundary slightly before its cue.
    let cue = lesson().cues[0];
    for (const candidate of lesson().cues) {
      if (candidate.start > time + 0.005) break;
      cue = candidate;
    }
    if (cue.slideIndex!==slideIndex) {
      slideIndex=cue.slideIndex;segmentIndex=cue.segmentIndex;renderSlide(true);
    } else if (cue.segmentIndex!==segmentIndex) showCaption(cue.segmentIndex);
  }
  $('lessons').addEventListener('click',e=>{
    const button=e.target.closest('[data-lesson]');if(!button)return;
    if (document.querySelector('.worksheet textarea') && [...document.querySelectorAll('.worksheet textarea')].some(t=>t.value.trim()) && !confirm('The planning aid has unsaved text. Copy or print it before changing lectures. Leave this lecture?')) return;
    lessonIndex=Number(button.dataset.lesson);slideIndex=0;renderLesson();
  });
  $('segment-buttons').addEventListener('click',e=>{const b=e.target.closest('[data-segment]');if(b)setSegment(Number(b.dataset.segment),false);});
  $('previous').addEventListener('click',()=>{if(slideIndex>0){slideIndex--;renderSlide();}});
  $('next').addEventListener('click',()=>{if(slideIndex<lesson().slides.length-1){slideIndex++;renderSlide();}});
  $('speed').addEventListener('change',()=>{audio.playbackRate=Number($('speed').value);});
  audio.addEventListener('timeupdate',()=>syncTimeline());
  audio.addEventListener('seeked',()=>syncTimeline(true));
  audio.addEventListener('loadedmetadata',()=>{
    audio.playbackRate=Number($('speed').value);
    if (pendingSeek !== null) audio.currentTime = pendingSeek;
  });
  audio.addEventListener('ended',()=>syncTimeline(true));
  audio.addEventListener('error',()=>{$('clip-note').textContent='Audio could not be loaded. Keep the audio folder beside this page; narration may still be pending in this internal build.';});
  $('reading-mode').addEventListener('click',()=>{reading=!reading;audio.pause();document.body.classList.toggle('reading-on',reading);$('study-reading').hidden=!reading;$('reading-mode').textContent=reading?'Return to lecture / 返回课件':'Bilingual reading / 中英对照';window.scrollTo(0,0);});
  $('study-reading').addEventListener('click', e => {const b=e.target.closest('[data-reading-target]');if(b)document.getElementById(b.dataset.readingTarget)?.scrollIntoView({block:'start'});});
  window.addEventListener('hashchange',()=>{lessonFromHash();renderLesson();});
  window.addEventListener('beforeunload',e=>{if([...document.querySelectorAll('.worksheet textarea')].some(t=>t.value.trim())){e.preventDefault();e.returnValue='';}});
  $('status').textContent = course.noticeEn + ' ' + course.noticeZh;
  $('build-label').textContent = course.release ? 'REVIEWED COURSE' : 'INTERNAL PRODUCTION';
  const moduleCoverageLine = (m, reviewed) => {
    const count = m.sourceTeachingSectionCount ?? m.sourceSectionCount;
    const excluded = m.excludedAssessmentSections || [];
    const boundary = excluded.length ? `; separate assessment sections ${excluded.join(', ')} excluded from teaching` : '';
    return `<li>${esc(m.schoolTitle)}: teaching sections ${m.sourceSectionsRepresented.length}/${count} mapped${boundary}; ${reviewed?'review evidence recorded':'internal mapping only'}</li>`;
  };
  $('coverage-body').innerHTML=`<p>All 17 weekends are tracked separately. Module-section mapping and a reading guide do not establish full school-week completion.</p>${course.weekCoverage.map(w=>`<details><summary>Weekend ${w.week}: ${w.lectures.length} lectures; reading guides ${w.readingRowsWithBilingualGuide}/${w.assignedReadingRows}</summary><p>Slides: ${w.slideCount}. Audio: ${w.audioReady?'ready for authored lectures':'not ready / not authored'}. Full-week content review: ${w.weekComplete?'verified against recorded requirements':'pending'}.</p><ul>${w.explicitlyAllocatedModules.map(m=>moduleCoverageLine(m,w.weekComplete)).join('')}</ul>${w.missingReadingGuideIds.length?`<p>Reading guides not yet authored: ${w.missingReadingGuideIds.map(esc).join(', ')}</p>`:''}<p>${esc(w.warning)}</p></details>`).join('')}<p>Assigned rows with a bilingual source-read guide: ${course.readingCoverage.assignedRowsWithBilingualGuide}/${course.readingCoverage.totalAssignedRows}. Assigned rows verified against recorded requirements: ${course.readingCoverage.completedAssignedRows}. Unreviewed rows remain pending; source-specific limits remain visible. This is teaching review, not learner competency certification.</p>`;
  lessonFromHash();renderLesson();
})();
