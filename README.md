# TextPhone for Voyage

A configurable phone inside Voyage story chat: dynamic apps and shortcuts, an App Store, business directories and narrator-generated pages.

**Version 0.6.0 — tested preview.** Single player. Narration can omit or contradict the scripted screen; this is not a transaction engine. Clock is disabled until connected to a suitable host time system. Every app can be enabled or disabled.

- [Documentation website](https://morberis.github.io/textphone-for-voyage/)
- [Download the Neon Circuit creator guide](https://morberis.github.io/textphone-for-voyage/downloads/Creator-Guide.pdf)
- [Download the ready-to-use package](https://morberis.github.io/textphone-for-voyage/downloads/textphone-for-voyage-0.6.0.zip)
- [API reference](API-REFERENCE.txt) · [Verification and limits](VERIFICATION.txt) · [Examples](examples/README.txt)

## Install

1. Download and unzip the package. Preserve a complete original world export and make a test remix.
2. Open `build/generic-phone-installer.html` locally and choose your complete world JSON. Prepare and download a separate updated world.
3. Save that **complete** JSON in the remix's Studio Content editor; read it back and start a fresh test game. The partial mod JSON must never replace a complete world.
4. Try `phone`, `phone store` and the displayed shortcuts. Review the creator guide before enabling custom features.

Native Mods Apply is not verified. Existing saves are not automatically migrated. The HTML installer's merge logic is checked offline; direct complete-export merging was exercised in Studio.

## Develop

Requires Node 20 or newer; no npm install or runtime dependencies.

```sh
npm test
npm run build
node native/merge-world.mjs original.json build/generic-phone-mod.json new-world.json
```

Edit `config/generic-phone.json`; rebuild both the mod and HTML installer. The shared engine lives in `src/`; `native/` contains build and merge tools. `examples/` covers hidden apps, store filters, delivery messages and generated pages. See `API-REFERENCE.txt` for state, host connections and limits.

## Documentation sources

`documentation/guide.json` is the full guide source. `tools/build-site.py` generates the static site; `tools/build-guide.py` generates the PDF with ReportLab. Install ReportLab for PDF authoring only. The renderer uses Arial/Consolas from Windows Fonts, or a `TEXTPHONE_FONT_DIR` directory containing arial.ttf, arialbd.ttf and consola.ttf. Font files are not distributed. `docs/` is the GitHub Pages publishing folder. No private world export, credentials or gameplay save belongs in this repository.

## License

MIT covers the original TextPhone code and documentation. Third-party world material and assets remain separate and are not relicensed by this project. See [MIT](LICENSE) and [provenance](THIRD_PARTY_NOTICES.md).
