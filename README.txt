TEXTPHONE FOR VOYAGE — VERSION0.6.0 TESTED PREVIEW

START HERE
1. Read the included Creator Guide, especially the verification pages.
2. Preserve a COMPLETE world export from Voyage Studio Content.
3. Open build/generic-phone-installer.html locally, choose that export,
   and prepare/download a separate updated complete world JSON.
4. Add the prepared COMPLETE JSON to a test remix in Studio Content, save,
   read it back and start a new test game. Do not overwrite the whole world
   with the partial *-phone-mod.json file.

Alternative verified merge logic using Node20+:
  node native/merge-world.mjs original.json build/generic-phone-mod.json new-world.json

The HTML installer's logic was checked offline; its live browser UI was
blocked in the authoring environment. The complete-export merge was applied
through Studio and the full saved world matched. Native Mods > Apply has
not been verified; this package does not claim a published mod listing.

EDIT / BUILD
  Edit config/generic-phone.json.
  node native/build-mod.mjs config/generic-phone.json build/generic-phone-mod.json
  node native/build-installer.mjs build/generic-phone-mod.json build/generic-phone-installer.html "Modular Phone"
  npm test
No npm install is needed. Rebuilding the JSON alone does not update an old
HTML installer; rebuild BOTH when you use the HTML route.

CUSTOM APPS
See examples/README.txt and the PDF for generated pages, explicit activities,
known/public/curated stores, per-app delivery rules, hidden downloads,
shortcuts/layout, and host connections. API-REFERENCE.txt explains runtime
storage and functions. Optional creator improvements are listed in the guide.

CLOCK DEFAULT
Every app has an enabled switch. Clock defaults off. Read CLOCK-SETUP.txt
to configure apps and enable Clock with a suitable time
system. Changing this default does not migrate existing saves.

KNOWN LIMITS
Scripts track the phone, but narration can omit or contradict a correct
screen. Live tests found wrong uninstall text and layout, and invented
choices. View VERIFICATION.txt for detailed results. Multiplayer is not
supported by the current identity adapter. Existing saves are not migrated.

UNINSTALL / ROLLBACK
Keep the original export. To undo a test deployment, restore that definition
in your test remix and start a fresh game. For a later world with unrelated
edits, first export the current definition; remove only trigger keys starting
phone_mod_ and the exact prepended text in narrator-bridge.txt from
AI > Story > How to Use the Narrator. Preserve the remaining instructions.
Review the diff before saving. Existing game saves keep their old scripts
and phone state; this package provides no automatic save rollback.

UPGRADE
Use one profile per world. The merger replaces its namespace, not unrelated
triggers. A different existing phone bridge is a review error; compare it
with narrator-bridge.txt before replacing. Older phone implementations or
other namespaces need an explicit migration review. Do not stack profiles.

CONTENTS
Creator Guide PDF: instructions, examples, comparisons, API and checklist.
build/: ready-built partial mod JSON and offline complete-export installer.
config/: editable profile(s). src/ and native/: reusable source/tools.
examples/: valid copyable configurations and a reveal-trigger example.
test/: relevant repeatable checks. MANIFEST.json: file digests.

PROVENANCE
Independently authored phone integration using acquired Latitude trigger
documentation and observed production behavior, September2026, engine36.
Not an official Latitude feature. This package contains no credentials,
populated game saves or complete private world export. No public license
for underlying world content or third-party assets is granted here.

LICENSE
MIT covers the original TextPhone code and documentation. Third-party world material and assets remain separate and are not relicensed by this project. See LICENSE and THIRD_PARTY_NOTICES.md.
