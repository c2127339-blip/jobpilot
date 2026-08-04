# Contributing

感谢你愿意为 **Interview Question CLI** 贡献代码！请花两分钟阅读以下约定。

## 开发环境

- Node.js ≥ 18
- npm ≥ 9

```bash
# 安装依赖
npm install

# 本地运行（演示模式）
npm run demo
```

## 提交 PR

1. Fork 本仓库，基于最新 `main` 新建分支
2. 修改代码，确保 `npm run build`（TypeScript 类型检查 + 编译）通过
3. 添加或更新相关测试 / 示例
4. 提交信息使用简洁的英文或中文说明（例如 `feat: support more providers`）
5. 发起 PR，说明改动目的与验证方式

## 目录约定

- 核心逻辑都在 `src/` 下，单一职责，见各文件顶部注释
- 演示数据在 `src/demo-data.ts`；示例文件在 `examples/`
- 新增 LLM provider 时，在 `src/llm.ts` 的 `resolveProviderConfig` 增加一条配置即可

## 代码风格

- TypeScript，`strict` 模式
- 英文变量 / 函数名，中文注释与用户可见文案
- 不引入不必要的依赖；能用 Node 内置 API 优先

## Issue 模板

提交 Issue 时请包含：

- 复现步骤（命令 + 输入）
- 期望行为与实际行为
- 环境：Node 版本、平台

再次感谢！
