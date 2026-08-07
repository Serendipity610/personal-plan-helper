# 个人计划管理器

一个基于 **Tauri v2 + React + TypeScript** 的 Windows 桌面应用，用于记录并可视化当前待办事项。支持按重要/紧急维度排序、按工作流推进状态、按周期查看规划，并提供数据看板。

## 功能说明

- **艾森豪威尔四象限**：计划按「重要 × 紧急」两个维度自动落入四象限，支持拖拽卡片调整优先级（重要度/紧急度 0–4，步长 0.5）。
- **分类管理**：内置工作/学习/日常/个人任务分类，可自定义分类名称与颜色，支持按分类、状态、时间段全局筛选。
- **标签工作流与看板**：可创建工作流模板（自定义步骤序列），将计划绑定工作流后在看板视图中按步骤分列展示，支持拖拽推进/回退步骤，也可拖回「未分类」解除绑定。
- **时间周期与 DDL**：支持日/月/季/年周期视图与日历视图；计划可设置 DDL，临近到期、今日到期、已逾期均有高亮提醒。
- **列表视图**：多条件筛选与排序。
- **数据看板**：总计划数、完成率、今日待办、逾期数等统计卡片，以及分类占比饼图、完成趋势折线图、紧急度分布柱状图（支持周/月/季/年切换）。
- **本地存储**：数据保存在本机 SQLite 数据库（Tauri 应用数据目录），无需联网。

## 技术栈

| 层面 | 技术 |
|------|------|
| 桌面框架 | Tauri v2（Rust） |
| 前端 | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 本地存储 | SQLite（Rust `rusqlite`） |
| 图表 | Recharts |
| 拖拽 | @dnd-kit |
| 测试 | Vitest + React Testing Library |

## 开发环境搭建

### 前置依赖

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9
- [Rust](https://www.rust-lang.org/tools/install)（stable，含 `cargo`）
- Windows：Microsoft C++ Build Tools（或 Visual Studio Build Tools，含「使用 C++ 的桌面开发」工作负载）

### 安装依赖

```bash
cd app
pnpm install
```

### 启动开发模式

```bash
pnpm tauri:dev
```

这会先启动 Vite 开发服务器（默认 `http://127.0.0.1:5173`），再以开发模式拉起 Tauri 窗口。改动前端代码会热更新；修改 Rust 代码后需重启。

只跑前端（不带 Tauri 窗口）:

```bash
pnpm dev
```

## 测试与代码检查

```bash
pnpm test          # 运行 Vitest 测试套件
pnpm typecheck     # TypeScript 类型检查
pnpm lint          # oxlint + eslint
pnpm check         # lint + test
```

## 构建 Windows 安装包

```bash
pnpm build         # 仅构建前端产物（dist/）
pnpm tauri:build   # 完整构建：编译 Rust 并生成 Windows 安装包
```

构建产物位于 `src-tauri/target/release/bundle/`：

- `msi/*.msi` — Windows Installer 安装包
- `nsis/*.exe` — NSIS 安装包
- 以及 `.exe` 主程序

Tauri 打包配置见 `src-tauri/tauri.conf.json`（应用名称、版本号、图标、bundle targets 等）。应用图标位于 `src-tauri/icons/`，可使用 `pnpm tauri icon <源图片>` 重新生成。

## 目录结构

```
app/
├── src/                    # React 前端
│   ├── components/         # 通用组件（计划卡片、表单、对话框等）
│   ├── pages/              # 页面（矩阵、看板、日历、列表、看板）
│   ├── store/              # Zustand 状态管理
│   ├── lib/                # 工具函数（筛选、DDL、象限、日期等）
│   ├── types/              # TypeScript 类型定义
│   └── test/               # 测试工具与 fixtures
├── src-tauri/              # Tauri Rust 后端
│   ├── src/
│   │   ├── db/             # SQLite 连接与初始化
│   │   ├── commands/       # Tauri invoke 命令
│   │   └── models.rs       # 数据模型
│   ├── icons/              # 应用图标
│   └── tauri.conf.json     # Tauri 构建配置
├── package.json
└── vite.config.ts
```
