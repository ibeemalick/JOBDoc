import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');
let version=0;
async function fresh() {return import(`data:text/javascript;base64,${Buffer.from(source+'\n// '+version++).toString('base64')}`);}
const doctor={id:1,jobTitle:'Consultant Anaesthetist',companyName:'Example Healthcare',jobGeo:'UK',url:'https://jobicy.com/jobs/1-example',pubDate:'2026-11-14T12:00:00Z',jobExcerpt:'<b>Clinical role</b>',jobType:['Contract']};
const employer={id:2,title:'Psychiatrist',company_name:'Charlie Health',location:{name:'Remote, United States'},absolute_url:'https://www.charliehealth.com/careers?gh_jid=2',first_published:'2026-11-14T10:00:00Z'};
test('normalizes real source formats, filters unrelated roles, retains attribution and caches requests',async()=>{
  const original=globalThis.fetch;let count=0;
  globalThis.fetch=async url=>{count++;return Response.json({content:[],jobs:String(url).includes('jobicy')?[doctor,{...doctor,id:3,url:'javascript:alert(1)'},{...doctor,id:4,url:'https://evil.example/job'}]:[employer,{...employer,id:5,title:'Software Engineer'},{...employer,id:6,application_deadline:'2020-01-01'}]});};
  try {
    const mod=await fresh();const result=await mod.jobsResponse('https://example.com');
    assert.equal(result.jobs.length,2);
    assert.equal(result.jobs[0].category,'Doctors / Physicians');
    assert.deepEqual(result.jobs[0].countries,['United Kingdom']);
    assert.equal(result.jobs[0].description,'Clinical role');
    assert.equal(result.sources.length,5);
    await mod.jobsResponse('https://example.com');assert.equal(count,5);
  } finally {globalThis.fetch=original;}
});
test('source outage returns explicit unavailable state without inventing jobs',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('offline');};
  try {const mod=await fresh();const result=await mod.jobsResponse('https://example.com');assert.equal(result.jobs.length,0);assert.ok(result.sources.every(item=>item.state==='unavailable'&&item.fetchedAt===null));}
  finally {globalThis.fetch=original;}
});
test('deduplicates matching title, employer and location across feed records',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async url=>Response.json({content:[],jobs:String(url).includes('jobicy')?[doctor,{...doctor,id:99}]:[]});
  try{const mod=await fresh();const result=await mod.jobsResponse('https://example.com');assert.equal(result.jobs.length,1);}
  finally{globalThis.fetch=original;}
});
test('all 12 country guides have separate profession summaries and official HTTPS sources',async()=>{
  const {runInNewContext}=await import('node:vm');const data=await readFile(new URL('../public/country-guides.js',import.meta.url),'utf8');const sandbox={window:{}};runInNewContext(data,sandbox);
  const guides=sandbox.window.countryGuides;assert.equal(guides.length,12);assert.equal(new Set(guides.map(g=>g.code)).size,12);
  for(const guide of guides){assert.ok(guide.doctors&&guide.nursing&&guide.exam&&guide.links.length>=2);assert.ok(guide.links.every(([,url])=>url.startsWith('https://')));}
});
test('outages serve an explicitly stale snapshot for less than 24 hours, then remove it',async()=>{
  const originalFetch=globalThis.fetch,originalNow=Date.now;let now=originalNow();Date.now=()=>now;
  globalThis.fetch=async url=>Response.json({content:[],jobs:String(url).includes('jobicy')?[doctor]:[]});
  try {
    const mod=await fresh();await mod.jobsResponse('https://example.com');
    globalThis.fetch=async()=>{throw new Error('offline');};now+=2*3600_000;
    const stale=await mod.jobsResponse('https://example.com');assert.equal(stale.jobs.length,1);assert.ok(stale.sources.every(s=>s.state==='stale'));
    now+=24*3600_000;const expired=await mod.jobsResponse('https://example.com');assert.equal(expired.jobs.length,0);assert.ok(expired.sources.every(s=>s.state==='unavailable'));
  } finally {globalThis.fetch=originalFetch;Date.now=originalNow;}
});
test('country detection does not confuse Romania with Oman, or India with Indiana',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async url=>Response.json({content:[],jobs:String(url).includes('jobicy')?[{...doctor,id:7,jobGeo:'Romania'},{...doctor,id:8,jobGeo:'Indiana'}]:[]});
  try{const mod=await fresh();const result=await mod.jobsResponse('https://example.com');assert.deepEqual(result.jobs.find(j=>j.id==='jobicy:7').countries,['Romania']);assert.deepEqual(result.jobs.find(j=>j.id==='jobicy:8').countries,[]);}
  finally{globalThis.fetch=original;}
});
test('an unavailable hosted Cache API does not prevent live source fetching',async()=>{
  const original=globalThis.fetch,oldCaches=globalThis.caches;
  globalThis.caches={match:async()=>{throw new Error('Cache API unavailable');},get default(){throw new Error('Cache API unavailable');}};
  globalThis.fetch=async url=>Response.json({content:[],jobs:String(url).includes('jobicy')?[doctor]:[]});
  try{const mod=await fresh();const result=await mod.jobsResponse('https://example.com');assert.equal(result.jobs.length,1);assert.equal(result.sources[0].state,'current');}
  finally{globalThis.fetch=original;if(oldCaches===undefined)delete globalThis.caches;else globalThis.caches=oldCaches;}
});
test('imports public employer pages with accurate country, profession and original source links',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>String(url).includes('/companies/')?Response.json({totalFound:101,content:String(url).includes('offset=100')?[{id:'101',name:'Dentist',visibility:'PUBLIC',location:{country:'nz',fullLocation:'Auckland, New Zealand'},company:{name:'Dental Employer'},releasedDate:'2026-11-15',typeOfEmployment:{label:'Part-time'}}]:[{id:'100',name:'Registered Nurse',visibility:'PUBLIC',location:{country:'au',fullLocation:'Melbourne, Australia'},company:{name:'Hospital'}}]}):Response.json({jobs:[]});
 try{const result=await(await fresh()).jobsResponse('https://example.com');assert.equal(result.jobs.length,2);assert.ok(result.jobs.some(j=>j.category==='Doctors / Physicians'&&j.countries.includes('New Zealand')));assert.ok(result.jobs.every(j=>j.url.startsWith('https://jobs.smartrecruiters.com/')));}
 finally{globalThis.fetch=original;}
});
