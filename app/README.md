# app/ — 个人计划管理器 应用代码

本目录包含个人计划管理器的完整应用源码。项目整体介绍、环境要求、数据说明和故障排查请参阅 **[仓库根 README](../README.md)**。

## 从本目录直接开发

```bash
# 安装依赖
pnpm install

# 纯前端调试
pnpm dev

# Tauri 桌面调试
pnpm tauri:dev

# 测试与检查
pnpm test
pnpm lint
pnpm typecheck
pnpm check
```

## 本目录结构补充说明

| 路径 | 说明 |
|------|------|
| `src/components/ui/` | shadcn/ui 基础组件，由 `components.json` 配置生成，不要手动修改 |
| `src/store/useAppStore.ts` | 全局 Zustand store，前端状态统一管理入口 |
| `src/lib/api.ts` | Tauri invoke 封装层，前端与 Rust 后端的桥接 |
| `src/pages/` | 路由页面：矩阵 `/`、看板 `/kanban`、日历 `/calendar`、列表 `/list`、看板 `/dashboard` |
| `src-tauri/src/commands/` | Rust 侧 Tauri 命令实现，每文件对应一个领域 |
| `src-tauri/src/db.rs` | SQLite 连接、版本化迁移逻辑 |
| `src-tauri/src/seed.rs` | 开发环境种子数据，在 Tauri setup 阶段自动插入（仅当数据库为空） |

## TypeScript 路径别名

项目配置了 `@/*` → `./src/*` 路径别名（见 `tsconfig.app.json` 和 `vite.config.ts`），可在源码中使用：

```ts
import { PlanCard } from "@/components/plans/PlanCard";
import { useAppStore } from "@/store/useAppStore";
```

## 测试

```bash
pnpm test              # 运行全部测试
pnpm test:watch        # 监视模式
pnpm vitest --coverage # 生成覆盖率报告（html/ 目录）
```

测试文件与源码同目录放置，命名规范为 `*.test.{ts,tsx}`。全局测试配置见 `vite.config.ts` 的 `test` 字段和 `src/test/setup.ts`。
