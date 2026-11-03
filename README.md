# 设计画廊

画廊收集可观看、可操作的设计方案。每件展品通过标题说明针对什么，首页平铺展示，按收录日期倒序排列。标签由维护者自由填写，搜索覆盖标题、可选说明和标签。

## 本地运行

在仓库根目录启动：

```sh
python3 -m http.server 4317 --bind 127.0.0.1
```

打开 http://127.0.0.1:4317/ 。已登记 localhost-manager 的工作区可使用 `lhm start design-gallery`，以命令返回的地址为准。

## 添加展品

1. 将用户已验收的展示文件放入 `assets/<id>/<version>/`，入口页与依赖素材一起保存。
2. 在 `catalog.mjs` 的 `EXHIBITS` 清单增加一条记录。标题直接写方案对象，例如“角色造型的即时试穿与比较”。同一天的展品沿用清单顺序。
3. 按需填写 `tags`、`description` 和 `reference`。标签使用自由文本数组；标签缺省或 `[]` 时，展品照常呈现。标题已说明对象时，正文可留空。
4. 运行 `node scripts/sync-posts.mjs` 生成帖子，再运行 `node scripts/check.mjs`。
5. 通过浏览器操作作品，并检查搜索、返回和窄屏布局。

记录示例：

```js
{
  id: 'outfit-preview',
  title: '角色造型的即时试穿与比较',
  date: '2026-11-03',
  version: 'v1',
  preview: 'assets/outfit-preview/v1/preview.png',
  entry: 'assets/outfit-preview/v1/index.html',
  tags: ['换装', '角色展示']
}
```

`reference` 使用 `{title:'来源名称', url:'https://…'}`。现有共用展台使用 `entry:'exhibit.html#<id>'` 与 `embedSlug:'<id>'` 选择已验收作品；新独立展品直接填写入口页路径。

## 更新展品

新实验版本保存在外层实验目录。用户确认更新后，将该版本复制到新的 `assets/<id>/<version>/`，更新原记录的版本、预览与入口，保留稳定 ID 和首次收录日期，再生成帖子并检查。展示文件的运行依赖全部保存在本仓库。

## 文件与验证

- `catalog.mjs`：展品清单及搜索匹配规则。
- `app.mjs`、`style.css`、`index.html`：列表与展品页面。
- `routes.mjs`：当前路由及已有链接兼容。
- `posts/`：由清单生成的展品帖子，内容随同步脚本更新。
- `node scripts/check.mjs`：检查语法、搜索与路由、馆藏文件和帖子一致性。

浏览器验证时，从首页搜索标题或标签，打开作品并操作，刷新后返回列表；点击标签筛选并清除；用空搜索结果恢复列表；在窄屏检查作品主要控件。画面、操作记录与验收结论保存在外层对应实验目录。

## 收录与发布

展品收录采用用户明确验收通过的版本，或按用户“加入画廊”的直接指令执行。公网发布按用户明确的发布指令执行。完整研究、生成输入和过程记录保存在外层工作区。
