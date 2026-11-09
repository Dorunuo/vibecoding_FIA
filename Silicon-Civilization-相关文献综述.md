# Silicon Civilization（硅基文明）相关论文与研究报告

> 检索时间：2026-11-01
> 项目核心：基于 LLM 多智能体的稀缺资源博弈社会沙盒，研究资源受限下合作、惩罚、沟通、制度对群体生存/崩溃的影响。
> 阅读建议：**⭐⭐⭐ = 必读核心对标，⭐⭐ = 理论基础，⭐ = 拓展参考**

---

## 一、最直接对标：LLM 多智能体社会沙盒（⭐⭐⭐ 优先精读）

这一类是你们项目"正在做什么"的同代工作，直接决定了你们的差异化定位。

### 1. GOVSIM: Cooperate or Collapse —— 与你们项目最接近的工作
- **会议**：NeurIPS 2024（ETH Zürich / MPI / University of Washington）
- **链接**：https://papers.nips.cc/paper_files/paper/2024/file/ca9567d8ef6b2ea2da0d7eed57b933ee-Paper-Conference.pdf
- **做了什么**：构建了"公共资源治理模拟平台"，一群 LLM agent 必须在"开采资源"与"维持资源可持续"之间集体权衡，研究伦理推理、战略规划、谈判能力如何影响合作结果。
- **核心发现**：
  - 除最强模型外，**几乎所有 LLM agent 都无法达成可持续均衡，最高存活率低于 54%**；
  - **多 agent 之间的有效沟通是合作达成的关键**；
  - 失败根源是 LLM 无法对自身行为的长期均衡效应形成假设并推演；
  - 引入"普遍化推理"（Universalization，一种道德推理理论）的 agent 可持续性显著更好。
- **对你们项目的价值**：这几乎就是你们"核心问题 1 和 2"的已发表版本。**务必精读并对比**：你们的 3D 可视化、四种性格 agent（慷慨/自私/公平/惩罚者）的初始配比滑块、旱灾/瘟疫等压力事件，正是 GOVSIM 没有覆盖的维度。可以在 related work 中明确指出 GOVSIM 缺乏性格异质性预设和环境压力事件。

### 2. Emergence World：长程多智能体自治平台
- **来源**：arXiv 2026（IBM Research 等）
- **链接**：https://arxiv.org/pdf/2606.08367
- **做了什么**：持续运行的多 agent 模拟平台，agent 生活在接入实时天气/新闻 API 的共享空间，配备 120+ 工具和三套持久记忆系统，通过民主机制自我治理。
- **核心发现**：15 天跨模型实验（Claude / Grok / Gemini / GPT / 混合种群）中，**相同初始条件产生了从稳定协商治理到总人口崩溃的截然不同结果**。
- **对你们项目的价值**：证明了"长程模拟 + 不同 agent 构成产生不同社会结局"这一核心假设是可复现的，可作为你们"社会崩溃回合数"指标的参照范式。

### 3. AIvILIZATION v0：大规模资源受限沙盒经济
- **来源**：arXiv 2026（HKUST / Bauhinia AI）
- **链接**：https://arxiv.org/pdf/2602.10429v1
- **做了什么**：公开部署的大规模人工社会，耦合"资源受限沙盒经济"与统一 LLM agent 架构，包含生理生存成本、多层生产、AMM 价格机制、教育-职业系统。
- **核心发现**：成熟阶段高频交易复现了重尾收益、波动率聚集等典型市场特征，并产生了由教育和准入约束驱动的结构化财富分层。
- **对你们项目的价值**：你们的"混合驱动架构"（底层状态机 + LLM 高层决策）与该文的分层规划器思路一致；其"资源-生产-价格"经济模型可作为你们阶段三通用沙盒配置的经济模块参考。

### 4. Generative Agents: Interactive Simulacra of Human Behavior（Stanford Smallville）
- **会议**：UIST 2023（Best Paper）
- **链接**：https://dl.acm.org/doi/pdf/10.1145/3586183.3606763
- **做了什么**：25 个 LLM agent 在一个模拟小镇中生活，核心架构是**记忆流（observation → reflection → planning）**。
- **核心发现**：仅靠"一个 agent 想办情人节派对"这一初始设定，agent 自发地在两天内传播邀请、结识新朋友、约会并协调到场——涌现出可信的个体行为和社会行为。消融实验证明观察、规划、反思三个组件缺一不可。
- **对你们项目的价值**：这是 LLM agent 记忆/反思/规划架构的**奠基论文**。你们的"给 agent 注入灵魂"（陈致胜负责）应直接参考其记忆流设计；但该论文不涉及资源博弈和惩罚机制，正好是你们的差异点。

### 5. SandboxSocial：多模态社交媒体沙盒
- **会议**：IJCAI 2025 Demonstrations
- **链接**：https://www.ijcai.org/proceedings/2025/1271.pdf
- **对你们项目的价值**：提供了"真实用户数据校准 agent 画像 + 可观测仪表板 + 并行化 agent 计算"的工程实现参考，与翁琦凯负责的"批量自动跑实验 + 指标报告"直接相关。

