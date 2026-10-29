export const DOMAINS = [
  {id:'web',title:'Web',english:'INTERFACE / SPACE / RESPONSE',roman:'I',description:'从控件的触感，到信息与空间的呈现。',categories:[{id:'visual',title:'视觉与版式'},{id:'interaction',title:'控件与交互'},{id:'feedback',title:'动效与反馈'},{id:'information',title:'信息与空间'}]},
  {id:'video',title:'视频',english:'TYPE / FORM / NARRATIVE',roman:'II',description:'让文字、图形与界面，在时间里组成一段表达。',categories:[{id:'interface',title:'界面与信息'},{id:'type',title:'文字与节奏'},{id:'drawing',title:'图形与材质'}]},
  {id:'game',title:'游戏',english:'ART / CAMERA / FEEL',roman:'III',description:'收集画风、镜头、动作与声音构成的小场景。',categories:[]}
];
const embedded=(id,title,date,description,reference,source,extra={})=>({id,title,date,description,reference,source,version:id==='remove-experience'?'v2':'v1',entry:`exhibit.html#${id}`,embedSlug:id,preview:`assets/previews/${id}.jpg`,...extra});
const reel=(id,title,description,extra={})=>({id,title,date:'2026-10-20',version:'v1',description,reference:'设计实验室',source:`assets/${id}/v1/index.html`,entry:`assets/${id}/v1/index.html`,preview:`assets/${id}/v1/preview.png`,...extra});
export const THEMES = [
  {id:'product-launch',title:'把发布信息变成短片',english:'Interface Launch Stories',domain:'video',category:'interface',cases:[
    reel('gsap-framecheck-cards','卡片级联','同一条虚构的「安静发布」故事，以焦点卡、回执条和卫星信息的交错出现组织阅读顺序。暖纸、绿与赭石保持统一气质，时间轴可拖动并逐帧查看，适合观察信息分组、出现节奏和画面留白。',{originalTitle:'GSAP 帧检卡片联播',english:'GSAP Framecheck Cards'}),
    reel('seek-t-morph-reel','连续变形','虚构的 Tideline 2.4 发布信息沿同一物件连续变化：发布按钮变成进度环与完成标记，再交给数据与回执卡片。可播放、暂停、拖动时间轴和逐帧查看，适合观察连续形变怎样连接一段产品叙事。',{originalTitle:'连续变形发布短片',english:'Continuous Morph Reel'})
  ]},
  {id:'editorial-kinetic-type',title:'编辑式动能字体',english:'Editorial Kinetic Type',domain:'video',category:'type',cases:[
    reel('editorial-kinetic-type','字形成为空间','字被当成可以走进的建筑：字重落地成地面，两个词相倚，间隙里长出房间。骨色纸、墨与酒红围绕字形变化建立节奏。可拖动时间轴观察每一段转化，适合品牌片头与编辑式排印。')
  ]},
  {id:'three-ink-linework',title:'三种墨水线稿',english:'Three Ink Linework',domain:'video',category:'drawing',cases:[
    reel('three-ink-linework','铅笔、蓝图与发光线','同一只器皿沿着同一段几何运动，依次呈现纸上铅笔、蓝图和发光线稿。画法改变时保留物件的连续性，适合观察线条、材质与显现节奏，也可作为品牌线稿短片的参考。')
  ]},
  {id:'annotated-3d-cutaway',title:'可标注三维剖解',english:'Annotated 3D Cutaway',domain:'web',category:'information',cases:[
    {id:'annotated-3d-cutaway',title:'Clove C2 手摇磨豆机',date:'2026-10-20',version:'v1',description:'虚构手摇磨豆机 Clove C2 在纸台与哑光材质中呈现。绕转观察整体，沿章节进入剖面与爆炸视图，标签跟随结构，剖切滑条连续扫过壳体。适合产品讲解页，让观看者在同一空间中理解外观与内部关系。',reference:'设计实验室',source:'assets/annotated-3d-cutaway/v1/index.html',entry:'assets/annotated-3d-cutaway/v1/index.html',preview:'assets/annotated-3d-cutaway/v1/preview.png'}
  ]},
  {id:'living-cover',title:'动态封面',english:'Living Shader Cover',domain:'web',category:'visual',cases:[
    embedded('living-cover','声音艺术展封面','2026-10-15','同一张声音艺术展封面，分别呈现静态印刷、自动流动与随指针变化的材质状态。展示台保留三态并排与单态聚焦，配色、速度和暂停可调，适合音乐封面与展览主视觉。','23rd','https://23rd.dev/',{accent:'#f3b37a'})
  ]},
  {id:'image-compare',title:'图像对比',english:'Optical Image Comparison',domain:'web',category:'information',cases:[
    embedded('image-compare','原创植物展海报','2026-10-15','比较同一张原创植物展海报的两个排版版本。滑动分割用于对齐观察，并排全画幅保留整体构图，按住切换让细微差别出现在同一位置。适合设计改版、修图与生成结果审阅。','Bencho','https://bencho.dev/',{accent:'#9be3b1'})
  ]},
  {id:'reorder-list',title:'拖动排序',english:'Tactile Reorder Queue',domain:'web',category:'interaction',cases:[
    embedded('reorder-list','参考清单排序','2026-10-15','调整六条设计参考的顺序，拿起、让位与落下都有可见反馈，操作后可撤销。保留指针拖动、行内方向按钮和键盘排序，适合播放队列、参考清单与作品编排。','Bencho','https://bencho.dev/',{accent:'#e6c885'})
  ]},
  {id:'agent-progress',title:'任务进度',english:'Agent Progress & Recovery',domain:'web',category:'feedback',cases:[
    embedded('agent-progress','逐项整理与恢复','2026-10-15','逐项整理五条模拟参考，将当前阶段、完成与中断放在各自条目附近。展开后查看阶段细节，失败项可单独重试，也可切换顺畅情境，适合批量导入与内容整理中的进度反馈。','Beautiful UI','https://beautifului.dev/',{accent:'#85c1ff'})
  ]},
  {id:'remove-experience',title:'移除确认',english:'Modal & Inline Confirm',domain:'web',category:'interaction',cases:[
    embedded('remove-experience','收藏列表移除','2026-10-13','同一组模拟收藏，分别以弹窗与原地胶囊变形完成移除。原有展示台保留双方案对照、单独查看、响应延迟、失败重试和撤销，适合观察决定、等待与结果怎样留在条目附近。','Arc UI','https://uiarc.dev/components/confirm-morph',{accent:'#f29b8e'})
  ]}
];
export const CASES = THEMES.flatMap(theme=>theme.cases.map(sample=>({...sample,themeId:theme.id,domain:theme.domain,category:theme.category})));
export const caseById = id=>CASES.find(sample=>sample.id===id);
export const themeDate = theme=>theme.cases.reduce((latest,sample)=>sample.date>latest?sample.date:latest,'');
export const sortedThemes = [...THEMES].sort((a,b)=>themeDate(b).localeCompare(themeDate(a)));
export const legacyCollection = {visual:['living-cover','image-compare','annotated-3d-cutaway','gsap-framecheck-cards','editorial-kinetic-type','seek-t-morph-reel','three-ink-linework'],feedback:['reorder-list','agent-progress','remove-experience']};
