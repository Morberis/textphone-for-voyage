// Bundled with the pure lifecycle and workshop context, separately from the
// ordinary phone router so detailed design input does not expand all commands.
export function handlePhoneWorkshop(context,storage,effects,log,triggers) {
  if(!context)return;
  const {phone,app,action,actor,tick}=context;
  let session=phone.workshop;
  const close=/^(?:phone(?: home| store| back)?|back|close phone|phone open .+|phone uninstall .+|phone workshop cancel)$/i.test(action);
  const request=/^phone view (.+)$/i.exec(action);
  const page=request&&app?.pages.find(page=>page.name.toLowerCase()===request[1].toLowerCase());
  if(session&&session.status!=='closed'&&(close||!app||!phone.installedIds.includes(app.id)||phone.page!==session.pageName||page&&page.kind!=='workshop')){
    phone.workshop=closeWorkshopSession(session,actor).session;
    context.root.players[context.key]=phone;storage.phone_mod=context.root;
    if(/^phone workshop cancel$/i.test(action)){
      phone.page=null;
      saveWorkshop(context,storage,effects,log,'TEXTPHONE WORKSHOP CLOSED. '+(session.approved?'The approved design remains saved for practice.':'The unsubmitted design is cancelled.')+' Return to the app menu and await the player.');
    }
    return;
  }
  if(!app||phone.screen!=='app'||!phone.installedIds.includes(app.id))return;
  if(phone.lastHandled===JSON.stringify([tick,action]))return;
  if(page?.kind==='workshop'){
    if(session&&session.status!=='closed'){
      saveWorkshop(context,storage,effects,log,'Continue this design, or use phone workshop cancel before starting another.');return;
    }
    phone.workshop=beginWorkshopSession(session,actor,page.workshopKind,'Await the player\'s initial concept.');
    phone.workshop.awaitingConcept=true;phone.workshop.draftTick=tick;phone.workshop.pageName=page.name;phone.page=page.name;phone.directory=null;
    saveWorkshop(context,storage,effects,log,'TEXTPHONE '+page.name.toUpperCase()+' on '+app.label+' at the current location. Ask for the '+page.workshopKind+' concept, scope, theme and limits; await the answer. Design discussion only. [phone workshop cancel] Cancel.');return;
  }
  if(!session||session.status==='closed'||phone.page===null)return;
  if(/^(?:phone confirm |practice\s)/i.test(action))return;
  if(/^phone(?:\s|$)/i.test(action))return;
  if(session.status==='requested'){
    saveWorkshop(context,storage,effects,log,'TEXTPHONE saved design: '+JSON.stringify(session.approved.draft)+'. Answer the player\'s design question on screen. Show practice '+(session.kind==='skill'?'skill':'ability')+' '+session.approved.draft.name+' to begin its exercise. Native acquisition comes from actual Character state. Use phone workshop cancel to leave.');return;
  }
  session=reviseWorkshopSession(session,actor,action);session.awaitingConcept=false;session.draftTick=tick;
  phone.workshop=session;saveWorkshop(context,storage,effects,log,workshopPrompt(session,app,triggers));
}
