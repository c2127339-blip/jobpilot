# Interview Question CLI（iq）

> 根据你的**简历**和**岗位 JD**，一键生成**个性化模拟面试问题** —— 附带「为什么问」和「参考答案思路」。

![demo](https://via.placeholder.com/800x300?text=iq+--demo+终端演示截图)

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

面试前最痛苦的事：对着 JD 不知道对方会问什么。这个 CLI 把**简历 + JD** 交给大模型，生成 12–15 个贴合你真实情况的面试问题，每个问题都告诉你**面试官为什么这样问**、**怎么答**，最后还会给出**简历与 JD 的差距提示** —— 相当于请了一位 24 小时在线的模拟面试官。

---

## 特性

- ✅ **基于真实材料出题**：问题只围绕简历和 JD 里真实出现的内容，不编造
- ✅ **四类问题**：项目经历 / 前端技术 / 行为面试 / 岗位匹配，覆盖面试全维度
- ✅ **每题带解析**：为什么问 + 参考答案思路 + 难度标注
- ✅ **差距提示**：自动指出简历与 JD 的差距，帮你针对性补强
- ✅ **无需 API key 也能体验**：内置 `--demo` 演示模式，离线跑通全流程
- ✅ **可替换模型**：基于 Vercel AI SDK，一套代码支持 DeepSeek / OpenAI 等
- ✅ **多语言适配**：默认中文输出，可扩展其他语言

## 快速开始

### 1. 演示模式（无需 API key）

```bash
# 克隆或下载本项目后
npx tsx src/index.ts generate --demo
```

即可在终端看到一份完整的模拟面试问题（内置示例简历 + 示例 JD）。

### 2. 真实使用

```bash
# 准备两份文件：resume.md（你的简历）、jd.md（目标岗位 JD）

# 使用 .env 中的 key
iq generate resume.md jd.md

# 或临时指定 key
iq generate resume.md jd.md --key sk-xxx

# 同时保存为 Markdown 文件
iq generate resume.md jd.md --out questions.md
```

> 首次运行后可用 `npm link` 将 `iq` 安装为全局命令。

## 命令一览

```
iq generate [resume] [jd]          生成面试问题
  --demo                           演示模式：内置示例数据，无需 API key
  --key <key>                      API key（默认读 .env 或 DEEPSEEK_API_KEY）
  --provider <deepseek|openai>     模型提供商，默认 deepseek
  --out <file.md>                  输出文件路径，同时保存为 Markdown
```

## 配置

在项目根目录创建 `.env`（参考 `.env.example`）：

```
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

- **DeepSeek**：到 [platform.deepseek.com](https://platform.deepseek.com) 申请，默认模型 `deepseek-chat`
- **OpenAI**：`--provider openai`，默认模型 `gpt-4o-mini`

## 工作原理

```
简历 (resume.md) ──┐
                   ├──► 拼接 Prompt ──► LLM（DeepSeek / OpenAI / Mock）──► JSON
JD (jd.md) ────────┘                              │
                                                   ▼
                            本地校验结构 ──► 终端彩色渲染 / 保存 Markdown
```

- **LLM 层**：通过 [Vercel AI SDK](https://sdk.vercel.ai) 统一接口调用，`src/llm.ts` 中一个 `MockProvider` 实现演示模式 —— 完整走通「Prompt → LLM → 解析 → 输出」管线，但不发任何网络请求。
- **约束出题**：Prompt 要求问题关键字必须出自简历或 JD，避免模型编造经历。
- **结构校验**：`src/prompt.ts` 的 `parseQuestionsJson` 在本地严格校验 LLM 返回的 JSON 结构，失败会给出可读错误。

## 项目结构

```
├── src/
│   ├── index.ts          # CLI 入口（commander）
│   ├── args.ts           # 参数解析与校验
│   ├── read-input.ts     # 读取简历 / JD 文件
│   ├── prompt.ts         # Prompt 构建 + 返回 JSON 校验
│   ├── llm.ts            # AI SDK 调用 + MockProvider（演示模式）
│   ├── demo-data.ts      # 演示数据（示例简历/JD/预置输出）
│   ├── output.ts         # 终端渲染 + Markdown 保存
│   └── run.ts            # generate 命令主流程
├── examples/             # 示例简历、JD、输出
├── README.md
├── LICENSE               # MIT
└── CONTRIBUTING.md
```

## FAQ

**Q：没有 API key 能用吗？**
可以。`iq generate --demo` 用内置演示数据 + 预置输出完整跑通流程，无需任何 key。

**Q：能换其他模型吗？**
能。本项目基于 Vercel AI SDK，支持 OpenAI 兼容接口的模型。加 provider 只需在 `src/llm.ts` 增加一条配置。

**Q：简历 / JD 支持什么格式？**
支持 `.txt` / `.md` / `.markdown`。粘贴任意简历文本到文件即可。

**Q：生成的问题质量如何？**
质量取决于简历和 JD 的信息完整度。建议简历写清楚项目职责、技术栈、量化成果；JD 用完整原文。差距提示会帮你发现信息缺口。

## 贡献

欢迎提交 Issue 和 PR，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

[MIT](LICENSE)
