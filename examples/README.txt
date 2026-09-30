CUSTOM APP EXAMPLES — Modular Phone Interface 0.5.0

Start with config/generic-phone.json. App examples are objects to add to its apps array, not complete worlds. Use a unique id and order for every app. Build after every edit:
  node native/build-mod.mjs config/generic-phone.json build/custom-mod.json
  node native/merge-world.mjs original.json build/custom-mod.json new-world.json

transit-app.json
  A normal generated Routes page plus an explicit Request ticket activity.
  Players type phone view routes to browse and phone choose request ticket to ask.
  The activity requests a destination and quote; the host resolves an actual purchase.

store-app.json
  A complete delivery app with two candidate businesses, location/area messages,
  a directory opening page, and generated order history.

store-known.json / store-all_public.json / store-curated.json
  Alternative complete store apps showing the three directory policies.
  Use ONE of these alternatives, or change IDs/labels/orders before combining.
  known checks native known-entity. all_public includes every public candidate
  in this app's configured list. curated also requires an ID in curatedIds.
  public:false excludes a candidate under every policy.

hidden-app.json + reveal-trigger.json
  Add the app object to apps; leave it out of initialInstalledIds.
  Add the trigger under a unique HOST trigger key outside phone_mod_.
  In Studio: Content > Mechanics > Advanced > Triggers.
  Replace Restore the Relay with an actual quest/condition from your world.
  The example script writes a grant for exactly one player. The phone reads it
  next time it processes that player's command. Reveal does not install the app.
  The native test used an action-text trigger. This example quest condition
  was source-checked and its script tested offline, not played to completion.

complete-example-config.json
  A complete buildable configuration combining the generic phone, transit,
  a delivery store and a hidden app. Replace synthetic locations/quests before
  using it in a real world. It does not contain the reveal trigger itself.

OTHER COMMON OPTIONS
  columns:true selects paired Home for new phone state. Players can change it:
    phone layout paired
    phone layout single
  initialInstalledIds lists stable app IDs, including the storeAppId.
  preferredShortcut:"T" requests T; a collision gets another free key.
  removable:false protects a custom app's installation state.
  appStoreVisibility:"triggered" hides a download until revealed.
  unlockKnownEntity:"Guild Hall" reveals when native known-entity is true.
  clockStorageKey:"public_clock" reads a compact public host storage record.
    Example host writer: storage.public_clock={date:"2040-05-03",time:"09:20"};
  Keep the writer synchronized with your existing calendar. This phone does
  not create a second clock or schedule alarms by itself.

All properties above are configuration fields. Set them at the correct level
shown in the Creator Guide. The player can change layout in chat; discovery,
delivery, protection and reveal rules are creator settings, not player toggles.

TESTING
  Open each page; test an ordinary follow-up; compare stored phone state,
  emitted instruction, visible reply and the host's money/items/quests.
  The narrator can contradict a correct screen or protected state. Do not
  describe a successful script assertion as proof of perfect narration.

No device requirement is implemented. Multiplayer input is not supported by
the current identity adapter. Existing saves are not automatically migrated.
