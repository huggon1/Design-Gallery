import {EXHIBITS,WORKS,workForGame} from './hall-catalog.mjs';
const games=new Set(Object.keys(EXHIBITS));

export function readHallRoute(hash=''){
  const [path,query='']=hash.replace(/^#\/?/,'').split('?');
  const params=new URLSearchParams(query);
  if(path==='work/angled-actions' && params.get('game')==='dont-starve')
    return {view:'work',id:'dont-starve',area:params.get('area')||''};
  if(path.startsWith('work/')&&WORKS[path.slice(5)]){const work=path.slice(5),id=params.get('game');return {view:'work',id:games.has(id)&&workForGame(id)===work?id:WORKS[work].first,area:params.get('area')||''};}
  if(games.has(path))return {view:'work',id:path,area:params.get('area')||''};
  return {view:'home'};
}

export function workHash(id='hollow',area=''){
  const query=new URLSearchParams({game:games.has(id)?id:'hollow'});
  if(area)query.set('area',area);
  return `#/work/${workForGame(id)}?${query}`;
}

export function createSceneLoader(loadModule=path=>import(path)){
  let generation=0;
  return {
    cancel(){generation++;},
    async open(path,options){
      const token=++generation;
      const module=await loadModule(path);
      if(token!==generation)return null;
      const scene=await module.createScene(options);
      if(token!==generation){scene.setMuted?.(true);scene.dispose?.();return null;}
      return {module,scene};
    },
  };
}
