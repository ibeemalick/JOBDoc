import { readdir, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
const root = new URL('../', import.meta.url).pathname;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const assets = {};
async function collect(directory) {
  for (const item of await readdir(directory, { withFileTypes:true })) {
    const path = join(directory,item.name);
    if (item.isDirectory()) await collect(path);
    else {
      const ext = '.' + item.name.split('.').pop();
      assets['/' + relative(join(root,'public'),path)] = {type:types[ext]||'application/octet-stream',body:(await readFile(path)).toString('base64')};
    }
  }
}
await collect(join(root,'public'));
await rm(join(root,'dist'),{recursive:true,force:true});
await mkdir(join(root,'dist/server'),{recursive:true});
await mkdir(join(root,'dist/.openai'),{recursive:true});
const source = await readFile(join(root,'worker/index.js'),'utf8');
await writeFile(join(root,'dist/server/index.js'),source.replace('/* EMBED_ASSETS */',`const ASSETS = ${JSON.stringify(assets)};`));
await writeFile(join(root,'dist/.openai/hosting.json'),await readFile(join(root,'.openai/hosting.json')));
console.log(`Built Worker with ${Object.keys(assets).length} embedded assets`);
