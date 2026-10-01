export function handlePhoneServices(context, storage, effects, log) {
  if(!context||context.unsupported)return;
  const {action,phone,app,configuration}=context;
  const request=/^phone (view|choose) (.+)$/i.exec(action);
  if(!context.openApp&&!context.explicitOpen&&!request)return;
  if(context.openApp?.id===configuration.storeAppId)return;
  if(!app || (context.explicitOpen&&!context.openApp)){
    if(context.explicitOpen)completePhoneAction(context,storage,effects,log,'That app is not in this phone catalog.\n[phone store] App Store');
    return;
  }
  if(!phone.installedIds.includes(app.id)){
    completePhoneAction(context,storage,effects,log,app.label+' is not installed.\n[phone store] App Store');return;
  }
  if(request&&phone.screen!=='app')return;
  const page=request?app.pages.find(page=>page.name.toLowerCase()===request[2].toLowerCase()):
    context.openApp&&app.openPage?app.pages.find(page=>page.name===app.openPage):null;
  // A generated detail is model-mediated browsing within the current page.
  if(request&&request[1].toLowerCase()==='view'&&!page)return;
  if(page?.kind==='workshop')return;
  if(page?.kind==='directory'&&(!request||request[1].toLowerCase()==='view'))return;
  phone.screen='app';phone.appId=app.id;phone.directory=null;
  const selector=app.label.toUpperCase()+'\n'+(app.summary?app.summary+'\n':'')+app.pages.map(page=>'[phone '+(page.startsActivity?'choose ':'view ')+page.name.toLowerCase()+'] '+page.name).join('\n')+'\n[phone home] Phone home';
  if(!page || (request&&request[1].toLowerCase()!==(page.startsActivity?'choose':'view'))){phone.page=null;completePhoneAction(context,storage,effects,log,selector);return;}
  phone.page=page.name;
  const generation='Present the '+app.label+' '+page.name+' page. '+(app.guidance||'')+' '+page.guidance+' '+
    (page.startsActivity?'The player explicitly requested this named activity. Resolve its stated scope under the existing world rules. ':'This is browsing. Show relevant content and choices, then await the player. ')+
    'Use established state for orders, messages, contracts and appointments; distinguish proposed offers from accepted records. '+
    'Write generated follow-up choices as ordinary chat requests. Only the supplied phone commands are registered controls. '+
    (page.contextReader==='location'?'Current location data: '+JSON.stringify({location:context.check({type:'party-location'}),area:context.check({type:'party-area'})})+' ':'')+
    (page.contextReader==='clock'&&configuration.clockStorageKey?'Clock context data: '+JSON.stringify(storage[configuration.clockStorageKey]??null).slice(0,1000)+' ':'');
  completePhoneAction(context,storage,effects,log,app.label.toUpperCase()+' - '+page.name+'\n[phone home] Phone home',generation);
}
