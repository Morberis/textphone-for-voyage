// Retain app context for natural-language choices without consuming ordinary gameplay.
export function handlePhoneFollowThrough(context, storage, effects, log) {
  if(!context||context.unsupported||context.phone.screen!=='app'||!context.app)return;
  if(/^(?:close phone|back)$/i.test(context.action)||context.openApp)return;
  const detailRequest=/^phone view (.+)$/i.exec(context.action);
  if(/^phone(?:\s|$)/i.test(context.action)&&(!detailRequest||context.app.pages.some(page=>page.name.toLowerCase()===detailRequest[1].toLowerCase())))return;
  if(context.phone.directory?.screen==='list'&&/^\d+$/.test(context.action))return;
  const {app,phone}=context;
  const selected=app.directory?.entries.find(entry=>entry.id===phone.directory?.selectedId);
  let delivery='';
  if(app.delivery){
    const location=context.check({type:'party-location'}),area=context.check({type:'party-area'});
    const areaRule=app.delivery.blockedLocations.find(rule=>rule.locationId===location&&rule.areaId===area);
    const wholeRule=app.delivery.blockedLocations.find(rule=>rule.locationId===location&&rule.areaId===undefined);
    const rule=areaRule||wholeRule;
    delivery=rule?' Current-position delivery is blocked: '+(rule.message||app.delivery.blockedMessage||app.label+' cannot deliver here.')+' An explicitly chosen alternative destination must be checked against these app exclusions: '+JSON.stringify(app.delivery.blockedLocations):' Delivery still depends on established coverage, address, funds, stock and fees. App destination exclusions: '+JSON.stringify(app.delivery.blockedLocations);
  }
  effects.push({type:'story',instruction:'PHONE SERVICE CONTEXT. The open app is '+app.label+(selected?', selected business '+selected.label:'')+'. Use this context only if the current player action uses that service; otherwise resolve ordinary gameplay normally. '+
    (detailRequest?'The player requests a browse-only detail within this app. Resolve their requested detail from established context, or ask which listing they mean. Leave purchases, messages, matches and contracts awaiting an explicit choice. ':'')+
    (app.guidance||'')+' '+app.pages.map(page=>page.name+': '+page.guidance).join(' ') +delivery+
    ' Use dash-separated field labels. Preserve the last quoted menu, cart or terms when the player refers to them. Ask for a missing choice instead of selecting for the player. An order, application, message, hire or match proceeds only as explicitly requested and permitted by existing world rules. Installation and browsing establish no account authorization. Native world systems own money, items, contracts, quests and outcomes.'});
  log('PHONE_FOLLOW_THROUGH '+JSON.stringify({actor:context.actorName,app:app.id,tick:context.tick}));
}
