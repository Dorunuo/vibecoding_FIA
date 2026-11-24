# 遗迹回声 / Echoes of the Buried Relic

浏览器第三人称 3D 游戏。键鼠：WASD／方向键移动，按住鼠标左键或右键拖动镜头，Shift 跑步，Space 跳跃，靠近宝物按 E 挖掘／开盒，Esc 暂停。目标是收集 3 个宝物并抵达出口。

## 在线游玩

GitHub Pages 发布完成后填写：`https://<用户名>.github.io/<仓库名>/`

## 本地运行

通过 HTTP 服务器打开根目录 `index.html`（不要直接双击）。Three.js 使用 jsDelivr CDN，需联网。若在本目录本机已有 Node.js 与 pnpm：`pnpm install --frozen-lockfile`，然后 `pnpm start`，访问 `http://localhost:5173/`。

## 发布

GitHub 仓库 Settings → Pages → Deploy from a branch → `main` → `/(root)`。源码所需文件为 `index.html`、`style.css`、`src/` 和 `assets/`。

## 已知限制与素材

浏览器／网络需支持 WebGL 并能访问 jsDelivr；需由团队实际检查画面、玩法和声音。素材来源、作者许可及各成员贡献请由团队确认后填写。Three.js 版本为 0.170.0。



