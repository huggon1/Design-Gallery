# Yolk 角色素材

本包用于 Leap Day 角色动作研究。角色由 Nitrome 创作。

## 清晰静态素材

Nitrome Wiki 的公开图片提供 `slide`、`death` 和 `stand` 所用的姿势。原 PNG 为两倍像素尺寸。`stand` 使用一张真实跑步姿势作为静止占位。

- [Run](https://nitrome.wiki.gg/wiki/File:Leap_Day_Yolk_Run.png)，38×46。
- [Slide](https://nitrome.wiki.gg/wiki/File:Leap_Day_Yolk_Slide_Slide.png)，38×48。
- [Death](https://nitrome.wiki.gg/wiki/File:Leap_Day_Yolk_Death.png)，46×56。
- [Double Jump 单帧参考](https://nitrome.wiki.gg/wiki/File:Leap_Day_Yolk_Double_Jump.png)，40×40。

原文件和 API 出处保存在 `../source/` 与 `../../research/wiki-yolk-imageinfo.json`。

## 连续动作素材

`run`、`jump`、`fall`、`double` 提取自 wason_sonico 在 Reddit 帮助帖中发布的实机录像：[原回答](https://www.reddit.com/r/leapdaygame/comments/16mwq2h/)，[作者视频](https://imgur.com/a/iQN2Ztn)。本地原片为 `../../reference/wason-sonico-2023-09-19.mp4`，960×2132、30fps、12.87秒。

| 动作 | 视频位置 | 输出 |
| --- | --- | --- |
| 跑步 | 0.833–1.333秒，连续16帧 | 镜像为朝右；保留脚底起伏；0.533秒片段含两次步态起伏 |
| 上升 | 1.667秒 | 真实张嘴伸肢姿势，镜像为朝右 |
| 下落 | 4.400秒 | 从砖块底部滑出后的闭嘴收肢姿势，镜像为朝右 |
| 二跳 | 5.367–5.600秒，连续8帧 | 真实卷球旋转姿势；约0.267秒后重复首个朝向 |

提取脚本 `../../research/build-character.py` 从录像恢复近似像素网格，使用 Wiki 原图色板，清除背景和孤立连通域。视频压缩、网格相位与估计锚点使输出存在像素级差异。记录帧中的重复帧随输出保留。完整原图集与原游戏动画时长仍是后续校核项。

## 接口

`manifest.json` 指向 `yolk.png`。每帧64×64，锚点 `[32,56]`；使用0.5倍率得到32×32逻辑格和 `[16,28]` 锚点。`frames[].durationMs` 记录当前播放间隔。默认朝右，朝左使用水平镜像。

挂左墙使用朝右的 `slide`；挂右墙使用水平镜像。二跳后的卷球状态持续到触墙或落地；原视频5.733秒仍在卷球下落。持续时间由动作状态控制。

## 已找到的完整图集

[The Spriters Resource：Yolk，ToastGhost，2021-04-21](https://www.spriters-resource.com/mobile/leapday/asset/152883/) 登记了一张512×512图集。当前下载请求进入 Cloudflare 验证页，完整文件尚待取得。现包按上述清晰姿势和实机帧导出。

## 2026-11-13 节奏复核

本轮以Nitrome官方 `Leap Day speedrun in space` 的连续帧复核节奏。21.033/21.567秒与21.167/21.700秒呈现同脚相，完整跑步周期约0.533秒，保留当前16帧的播放间隔。二跳球在6.200–6.467秒的旋转复核得到约0.20–0.233秒同相重复；当前8帧调整为总0.233秒，每帧约29.17毫秒。录像相位估计带来误差，循环帧内容沿用已提取的真实姿态。详细接触图与测量保存在 `../../research/feel-v2/`。
