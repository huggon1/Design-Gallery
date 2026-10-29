import {writeFile,readFile} from 'node:fs/promises';
import {DOMAINS,THEMES,themeDate} from '../catalog.mjs';
const check=process.argv.includes('--check');
const files=new Map();
const link=(theme,sample)=>`../index.html#/${theme.domain}/topic/${theme.id}?case=${sample.id}`;
const image=sample=>sample.embedSlug?`assets/${sample.id}/${sample.version}/preview.png`:sample.preview;
for(const theme of THEMES){
  const first=theme.cases[0],domain=DOMAINS.find(domain=>domain.id===theme.domain),category=domain.categories.find(category=>category.id===theme.category);
  let text=`---\ntitle: ${theme.title}\ncollected_at: ${themeDate(theme)}\ndomain: ${theme.domain}\ncategory: ${theme.category}\ntheme: ${theme.id}\ncases: ${JSON.stringify(theme.cases.map(sample=>sample.id))}\npreview: ../${image(first)}\nentry: ${link(theme,first)}\n---\n\n# ${theme.title}\n\n${domain.title} / ${category.title}\n`;
  for(const sample of theme.cases){if(theme.cases.length>1)text+=`\n## ${sample.title}\n`;text+=`\n![${sample.title}](../${image(sample)})\n\n[体验${theme.cases.length>1?'此案例':''}](${link(theme,sample)})\n\n${sample.description}\n\n收录 ${sample.date} · ${sample.version} · [参考 ${sample.reference}](${sample.source.startsWith('https://')?sample.source:'../'+sample.source})\n`;}
  files.set(theme.id+'.md',text);
  for(const sample of theme.cases){if(sample.id===theme.id)continue;files.set(sample.id+'.md',`---\ntitle: ${sample.originalTitle||sample.title}\ncollected_at: ${sample.date}\nversion: ${sample.version}\ndomain: ${theme.domain}\ncategory: ${theme.category}\ntheme: ${theme.id}\ncase: ${sample.id}\npreview: ../${image(sample)}\nentry: ${link(theme,sample)}\n---\n\n# ${sample.originalTitle||sample.title}\n\n此案例归入[${theme.title}](${theme.id}.md)主题。\n\n[体验${sample.title}](${link(theme,sample)})\n`);}
}
let stale=0;
for(const [name,text] of files){const file=new URL('../posts/'+name,import.meta.url);if(check){const current=await readFile(file,'utf8').catch(()=>null);if(current!==text){console.error('帖子待同步：'+name);stale++;}}else await writeFile(file,text);}
if(stale)process.exitCode=1;else console.log(`${check?'帖子与馆藏一致':'帖子已同步'}：${THEMES.length} 个主题，${files.size} 个主题/兼容入口文件。`);
