#!/usr/bin/env node
const os = require('os');
const path = require('path');
const subprocesses = require('child_process');
const process = require('process');

const root = path.resolve(__dirname, '..');
const { argv, cwd, env } = process;
const args = argv.slice(2);
const stdio = 'inherit';
const encoding = 'utf-8';

/**
 * It's creating an object with the following properties:
 * @type {subprocesses.SpawnSyncOptionsWithStringEncoding}
 * @prop {NodeJS.ProcessEnv} env: The environment variables of the current process.
 * @prop {subprocesses.IOType} stdio: The standard input/output/error streams of the current process.
 * @prop {BufferEncoding} encoding: The encoding of the standard input/output/error streams of the current process.
 * @prop {string} cwd: The current working directory of the current process.
 */
const options = { env, stdio, encoding, cwd: cwd() };

/**
 * It's setting the `shell` property of the `options` object to `true`
 * if the current operating system is Windows.
 */
if (os.type() === 'Windows_NT') {
  options.shell = true;
}

let result;

/**
 * If the current working directory is not the root of the project,
 * or if additional arguments were passed,
 * then forward the command to `yarn`. Otherwise,
 * otherwise, `yarn` is run without arguments, perform bootstrap.
 */
if (cwd() !== root || args.length) {
  result = subprocesses.spawnSync('yarn', args, options);
} else {
  result = subprocesses.spawnSync('yarn', ['bootstrap'], options);
}

process.exitCode = result.status || 0;
