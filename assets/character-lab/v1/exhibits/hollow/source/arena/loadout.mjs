/** Source-backed ordinary-nail charms. Host selects its loadout; controller
 * defaults to vanilla. Strength affects nail damage; spells and SOUL stay separate.
 */
export const CHARMS=Object.freeze({
 quickSlash:Object.freeze({id:32,name:'快速劈砍',notches:3,description:'缩短挥击动作与冷却；站桩约每0.28秒一刀，转身取消可更快衔接。'}),
 markOfPride:Object.freeze({id:13,name:'骄傲印记',notches:3,description:'普通骨钉四向范围增加25%；墙滑挥击使用原范围。'}),
 longnail:Object.freeze({id:18,name:'修长之钉',notches:2,description:'普通骨钉四向范围增加15%；墙滑挥击使用原范围。'}),
 strength:Object.freeze({id:25,name:'坚固力量',notches:3,description:'普通骨钉伤害提高50%；纯粹骨钉从21提高至32。'}),
});
export function resolveLoadout(raw={}){return Object.freeze({quickSlash:raw.quickSlash===true,markOfPride:raw.markOfPride===true,longnail:raw.longnail===true,strength:raw.strength===true})}
export const DEFAULT_LOADOUT=resolveLoadout({quickSlash:true,markOfPride:true,strength:true});
export const VANILLA_LOADOUT=resolveLoadout();
/** Set Slash Damage -> Strength -> ConvertFloatToInt.Nearest -> Mathf.RoundToInt. */
export function getNailDamage(baseDamage=21,raw={}){
 const base=Number.isFinite(baseDamage)?Math.max(0,Math.trunc(baseDamage)):21;
 if(!resolveLoadout(raw).strength)return base;
 const value=base*1.5,lower=Math.floor(value);
 return value-lower===.5?(lower%2===0?lower:lower+1):Math.round(value);
}
export function getLoadoutInfo(raw={},baseDamage=21){
 const loadout=resolveLoadout(raw),equipped=Object.entries(CHARMS).filter(([id])=>loadout[id]).map(([id,charm])=>({key:id,...charm}));
 return {loadout,equipped,cost:equipped.reduce((sum,c)=>sum+c.notches,0),capacity:11,baseNailDamage:getNailDamage(baseDamage),nailDamage:getNailDamage(baseDamage,loadout)};
}
export function getNailProfile(raw={}){
 const c=resolveLoadout(raw);
 return {attackDuration:c.quickSlash?.28:.35,attackCooldown:c.quickSlash?.25:.41,attackRecovery:.1,activeStart:.02,activeEnd:.1,
  rangeScale:c.markOfPride&&c.longnail?1.4:c.markOfPride?1.25:c.longnail?1.15:1,mantis:c.markOfPride};
}
// Child localPosition stays fixed. NailSlash.StartSlash scales only localScale.
const EFFECTS={
 side:['SlashEffect',-.4,-.25,1.601078,1.645244],
 alt:['SlashEffectAlt',-.4,-.25,1.25697,1.422434],
 up:['UpSlashEffect',-.1,.3,1.15,1.4],
 down:['DownSlashEffect',.3,-1.75,1.125,1.28002],
 wall:['SlashEffect',.04,-.41,-1.62,1.645244],
};
/** One shared transform drives the actual source VFX and the hit polygon. The
 * original M artwork has its own silhouette, retained with its native pivot.
 */
export function nailEffectPose(attack={}){
 const key=attack.wall?'wall':attack.kind==='side'?(attack.alt?'alt':'side'):attack.kind||'side';
 const [base,offsetX,offsetY,sx,sy]=EFFECTS[key]||EFFECTS.side;
 const rangeScale=attack.wall?1:Number.isFinite(attack.rangeScale)?attack.rangeScale:1;
 return {key,clip:base+(attack.mantis&&!attack.wall?' M':''),offsetX,offsetY,scaleX:sx*rangeScale,scaleY:sy*rangeScale,rangeScale};
}
