# 团队项目

在团队目录开发，用平台按钮保存版本、获取更新和分享。

## 项目：《遗迹回声 / Echoes of the Buried Relic》

HTML + CSS + JavaScript + Three.js 的浏览器第三人称 3D 游戏（第五周小组作业）。

### 关键文档

- [AI_HANDOFF_PROMPT.md](./AI_HANDOFF_PROMPT.md) —— 项目需求 brief（游戏功能、角色、宝物、输入、Demo、阶段等）。
- [遗迹回声_第二版分工方案.md](./遗迹回声_第二版分工方案.md) —— 五人并行 Vibecoding 分工与接口冻结方案（唯一执行依据）。
- [w05_3d_game/](./w05_3d_game/) —— 游戏项目目录（源代码、依赖、README）。
- [w05_3d_game/接口契约.md](./w05_3d_game/接口契约.md) —— **已冻结的接口与分模块提示**，B/C/D/E 开发前必读。

### 当前进展（2026-11-07，A 已完成骨架）

A 已建立 `w05_3d_game/` 项目骨架并完成灰盒场景、主循环与最小占位模块：

- 依赖 `three@0.170.0`（pnpm install 已生成 `pnpm-lock.yaml`），importmap 指向本地 `node_modules`，离线可运行、不依赖 CDN。
- 本地启动：`pnpm install` → `pnpm start`（`node serve.mjs`）→ 打开 `http://localhost:5173/`。
- 全模块已通过 `node --check` 语法检查；本地服务器已实测所有页面/模块返回 200。

**待完成（B/C/D/E）：**真实角色与动画、Gamepad、晶体收集/陷阱/出口/胜利失败、UI、声音、Demo、素材清单、测试与交付记录。

> 运行与操作详见 [w05_3d_game/README.md](./w05_3d_game/README.md)。接口契约与分模块提示见 [w05_3d_game/接口契约.md](./w05_3d_game/接口契约.md)。