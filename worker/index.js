/* EMBED_ASSETS */
const HOUR = 3600_000;
const memory = new Map();
const pending = new Map();
const sources = [
  {id:'jobicy',name:'Jobicy',url:'https://jobicy.com/api/jobs?count=100&industry=healthcare',website:'https://jobicy.com/jobs-rss-feed',kind:'Healthcare & Medical remote jobs'},
  {id:'charliehealth',name:'Charlie Health',url:'https://boards-api.greenhouse.io/v1/boards/charliehealth/jobs',website:'https://www.charliehealth.com/careers',kind:'Employer career board / United States'},
  ...[['Iqarus','International medical projects'],['Epworth','Hospital care / Australia'],['AbanoHealthcare','Dental care / Australia and New Zealand']].map(([board,kind])=>({id:board.toLowerCase(),name:board==='AbanoHealthcare'?'Abano Healthcare':board,board,format:'smartrecruiters',url:`https://api.smartrecruiters.com/v1/companies/${board}/postings?limit=100`,website:`https://careers.smartrecruiters.com/${board}`,kind:kind+' / up to 500 current postings'}))
];
function json(data,status=200) { return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}); }
function plain(value) { return String(value??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#(?:39|x27);/g,"'").replace(/&quot;/g,'"').replace(/&hellip;/g,'…').replace(/\s+/g,' ').trim(); }
function safeLink(value, sourceId) {
  try {
    const url=new URL(value);
    const allowed=sourceId==='jobicy'?['jobicy.com','www.jobicy.com']:['charliehealth.com','www.charliehealth.com','boards.greenhouse.io','job-boards.greenhouse.io'];
    return url.protocol==='https:'&&allowed.includes(url.hostname)?url.href:null;
  } catch {return null;}
}
function category(title) {
  if (/nurs|\bRN\b|\bLPN\b|\bNP\b|midwi/i.test(title)) return 'Nursing';
  if (/dentist|physician|doctor|psychiatrist|medical director|cardiolog|pediatrician|anaesth|anesth|surgeon|oncolog|dermatolog|neurolog|urolog/i.test(title)) return 'Doctors / Physicians';
  if (/pharmac/i.test(title)) return 'Pharmacy';
  if (/radiograph|radiolog|sonograph/i.test(title)) return 'Radiology';
  if (/laborator|patholog/i.test(title)) return 'Laboratory';
  if (/dental|paramedic|biomedical|technician|therapist|counsel|psycholog|social work|dietitian|physiotherap|clinician/i.test(title)) return 'Allied Health';
  if (/coordinator|director|manager|administr|operations|billing/i.test(title)) return 'Administration';
  return 'Other Healthcare';
}
function countries(location,source) {
  const found=[];
  const rules=[['United States',/\bUSA\b|United States|\bUS\b/i],['United Kingdom',/United Kingdom|\bUK\b/i],['United Arab Emirates',/United Arab Emirates|\bUAE\b/i],['Saudi Arabia',/Saudi Arabia/i],['Canada',/Canada/i],['Australia',/Australia/i],['New Zealand',/New Zealand/i],['Ireland',/Ireland/i],['Germany',/Germany/i],['Pakistan',/Pakistan/i],['Qatar',/Qatar/i],['Singapore',/Singapore/i]];
  for (const [name,re] of rules) if(re.test(location)) found.push(name);
  const additional=['Poland','Greece','France','Spain','Italy','Netherlands','Belgium','Switzerland','Austria','Portugal','Sweden','Norway','Denmark','Finland','Romania','Czech Republic','Hungary','South Africa','India','Philippines','Malaysia','Indonesia','Thailand','Japan','South Korea','China','Brazil','Mexico','Argentina','Colombia','Chile','Egypt','Kenya','Nigeria','Turkey','Israel','Oman','Bahrain','Kuwait'];
  for(const name of additional)if(new RegExp('(?:^|[^A-Za-z])'+name+'(?:$|[^A-Za-z])','i').test(location))found.push(name);
  if(source==='charliehealth'&&/,(?:\s*)(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/.test(location))found.push('United States');
  return [...new Set(found)];
}
function normalize(source,row) {
  if(source.format==='smartrecruiters') {
    if(row.visibility!=='PUBLIC'||!/^\d+$/.test(String(row.id))||!row.name)return null;
    const location=plain(row.location?.fullLocation)||plain(row.location?.city)||'See source for location';
    let country='';try{country=new Intl.DisplayNames(['en'],{type:'region'}).of(String(row.location?.country||'').toUpperCase())||'';}catch{}
    return {id:`${source.id}:${row.id}`,title:plain(row.name),company:plain(row.company?.name)||source.name,location,countries:country?[country]:countries(location,source.id),category:category(row.name),type:plain(row.typeOfEmployment?.label)||'See source for contract',salary:'Salary not supplied',description:'Open the employer’s original vacancy for the full description, qualifications, work location and application process.',publishedAt:Number.isFinite(Date.parse(row.releasedDate))?new Date(row.releasedDate).toISOString():null,source:source.name,sourceId:source.id,url:`https://jobs.smartrecruiters.com/${source.board}/${row.id}`,sourceUrl:source.website,remote:row.location?.remote===true};
  }
  const isJobicy=source.id==='jobicy';
  const title=plain(isJobicy?row.jobTitle:row.title);
  const url=safeLink(isJobicy?row.url:row.absolute_url,source.id);
  if(!title||!url||row.id===undefined) return null;
  if(!isJobicy&&!/clinician|therapist|nurs|psychi|medical|clinical|care coach|care coordinator|patient|counsel|dietitian|social work/i.test(title))return null;
  if(row.application_deadline&&new Date(row.application_deadline).getTime()<Date.now())return null;
  const location=plain(isJobicy?row.jobGeo:row.location?.name)||'See source for location';
  const published=isJobicy?row.pubDate:row.first_published;
  const date=Number.isFinite(Date.parse(published))?new Date(published).toISOString():null;
  const salary=isJobicy&&row.salaryMin&&row.salaryCurrency?`${row.salaryCurrency} ${row.salaryMin}${row.salaryMax?'–'+row.salaryMax:''}${row.salaryPeriod?' / '+row.salaryPeriod:''}`:'Salary not supplied';
  return {id:`${source.id}:${row.id}`,title,company:plain(isJobicy?row.companyName:row.company_name)||source.name,location,countries:countries(location,source.id),category:category(title),type:isJobicy?(Array.isArray(row.jobType)?row.jobType.join(', '):plain(row.jobType))||'See source':'See source for contract',salary,description:isJobicy?plain(row.jobExcerpt).slice(0,600):'Open the employer’s original vacancy for the full description, qualifications, work location and application process.',publishedAt:date,source:source.name,sourceId:source.id,url,sourceUrl:source.website,remote:/remote|anywhere|worldwide/i.test(location)||isJobicy};
}
async function refreshSource(source,origin) {
  const previous=memory.get(source.id);
  if(previous&&Date.now()-previous.fetchedAt<HOUR)return {...previous,state:'current'};
  try {
    const response=await fetch(source.url,{headers:{Accept:'application/json','User-Agent':'JobsDoctor/1.0 (healthcare job discovery)'},signal:AbortSignal.timeout(18000)});
    if(!response.ok)throw new Error(`Source returned HTTP ${response.status}`);
    const data=await response.json();
    let rows=source.format==='smartrecruiters'?data.content:data.jobs;
    if(source.format==='smartrecruiters'&&Array.isArray(rows)&&data.totalFound>100) {
      const pages=await Promise.all(Array.from({length:Math.min(4,Math.ceil(data.totalFound/100)-1)},(_,i)=>fetch(source.url+'&offset='+((i+1)*100),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)}).then(async response=>{if(!response.ok)throw new Error('Source pagination failed');const page=await response.json();if(!Array.isArray(page.content))throw new Error('Source response format changed');return page.content;})));
      rows=rows.concat(...pages);
    }
    if(!Array.isArray(rows))throw new Error('Source response format changed');
    const jobs=rows.map(row=>normalize(source,row)).filter(Boolean);
    const result={id:source.id,name:source.name,website:source.website,kind:source.kind,jobs,fetchedAt:Date.now(),state:'current'};
    memory.set(source.id,result);

    return result;
  } catch(error) {
    if(previous&&Date.now()-previous.fetchedAt<24*HOUR)return {...previous,state:'stale',error:'Refresh failed; showing the last successful feed from within 24 hours.'};
    return {id:source.id,name:source.name,website:source.website,kind:source.kind,jobs:[],fetchedAt:null,state:'unavailable',error:'This source could not be reached. Try again later or visit the original board.'};
  }
}
function deadline(promise,ms) {let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Source timeout')),ms);})]).finally(()=>clearTimeout(timer));}
async function sourceData(source,origin) {
  if(pending.has(source.id))return pending.get(source.id);
  const promise=deadline(refreshSource(source,origin),20000).catch(()=>{const old=memory.get(source.id);return old&&Date.now()-old.fetchedAt<24*HOUR?{...old,state:'stale',error:'Refresh timed out; showing the last successful feed within 24 hours.'}:{id:source.id,name:source.name,website:source.website,kind:source.kind,jobs:[],fetchedAt:null,state:'unavailable',error:'Source request timed out. Try again later or visit the original board.'};}).finally(()=>pending.delete(source.id));pending.set(source.id,promise);return promise;
}
export async function jobsResponse(origin) {
  const results=await Promise.all(sources.map(source=>sourceData(source,origin)));
  const unique=new Map();
  for(const source of results) for(const job of source.jobs) {
    const key=`${job.title}|${job.company}|${job.location}`.toLowerCase().replace(/\s+/g,' ');
    if(!unique.has(key))unique.set(key,job);
  }
  const jobs=[...unique.values()].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0));
  return {jobs,sources:results.map(({jobs,...source})=>({...source,count:jobs.length})),retrievedAt:new Date().toISOString(),refreshPolicy:'Feeds refresh on demand after one hour. While this page is open, it checks hourly. This is not a background scheduled import.',coverage:'Selected public healthcare feeds only. Coverage includes selected international medical projects, United States, Australian and New Zealand employers, and remote roles. Coverage varies by source; remote does not imply worldwide eligibility.'};
}
export default {
  async fetch(request) {
    const url=new URL(request.url);
    if(request.method!=='GET'&&request.method!=='HEAD')return json({error:'Method not allowed'},405);
    if(url.pathname==='/api/jobs') {try{return json(await jobsResponse(url.origin));}catch(error){console.error('Job aggregation failed:',String(error.message).slice(0,180));return json({error:'Job feeds are temporarily unavailable',jobs:[],sources:[]},503);} }
    const path=url.pathname==='/'?'/index.html':url.pathname;
    const asset=ASSETS[path];
    if(!asset)return new Response('Not found',{status:404});
    const bytes=Uint8Array.from(atob(asset.body),character=>character.charCodeAt(0));
    return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':asset.type,'Cache-Control':path.endsWith('.png')?'public,max-age=86400':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
  }
};
