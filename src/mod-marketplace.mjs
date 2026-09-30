export function handlePhoneMarketplace(context, storage, effects, log) {
  if(!context||context.unsupported)return;
  const {action,phone,configuration}=context;
  const install=/^phone install (.+)$/i.exec(action),remove=/^phone uninstall (.+)$/i.exec(action);
  const opening=/^phone store[.!]?$/i.test(action)||context.openApp?.id===configuration.storeAppId;
  if(!install&&!remove&&!opening)return;
  if(!configuration.storeAppId){
    phone.screen='home';phone.appId=null;phone.page=null;phone.directory=null;
    completePhoneAction(context,storage,effects,log,'App Store is disabled in this world.\n'+phoneHomeText(context));return;
  }
  const available=app=>app.appStoreVisibility!=='triggered'||phone.revealedIds.includes(app.id)||phone.installedIds.includes(app.id);
  let notice='';
  if(install||remove){
    const label=(install||remove)[1].toLowerCase();
    const app=configuration.apps.find(app=>app.label.toLowerCase()===label);
    if(!app||(!available(app)&&install))notice='That app is unavailable for download. Installed apps remain unchanged.';
    else if(install){
      if(phone.installedIds.includes(app.id))notice=app.label+' is already installed.';
      else{phone.installedIds.push(app.id);phone.revision++;notice=app.label+' installed. Service account access and agreements are unchanged.';}
    }else if(app.id===configuration.storeAppId||app.removable===false)notice=app.label+' is a core app and remains installed.';
    else if(phone.installedIds.includes(app.id)){phone.installedIds=phone.installedIds.filter(id=>id!==app.id);phone.revision++;notice=app.label+' uninstalled. Existing account, orders and contracts are retained.';}
    else notice=app.label+' is not installed.';
  }
  phone.screen='app';phone.appId=configuration.storeAppId;phone.page=null;phone.directory=null;
  const screen='APP STORE\n'+(notice?notice+'\n':'')+configuration.apps.filter(available).map(app=>app.label+' - '+(phone.installedIds.includes(app.id)?'Installed':'Available')+(app.summary?' - '+app.summary:'')).join('\n')+
    '\nType phone install APP NAME or phone uninstall APP NAME.\n[phone home] Phone home';
  completePhoneAction(context,storage,effects,log,screen);
}
