import fs from 'fs';
import assert from 'assert';
import { VERSION as moduleVersion } from '../src/index';
import { VERSION as BuildVersion } from '../lib/commonjs/index';

const { version } = JSON.parse(fs.readFileSync('../package.json', 'utf8'));

console.debug('Checking versions...\n----------------------------');
console.debug(`Package version: v${version}`);
console.debug(`RNStepCounter version: v${moduleVersion}`);
console.debug(`RNStepCounter build version: v${BuildVersion}`);
console.debug('----------------------------');

assert.strictEqual(
  version,
  moduleVersion,
  `Version mismatch between package and RNStepCounter ${version} != ${moduleVersion}`
);

assert.strictEqual(version, BuildVersion, `Version mismatch between package and build ${version} != ${BuildVersion}`);

console.debug('✔️ PASSED\n');