### 6. 其他拓展
- **BookWorld**（arXiv 2025）：基于小说世界观构建多 agent 社会，https://web3.arxiv.org/abs/2504.14538
- **Learning to Make Friends**（arXiv 2025）：LLM agent 通过教练信号涌现社交纽带，https://web3.arxiv.org/abs/2510.19299
- **SEAA 自涌现 agent 架构**（arXiv 2026）：用 HMM 编码行为惯性 + 反思维度更新 HMM 参数，解决 LLM agent 人格漂移问题，https://arxiv.org/pdf/2609.17331.pdf

---

## 二、经典理论基础：惩罚、合作与演化博弈（⭐⭐ 精读）

这一类是你们"自私者/慷慨者/公平者/惩罚者"四种性格设定的理论根源。

### 1. Reward and Punishment（Sigmund, Hauert, Nowak, PNAS 2001）
- **链接**：https://www.pnas.org/content/98/19/10757.full.pdf
- **核心结论**：在没有声誉机制时，单纯的惩罚和奖励都无法带来亲社会行为；**声誉效应能诱导公平与合作**，且惩罚比奖励更有效。
- **对你们项目**：直接支撑你们"引入声誉/沟通机制能否延缓社会崩溃"的实验设计。

### 2. Via Freedom to Coercion: The Emergence of Costly Punishment（Hauert et al., Science 2007）
- **链接**：https://core.ac.uk/download/pdf/28933924.pdf
- **核心结论**：如果个体可以选择"退出"公共事业（自愿参与），代价惩罚行为反而能在群体中立足；**强制性参与的群体反而更难产生合作**。这是一个反直觉结论。
- **对你们项目**：可以作为你们"性格配比"实验的一个理论假设——加入"中立者/退出者"类型是否会影响惩罚者的涌现。

### 3. Sustainable Institutionalized Punishment Requires Elimination of Second-Order Free-Riders（Perc, Scientific Reports 2012）
- **链接**：https://www.nature.com/articles/srep00344.pdf
- **核心结论**：制度化惩罚（pool punishment）要可持续，**必须同时惩罚"只贡献但不惩罚搭便车者"的二阶搭便车者**，否则惩罚者会被二阶搭便车者淘汰。
- **对你们项目**：这正是你们"惩罚者"性格设定的关键理论细节——单纯有惩罚者不够，还要处理"惩罚者本身被不惩罚的合作者搭便车"的问题。

### 4. Punishment and Inspection for Governing the Commons in a Feedback-Evolving Game（Chen & Szolnoki, PLoS Comp Biol）
- **链接**：https://pmc.ncbi.nlm.nih.gov/articles/PMC6070290/pdf/pcbi.1006347.pdf
- **核心结论**：可再生资源的增长能力是关键变量；**即使重罚，如果合作者不关注资源再生能力，再严厉的惩罚也救不了群体**。
- **对你们项目**：直接支撑你们"旱灾/瘟疫等资源压力事件"的设计——惩罚制度的效果依赖于资源再生率参数。

### 5. Probabilistic Sharing Solves the Problem of Costly Punishment（Chen, Szolnoki, Perc）
- **链接**：https://arxiv.org/pdf/1408.1945
- **核心结论**：**分担惩罚责任**（概率性惩罚，而非固定某几个人永远惩罚）能解决"代价惩罚者被淘汰"的问题。
- **对你们项目**：为你们"惩罚者配比"实验提供了一种更优的制度设计变量。

### 6. Homo Reciprocans（Bowles & Gintis, Nature 2000）
- **链接**：http://ereserve.library.utah.edu/Annual/ANTH/4141/anth4141homo.pdf
- **核心结论**：人类大规模合作的关键是"强互惠"——人们愿意**自掏腰包惩罚违规者**，哪怕这对自己没有任何未来收益。
- **对你们项目**：你们"惩罚者"性格的理论定义直接来自 Fehr & Gächter 这一脉的强互惠理论。

---

## 三、沟通机制如何促进合作（⭐⭐ 精读）

直接对应你们"规则干预：沟通机制能否延缓社会崩溃"。

### 1. Inequality, Communication, and Avoiding Disastrous Climate Change（Tavoni et al., PNAS 2011）
- **链接**：https://www.pnas.org/content/108/29/11825.full.pdf
- **核心结论**：在气候公共物品博弈中，**不平等会降低达成目标的概率，但沟通能极大提高成功率**；成功组倾向于在博弈过程中消除不平等（富人早期主动再分配）。
- **对你们项目**：你们"初始资源不平等 + 沟通机制"的实验设计可直接引用此文作为假设来源。

