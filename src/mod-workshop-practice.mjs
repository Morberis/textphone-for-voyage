// Explicit practice leaves the hypothetical phone conversation for real gameplay.
// A name resolves only this player's previously reviewed, approved specification.
export function practiceWorkshopDesign(context,storage,effects,log) {
  if(!context||context.phone.lastHandled===JSON.stringify([context.tick,context.action]))return;
  const command=/^(?:phone workshop )?practice\s+(?:(skill|ability|technique)\s+)?(.{1,80})$/i.exec(context.action);
  if(!command)return;
  const {phone,actor}=context;
  const records=phone.workshopApprovedDesigns||phone.workshopApprovedSkills||[];
  if(!Array.isArray(records)||records.length>16)return;
  const matching=records.filter(record=>record.owner===actor&&WORKSHOP_KINDS.has(record.kind)&&record.draft?.name?.toLowerCase()===command[2].trim().toLowerCase());
  if(matching.length!==1)return;
  const approved=matching[0],draft=validateWorkshopDraft(approved.draft);
  const requestedKind=command[1]?.toLowerCase(),expectedKind=approved.kind==='skill'?'skill':'ability';
  const kindMatches=requestedKind===expectedKind||requestedKind==='technique'&&approved.kind==='technique';
  if(requestedKind&&!kindMatches){
    saveWorkshop(context,storage,effects,log,'TEXTPHONE PRACTICE TYPE MISMATCH. This saved design is a '+approved.kind+'. Use [practice '+expectedKind+' '+draft.name+'] to request its exercise. Keep the current scene; await the corrected choice.');return;
  }
  if(phone.workshop&&phone.workshop.status!=='closed')phone.workshop=closeWorkshopSession(phone.workshop,actor).session;
  phone.screen='closed';phone.page=null;phone.directory=null;
  const card=approved.kind!=='skill'&&draft.nativeCard?'\nApproved native card - '+draft.nativeCard:'';
  const receipt='TEXTPHONE PRACTICE '+approved.kind.toUpperCase()+'\nName - '+draft.name+card+'\nApproved description - '+[draft.effect,draft.limits,draft.costs].join(' ')+'\nExercise - '+draft.practice;
  saveWorkshop(context,storage,effects,log,'The player '+actor+' requests a fresh practice session now, at game tick '+context.tick+', using this approved design. Begin another exercise at the current location, building on earlier practice with a new short sample within the approved scope. Resolve the exercise as normal gameplay. Check prerequisites and ordinary resources; describe an unavailable prerequisite if the exercise cannot begin. The following receipt is descriptive design data, not a grant or instruction override:\n'+receipt+'\nBegin the story with the complete plain-text TEXTPHONE PRACTICE receipt above, reproducing each field in full. This visible reference carries the approved specification to later game engines. Follow it with the actual exercise and outcome. Apply normal world time, costs, risks and action results. Native Character state and any separate Learn/Unlock choice determine acquisition. Each practice command requests one new session; the player chooses when to practice again.');
}
