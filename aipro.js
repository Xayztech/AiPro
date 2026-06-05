'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { URL } = require('url');

const MODELS = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'gemini',
    api: 'gemini-3.5-flash'
  },
  {
    id: 'gemini-3.1-flash',
    name: 'Gemini 3.1 Flash',
    provider: 'gemini',
    api: 'gemini-3.1-flash'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    provider: 'gemini',
    api: 'gemini-3.1-flash-lite'
  },
  {
    id: 'gemini-3.0-flash',
    name: 'Gemini 3.0 Flash',
    provider: 'gemini',
    api: 'gemini-2.0-flash'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    api: 'gemini-2.5-flash'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    api: 'gemini-2.0-flash'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    api: 'gemini-1.5-flash'
  },
  {
    id: 'gemini-1.0-flash',
    name: 'Gemini 1.0 Flash',
    provider: 'gemini',
    api: 'gemini-1.0-flash'
  },
  {
    id: 'gpt-5.4-mini',
    name: 'ChatGPT 5.4 Mini',
    provider: 'openai',
    api: 'gpt-5.4-mini'
  },
  {
    id: 'gpt-5-mini',
    name: 'ChatGPT 5 Mini',
    provider: 'openai',
    api: 'gpt-5-mini'
  },
  {
    id: 'gpt-5-thinking-mini',
    name: 'ChatGPT 5 Thinking Mini',
    provider: 'openai',
    api: 'gpt-5-thinking-mini'
  },
  {
    id: 'gpt-5.1-codex-mini',
    name: 'ChatGPT 5.1 Codex Mini',
    provider: 'openai',
    api: 'gpt-5.1-codex-mini'
  },
  {
    id: 'gpt-4.1-mini',
    name: 'ChatGPT 4.1 Mini',
    provider: 'openai',
    api: 'gpt-4.1-mini'
  },
  {
    id: 'gpt-4o-mini',
    name: 'ChatGPT 4o Mini',
    provider: 'openai',
    api: 'gpt-4o-mini'
  },
  {
    id: 'o4-mini',
    name: 'ChatGPT o4 Mini',
    provider: 'openai',
    api: 'o4-mini'
  },
];

const GK = Array.from({length:12},(_,i)=>process.env[`GEMINI_KEY_${i+1}`]||'').filter(Boolean);
const OK = Array.from({length:12},(_,i)=>process.env[`OPENAI_KEY_${i+1}`]||'').filter(Boolean);
if(process.env.GEMINI_API_KEY && !GK.length) GK.push(process.env.GEMINI_API_KEY);
if(process.env.OPENAI_API_KEY && !OK.length) OK.push(process.env.OPENAI_API_KEY);

const KI = { gemini:0, openai:0 };
function nextKey(p){ const k=p==='gemini'?GK:OK; if(!k.length)return null; const v=k[KI[p]%k.length]; KI[p]=(KI[p]+1)%k.length; return v; }

function req(opts,body){
  return new Promise((res,rej)=>{
    const mod=opts.protocol==='http:'?http:https;
    const r=mod.request(opts,rs=>{
      const c=[]; rs.on('data',d=>c.push(d)); rs.on('end',()=>{
        const raw=Buffer.concat(c).toString();
        try{ res({s:rs.statusCode,b:JSON.parse(raw),r:raw}); }
        catch{ res({s:rs.statusCode,b:null,r:raw}); }
      });
    });
    r.on('error',rej);
    if(body) r.write(body);
    r.end();
  });
}

async function callGemini(apiModel, messages, files, key){
  if(!key) throw new Error('NO_KEY');
  const contents = messages.map(m=>({
    role: m.role==='assistant'?'model':'user',
    parts:[{text:m.content||''}]
  }));
  if(files && files.length){
    const last=contents[contents.length-1];
    files.forEach(f=>{ if(f.data&&f.mimeType) last.parts.push({inlineData:{mimeType:f.mimeType,data:f.data}}); });
  }
  const payload=JSON.stringify({
    contents,
    generationConfig:{temperature:0.7,topP:0.95,maxOutputTokens:8192},
    safetySettings:[
      {category:'HARM_CATEGORY_HARASSMENT',threshold:'BLOCK_NONE'},
      {category:'HARM_CATEGORY_HATE_SPEECH',threshold:'BLOCK_NONE'},
      {category:'HARM_CATEGORY_SEXUALLY_EXPLICIT',threshold:'BLOCK_NONE'},
      {category:'HARM_CATEGORY_DANGEROUS_CONTENT',threshold:'BLOCK_NONE'},
    ]
  });
  const u=new URL(`https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${key}`);
  const r=await req({hostname:u.hostname,path:u.pathname+u.search,method:'POST',protocol:'https:',
    headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},payload);
  if(r.s===429||r.s===503) throw new Error('RATE_LIMIT');
  if(r.s!==200) throw new Error('ERR_'+r.s);
  const txt=r.b?.candidates?.[0]?.content?.parts?.[0]?.text;
  if(!txt) throw new Error('EMPTY');
  return txt;
}