### 2. Leading by Words: One-Way Communication（Koukoumelis et al.）
- **链接**：https://core.ac.uk/download/pdf/6309483.pdf
- **核心结论**：**即使只有单向沟通**（一个人给其他人发自由文本），也能显著提高贡献并降低方差，且效果持续。
- **对你们项目**：为你们"LLM 生成对话"的实验提供了一个低成本变体——不一定需要双向谈判，单向领袖喊话也有效果。

### 3. How Cheap Talk Enhances Efficiency in Threshold Public Goods（Palfrey et al., Caltech）
- **链接**：https://authors.library.caltech.edu/76633/2/prr_jan6_15.pdf
- **核心结论**：只有**无限制文本聊天**才能显著提高效率；二元消息和有限数值消息空间效果有限。
- **对你们项目**：直接支持你们"在涉及语言沟通时调用 LLM"的架构决策——结构化消息不如自由文本。

### 4. Normative Foundations of Human Cooperation（Fehr & Schurtenberger, Nature Human Behaviour）
- **链接**：https://scispace.com/pdf/normative-foundations-of-human-cooperation-2q6llnac94.pdf
- **核心结论**：**条件合作规范**是人类合作的因果驱动力；人们倾向于迁移到能规范执行合作的制度环境中。
- **对你们项目**：为你们"公平者"性格（条件合作者）提供了实证基础。

---

## 四、社会崩溃、不平等与早期预警（⭐ 拓展）

### 1. Inequality between Identity Groups and Social Unrest（Houle et al., J. R. Soc. Interface 2021）
- **链接**：https://royalsocietypublishing.org/doi/pdf/10.1098/rsif.2021.0725
- **核心结论**：身份群体间经济/政治不平等会导致合作崩溃；法治、国家忠诚、反从众规范能延缓这一过程；用 79 国数据验证。
- **对你们项目**：为你们"阵营划分"事件干预提供理论依据。

### 2. Detecting the Collapse of Cooperation in Evolving Networks（Cavaliere et al., Scientific Reports 2016）
- **链接**：https://www.nature.com/articles/srep30845.pdf
- **核心结论**：**合作者被清除的平均时间随崩溃风险上升而变长**（类似临界转变前的恢复减速），可作为崩溃早期预警信号。
- **对你们项目**：直接支撑你们"社会崩溃回合数"指标——可以进一步设计"崩溃预警指标"。

### 3. Profit Fluctuations Signal Eroding Resilience of Natural Resources（Richter & Dakos, Ecological Economics）
- **链接**：https://daneshyari.com/article/preview/5049275.pdf
- **核心结论**：个体利润波动可以作为社会-生态系统即将崩溃的早期信号。
- **对你们项目**：你们的指标结算可以加入"资源存量波动率"和"个体收益标准差"等预警指标。

### 4. Avoiding the Bullies: Resilience of Cooperation among Unequals（Foley et al., arXiv 2021）
- **链接**：https://arxiv.org/pdf/2104.08636
- **核心结论**：**伴侣选择能力**让群体能孤立"霸凌者"，从而在权力不对称下维持合作；无伴侣选择则霸凌者无法被孤立。
- **对你们项目**：为你们"结盟/抢夺"机制提供了一个关键变量——agent 能否选择和谁互动。

---

## 五、给你们项目的文献使用建议

### 必读优先级（建议每人分配）
1. **陈致胜（AI Agent 与 Prompt）**：精读 Generative Agents（记忆/反思/规划架构）+ GOVSIM（agent 架构与沟通 ablation）+ SEAA（人格漂移问题）。
2. **翁琦凯（批量实验与统计）**：精读 GOVSIM（ablation 方法）+ Cavaliere et al.（崩溃预警指标）+ SandboxSocial（并行化与仪表板）。
3. **易天瑞（实验设计）**：通读第二、三部分（惩罚/沟通经典理论），特别是 Hauert 2007、Perc 2012、Tavoni 2011——这些直接定义你们的性格变量和制度变量。
4. **林升键（3D 前端）**：参考 Emergence World 和 AIvILIZATION 的可视化设计。
5. **刘锴桐（场景配置与 QA）**：参考 Chen & Szolnoki 的资源再生率参数、Houle et al. 的阵营划分设计。

### 你们项目的差异化定位（写 related work 时可强调）
- **相比 GOVSIM**：你们有 (a) 四种性格 agent 的初始配比滑块（异质性预设），(b) 旱灾/瘟疫/入侵等环境压力事件，(c) 3D 上帝视角实时观测。
- **相比 Generative Agents**：你们聚焦**资源博弈与合作崩溃**，而非日常生活模拟；有明确的经济学指标（存活率、崩溃回合数）。
- **相比经典演化博弈论文**：你们用 **LLM 作为高层决策引擎**，能处理语言沟通、欺骗、伦理抉择，突破了传统模型只能用预设策略的限制。

### 建议补充检索的方向（如需要）
- Elinor Ostrom 的公共池塘资源治理理论（Nobel 奖，commons governance 的经典框架）
- Mesa / NetLogo / Repast 等 ABM 工具框架文档
- "LLM agent deception / trust" 方向的最新论文
