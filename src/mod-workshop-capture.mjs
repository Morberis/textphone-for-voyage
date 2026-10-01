export function capturePhoneWorkshop(context,storage,check,log) {
  if(!context)return;
  const session=context.phone.workshop;
  if(!session||session.status!=='drafting'||session.awaitingConcept||session.draftTick!==context.tick||!context.app)return;
  const proposal=readWorkshopProposal(check({type:'story-text'}),session.sequence,session.revision);
  if(!proposal){log('TEXTPHONE_WORKSHOP incomplete proposal; confirmation remains unavailable');return;}
  try{
    context.phone.workshop=recordWorkshopDraft(session,context.actor,session.revision,proposal);
    context.root.players[context.key]=context.phone;storage.phone_mod=context.root;
    log('TEXTPHONE_WORKSHOP captured revision '+session.sequence+'.'+session.revision);
  }catch(error){log('TEXTPHONE_WORKSHOP rejected proposal; confirmation remains unavailable');}
}
