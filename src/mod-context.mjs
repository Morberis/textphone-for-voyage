// Shared native boundary. Configuration is JSON in inert, named trigger records.
// No eval, network, inventory possession gate, or model-authored configuration.
export function readPhoneConfiguration(triggers) {
  const records = Object.entries(triggers).filter(([id]) => id.startsWith('phone_mod_config_'));
  const settings = records.find(([id]) => id === 'phone_mod_config_settings');
  const parse = record => {
    const script = record?.[1]?.script;
    if (typeof script !== 'string' || !script.startsWith('/* PHONE CONFIG\n') || !script.endsWith('\n*/')) throw Error('Invalid phone configuration record');
    return JSON.parse(script.slice(16, -3));
  };
  const configuration = parse(settings);
  configuration.apps = records.filter(([id]) => id !== 'phone_mod_config_settings').map(parse).sort((a,b) => a.order-b.order);
  for(const app of configuration.apps)if(app.directory?.entryRecords)app.directory.entries=app.directory.entryRecords.flatMap(id=>parse([id,triggers[id]]));
  return configuration;
}

export function createPhoneContext(storage, triggers, check) {
  const actions = check({type:'action-text'});
  const players = Object.keys(check({type:'player-level'}) || {});
  if (!Array.isArray(actions) || actions.length !== 1 || typeof actions[0] !== 'string') return null;
  const action = actions[0].trim();
  if (!action || action.length > 400) return null;
  // Native action-text does not expose a verified player binding in this adapter.
  // Never assign a multiplayer action to a guessed actor.
  if (players.length !== 1) return {unsupported:true,action};
  const configuration = readPhoneConfiguration(triggers);
  const actorName = players[0];
  const actorKey = JSON.stringify(actorName);
  const tick = check({type:'game-tick'});
  const root = storage.phone_mod || {schemaVersion:1,players:{}};
  if (root.schemaVersion !== 1 || !root.players || typeof root.players !== 'object') throw Error('Unsupported phone save');
  const previous = root.players[actorKey];
  const phone = previous ? JSON.parse(JSON.stringify(previous)) : {
    installedIds:configuration.initialInstalledIds.slice(), revealedIds:[], columns:configuration.columns,
    screen:'closed',appId:null,page:null,directory:null,shortcuts:{},revision:0,lastHandled:null
  };
  const knownIds = configuration.apps.map(app=>app.id);
  phone.installedIds = phone.installedIds.filter(id=>knownIds.includes(id));
  if (!phone.installedIds.includes(phone.appId)) {phone.appId=null;phone.page=null;phone.directory=null;if(phone.screen==='app')phone.screen='home';}
  const claimed = new Set();
  const priorKeys=phone.shortcuts||{};
  phone.shortcuts = {};
  for (const id of phone.installedIds) {
    const app = configuration.apps.find(app=>app.id===id);
    const candidates = [app.preferredShortcut,...app.label.toUpperCase().replace(/[^A-Z0-9]/g,''),'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'].filter(Boolean).join('');
    const retained=priorKeys[id];
    const shortcut = /^[A-Z0-9]$/.test(retained)&&!claimed.has(retained)?retained:[...candidates].find(key=>!claimed.has(key));
    if(shortcut){phone.shortcuts[id]=shortcut;claimed.add(shortcut);}
  }
  for (const app of configuration.apps) {
    const granted = storage.phone_mod_unlocks?.[actorKey]?.[app.id] === true;
    const known = app.unlockKnownEntity && check({type:'known-entity',entity:app.unlockKnownEntity}) === true;
    if ((granted || known) && !phone.revealedIds.includes(app.id)) phone.revealedIds.push(app.id);
  }
  const receipt = JSON.stringify([tick,action]);
  if (phone.lastHandled === receipt) return null;
  const context={action,actorName,actorKey,tick,receipt,configuration,phone,root,check};
  const explicit=/^phone open (.+?)[.!]?$/i.exec(action);
  context.openApp=explicit?configuration.apps.find(app=>app.label.toLowerCase()===explicit[1].toLowerCase()):
    phone.screen==='home'?configuration.apps.find(app=>phone.shortcuts[app.id]?.toLowerCase()===action.toLowerCase()):null;
  context.explicitOpen=Boolean(explicit);
  context.app=context.openApp||configuration.apps.find(app=>app.id===phone.appId);
  return context;
}

export function phoneHomeText(context) {
  const {phone,configuration}=context;
  const rows=phone.installedIds.map(id=>'['+phone.shortcuts[id]+' - '+configuration.apps.find(app=>app.id===id).label+']');
  const lines=[];
  for(let index=0;index<rows.length;index+=phone.columns?2:1)lines.push(rows.slice(index,index+(phone.columns?2:1)).join('   '));
  return 'PHONE\n'+lines.join('\n')+'\nType a shortcut or phone open APP NAME.\n'+(configuration.storeAppId?'[phone store] App Store | ':'')+'[close phone] Close';
}

export function completePhoneAction(context, storage, effects, log, screen, generation=null) {
  context.phone.lastHandled=context.receipt;
  context.root.players[context.actorKey]=context.phone;
  storage.phone_mod=context.root;
  const contract='PHONE INTERFACE for '+context.actorName+'. This turn ends on the requested phone screen, awaiting the player. '+
    'Use dash-separated field labels. '+
    'Render the screen as Narrator text with every supplied word-bearing row. Use the listed apps and shortcuts as authoritative; '+
    'brief surroundings can accompany it. Preserve the world\'s normal time handling. The current action authorizes only this navigation or stated request. '+
    'Purchases, applications, hires, messages and travel occur only following the player\'s explicit choices. ';
  effects.push({type:'story',instruction:contract+(generation?generation+'\nRequired heading and controls:\n'+screen:'Current screen:\n'+screen)});
  log('PHONE_MOD '+JSON.stringify({actor:context.actorName,tick:context.tick,app:context.phone.appId,page:context.phone.page,screen:context.phone.screen,revision:context.phone.revision}));
}
