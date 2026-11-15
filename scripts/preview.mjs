import http from 'node:http';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../dist/server/index.js',import.meta.url),'utf8');
const {default:worker}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
http.createServer(async(req,res)=>{
  try {
    const response=await worker.fetch(new Request(`http://127.0.0.1:4173${req.url}`,{method:req.method}));
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {res.writeHead(500);res.end('Preview error');}
}).listen(4173,'127.0.0.1',()=>console.log('JobsDoctor preview: http://127.0.0.1:4173'));
