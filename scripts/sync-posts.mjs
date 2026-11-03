import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {EXHIBITS,exhibitById} from '../catalog.mjs';
import {exhibitUrl,legacyGroups} from '../routes.mjs';

const check = process.argv.includes('--check');
const files = new Map();
for (const exhibit of EXHIBITS) {
  const fields = {title:exhibit.title,collected_at:exhibit.date,version:exhibit.version,
    preview:'../'+exhibit.preview,entry:'../index.html'+exhibitUrl(exhibit.id)};
  if (exhibit.tags?.length) fields.tags = exhibit.tags;
  let text = '---\n'+Object.entries(fields).map(([key,value]) => key+': '+JSON.stringify(value)).join('\n')+'\n---\n\n';
  text += `# ${exhibit.title}\n\n![${exhibit.title}](../${exhibit.preview})\n\n[打开作品](../index.html${exhibitUrl(exhibit.id)})\n`;
  if (exhibit.description) text += '\n'+exhibit.description+'\n';
  if (exhibit.reference) text += `\n[参考 ${exhibit.reference.title}](${exhibit.reference.url})\n`;
  files.set(exhibit.id+'.md',text);
}
for (const [id,children] of Object.entries(legacyGroups)) {
  const exhibits = children.map(exhibitById).filter(Boolean);
  files.set(id+'.md','# 发布短片\n\n'+exhibits.map(exhibit => `- [${exhibit.title}](${exhibit.id}.md)`).join('\n')+'\n');
}
if (!check) await mkdir(new URL('../posts/',import.meta.url),{recursive:true});
let stale = 0;
for (const [name,text] of files) {
  const file = new URL('../posts/'+name,import.meta.url);
  if (check) {
    if (await readFile(file,'utf8').catch(() => null) !== text) { console.error('帖子待同步：'+name); stale++; }
  } else await writeFile(file,text);
}
if (stale) process.exitCode = 1;
else console.log(`${check ? '帖子与馆藏一致' : '帖子已同步'}：${EXHIBITS.length} 件展品。`);
