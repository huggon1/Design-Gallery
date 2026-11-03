import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesExhibit} from '../catalog.mjs';
import {resolveRoute} from '../routes.mjs';

test('标题和可选字段支持统一搜索', () => {
  assert(matchesExhibit({title:'列表拖动排序'}, '  排序  '));
  assert(matchesExhibit({title:'材质',tags:[]}, ''));
  assert(matchesExhibit({title:'封面',tags:['WebGL','动态材质']}, 'webgl 材质'));
  assert(matchesExhibit({title:'对比',description:'按住切换'}, '切换'));
  assert(!matchesExhibit({title:'列表拖动排序'}, '换装'));
});

test('旧作品路径和案例参数定位到独立展品', () => {
  for (const hash of ['#living-cover','#/work/living-cover','#/web/topic/living-cover']) {
    assert.equal(resolveRoute(hash).id,'living-cover');
  }
  assert.equal(resolveRoute('#/video/topic/product-launch?case=seek-t-morph-reel').id,'seek-t-morph-reel');
  assert.equal(resolveRoute('#/video/topic/product-launch').id,'gsap-framecheck-cards');
  assert.equal(resolveRoute('#/video/topic/product-launch?case=invalid').id,'gsap-framecheck-cards');
});

test('列表、旧分区及返回上下文保留搜索条件', () => {
  for (const hash of ['#/all?q=排序','#/web?q=排序','#/room/visual?q=排序']) {
    assert.equal(resolveRoute(hash).url,'#/?q=%E6%8E%92%E5%BA%8F');
  }
  const route=resolveRoute('#/exhibit/reorder-list?from='+encodeURIComponent('/?q=排序&tag=交互'));
  assert.equal(route.back,'#/?q=%E6%8E%92%E5%BA%8F&tag=%E4%BA%A4%E4%BA%92');
  assert.equal(resolveRoute('#/exhibit/reorder-list?from=https://example.com/').back,'#/');
  assert.equal(resolveRoute('#/exhibit/reorder-list?from=/?q=排序#ignored').back,'#/?q=%E6%8E%92%E5%BA%8F');
  assert.equal(resolveRoute('#/exhibit/unknown').kind,'missing');
});
