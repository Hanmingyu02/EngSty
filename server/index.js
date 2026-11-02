import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {ApiError,validateInput,translate} from './translation.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const assets=new Map([['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/app.js','app.js'],['/phrases.js','phrases.js'],['/api-client.js','api-client.js']]);
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8'};
export function createApp({apiKey=process.env.DEEPSEEK_API_KEY,model=process.env.DEEPSEEK_MODEL||'deepseek-chat',allowedOrigins=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean),fetchImpl=fetch,rateLimit=20,now=Date.now}={}) {
  const clients=new Map();
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname.startsWith('/api/')){
        const origin=req.headers.origin;
        // Only explicitly configured browser origins may access the API cross-origin.
        const sameOrigin=origin&&(()=>{try{return new URL(origin).host===req.headers.host;}catch{return false;}})();
        if(origin&&!sameOrigin&&!allowedOrigins.includes(origin))throw new ApiError(403,'허용되지 않은 사이트의 요청입니다.');
        if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
        if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'});return res.end();}
        if(url.pathname==='/api/health'&&req.method==='GET')return json(200,{status:'ok',translationConfigured:Boolean(apiKey)});
        if(url.pathname!=='/api/translate')return json(404,{error:'요청한 API가 없습니다.'});
        if(req.method!=='POST'){res.setHeader('Allow','POST');return json(405,{error:'POST 요청만 지원합니다.'});}
        if(req.headers['content-type']?.split(';')[0].trim()!=='application/json')throw new ApiError(415,'JSON 형식으로 요청해 주세요.');
        const timestamp=now();for(const [key,entry]of clients)if(timestamp>=entry.reset)clients.delete(key);
        // Do not trust spoofable X-Forwarded-For. Single-process limits are per TCP peer.
        const key=req.socket.remoteAddress;const entry=clients.get(key)||{count:0,reset:timestamp+60000};
        if(entry.count>=rateLimit){res.setHeader('Retry-After',String(Math.max(1,Math.ceil((entry.reset-timestamp)/1000))));throw new ApiError(429,'요청이 너무 많습니다. 1분 후 다시 시도해 주세요.');}
        if(clients.size>=10000&&!clients.has(key))throw new ApiError(503,'서비스가 혼잡합니다. 잠시 후 다시 시도해 주세요.');
        entry.count++;clients.set(key,entry);
        const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>8192)throw new ApiError(413,'입력 데이터가 너무 큽니다.');chunks.push(chunk);}const raw=Buffer.concat(chunks).toString('utf8');
        let body;try{body=JSON.parse(raw);}catch{throw new ApiError(400,'올바른 JSON을 보내 주세요.');}
        return json(200,await translate(validateInput(body),{apiKey,model,fetchImpl}));
      }
      if(!['GET','HEAD'].includes(req.method))return json(405,{error:'지원하지 않는 요청입니다.'});
      if(url.pathname==='/config.js'){res.writeHead(200,{'Content-Type':types.js,'Cache-Control':'no-store'});return res.end(req.method==='HEAD'?undefined:'window.ENGSTY_CONFIG = { apiBaseUrl: "" };');}
      const file=assets.get(url.pathname);if(!file)return json(404,{error:'페이지를 찾을 수 없습니다.'});
      const data=await readFile(resolve(root,file));res.writeHead(200,{'Content-Type':types[file.split('.').pop()],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
    } catch(error){if(!res.headersSent)json(error instanceof ApiError?error.status:500,{error:error instanceof ApiError?error.message:'서버 오류가 발생했습니다.'});else res.end();}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createApp();server.requestTimeout=30000;server.headersTimeout=15000;
  server.listen(Number(process.env.PORT||5173),'0.0.0.0',()=>console.log(`EngSty server listening on port ${server.address().port}; translation ${process.env.DEEPSEEK_API_KEY?'configured':'not configured'}`));
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();});
}
