import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {SAMPLE,SEEDS} from '../src/data.mjs';

test('local gateway checks origin, validates structured output, and rejects hallucinated quotes',async()=>{
  let invalid=false,seenRequest;
  const mock=http.createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');
    if(req.url==='/api/tags')return res.end(JSON.stringify({models:[{name:'fixture-model'}]}));
    let body='';for await(const chunk of req)body+=chunk;seenRequest=JSON.parse(body);
    res.end(JSON.stringify({message:{content:JSON.stringify({challenges:[{...SEEDS[0],...(invalid?{quote:'Invented evidence that does not appear in the draft.'}:{})}]})}}));
  }).listen(0,'127.0.0.1');await once(mock,'listening');
  const reserve=http.createServer().listen(0,'127.0.0.1');await once(reserve,'listening');const port=reserve.address().port;await new Promise(r=>reserve.close(r));
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),OLLAMA_MODEL:'fixture-model',OLLAMA_URL:`http://127.0.0.1:${mock.address().port}`},stdio:['ignore','pipe','pipe']});
  try{
    await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Gateway did not start')),5000).unref())]);
    const origin=`http://127.0.0.1:${port}`;
    const status=await fetch(origin+'/api/status').then(r=>r.json());assert.equal(status.ready,true);
    let r=await fetch(origin+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:JSON.stringify({manuscript:SAMPLE})});assert.equal(r.status,403);
    r=await fetch(origin+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({manuscript:{sections:[]}})});assert.equal(r.status,400);
    r=await fetch(origin+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({manuscript:SAMPLE})});assert.equal(r.status,200);const result=await r.json();assert.equal(result.challenges[0].origin,'Local model · quote verified');assert.equal(seenRequest.stream,false);assert.equal(seenRequest.format.type,'object');assert.match(seenRequest.messages[0].content,/UNTRUSTED DATA/);
    invalid=true;r=await fetch(origin+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({manuscript:SAMPLE})});assert.equal(r.status,422);assert.match((await r.json()).error,/does not exist/);
  }finally{child.kill();await new Promise(r=>mock.close(r));}
});
