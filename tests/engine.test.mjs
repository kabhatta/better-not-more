import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,activeChallenges,escalate,saveResponse,resolve,dismiss,saveAuthorship,rateAuthorship,upgradeSession,exportSession,feedbackOnly,validateModelChallenges,parseDraft,questionOnly,clone} from '../src/engine.mjs';
import {SAMPLE,SEEDS} from '../src/data.mjs';

test('all six curated challenges and source quotes have exact evidence',()=>{
  const s=newSession();assert.equal(s.challenges.length,6);
  for(const c of s.challenges){const section=s.manuscript.sections.find(x=>x.id===c.sectionId);assert.ok(section.paragraphs[c.paragraph].includes(c.quote));if(c.referenceId)assert.ok(s.manuscript.references.find(r=>r.id===c.referenceId).text.includes(c.sourceQuote));for(const q of [c.question,c.hint])assert.ok(questionOnly(q));assert.ok(feedbackOnly(c.missing));}
});
test('orchestrator caps open work and promotes the next criterion after resolution',()=>{
  let s=newSession();assert.deepEqual(activeChallenges(s).map(x=>x.criterion),['literature','linkage','methods']);
  assert.throws(()=>saveResponse(s,'challenge-4','This queued challenge should not accept any responses yet.',50));
  s=saveResponse(s,'challenge-1','The source has mixed results for junior workers, so the universal claim is unsupported.',70);
  s=resolve(s,'challenge-1','The association differs by seniority in the two sampled firms.','revise',true);
  assert.equal(activeChallenges(s).length,3);assert.equal(activeChallenges(s).at(-1).criterion,'analysis');
  assert.ok(s.manuscript.sections[0].paragraphs[1].includes('differs by seniority'));
  assert.ok(s.original.sections[0].paragraphs[1].includes('for all employees'));
  assert.equal(s.events.at(-1).revision,'The association differs by seniority in the two sampled firms.');
});
test('escalation stops after stating the gap and cannot unlock a queued criterion',()=>{
  let s=newSession();for(let i=0;i<5;i++)s=escalate(s,'challenge-1');assert.equal(s.challenges[0].level,2);assert.equal(s.events.filter(e=>e.type==='support_requested').length,2);
  assert.equal(escalate(s,'challenge-6').challenges[5].level,0);
});
test('researcher reasoning is required and unchanged revisions are rejected',()=>{
  let s=newSession();assert.throws(()=>resolve(s,'challenge-1','New prose','revise',true));assert.throws(()=>saveResponse(s,'challenge-1','Looks wrong',90));
  s=saveResponse(s,'challenge-1','The claim is justified only in the narrower setting that these researchers examined.',65);
  assert.throws(()=>resolve(s,'challenge-1',s.challenges[0].quote,'revise',true));s=resolve(s,'challenge-1','','retain',true);assert.equal(s.challenges[0].decision,'retain');assert.deepEqual(s.manuscript,s.original);
});
test('disagreements log evidence and advance the queue without endorsing correctness',()=>{let s=newSession();s=dismiss(s,'challenge-1','This challenge overlooks the qualification in the preceding paragraph.');assert.equal(s.challenges[0].status,'disputed');assert.equal(activeChallenges(s).length,3);assert.equal(s.events.at(-1).type,'challenge_disputed');assert.ok(s.events.at(-1).quote);});
test('closing requires an explicit criterion check and cannot close twice',()=>{
  let s=saveResponse(newSession(),'challenge-1','The original claim overstates findings for a limited population and setting.',75);
  assert.throws(()=>resolve(s,'challenge-1','A narrower claim grounded in the source.','revise'),/criterion/);
  assert.deepEqual(s.manuscript,s.original);
  s=resolve(s,'challenge-1','A narrower claim grounded in the source.','revise',true);
  assert.equal(s.challenges[0].closure.verifiedByAgent,false);
  assert.throws(()=>resolve(s,'challenge-1','','retain',true),/not active/);
});
test('authorship review uses actual revisions, preserves explanations, and requires submission before rating',()=>{
  let s=newSession();
  const explanation='I narrowed the claim to the studied population because junior employees reported mixed experiences, and the source cannot establish causation.';
  assert.throws(()=>saveAuthorship(s,'challenge-1',explanation));
  assert.throws(()=>rateAuthorship(s,'challenge-1','2'));
  s=saveResponse(s,'challenge-1','The claim overstates the source because junior employees reported mixed experiences.',75);
  s=resolve(s,'challenge-1','Remote work was associated with greater discretion among senior workers in two firms.','revise',true);
  assert.throws(()=>saveAuthorship(s,'challenge-1','I fixed it.'));
  s=saveAuthorship(s,'challenge-1',explanation);
  assert.equal(s.events.at(-1).quote,SEEDS[0].quote);assert.equal(s.events.at(-1).revision,s.challenges[0].revision);
  assert.throws(()=>saveAuthorship(s,'challenge-1',explanation));
  assert.throws(()=>rateAuthorship(s,'challenge-1','3'));
  s=rateAuthorship(s,'challenge-1','0');assert.equal(s.authorship.ratings['challenge-1'],'0');assert.equal(s.events.at(-1).blind,false);
  assert.equal(exportSession(s).authorship.answers['challenge-1'],explanation);
});
test('upgrading preserves earlier drafts and practice records while restoring the revised question queue',()=>{
  const old=newSession();delete old.proposalVersion;delete old.authorship;
  old.transfer={answers:{t1:{response:'A saved response from the earlier version.'}},submitted:false,ratings:{}};old.faded=['citation-scope'];delete old.challenges[0].missing;
  const next=upgradeSession(old);
  assert.deepEqual(next.manuscript,old.manuscript);assert.deepEqual(next.legacy.transfer,old.transfer);
  assert.equal(next.challenges[0].missing,SEEDS[0].groundTruth);assert.equal(activeChallenges(next)[0].criterion,'literature');
  assert.deepEqual(upgradeSession(next),next);assert.equal(next.events.length,old.events.length+1);
});
test('model output is rejected for invented evidence, prose, fake references, or duplicate criteria',()=>{
  const valid={challenges:[clone(SEEDS[0])]};assert.equal(validateModelChallenges(valid,SAMPLE).length,1);
  for(const patch of [{quote:'This invented quotation does not exist in the draft.'},{question:'Here is a revision: Remote work improves autonomy.'},{referenceId:'fake',sourceQuote:'A fabricated source quote.'},{sourceQuote:'A fabricated source quote.'},{criterion:'unknown'},{missing:'Here is a replacement paragraph for your manuscript.'},{missing:null}])assert.throws(()=>validateModelChallenges({challenges:[{...valid.challenges[0],...patch}]},SAMPLE));
  assert.throws(()=>validateModelChallenges({challenges:[valid.challenges[0],valid.challenges[0]]},SAMPLE));
});
test('manuscript import preserves text and headings; rejects empty and excessive content',()=>{const draft=parseDraft('# Introduction\n\n'+SAMPLE.sections[0].paragraphs[0]+'\n\n# Methods\n\n'+SAMPLE.sections[2].paragraphs[0],'My draft');assert.equal(draft.sections.length,2);assert.equal(draft.sections[1].label,'Methods');assert.equal(draft.mode,'guided');assert.throws(()=>parseDraft('Too short'));assert.throws(()=>parseDraft('x'.repeat(100001)));});
test('guided prompts attach to actual uploaded paragraphs without claiming detected defects',()=>{const s=newSession(parseDraft(SAMPLE.sections[0].paragraphs.join('\n\n')));for(const c of s.challenges){assert.equal(c.origin,'Guided reading prompt');assert.ok(s.manuscript.sections.find(p=>p.id===c.sectionId).paragraphs.includes(c.quote));}});
