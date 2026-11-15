const icons=['<path d="M6 3v7a6 6 0 0 0 12 0V3M4 3h4m8 0h4M12 16v3a6 6 0 0 0 12 0v-5"/><circle cx="24" cy="11" r="3"/>','<path d="M3 10l5 14q8-4 16 0l5-14q-13-10-26 0Z"/><path d="M16 9v9m-4-4h8"/>','<circle cx="16" cy="8" r="4"/><circle cx="6" cy="13" r="3"/><circle cx="26" cy="13" r="3"/><path d="M8 27v-5a8 8 0 0 1 16 0v5ZM2 27v-6a5 5 0 0 1 5-5m23 11v-6a5 5 0 0 0-5-5"/>','<path d="M5 27a7 7 0 0 1 0-10L17 5a7 7 0 0 1 10 10L15 27a7 7 0 0 1-10 0Zm6-16 10 10"/>','<path d="m16 3 7 5-8 12-7-5ZM20 17a9 9 0 0 1-4 15M8 25h14M5 31h23M8 19l5 3"/>','<rect x="6" y="4" width="21" height="26" rx="2"/><path d="M16 8v17m-7-13 7 3 8-3m-15 5 7 3 8-3m-15 5 7 3 8-3"/>','<rect x="3" y="10" width="27" height="20" rx="3"/><path d="M11 10V5h12v5M3 18q14 8 27 0M15 17h4v5h-4Z"/>','<circle cx="6" cy="16" r="2"/><circle cx="16" cy="16" r="2"/><circle cx="26" cy="16" r="2"/>'];const cats=['Doctors / Physicians','Nursing','Allied Health','Pharmacy','Laboratory','Radiology','Administration','Other Healthcare'];
const $ = selector => document.querySelector(selector);
const guides = window.countryGuides || [];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeURL = value => { try { const u=new URL(value);return u.protocol==='https:'?u.href:'#'; } catch {return '#';} };
const link = (url,label) => `<a href="${escapeHTML(safeURL(url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`;
const iconPaths = {
  bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>',
  location:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12h18"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]}</svg>`;
const formatDate = value => value ? new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : 'Date not supplied';
const formatTime = value => value ? new Date(value).toLocaleString() : 'Not yet fetched';
let jobs = [], sources = [], limit = 10, savedOnly = false, loading = false, feedError = '';
function readSaved() {
  try { const value=JSON.parse(localStorage.getItem('mc-saved')||'[]');return Array.isArray(value)?value.filter(id=>typeof id==='string'):[]; }
  catch { return []; }
}
let saved = readSaved();
function storeLocal(key,value) {
  try {localStorage.setItem(key,JSON.stringify(value));return true;} catch {return false;}
}
function toast(message) {
  $('#toast').textContent=message;
  $('#toast').classList.add('visible');
  setTimeout(()=>$('#toast').classList.remove('visible'),4000);
}
function renderJobs() {
  const query=$('#keyword').value.trim().toLowerCase();
  const country=$('#location').value;
  const specialty=$('#specialty').value;
  const filtered=jobs.filter(job => (!query||`${job.title} ${job.company} ${job.location} ${job.category}`.toLowerCase().includes(query)) && (!country||job.countries.includes(country)) && (!specialty||job.category===specialty) && (!savedOnly||saved.includes(job.id)));
  filtered.sort($('#sort').value==='title' ? (a,b)=>a.title.localeCompare(b.title) : (a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0));
  $('#result-count').textContent=loading&&!jobs.length?'Loading live feeds…':`${filtered.length} ${savedOnly?'saved ':''}imported ${filtered.length===1?'opportunity':'opportunities'}`;
  $('#job-list').innerHTML=loading&&!jobs.length?'<div class="feed-loading" role="status"><strong>Finding healthcare opportunities…</strong><p>Checking connected employer and job-board feeds. This may take up to 25 seconds.</p></div>':filtered.slice(0,limit).map(jobMarkup).join('');
  $('#job-list').setAttribute('aria-busy',String(loading));
  $('#empty').hidden=loading||filtered.length>0||!!feedError;
  $('#load').hidden=filtered.length<=limit;
  $('#saved-count').textContent=saved.length;
  $('#feed-error').hidden=!feedError;
  $('#feed-error').textContent=feedError;
  document.querySelectorAll('.category').forEach(button=>button.classList.toggle('active',button.dataset.category===specialty));
}
function jobMarkup(job) {
  const selected=saved.includes(job.id);
  const initials=job.company.split(' ').slice(0,2).map(word=>word[0]).join('');
  return `<article class="job" data-job="${escapeHTML(job.id)}" aria-label="${escapeHTML(job.title)}">
    <div class="hospital-logo" aria-hidden="true">${escapeHTML(initials)}</div>
    <div class="job-main"><h3><button class="job-title" type="button">${escapeHTML(job.title)}</button></h3>
      <div class="company">${escapeHTML(job.company)}</div>
      <div class="job-meta"><span>${icon('location')}${escapeHTML(job.location)}</span><span>${icon('briefcase')}${escapeHTML(job.type)}</span></div>
      <div class="job-bottom"><span class="tag">${escapeHTML(job.category)}</span><span class="salary">${escapeHTML(job.salary)}</span></div>
      <div class="job-source">${link(job.url,`Source: ${job.source}`)}<span>Published ${escapeHTML(formatDate(job.publishedAt))}</span></div>
    </div><button class="save ${selected?'saved':''}" data-save="${escapeHTML(job.id)}" aria-label="${selected?'Unsave':'Save'} ${escapeHTML(job.title)}" aria-pressed="${selected}">${icon('bookmark')}</button>
  </article>`;
}
function open(content) {
  const modal=$('#modal');
  $('#modal-content').innerHTML='<img class="dialog-logo" src="assets/jobsdoctor-logo.png" alt="JobsDoctor, Healthcare Job Portal" width="2508" height="627">'+content;
  const heading=$('#modal-content h2');
  if(heading)heading.id='dialog-title';
  if(!modal.open)modal.showModal();
}
function jobDetails(id) {
  const job=jobs.find(value=>value.id===id);
  if(!job)return;
  const guide=guides.find(value=>job.countries.includes(value.name));
  open(`<div class="dialog-label">Imported from ${escapeHTML(job.source)}</div><h2>${escapeHTML(job.title)}</h2><p>${escapeHTML(job.company)} / ${escapeHTML(job.location)}</p><div class="status">${escapeHTML(job.type)} / ${escapeHTML(job.salary)}</div><p>${escapeHTML(job.description)}</p><p>Published ${escapeHTML(formatDate(job.publishedAt))}. The original source controls vacancy status, eligibility and applications.</p><div class="detail-actions">${link(job.url,`View vacancy on ${job.source}`)}<button class="outline" id="detail-save">${saved.includes(id)?'Remove saved job':'Save opportunity'}</button>${guide?`<button class="text-button" data-guide="${guide.code}">Read ${escapeHTML(guide.name)} licensing guide</button>`:''}</div>`);
  $('#detail-save').onclick=()=>{toggleSaved(id);$('#detail-save').textContent=saved.includes(id)?'Remove saved job':'Save opportunity';};
}
function toggleSaved(id) {
  const restore=document.activeElement?.matches('[data-save]');
  const next=saved.includes(id)?saved.filter(value=>value!==id):[...saved,id];
  if(!storeLocal('mc-saved',next)){toast('Browser storage is unavailable. This change could not be saved.');return;}
  saved=next;renderJobs();
  if(restore)(document.querySelector(`[data-save="${CSS.escape(id)}"]`)||$('#saved-nav')).focus({preventScroll:true});
}
function sourceMarkup(source) {
  const labels={current:'Feed available',stale:'Last successful feed',unavailable:'Unavailable'};
  return `<article class="source-row"><div><h3>${link(source.website,source.name)}</h3><p>${escapeHTML(source.kind)}</p></div><div><strong>${labels[source.state]||'Checking'}</strong><p>${source.count||0} imported roles</p><small>Last fetched: ${escapeHTML(formatTime(source.fetchedAt))}</small>${source.error?`<p class="source-error">${escapeHTML(source.error)}</p>`:''}</div></article>`;
}
function renderSources() {
  $('#source-status').innerHTML=sources.length?sources.map(sourceMarkup).join(''):'<p>No successful source response yet. Check again or visit the original job boards.</p>';
  const available=sources.filter(source=>source.state==='current').length;
  $('#feed-summary').textContent=sources.length?`${available} of ${sources.length} feeds current. Original-source status applies.`:'No live source has responded yet.';
}
async function loadJobs() {
  if(loading)return;
  loading=true;feedError='';renderJobs();
  $('#refresh-jobs').disabled=true;
  $('#refresh-jobs').setAttribute('aria-busy','true');
  try {
    const response=await fetch('/api/jobs',{headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw new Error('Feed service unavailable');
    const data=await response.json();
    if(!Array.isArray(data.jobs)||!Array.isArray(data.sources))throw new Error('Unexpected source response');
    jobs=data.jobs;sources=data.sources;
    const previousCountry=$('#location').value;
    const choices=[...new Set([...guides.map(guide=>guide.name),...jobs.flatMap(job=>job.countries)])].sort();
    $('#location').innerHTML='<option value="">All locations</option>'+choices.map(name=>`<option>${escapeHTML(name)}</option>`).join('');
    $('#location').value=previousCountry;
    if(!sources.some(source=>source.state!=='unavailable'))feedError='The source feeds are temporarily unavailable. No sample vacancies are substituted. Use Check feed status to retry.';
  } catch {
    const freshEnough=new Set(sources.filter(source=>source.fetchedAt&&Date.now()-source.fetchedAt<86400_000).map(source=>source.id));
    jobs=jobs.filter(job=>freshEnough.has(job.sourceId));
    sources=sources.map(source=>({...source,state:freshEnough.has(source.id)?'stale':'unavailable',error:'The latest feed service request failed. Check the source directly.'}));
    feedError=jobs.length?'The latest refresh failed. Showing the last loaded results; confirm availability at the original source.':'The live job service did not respond in time or could not be reached. Use Check feed status to retry.';
  } finally {
    loading=false;renderJobs();renderSources();
    $('#refresh-jobs').disabled=false;$('#refresh-jobs').setAttribute('aria-busy','false');
  }
}
function resetFilters() {$('#keyword').value='';$('#location').value='';$('#specialty').value='';savedOnly=false;limit=10;renderJobs();}
function scrollToJobs() {$('#jobs').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function showGuide(code,scroll=true) {
  const country=guides.find(guide=>guide.code===code)||guides[0];
  if(!country)return;
  $('#guide-country').value=country.code;
  const profession=$('#guide-profession').value;
  const text=profession==='doctors'?country.doctors:profession==='nursing'?country.nursing:'There is no single healthcare exam covering every occupation. Pharmacy, dentistry, physiotherapy, laboratory, radiology and other regulated roles have distinct recognition and licensing requirements. Check the regulator for your exact profession and scope. Doctor and nursing exam names should not be applied to other professions.';
  $('#guide-content').innerHTML=`<article class="country-guide"><div class="guide-main"><p class="guide-regulator">${escapeHTML(country.regulator)}</p><h3>${escapeHTML(country.name)}</h3><h4>${profession==='doctors'?escapeHTML(country.exam):profession==='nursing'?'Nursing registration and assessment':'Choose your profession’s regulator'}</h4><p>${escapeHTML(text)}</p><h4>Language and evidence</h4><p>${escapeHTML(country.language)}</p></div><div class="guide-next"><h4>Plan your next steps</h4><ol>${country.steps.map(step=>`<li>${escapeHTML(step)}</li>`).join('')}</ol><h4>Official sources</h4><ul class="official-links">${country.links.map(([label,url])=>`<li>${link(url,label)}</li>`).join('')}</ul><small>Editorial review: ${escapeHTML(formatDate(country.reviewed))}. Rules can change; linked regulators make the final decision.</small><button class="outline" data-jobs-country="${escapeHTML(country.name)}">View imported jobs in ${escapeHTML(country.name)}</button></div></article>`;
  if(scroll)$('#licensing').scrollIntoView({behavior:'smooth'});
}
function selectCountry(name) {resetFilters();$('#location').value=name;renderJobs();const guide=guides.find(value=>value.name===name);if(guide)showGuide(guide.code,false);scrollToJobs();}
$('#categories').innerHTML=cats.map((category,index)=>`<button class="category" data-category="${escapeHTML(category)}"><svg viewBox="0 0 34 36" aria-hidden="true">${icons[index]}</svg><span>${escapeHTML(category)}</span></button>`).join('');
$('#location').innerHTML='<option value="">All locations</option>'+guides.map(guide=>`<option>${escapeHTML(guide.name)}</option>`).join('');
$('#guide-country').innerHTML=guides.map(guide=>`<option value="${guide.code}">${escapeHTML(guide.name)}</option>`).join('');
$('#countries').innerHTML=guides.map(guide=>`<button data-country="${escapeHTML(guide.name)}"><span class="country-flag" aria-hidden="true"><img src="assets/flags/${guide.code.toLowerCase()}.png" alt="" width="48" height="48" loading="lazy"></span><div><strong>${escapeHTML(guide.name)}</strong><small>${escapeHTML(guide.region)}</small></div></button>`).join('');
$('#countries').onclick=event=>{const button=event.target.closest('[data-country]');if(button)selectCountry(button.dataset.country);};
$('#guide-country').onchange=()=>showGuide($('#guide-country').value,false);
$('#guide-profession').onchange=()=>showGuide($('#guide-country').value,false);
$('#guide-content').onclick=event=>{const button=event.target.closest('[data-jobs-country]');if(button)selectCountry(button.dataset.jobsCountry);};
$('#job-list').onclick=event=>{
  if(event.target.closest('a'))return;
  const button=event.target.closest('[data-save]');
  if(button){toggleSaved(button.dataset.save);return;}
  const row=event.target.closest('[data-job]');if(row)jobDetails(row.dataset.job);
};
$('#categories').onclick=event=>{const button=event.target.closest('[data-category]');if(!button)return;$('#specialty').value=$('#specialty').value===button.dataset.category?'':button.dataset.category;savedOnly=false;limit=10;renderJobs();scrollToJobs();};
$('#search').onsubmit=event=>{event.preventDefault();savedOnly=false;limit=10;renderJobs();scrollToJobs();};
$('#sort').onchange=renderJobs;
$('#reset').onclick=resetFilters;
$('#view-all').onclick=resetFilters;
$('#load').onclick=()=>{limit+=10;renderJobs();};
$('#saved-nav').onclick=()=>{resetFilters();savedOnly=true;renderJobs();scrollToJobs();};
$('#international').onclick=()=>{resetFilters();scrollToJobs();};
$('#refresh-jobs').onclick=loadJobs;
$('#close').onclick=()=>$('#modal').close();
$('#modal').onclick=event=>{if(event.target===$('#modal'))$('#modal').close();};
const panels={
  about:'<h2>Healthcare careers, across borders.</h2><p>JobsDoctor brings together selected public healthcare vacancies and country licensing guides. Listings link to the original source for current requirements and applications.</p><p>Coverage is limited to connected feeds. Account services and email delivery are not connected. Saved jobs and draft profiles stay in this browser.</p>',
  resources:'<h2>Prepare your next move.</h2><p>Keep your qualifications, registration history, good-standing evidence and references ready. Check the destination regulator before booking an exam.</p><a class="text-button" href="#licensing" id="open-guides">Read country licensing guides</a>'
};
function draftForm(type) {
  const title={login:'Your local career profile',register:'Start your next chapter',employer:'Prepare an employer enquiry',alert:'Save your job preferences'}[type];
  if(!title)return;
  const note=type==='login'||type==='register'?'Accounts are not enabled. This saves a profile only in your current browser; it does not create a secure account.':type==='employer'?'Save a local draft. Nothing is sent or published.':'Preferences stay in your browser. Email delivery is not connected.';
  open(`<h2>${title}</h2><p>${note}</p><form id="local-form">${type!=='alert'?`<label>${type==='employer'?'Organization name':'Your name'}<input name="name" required autocomplete="name"></label>`:''}<label>Email address<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>${type==='employer'?'<label>Role you are hiring for<input name="role" required></label>':`<label>Specialty<select name="specialty">${cats.map(category=>`<option>${escapeHTML(category)}</option>`).join('')}</select></label>`}<button class="primary">${type==='employer'?'Save enquiry draft':type==='alert'?'Save preferences':'Save local profile'}</button><small>Stored on this device only. No email is sent.</small></form>`);
  $('#local-form').onsubmit=event=>{event.preventDefault();if(!storeLocal('mc-'+type,Object.fromEntries(new FormData(event.target)))){toast('Browser storage is unavailable. Your draft could not be saved.');return;}$('#modal').close();toast('Draft saved in this browser. Nothing was sent.');};
}
document.addEventListener('click',event=>{
  const guide=event.target.closest('[data-guide]');
  if(guide){$('#modal').close();showGuide(guide.dataset.guide);return;}
  const button=event.target.closest('[data-open]');
  if(!button)return;
  const type=button.dataset.open;
  if(type==='sources'){open(`<h2>Live source connections</h2>${sources.length?sources.map(sourceMarkup).join(''):'<p>Connecting to the feed service.</p>'}<p>Feeds refresh after one hour on the next request. No background schedule is enabled. Sources are not employer-verification partners.</p>`);return;}
  if(panels[type]){open(panels[type]);const action=$('#open-guides');if(action)action.onclick=()=>$('#modal').close();return;}
  draftForm(type);
});
const menuToggle=$('#menu-toggle'),mainNav=$('#main-nav');
function setMenuOpen(value){menuToggle.setAttribute('aria-expanded',String(value));mainNav.classList.toggle('open',value);}
menuToggle.onclick=()=>setMenuOpen(menuToggle.getAttribute('aria-expanded')!=='true');
mainNav.onclick=event=>{if(event.target.closest('a,button'))setMenuOpen(false);};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menuToggle.getAttribute('aria-expanded')==='true'){setMenuOpen(false);menuToggle.focus();}});
showGuide(guides[0]?.code,false);
loadJobs();
setInterval(()=>{if(!document.hidden)loadJobs();},3600_000);
