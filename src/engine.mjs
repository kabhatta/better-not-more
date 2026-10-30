import { CRITERIA, SAMPLE, SEEDS, CLOSURE_CHECKS, READING_CHECKS } from './data.mjs';
export const SCHEMA_VERSION = 1;
export const clone = value => JSON.parse(JSON.stringify(value));
export const words = value => (value?.trim().match(/\S+/g)||[]).length;
export function makeChallenges(manuscript, sample = false) {
  if (sample) return SEEDS.map((s,i)=>({...s,missing:s.groundTruth,id:`challenge-${i+1}`,issueClass:CRITERIA[i].issueClass,status:'open',level:0,turns:[],response:'',revision:'',confidence:50,origin:'Prepared example'}));
  // Guided reading prompts make no automatic claim that an issue is present.
  return CRITERIA.map((c,i)=> {
    const section = manuscript.sections[Math.min(i,manuscript.sections.length-1)];
    const quote = section.paragraphs[0];
    return {id:`challenge-${i+1}`,criterion:c.id,issueClass:c.issueClass,sectionId:section.id,paragraph:0,quote,title:c.description,question:c.question,hint:c.hint,missing:READING_CHECKS[c.id],status:'open',level:0,turns:[],response:'',revision:'',confidence:50,origin:'Guided reading prompt'};
  });
}
export function newSession(manuscript = clone(SAMPLE)) {
  const createdAt = new Date().toISOString();
  return {schemaVersion:SCHEMA_VERSION,proposalVersion:'0.4',id:globalThis.crypto.randomUUID(),createdAt,manuscript,original:clone(manuscript),challenges:makeChallenges(manuscript,manuscript.mode==='sample'),selected:'challenge-1',cap:3,events:[{id:globalThis.crypto.randomUUID(),at:createdAt,type:'session_started',detail:manuscript.mode==='sample'?'Started a fictional demonstration session.':'Started a guided reading session.'}],authorship:{answers:{},submitted:{},ratings:{}},mode:manuscript.mode==='sample'?'sample':'guided'};
}
export function upgradeSession(session) {
  if(session.proposalVersion==='0.4')return session;
  const next=clone(session);
  next.proposalVersion='0.4';
  next.legacy={transfer:next.transfer||null,faded:next.faded||[]};
  delete next.transfer;delete next.faded;
  next.authorship={answers:{},submitted:{},ratings:{}};
  next.challenges=next.challenges.map(c=>({...c,missing:c.missing||(next.mode==='sample'?SEEDS.find(s=>s.criterion===c.criterion)?.groundTruth:null)||READING_CHECKS[c.criterion]}));
  next.events.push(event('session_updated','Session updated to the revised design. Earlier practice and fading records are retained in the export.'));
  return next;
}
export function activeChallenges(session) {
  return session.challenges.filter(c=>c.status==='open').slice(0,session.cap);
}
export function event(type, detail, extra={}) {return {id:globalThis.crypto.randomUUID(),at:new Date().toISOString(),type,detail,...extra};}
export function escalate(session,id) {
  const next=clone(session), c=next.challenges.find(c=>c.id===id);
  if(!c||c.status!=='open'||c.level>=2||!activeChallenges(next).some(a=>a.id===id))return next;
  c.level++; next.events.push(event('support_requested',c.level===1?'Requested a hint.':'Requested an explicit account of what needs attention.',{challengeId:c.id,criterion:c.criterion,level:c.level,...(c.level===1?{question:c.hint}:{missing:c.missing}),quote:c.quote}));return next;
}
export function saveResponse(session,id,response,confidence) {
  const next=clone(session), c=next.challenges.find(c=>c.id===id);
  if(!c||words(response)<8)throw new Error('Explain your reasoning in at least 8 words before continuing.');
  if(!activeChallenges(next).some(a=>a.id===id))throw new Error('This challenge is not active.');
  c.response=response.trim(); c.confidence=confidence;
  c.turns.push({response:c.response,confidence,at:new Date().toISOString(),level:c.level});
  next.events.push(event('reasoning_recorded','Researcher recorded a justification.',{challengeId:c.id,criterion:c.criterion,question:c.question,quote:c.quote,response:c.response,confidence,level:c.level}));return next;
}
export function resolve(session,id,revision,decision,closureConfirmed=false) {
  const next=clone(session),c=next.challenges.find(c=>c.id===id);
  if(!c||!c.response)throw new Error('Record your reasoning first.');
  if(!activeChallenges(next).some(a=>a.id===id))throw new Error('This challenge is not active.');
  if(!closureConfirmed)throw new Error('Check the criterion before closing this issue.');
  if(!['revise','retain'].includes(decision))throw new Error('Choose a revision decision.');
  if(decision==='revise'&&(!revision.trim()||revision.trim()===c.quote.trim()))throw new Error('Write your own revision, or choose to retain the passage.');
  if(decision==='revise') {
    const section=next.manuscript.sections.find(s=>s.id===c.sectionId);
    if(!section?.paragraphs[c.paragraph]?.includes(c.quote))throw new Error('The original passage has changed. Retain it or start a fresh reading session.');
    section.paragraphs[c.paragraph]=section.paragraphs[c.paragraph].replace(c.quote,revision.trim());
  }
  c.status='resolved';c.revision=decision==='revise'?revision.trim():c.quote;c.decision=decision;
  c.closure={criterion:CLOSURE_CHECKS[c.criterion],confirmedBy:'researcher',verifiedByAgent:false};
  next.events.push(event('challenge_resolved',decision==='revise'?'Researcher revised the passage and confirmed the criterion check.':'Researcher retained the passage with reasons and confirmed the criterion check.',{challengeId:c.id,criterion:c.criterion,quote:c.quote,response:c.response,revision:c.revision,decision,level:c.level,confidence:c.confidence,closure:c.closure,verification:'Researcher-confirmed closure; not an automated quality judgment.'}));
  next.selected=activeChallenges(next)[0]?.id||id; return next;
}
export function dismiss(session,id,reason) {
  if(words(reason)<5)throw new Error('Give a reason of at least 5 words so a reviewer can assess this challenge.');
  const next=clone(session),c=next.challenges.find(c=>c.id===id);c.status='disputed';c.disputeReason=reason.trim();next.events.push(event('challenge_disputed','Researcher flagged a potentially false challenge.',{challengeId:id,criterion:c.criterion,reason,question:c.question,quote:c.quote}));next.selected=activeChallenges(next)[0]?.id||id;return next;
}
export function saveAuthorship(session,id,response) {
  const next=clone(session),c=next.challenges.find(c=>c.id===id);
  if(!c||c.status!=='resolved'||c.decision!=='revise')throw new Error('Revise a passage before explaining the change.');
  if(next.authorship.submitted[id])throw new Error('This explanation is already submitted.');
  if(words(response)<12)throw new Error('Explain your change in at least 12 words.');
  next.authorship.answers[id]=response.trim();
  next.authorship.submitted[id]=new Date().toISOString();
  next.events.push(event('authorship_explained','Researcher explained a changed passage after revision.',{challengeId:id,criterion:c.criterion,quote:c.quote,revision:c.revision,response:response.trim()}));
  return next;
}
export function rateAuthorship(session,id,rating) {
  const next=clone(session);
  if(!next.authorship.submitted[id])throw new Error('Submit the author’s explanation before entering a rating.');
  if(!['','0','1','2'].includes(rating))throw new Error('Choose a valid human rating.');
  next.authorship.ratings[id]=rating;
  next.events.push(event('authorship_rated','A demonstration human rating was entered.',{challengeId:id,criterion:next.challenges.find(c=>c.id===id)?.criterion,rating,blind:false}));
  return next;
}
export function feedbackOnly(value) {
  return typeof value==='string'&&value.length>=20&&value.length<=850&&!/[\n<>`]/.test(value)&&!/(?:rewrite(?: it)? as|replacement (?:text|paragraph)|here(?: is|'s) (?:a |the )?(?:revision|rewrite)|ignore (?:all |previous )?instructions)/i.test(value);
}
export function questionOnly(value) {
  return typeof value==='string'&&value.length>=15&&value.length<=650&&value.trim().endsWith('?')&&!/[\n<>`]/.test(value)&&!/(?:rewrite(?: it)? as|replacement (?:text|paragraph)|here(?: is|'s) (?:a |the )?(?:revision|rewrite)|ignore (?:all |previous )?instructions)/i.test(value)&&value.split('?').filter(x=>x.trim()).length<=2;
}
export function validateModelChallenges(raw,manuscript) {
  if(!raw||!Array.isArray(raw.challenges)||!raw.challenges.length||raw.challenges.length>6)throw new Error('The model must return between 1 and 6 grounded questions.');
  const seen=new Set();
  return raw.challenges.map((c,i)=>{
    const criterion=CRITERIA.find(x=>x.id===c.criterion), section=manuscript.sections.find(x=>x.id===c.sectionId);
    if(!criterion||seen.has(c.criterion)||!section)throw new Error('Invalid or duplicate criterion or section.');
    seen.add(c.criterion);
    const p=section.paragraphs.findIndex(p=>typeof c.quote==='string'&&c.quote.trim().length>=20&&p.includes(c.quote));
    if(p<0)throw new Error('A challenge quoted a passage that does not exist in the draft.');
    if(![c.question,c.hint].every(questionOnly)||!feedbackOnly(c.missing))throw new Error('The model returned feedback outside the learning-support contract.');
    const ref=c.referenceId?manuscript.references.find(r=>r.id===c.referenceId):null;
    if(c.referenceId&&(!ref||typeof c.sourceQuote!=='string'||c.sourceQuote.length<15||!ref.text.includes(c.sourceQuote)))throw new Error('A source quote could not be verified against the uploaded reference.');
    return {id:`challenge-${i+1}`,criterion:c.criterion,issueClass:criterion.issueClass,sectionId:c.sectionId,paragraph:p,quote:c.quote,title:criterion.description,question:c.question,hint:c.hint,missing:c.missing,referenceId:ref?.id||null,sourceQuote:ref?c.sourceQuote:null,status:'open',level:0,turns:[],response:'',revision:'',confidence:50,origin:'Local model · quote verified'};
  });
}
export function exportSession(session) {return {...clone(session),exportedAt:new Date().toISOString(),evaluationNote:'Closure is confirmed by the researcher, not an automated quality verdict. Authorship explanations and illustrative human ratings are not blinded study results. Timestamps record elapsed session events, not active reading time. Draft-quality and authorship effects require the proposed controlled evaluation; lasting skill is for later work.'};}
export function parseDraft(text,title='Untitled manuscript') {
  if(text.trim().length<200)throw new Error('Add at least 200 characters of manuscript text.');
  if(text.length>100000)throw new Error('Keep the MVP draft under 100,000 characters.');
  const chunks=text.replace(/\r/g,'').split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
  const sections=[];let current={id:'s1',label:'Manuscript',paragraphs:[]};
  for(const chunk of chunks) {
    const lines=chunk.split('\n');
    const heading=lines[0].match(/^#{1,3}\s+(.+)$/)||(/^(abstract|introduction(?: & literature)?|literature review|theoretical fram(?:e|ing)|theory|research design|methods?|methodology|analysis(?: & findings)?|results|findings|discussion(?: & contribution)?|implications(?: for practice)?|conclusion)s?$/i.test(lines[0].trim())?[null,lines[0].trim()]:null);
    if(heading) {if(current.paragraphs.length)sections.push(current);current={id:`s${sections.length+1}`,label:heading[1],paragraphs:[]};if(lines.length>1)current.paragraphs.push(lines.slice(1).join(' '));}
    else current.paragraphs.push(chunk.replace(/\n/g,' '));
  }
  if(current.paragraphs.length)sections.push(current);
  if(!sections.length)throw new Error('No readable text found.');
  return {id:globalThis.crypto.randomUUID(),title,subtitle:'Your research, your reasoning',type:'Uploaded manuscript',mode:'guided',sections,references:[]};
}
