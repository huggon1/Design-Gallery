# 死亡细胞角色动作素材

本包用于本地角色动作研究。图像和声音来自社区模组 [Kidonia/DeadCellsBossFight](https://github.com/Kidonia/DeadCellsBossFight)，固定版本 `06697f7f1d5159e75a12f8f990ca5b814e817964`。作品角色和声音归 Motion Twin / Evil Empire。该仓库是社区移植来源，授权状态与原作版本需单独核对。

## 原文件

- 角色图像、分离的发光层、帧矩形与骨点：[Assets/NPCTextures](https://github.com/Kidonia/DeadCellsBossFight/tree/06697f7f1d5159e75a12f8f990ca5b814e817964/Assets/NPCTextures) 中的 `beheaded.atlas`、`beheaded0/1/2.png`、`beheaded0/1/2_glow.png`、`beheaded_tracks.json`。
- 剑挥砍效果：[Assets](https://github.com/Kidonia/DeadCellsBossFight/tree/06697f7f1d5159e75a12f8f990ca5b814e817964/Assets) 中的 `fxWeapon.atlas`、`fxWeapon-0.png`、`fxWeapon-1.png`。
- 头部核心：同一目录的 `head.png`，尺寸 10×13。其来自该模组，原作逐像素出处仍待核对。
- 声音：[PlayerSounds](https://github.com/Kidonia/DeadCellsBossFight/tree/06697f7f1d5159e75a12f8f990ca5b814e817964/Assets/Sounds/PlayerSounds) 的 `jump.ogg`、`roll.ogg`；[WeaponSounds](https://github.com/Kidonia/DeadCellsBossFight/tree/06697f7f1d5159e75a12f8f990ca5b814e817964/Assets/Sounds/WeaponSounds) 的短剑、军刀和刀刃命中音。

## 导出

`../extract-subset.py` 解码 BATL 的字符串和九个小端无符号 16 位字段，按动画名及数字帧号排序。脚本将选中的 419 个角色帧和 20 个剑效果帧重新打包。导出保留原始像素、裁剪框、裁剪偏移、原画布尺寸和 `headBone`、左手、武器骨点。

`body.png` 是角色层，`glow.png` 是同位置的发光遮罩，`fx.png` 是武器效果层。发光遮罩使用蓝色编码，展示时通过颜色映射着色。本实验的着色器和烟雾属于重建部分。

`manifest.json` 的 `animations` 和 `effects` 各条目包含 `count` 与 `frames`。每帧提供 `x/y/w/h`、`ox/oy/ow/oh`、来源矩形及可用骨点。角色绘制使用固定原画布中心；大部分动作画布为 150×150，`atkSaberA` 为 300×300。头部在 `headBone` 位置偏移 `(-6,-12)`，该偏移来自模组的 `DC_WeaponAnimation.DrawWeaponTexture`。

## 动作与时序证据

帧序列覆盖待机、起跑、跑动、停步、跳跃上升、顶点过渡、下落、落地、翻滚、爬墙及攻击。

模组 `StartSwordAtkA/B/C` 将短剑三连击映射到 `atkBackStabberA`（13 帧）、`atkBackStabberB`（17 帧）、`atkSaberA`（12 帧）。`atkA/B/C` 在该模组中对应双匕首。模组地面翻滚使用 `rollStart → rolling → rollEnd`。这些是模组的调用证据，原游戏状态切换仍以实机连续画面核对。

BATL 保存帧空间信息，tracks 保存骨点序列。播放时长、取消窗口、移动速度和二段跳的动作选择由展示实现另行定义。预览 GIF 的每帧 50 ms 用于检查姿势连续性，属于研究播放速度。原游戏的实时节奏、发光颜色和头部烟雾仍需实机比较。

运行包补充同一固定版本的 `HeadFlesh.png`，文件名为 `head-mass.png`。渲染器将其着色为暗紫褐色，用于橙色头芯周围的有机边缘。该调色与烟雾属于本实验重建。
