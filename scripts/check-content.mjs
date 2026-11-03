import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {EXHIBITS} from '../catalog.mjs';

const root = fileURLToPath(new URL('../',import.meta.url));
assert.equal(new Set(EXHIBITS.map(exhibit => exhibit.id)).size,EXHIBITS.length,'展品 ID 重复');
function localFile(value,label) {
  assert.equal(typeof value,'string',label);
  const target = path.resolve(root,value.split(/[?#]/)[0]);
  assert(target.startsWith(root),label+' 位于站点目录外');
  assert(existsSync(target),label+' 文件缺失');
}
for (const exhibit of EXHIBITS) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(exhibit.id),'展品 ID 格式');
  assert.equal(typeof exhibit.title,'string',exhibit.id+' 标题');
  assert(exhibit.title.trim(),exhibit.id+' 标题为空');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(exhibit.date),exhibit.id+' 日期格式');
  assert.equal(new Date(exhibit.date).toISOString().slice(0,10),exhibit.date,exhibit.id+' 日期');
  assert.equal(typeof exhibit.version,'string',exhibit.id+' 版本');
  assert(exhibit.version.trim(),exhibit.id+' 版本为空');
  localFile(exhibit.preview,exhibit.id+' 预览');
  localFile(exhibit.entry,exhibit.id+' 入口');
  if (exhibit.tags !== undefined) {
    assert(Array.isArray(exhibit.tags),exhibit.id+' 标签数组');
    assert(exhibit.tags.every(tag => typeof tag === 'string' && tag.trim()),exhibit.id+' 标签文本');
    assert.equal(new Set(exhibit.tags).size,exhibit.tags.length,exhibit.id+' 重复标签');
  }
  if (exhibit.description !== undefined) assert.equal(typeof exhibit.description,'string');
  if (exhibit.reference) {
    assert(exhibit.reference.title?.trim(),exhibit.id+' 来源名称');
    assert(/^https?:\/\//.test(exhibit.reference.url),exhibit.id+' 来源 URL');
  }
}
console.log(`馆藏完整性通过：${EXHIBITS.length} 件展品，入口、预览和可选字段有效。`);
