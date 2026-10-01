// Only supply stored meaning for an actually held, explicitly named skill.
// A submitted design alone never declares the skill learned.
export function remindWorkshopSkill(context,check,effects,log) {
  if(!context||/^(?:phone workshop )?practice\s/i.test(context.action)||context.phone.workshop&&context.phone.workshop.status!=='closed')return;
  const records=context.phone.workshopApprovedDesigns||context.phone.workshopApprovedSkills;
  if(!Array.isArray(records)||records.length>16)return;
  for(const record of records){
    if(record.owner!==context.actor||record.kind!=='skill')continue;
    const draft=validateWorkshopDraft(record.draft);
    if(!context.action.toLowerCase().includes(draft.name.toLowerCase()))continue;
    const values=check({type:'skill-value',skill:draft.name.toLowerCase()});
    const level=values&&typeof values==='object'?values[context.actor]:undefined;
    if(!Number.isFinite(level)||level<0)continue;
    effects.push({type:'story',instruction:'TEXTPHONE approved design data for '+context.actor+'\'s already learned '+draft.name+' skill: '+JSON.stringify(draft)+'. Apply this established scope to the current requested use, while native skill level, action outcome and host rules remain authoritative.'});
    log('TEXTPHONE_WORKSHOP skill context supplied');break;
  }
}
