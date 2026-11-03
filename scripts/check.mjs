import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd = fileURLToPath(new URL('../',import.meta.url));
const commands = [
  ['--check','app.mjs'],['--check','catalog.mjs'],['--check','routes.mjs'],
  ['--check','scripts/sync-posts.mjs'],['--test','scripts/catalog.test.mjs'],
  ['scripts/check-content.mjs'],['scripts/sync-posts.mjs','--check']
];
for (const args of commands) {
  const result = spawnSync(process.execPath,args,{cwd,stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
