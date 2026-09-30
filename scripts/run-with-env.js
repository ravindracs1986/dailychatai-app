/**
 * Runs a command with only the specified env file loaded.
 * Temporarily renames other .env* files so Next.js won't load them (and override our env).
 * Restores them when the process exits.
 *
 * Usage: node scripts/run-with-env.js <envfile> -- <command> [args...]
 * Example: node scripts/run-with-env.js .env.dev -- next dev -p 5005
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const bakSuffix = '._nextbak';

const envFilesToHide = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.production',
  '.env.production.local',
];

function renameToBak(filename) {
  const filepath = path.join(rootDir, filename);
  const bakpath = path.join(rootDir, filename + bakSuffix);
  if (fs.existsSync(filepath)) {
    fs.renameSync(filepath, bakpath);
    return filename;
  }
  return null;
}

function restoreFromBak(filename) {
  const filepath = path.join(rootDir, filename);
  const bakpath = path.join(rootDir, filename + bakSuffix);
  if (fs.existsSync(bakpath)) {
    fs.renameSync(bakpath, filepath);
    return filename;
  }
  return null;
}

function restoreAll(renamed) {
  (renamed || []).forEach((f) => restoreFromBak(f));
}

const args = process.argv.slice(2);
const dashIdx = args.indexOf('--');
if (dashIdx === -1 || args.length < 2) {
  console.error('Usage: node scripts/run-with-env.js <envfile> -- <command> [args...]');
  process.exit(1);
}

const envFile = path.resolve(rootDir, args[0]);
const commandArgs = args.slice(dashIdx + 1);
if (commandArgs.length === 0) {
  console.error('No command given after --');
  process.exit(1);
}

if (!fs.existsSync(envFile)) {
  console.error(`Env file not found: ${envFile}`);
  process.exit(1);
}

const renamed = [];
for (const f of envFilesToHide) {
  const r = renameToBak(f);
  if (r) renamed.push(r);
}

function run() {
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'npx.cmd' : 'npx';
  const child = spawn(cmd, ['env-cmd', '-f', envFile, '--', ...commandArgs], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: isWindows,
  });

  child.on('exit', (code, signal) => {
    restoreAll(renamed);
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}

const cleanup = () => {
  restoreAll(renamed);
  process.exit(0);
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

run();
