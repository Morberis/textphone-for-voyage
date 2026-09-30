export function handlePhoneHome(context, storage, effects, log) {
  if (!context) return;
  if(context.unsupported){
    if(/^phone(?:\s|$)/i.test(context.action)) effects.push({type:'story',instruction:'The phone mod cannot attribute this multiplayer input reliably. Leave every player phone unchanged and use the world\'s normal narration for this request.'});
    return;
  }
  const {action,phone}=context;
  const columns=/^phone columns (on|off)$/i.exec(action);
  const layout=/^phone layout (single|paired)$/i.exec(action);
  const home=/^(?:phone(?: home)?|(?:I )?(?:open|check) my phone)[.!]?$/i.test(action);
  const close=/^(?:close phone|(?:I )?put (?:away my phone|my phone away))[.!]?$/i.test(action);
  const back=/^(?:phone )?back$/i.test(action);
  if(!columns&&!layout&&!home&&!close&&!back)return;
  // Directory Back belongs to the directory handler, regardless of trigger order.
  if(back&&phone.directory)return;
  if(columns)phone.columns=columns[1].toLowerCase()==='on';
  if(layout)phone.columns=layout[1].toLowerCase()==='paired';
  phone.screen=close?'closed':'home';phone.appId=null;phone.page=null;phone.directory=null;
  completePhoneAction(context,storage,effects,log,close?'PHONE CLOSED':phoneHomeText(context));
}
