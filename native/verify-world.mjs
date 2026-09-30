import fs from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
const [expectedPath, savedPath] = process.argv.slice(2);
if (!expectedPath || !savedPath) throw Error('Usage: node native/verify-world.mjs PREPARED.json SAVED.json');
const expectedWorld = JSON.parse(await fs.readFile(expectedPath, 'utf8'));
const savedWorld = JSON.parse(await fs.readFile(savedPath, 'utf8'));
if (!isDeepStrictEqual(expectedWorld, savedWorld)) {
  console.error('Mismatch: saved world differs from prepared world. Review a local JSON diff before playtesting.');
  process.exitCode = 1;
} else {
  console.log('PASS: saved complete world matches the prepared world (formatting and object-key order ignored).');
}
