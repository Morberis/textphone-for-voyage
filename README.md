# TextPhone for Voyage

A configurable phone in Voyage story chat, with full source for **local development and offline tests** plus tools for **deployment into Voyage**.

Version 0.6.0, tested preview. Single player. Scripts track the interface; narrator output can still contradict it. Clock starts disabled until connected to a suitable host time system.

- [Full documentation](https://morberis.github.io/textphone-for-voyage/)
- [Creator guide PDF](https://morberis.github.io/textphone-for-voyage/downloads/Creator-Guide.pdf)
- [API reference](API-REFERENCE.txt) · [Examples](examples/README.txt) · [Verification](VERIFICATION.txt)

[Download the generic creator package](docs/downloads/textphone-for-voyage-0.6.0.zip): installer, editable example configuration, creator/API guide and license notices. Adapt the example businesses to your world. For builders and app examples, obtain the full source with **Code > Download ZIP**. The customized Your Power is What package is distributed separately.

## 1. Test and build locally

Extract the source and open a terminal in the folder containing `package.json`. Node.js with npm is needed here. The declared minimum is Node 20; current local verification uses Node 24.19.0. Node 20 itself has not been tested for this release.

```sh
node --version
npm --version
npm test
npm run build
```

No `npm install`, API key, Voyage account or paid generation is needed. Tests use a simulated Voyage scripting environment: they verify routing, toggles, state, merging and installer events, not AI narration or native chat rendering. This is a development/test harness, not a standalone Voyage game.

Edit `config/generic-phone.json` for your apps and host connections. Replace synthetic businesses and location mappings with entries from your world. Rerun tests and build after edits. Build produces `build/generic-phone-mod.json` (partial trigger payload) and `build/generic-phone-installer.html` (browser merger with that profile embedded).

## 2. Prepare a complete merged world

1. In Voyage, make a test copy using the source detail page **More > Remix**, or your own world’s **More > Duplicate**. Give it a `TEST__...` name and record its identity/purpose.
2. In that copy’s Studio, choose **Content** at the top and select the top-level **Content** file-tree entry. The breadcrumb should be just **Content**. Choose **View JSON** if needed.
3. Select **Download initial GameState JSON** above the editor. Keep the complete original; this is not a running-save or single-section export.
4. Create `local-worlds` inside the project and save the backup as `local-worlds/original.json`. This folder is ignored by Git. Keep world exports and saves private.
5. From the project folder, run this single-line command:

```sh
node native/merge-world.mjs local-worlds/original.json build/generic-phone-mod.json local-worlds/with-phone.json
```

The tool prints retained/installed record counts and writes a **new complete world**. It replaces only `phone_mod_` triggers and adds the narrator bridge once at `aiInstructions.generateStory["How to Use the Narrator"]`, retaining other fields. A different existing phone bridge causes a review error. It refuses to overwrite an existing output, so use a fresh output name for another attempt.

**Browser alternative:** open `build/generic-phone-installer.html` locally, choose **Original world JSON**, select **Prepare updated world**, review the report, then **Download updated world JSON** or **Copy complete JSON**. It needs no Node when already built. It sends no files anywhere. Rebuild it after changing the profile. Neither route installs anything into Voyage by itself.

## 3. Add the result in Voyage

1. Open `local-worlds/with-phone.json` in a text editor and copy all its text, or use **Copy complete JSON** in the browser merger.
2. Return to the identified test world’s **Studio > Content** root; choose **View JSON** if needed. Confirm the breadcrumb is just **Content**, not a trigger/category.
3. Click inside **Studio initial GameState JSON editor**, select all its text with Ctrl+A (Cmd+A on macOS), and paste the **complete merged JSON**. Use **Save** in the toolbar. This is a full editor replacement with the merged complete file; do not paste `build/generic-phone-mod.json` here.
4. Reload Studio, download the saved initial GameState JSON again, and store it as `local-worlds/saved-world.json`. Compare it with the prepared file:

```sh
node native/verify-world.mjs local-worlds/with-phone.json local-worlds/saved-world.json
```

Success prints `PASS`. It compares all parsed data while ignoring formatting and object-key order. On mismatch, review a local JSON diff before playtesting. Without Node, use a JSON-aware comparison tool.

5. Start a **fresh test game** from this world. Record the save, send `phone`, `phone store`, and a shortcut actually displayed on Home. Exercise your apps/toggles and ordinary play; compare narration with stored state. Retire unneeded test saves after saving the results.

Existing saves are not migrated. Native **Mods > Apply** is unverified; this guide uses the complete-export editor route. Purchases, jobs and messages remain host-world/narrator outcomes.

## Project layout and documentation builds

`src/`: runtime/merger; `config/`: editable profile; `native/`: build, merge and readback tools; `test/`: offline checks; `examples/`: custom app configurations. `documentation/guide.json` is the complete guide source; `tools/build-site.py` renders the website and `tools/build-guide.py` renders the PDF. Run these with Python from the project. PDF authoring additionally needs ReportLab and Arial/Consolas fonts (Windows Fonts, or `TEXTPHONE_FONT_DIR` containing arial.ttf, arialbd.ttf and consola.ttf). These dependencies are not needed to use or test TextPhone. `docs/` is the Pages publishing folder.

## License

MIT covers the original TextPhone code and documentation. Third-party world material and assets remain separate. See [LICENSE](LICENSE) and [provenance](THIRD_PARTY_NOTICES.md).
