# 本地素材清单

本次已接入用户提供的 `../../遗迹回声_地刺版/`（相对于本assets目录）。不再使用“全部运行时 Three.js 程序生成”的旧声明。

| 游戏内路径 | 用户提供的原文件 | 用途 |
|---|---|---|
| `ruins-environment.glb` | 遗迹回声_金光遗迹.glb | 完整三层遗迹、土堆、木盒、金光、静态地刺与局部灯光 |
| `ruins-treasure-colliders.glb` | 遗迹回声_寻宝碰撞体.glb | 只取可行走土堆网格，代理不显示 |
| `explorer.glb` | 遗迹回声_女性角色1000.glb | 肩髋膝节点程序动画的女性探险者 |
| `level-manifest.json` | level_manifest_threejs.json | 三维碰撞、楼板、连续楼梯、洞口及触发坐标 |
| `integration-validation.json` | 本次技术检查生成 | 数据/几何检查，不是人类试玩证据 |

资源保持原尺寸与原坐标。PNG纹理内嵌GLB；无需复制包内预览渲染图、Blender工程或机器路径脚本进运行资源。地刺伤害区读取manifest，不把触发GLB当成可见实体高墙。

包内两份说明声称模型与新增纹理为原创生成；本次只记录实际来源，**不代替作者授权证明**。D/提交者须确认实际作者、生成工具/模式、许可及课程披露，勿虚构授权或贡献。Three.js本地依赖按其MIT许可使用并保留安装包许可信息。

单文件浏览版由build-browser.mjs将模型以data URL和清单内嵌；源模块仍可用pnpm start运行。人物GLB无动画片段，动作由player.js对其真实节点施加，不宣称导入了现成骨骼动画。
