export function submitPhoneWorkshop(context,storage,effects,log) {
  if(!context)return;
  const {phone,app,actor,action,tick}=context,session=phone.workshop;
  if(!app||phone.screen!=='app'||!phone.installedIds.includes(app.id)||!session||session.status==='closed')return;
  if(phone.lastHandled===JSON.stringify([tick,action]))return;
  if(/^phone workshop (?:revise|confirm)$/i.test(action)){
    const status=session.status==='requested'?'This design is saved; use practice '+(session.kind==='skill'?'skill':'ability')+' '+session.approved.draft.name+' to begin its exercise.':
      /revise$/i.test(action)?'Describe the desired changes in ordinary chat. The current specification remains pending.':
      session.status==='review'?'To approve the current reviewed design, enter phone confirm '+session.sequence+'.'+session.revision+'.':'Ask for a complete proposal before confirmation.';
    saveWorkshop(context,storage,effects,log,'TEXTPHONE WORKSHOP. '+status+' Nothing new was approved.');return;
  }
  if(/^phone learn skill(?:\s|$)/i.test(action)){
    saveWorkshop(context,storage,effects,log,'Use phone confirm '+session.sequence+'.'+session.revision+' to save the reviewed design, then practice its name. This older command approves nothing.');return;
  }
  const confirm=/^phone confirm ([1-9][0-9]*)\.([1-9][0-9]*)$/i.exec(action);
  if(!confirm)return;
  if(Number(confirm[1])!==session.sequence||Number(confirm[2])!==session.revision||session.status==='drafting'){
    saveWorkshop(context,storage,effects,log,'The current complete proposal is required before approval. Ask for the proposal again or request a revision. Nothing was approved.');return;
  }
  const records=phone.workshopApprovedDesigns||phone.workshopApprovedSkills||[];
  if(session.status==='review'&&(!Array.isArray(records)||records.length>=16||records.some(record=>record.draft.name.toLowerCase()===session.draft.name.toLowerCase()))){
    saveWorkshop(context,storage,effects,log,'This design name is already saved, or sixteen designs are already stored. Choose a distinct name if necessary. The current design remains unapproved.');return;
  }
  const approval=confirmWorkshopDraft(session,actor,Number(confirm[2]));phone.workshop=approval.session;
  if(!approval.submission){saveWorkshop(context,storage,effects,log,'This exact design is already saved. Use practice '+(session.kind==='skill'?'skill':'ability')+' '+session.approved.draft.name+' when ready.');return;}
  phone.workshopApprovedDesigns=[...records,approval.submission];delete phone.workshopApprovedSkills;
  const draft=approval.submission.draft;
  saveWorkshop(context,storage,effects,log,'TEXTPHONE DESIGN SAVED for '+actor+'. Stay on the phone screen at the current location. Approved design data: '+JSON.stringify(draft)+'. Show the complete approved design, including limits and costs. Status - Saved for practice; acquisition is a later native decision. This action only saves a design. End with [practice '+(session.kind==='skill'?'skill':'ability')+' '+draft.name+'] Begin the introductory exercise; [phone workshop cancel] Leave workshop.');
}
