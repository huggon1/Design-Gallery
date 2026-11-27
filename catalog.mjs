export const EXHIBITS = [
  {
    id:"tabletop-interaction", title:"第一人称桌面交互",
    date:'2026-11-22', version:'v1',
    preview:"assets/character-lab/v1/assets/covers/tabletop-interaction.svg",
    entry:"assets/character-lab/v1/index.html#/work/tabletop-interaction?game=buckshot-roulette",
    tags:["游戏","第一人称","桌面交互","恶魔轮盘","骗子酒吧"]
  },
  {
    id:"angled-actions", title:"斜俯视角色动作",
    date:'2026-11-20', version:'v1',
    preview:"assets/character-lab/v1/assets/covers/angled-actions.svg",
    entry:"assets/character-lab/v1/index.html#/work/angled-actions?game=hades",
    tags:["游戏","斜俯视","角色动作","哈迪斯","风中行者"]
  },
  {
    id:"topdown-actions", title:"俯视移动与瞄准",
    date:'2026-11-16', version:'v1',
    preview:"assets/character-lab/v1/assets/covers/topdown-actions.svg",
    entry:"assets/character-lab/v1/index.html#/work/topdown-actions?game=brotato",
    tags:["游戏","俯视","角色动作","土豆兄弟","挺进地牢","以撒的结合","饥荒","脱逃者 2"]
  },
  {
    id:"character-actions", title:"侧视角色动作",
    date:'2026-11-16', version:'v1',
    preview:"assets/character-lab/v1/assets/covers/character-actions.svg",
    entry:"assets/character-lab/v1/index.html#/work/character-actions?game=terraria",
    tags:["游戏","侧视","角色动作","泰拉瑞亚","空洞骑士","蔚蓝","死亡细胞","Leap Day","武士零","茶杯头","Cuphead"]
  },
];

export const exhibitById = id => EXHIBITS.find(exhibit => exhibit.id === id);
export const sortedExhibits = [...EXHIBITS].sort((a,b) => b.date.localeCompare(a.date));
export const normalize = value => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('zh-CN');
export function matchesExhibit(exhibit, query = '') {
  const words = normalize([exhibit.title, exhibit.description, ...(exhibit.tags ?? [])].join(' '));
  return normalize(query).split(/\s+/).filter(Boolean).every(term => words.includes(term));
}
