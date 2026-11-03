export const EXHIBITS = [
  {
    id:'gsap-framecheck-cards', title:'产品发布的卡片级联短片',
    date:'2026-10-20', version:'v1',
    preview:'assets/gsap-framecheck-cards/v1/preview.png',
    entry:'assets/gsap-framecheck-cards/v1/index.html',
    tags:['发布短片','卡片','GSAP']
  },
  {
    id:'seek-t-morph-reel', title:'产品发布的连续变形短片',
    date:'2026-10-20', version:'v1',
    preview:'assets/seek-t-morph-reel/v1/preview.png',
    entry:'assets/seek-t-morph-reel/v1/index.html',
    tags:['发布短片','连续变形','动态图形']
  },
  {
    id:'editorial-kinetic-type', title:'品牌片头的空间字体编排',
    date:'2026-10-20', version:'v1',
    preview:'assets/editorial-kinetic-type/v1/preview.png',
    entry:'assets/editorial-kinetic-type/v1/index.html',
    tags:['字体','排版','品牌片头']
  },
  {
    id:'three-ink-linework', title:'品牌短片的三种线稿材质',
    date:'2026-10-20', version:'v1',
    preview:'assets/three-ink-linework/v1/preview.png',
    entry:'assets/three-ink-linework/v1/index.html',
    tags:['线稿','材质','品牌短片']
  },
  {
    id:'annotated-3d-cutaway', title:'产品结构的三维剖解展示',
    date:'2026-10-20', version:'v1',
    preview:'assets/annotated-3d-cutaway/v1/preview.png',
    entry:'assets/annotated-3d-cutaway/v1/index.html',
    tags:['3D','三维','剖面','产品展示']
  },
  {
    id:'living-cover', title:'封面的流动材质与指针响应',
    date:'2026-10-15', version:'v1',
    preview:'assets/previews/living-cover.jpg',
    entry:'exhibit.html#living-cover', embedSlug:'living-cover',
    tags:['封面','动态材质','WebGL'],
    reference:{title:'23rd',url:'https://23rd.dev/'}
  },
  {
    id:'image-compare', title:'图像版本的滑动与并排对比',
    date:'2026-10-15', version:'v1',
    preview:'assets/previews/image-compare.jpg',
    entry:'exhibit.html#image-compare', embedSlug:'image-compare',
    tags:['图像对比','滑动','审阅'],
    reference:{title:'Bencho',url:'https://bencho.dev/'}
  },
  {
    id:'reorder-list', title:'列表条目的拖动排序',
    date:'2026-10-15', version:'v1',
    preview:'assets/previews/reorder-list.jpg',
    entry:'exhibit.html#reorder-list', embedSlug:'reorder-list',
    tags:['列表','拖动排序','撤销'],
    reference:{title:'Bencho',url:'https://bencho.dev/'}
  },
  {
    id:'agent-progress', title:'批量任务的进度与失败恢复',
    date:'2026-10-15', version:'v1',
    preview:'assets/previews/agent-progress.jpg',
    entry:'exhibit.html#agent-progress', embedSlug:'agent-progress',
    tags:['进度反馈','批量任务','重试'],
    reference:{title:'Beautiful UI',url:'https://beautifului.dev/'}
  },
  {
    id:'remove-experience', title:'列表条目的移除确认与撤销',
    date:'2026-10-13', version:'v2',
    preview:'assets/previews/remove-experience.jpg',
    entry:'exhibit.html#remove-experience', embedSlug:'remove-experience',
    tags:['列表','原地确认','撤销'],
    reference:{title:'Arc UI',url:'https://uiarc.dev/components/confirm-morph'}
  }
];

export const exhibitById = id => EXHIBITS.find(exhibit => exhibit.id === id);
export const sortedExhibits = [...EXHIBITS].sort((a,b) => b.date.localeCompare(a.date));
export const normalize = value => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('zh-CN');
export function matchesExhibit(exhibit, query = '') {
  const words = normalize([exhibit.title, exhibit.description, ...(exhibit.tags ?? [])].join(' '));
  return normalize(query).split(/\s+/).filter(Boolean).every(term => words.includes(term));
}