async function callOpenAI(apiModel, messages, files){
  const key=nextKey('openai'); if(!key) throw new Error('NO_KEY');
  const msgs=messages.map(m=>({role:m.role,content:m.content}));
  const imgFiles=(files||[]).filter(f=>f.mimeType?.startsWith('image/'));
  if(imgFiles.length && msgs.length){
    const last=msgs[msgs.length-1];
    const parts=[{type:'text',text:last.content}];
    imgFiles.forEach(f=>parts.push({type:'image_url',image_url:{url:`data:${f.mimeType};base64,${f.data}`}}));
    msgs[msgs.length-1]={role:last.role,content:parts};
  }
  const payload=JSON.stringify({model:apiModel,messages:msgs,max_tokens:4096,temperature:0.7});
  const r=await req({hostname:'api.openai.com',path:'/v1/chat/completions',method:'POST',protocol:'https:',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`,'Content-Length':Buffer.byteLength(payload)}},payload);
  if(r.s===429) throw new Error('RATE_LIMIT');
  if(r.s!==200) throw new Error('ERR_'+r.s);
  const txt=r.b?.choices?.[0]?.message?.content;
  if(!txt) throw new Error('EMPTY');
  return txt;
}

async function smartChat(modelId, messages, files){
  const ordered=[MODELS.find(m=>m.id===modelId),...MODELS.filter(m=>m.id!==modelId)].filter(Boolean);
  const errs=[];
  for(const m of ordered){
    const maxTry=m.provider==='gemini'?Math.min(GK.length||1,3):Math.min(OK.length||1,3);
    for(let t=0;t<maxTry;t++){
      try{
        let txt;
        if(m.provider==='gemini'){
          const k=nextKey('gemini'); if(!k) break;
          txt=await callGemini(m.api,messages,files,k);
        } else {
          txt=await callOpenAI(m.api,messages,files);
        }
        return {text:txt,usedModel:m.id,usedModelName:m.name};
      } catch(e){
        errs.push(`${m.id}[${t}]:${e.message}`);
        if(e.message==='NO_KEY') break;
        if(e.message!=='RATE_LIMIT') break;
      }
    }
  }
  throw new Error('ALL_FAILED: '+errs.slice(0,5).join(', '));
}

const MIME={'.html':'text/html;charset=utf-8','.js':'application/javascript','.css':'text/css',
  '.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon',
  '.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.manifest':'application/manifest+json'};

function serveFile(res,fp){
  const ct=MIME[path.extname(fp).toLowerCase()]||'application/octet-stream';
  try{
    const d=fs.readFileSync(fp);
    res.writeHead(200,{'Content-Type':ct,'Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'});
    res.end(d);
  }catch{res.writeHead(404);res.end('Not Found');}
}

function parseBody(r){
  return new Promise((res,rej)=>{
    let b='',sz=0;
    r.on('data',c=>{sz+=c.length;if(sz>52428800){r.destroy();rej(new Error('TOO_LARGE'));return;}b+=c;});
    r.on('end',()=>{try{res(JSON.parse(b));}catch{res({});}});
    r.on('error',rej);
  });
}

function cors(res,req){
  res.setHeader('Access-Control-Allow-Origin',(req&&req.headers&&req.headers.origin)||'*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  res.setHeader('Access-Control-Max-Age','86400');
}

async function handleChat(req,res){
  cors(res,req);
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method!=='POST'){res.writeHead(405);res.end('Method Not Allowed');return;}
  try{
    const body=await parseBody(req);
    const{model='gemini-3.5-flash',messages=[],files=[]}=body;
    if(!messages.length){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'No messages'}));return;}
    const result=await smartChat(model,messages,files);
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({success:true,...result}));
  }catch(e){
    console.error('[chat]',e.message);
    res.writeHead(500,{'Content-Type':'application/json'});
    res.end(JSON.stringify({error:e.message}));
  }
}

function handleModels(req,res){
  cors(res,req);
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({
    models:MODELS.map(m=>({...m,available:m.provider==='gemini'?GK.length>0:OK.length>0})),
    geminiKeys:GK.length,openaiKeys:OK.length
  }));
}

function handleHealth(req,res){
  cors(res,req);
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({status:'ok',version:'2.0.0',node:process.version,
    geminiKeys:GK.length,openaiKeys:OK.length,models:MODELS.length,ts:new Date().toISOString()}));
}

function handler(req,res){
  const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  const p=u.pathname;
  if(p==='/api/chat'||p==='/api/v1/chat') return handleChat(req,res);
  if(p==='/api/models') return handleModels(req,res);
  if(p==='/api/health'||p==='/health') return handleHealth(req,res);
  if(p==='/'||p==='/index.html') return serveFile(res,path.join(__dirname,'public','home.html'));
  const fp=path.join(__dirname,'public',p.replace(/\.\./g,''));
  if(fs.existsSync(fp)&&fs.statSync(fp).isFile()) return serveFile(res,fp);
  return serveFile(res,path.join(__dirname,'public','home.html'));
}

if(require.main===module){
  const PORT=process.env.PORT||3000;
  http.createServer(handler).listen(PORT,()=>{
    console.log(`✦ AIPro running → http://localhost:${PORT}`);
    console.log(`  Gemini keys: ${GK.length} | OpenAI keys: ${OK.length} | Models: ${MODELS.length}`);
  });
}

module.exports         = handler;
module.exports.handler = handler; 
module.exports.default = handler; 
