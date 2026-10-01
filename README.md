# TextPhone for Voyage

A modular chat phone for Voyage. Version **0.7.0** adds separate skill, ability and technique workshops: propose, revise, explicitly approve, then practice through normal gameplay. Voyage controls actual learning, offers and purchases.

## Install in Voyage

The creator package includes a complete native Mod draft. Create a Mod in Studio, put `build/generic-phone-voyage-mod.json` in its Content root, save, then use your world's **Mods → Add draft → Apply**. Preserve a complete backup and use a test copy first. The mod draft must never replace a populated world. The HTML installer remains available for host-instruction conflicts and upgrade reconciliation.

[Read the creator documentation](https://morberis.github.io/textphone-for-voyage/) · [PDF](docs/downloads/Creator-Guide.pdf) · [API](API-REFERENCE.txt)

## Local development

Node.js 20 or newer; no dependencies, npm install or API key. `npm test` runs offline checks. `npm run build` builds the profile and local installer; `node native/build-draft.mjs build/generic-phone-mod.json build/generic-phone-voyage-mod.json` builds the complete native draft. The pinned native baseline contains required Voyage defaults, not an export of a populated user world.

Edit `config/` to add apps, enable or disable them, configure discovery, delivery rules and hidden downloads. Creator documentation includes examples and upgrading an existing installation.

## Limits

Single-player adapter. The narrator renders screens and can deviate. Workshop discussion is not an engine pause, approval is not a grant, practice has no fixed acquisition threshold, and generated ability descriptions need review. Clock is disabled until a creator supplies a suitable time connection; the native built-in clock is not script-readable.

## License

MIT covers TextPhone code. Third-party Voyage defaults and world material remain separate; see [notices](THIRD_PARTY_NOTICES.md).
