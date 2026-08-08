# 个人计划管理器 (Personal Plan Helper)

一个基于 **Tauri v2 + React + TypeScript** 的 Windows 桌面应用，用于记录并可视化当前待办事项。数据保存在本机 SQLite 数据库，无需联网。

## 核心功能

- **艾森豪威尔四象限**：计划按「重要 × 紧急」两个维度（0–4，步进 0.5）自动落入四象限，支持拖拽卡片调整优先级。
- **分类管理**：内置工作 / 学习 / 日常 / 个人任务四类分类，支持自定义分类名称与颜色，可按分类、状态、时间段全局筛选。
- **标签工作流与看板**：可创建自定义工作流模板（定义步骤序列），将计划绑定工作流后在看板视图中按步骤分列展示，支持拖拽推进 / 回退步骤，也可拖回「未分类」解除绑定。
- **时间周期与 DDL**：支持日 / 月 / 季 / 年周期视图与日历视图；计划可设置截止日期（DDL），临近到期、今日到期、已逾期均有高亮提醒。
- **列表视图**：多条件筛选与排序（按重要度、紧急度、DDL、创建时间等字段）。
- **数据看板**：总计划数、完成率、今日待办、逾期数等统计卡片，以及分类占比饼图、完成趋势折线图、紧急度分布柱状图（支持周 / 月 / 季 / 年切换）。

### 规划中 / 待验证

- 子任务（父子计划层级）—— 数据模型已预留 `parent_id`，前端交互尚未实现。
- 操作日志可视化 —— 后端已记录 `plan_logs` 表，前端暂无日志查看界面。
- 数据导出 / 云同步 / 快捷键自定义 —— 规划阶段，尚未开始开发。

## 技术栈

| 层面 | 技术 |
|------|------|
| 桌面框架 | [Tauri v2](https://v2.tauri.app/)（Rust 后端） |
| 前端框架 | React 18 + TypeScript（严格模式） |
| 构建工具 | [Vite](https://vitejs.dev/) 8 |
| 样式方案 | [Tailwind CSS](https://tailwindcss.com/) 3 + [shadcn/ui](https://ui.shadcn.com/) |
| 状态管理 | [Zustand](https://zustand.docs.pmnd.rs/) 5 |
| 本地存储 | SQLite（Rust `rusqlite`，bundled 模式，无需系统安装 SQLite） |
| 图表 | [Recharts](https://recharts.org/) |
| 拖拽 | [@dnd-kit](https://dndkit.com/) |
| 日期处理 | [date-fns](https://date-fns.org/) |
| 动画 | [Framer Motion](https://www.framer.com/motion/) |
| 测试 | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/) |
| 包管理器 | [pnpm](https://pnpm.io/) 9+ |

## 环境要求

### Windows（主要开发与运行平台）

- **Windows 10** 或更高版本（WebView2 已预装）
- **Node.js** ≥ 20（推荐 20 LTS 或 22）
- **pnpm** ≥ 9
- **Rust**（stable 工具链，含 `cargo`；通过 [rustup](https://rustup.rs/) 安装）
- **Microsoft Visual Studio Build Tools**（或 Visual Studio 2022，勾选「使用 C++ 的桌面开发」工作负载）

> 注意：Tauri v2 依赖 Microsoft C++ 工具链编译 Rust 原生代码。若未安装 Build Tools，`tauri:dev` 或 `tauri:build` 会在链接阶段失败。

### 验证环境

```bash
node --version    # 应 ≥ 20
pnpm --version    # 应 ≥ 9
rustc --version   # 应显示 stable 版本
cargo --version   # 应显示对应版本
```

## 快速开始

所有命令均从仓库根目录执行，项目代码位于 `app/` 子目录。

### 1. 克隆仓库

```bash
git clone <repo-url>
cd personal_plan_helper
```

### 2. 安装依赖

```bash
pnpm --dir app install
```

### 3. 启动开发模式

**纯前端调试（浏览器，不带 Tauri 窗口）**：

```bash
pnpm --dir app dev
```

启动后访问 `http://127.0.0.1:5173`。前端代码热更新；此模式下 Tauri 后端命令（SQLite 操作）不可用。

**Tauri 桌面调试（完整应用窗口）**：

```bash
pnpm --dir app tauri:dev
```

这会先启动 Vite 开发服务器，再以开发模式拉起 Tauri 窗口。前端改动热更新；Rust 代码修改后需重新编译（重启命令）。

## 常用命令

以下命令均针对 `app/` 子目录，可从仓库根目录通过 `--dir app` 调用，也可先 `cd app` 后直接执行。

| 命令 | 说明 |
|------|------|
| `pnpm --dir app dev` | 启动 Vite 前端开发服务器（浏览器调试） |
| `pnpm --dir app tauri:dev` | 启动 Tauri 桌面开发模式（完整应用） |
| `pnpm --dir app build` | TypeScript 编译 + Vite 生产构建 |
| `pnpm --dir app tauri:build` | 完整桌面构建：编译 Rust 后端 + 前端，生成 Windows 安装包 |
| `pnpm --dir app preview` | 本地预览生产构建产物 |
| `pnpm --dir app test` | 运行 Vitest 测试套件（单次） |
| `pnpm --dir app test:watch` | Vitest 监视模式（开发时持续运行） |
| `pnpm --dir app lint` | 代码检查：oxlint + ESLint |
| `pnpm --dir app format` | Prettier 格式化源码 |
| `pnpm --dir app format:check` | Prettier 格式检查（不修改文件） |
| `pnpm --dir app typecheck` | TypeScript 类型检查（`tsc -b --noEmit`） |
| `pnpm --dir app check` | 综合检查：lint + test |

> 提示：如果你已 `cd app`，可省略 `--dir app`，直接使用 `pnpm dev`、`pnpm test` 等。

## 项目结构

```
personal_plan_helper/          # 仓库根目录
├── app/                       # 应用主目录
│   ├── src/                   # React 前端源码
│   │   ├── components/        # 通用 UI 组件
│   │   │   ├── categories/    #   分类管理对话框
│   │   │   ├── layout/        #   布局（导航、筛选栏、命令面板）
│   │   │   ├── plans/         #   计划卡片、表单、删除确认
│   │   │   ├── ui/            #   shadcn/ui 基础组件
│   │   │   └── workflows/     #   工作流管理对话框
│   │   ├── hooks/             # 自定义 React Hooks（useTheme 等）
│   │   ├── lib/               # 工具函数（API 调用、日期、DDL、筛选、象限、表单）
│   │   ├── pages/             # 页面组件
│   │   │   ├── MatrixPage     #   艾森豪威尔四象限
│   │   │   ├── KanbanPage     #   工作流看板
│   │   │   ├── CalendarPage   #   时间周期 / 日历视图
│   │   │   ├── ListPage       #   列表视图
│   │   │   └── DashboardPage  #   数据看板
│   │   ├── store/             # Zustand 全局状态（useAppStore）
│   │   ├── test/              # 测试工具（fixtures、拖拽 mock、setup）
│   │   └── types/             # TypeScript 类型定义（与 Rust models.rs 同步）
│   ├── src-tauri/             # Tauri Rust 后端
│   │   ├── src/
│   │   │   ├── commands/      # Tauri invoke 命令（plans、categories、workflows、aggregates）
│   │   │   ├── db.rs          # SQLite 连接管理、版本化迁移
│   │   │   ├── models.rs      # 数据结构定义（Plan、Category、TagWorkflow 等）
│   │   │   ├── seed.rs        # 开发环境种子数据
│   │   │   ├── lib.rs         # Tauri 应用入口（注册命令、初始化数据库）
│   │   │   └── main.rs        # Rust 主函数
│   │   ├── icons/             # 应用图标（多分辨率）
│   │   ├── capabilities/      # Tauri 权限配置
│   │   └── tauri.conf.json    # Tauri 构建配置（窗口、打包、安全策略）
│   ├── package.json           # 依赖与脚本
│   ├── vite.config.ts         # Vite + Vitest 配置
│   ├── tsconfig.json          # TypeScript 项目引用
│   ├── tsconfig.app.json      # TypeScript 前端编译配置（strict）
│   ├── tailwind.config.js     # Tailwind CSS 主题配置
│   └── eslint.config.js       # ESLint 规则
├── docs/                      # 项目文档
│   └── GIT_WORKFLOW.md        # Git 工作流与分支规范
├── feature-spec.md            # 产品功能规格说明书
├── .gitignore                 # Git 忽略规则
└── README.md                  # ← 本文件
```

## 数据与隐私

- **所有数据仅保存在本机**：应用使用 SQLite 数据库，文件位于 Tauri 应用数据目录（Windows 上通常为 `%APPDATA%/com.personal-plan-helper.app/`）。
- **无需联网**：应用不包含任何遥测、统计上报或云端同步。当前版本纯离线运行。
- **数据库文件** `personal_plan.db` 可直接用 SQLite 工具打开查看，方便数据迁移或备份。
- **云同步** 处于规划阶段，尚未实现。如需在多台设备间同步数据，当前只能手动复制数据库文件。

## 构建 Windows 安装包

### 完整构建

```bash
pnpm --dir app tauri:build
```

此命令会：
1. 运行 TypeScript 编译 + Vite 前端打包
2. 以 release 模式编译 Rust 后端（启用 LTO、优化体积）
3. 生成 Windows 安装包

构建产物位于 `app/src-tauri/target/release/bundle/`：

| 目录 | 内容 |
|------|------|
| `msi/*.msi` | Windows Installer 安装包 |
| `nsis/*.exe` | NSIS 安装包（便携式安装器） |

> 首次构建需下载 Rust 依赖并编译所有 crate，耗时较长（5–15 分钟，视机器配置而定）。

### 构建配置

Tauri 打包参数在 `app/src-tauri/tauri.conf.json` 中配置：

- **应用名称**：`productName`（当前：Personal Plan Helper）
- **窗口标题**：`app.windows[0].title`（当前：个人计划管理器）
- **应用标识符**：`identifier`（当前：`com.personal-plan-helper.app`）
- **安装包格式**：`bundle.targets`（当前：`["msi", "nsis"]`）
- **应用图标**：`bundle.icon`，图标源文件位于 `app/src-tauri/icons/`

如需自定义应用图标，准备一张 ≥ 1024×1024 的 PNG 图片，然后运行：

```bash
pnpm --dir app tauri icon <你的图标文件.png>
```

## 常见问题排查

### 1. `tauri:dev` 启动报错 "linking with link.exe failed"

**原因**：未安装 Microsoft C++ Build Tools，或未勾选「使用 C++ 的桌面开发」工作负载。

**解决**：
- 下载 [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
- 安装时勾选「使用 C++ 的桌面开发」工作负载
- 安装完成后重启终端

### 2. `pnpm --dir app install` 报错 "Cannot find module ... esbuild"

**原因**：pnpm 的构建后脚本（如 esbuild 原生模块）需要允许执行。

**解决**：
- 检查 `app/.pnpm-approve-builds.json` 是否包含 `"esbuild": true`
- 若手动安装新依赖后出现此问题，运行 `pnpm --dir app approve-builds` 并确认
- 或设置环境变量允许所有构建脚本（仅开发环境）：`$env:PNPM_APPROVE_BUILDS = "*"`

### 3. Vite 开发服务器启动后页面空白

**原因**：Vite 服务器端口（默认 5173）被占用，或 Tauri 的 `devUrl` 与 Vite 实际地址不一致。

**解决**：
- 检查终端日志，确认 Vite 实际监听的地址和端口
- 确保 `app/src-tauri/tauri.conf.json` 中 `build.devUrl` 与 Vite 地址一致（当前配置为 `http://127.0.0.1:5173`）
- 若端口被占用，终止占用进程或修改 `vite.config.ts` 中的 `server.port`

### 4. 运行 `pnpm test` 时 jsdom 相关报错

**原因**：jsdom 依赖的 Node.js 原生模块未正确安装。

**解决**：
```bash
pnpm --dir app install --force
pnpm --dir app test
```

### 5. `tauri:build` 编译报错 "error: could not compile ..."

**原因**：Rust 工具链版本过旧，或网络问题导致 crate 下载不完整。

**解决**：
```bash
rustup update stable
cd app/src-tauri && cargo clean
cd ../.. && pnpm --dir app tauri:build
```

## 项目状态

当前项目版本：**v0.1.0**（开发中，未发布正式版）

- ✅ Stage 1–3 核心功能已完成（任务 CRUD、四象限、分类、工作流、时间视图、数据看板）
- ✅ 测试覆盖：前端 Vitest 测试套件通过，Rust 后端包含单元测试
- ✅ Windows 平台 Tauri 打包配置就绪
- ⏳ 子任务、操作日志 UI 等高级功能尚未实现
- ⏳ 尚未进行全面的跨 Windows 版本兼容性测试
- ⏳ 云同步、数据导出功能为远期规划

## 相关文档

- [功能规格说明书](feature-spec.md) — 产品架构、数据模型、功能优先级
- [Git 工作流规范](docs/GIT_WORKFLOW.md) — 分支策略、Commit 规范、PR 流程
- [子项目 README](app/README.md) — `app/` 子目录补充说明

## 许可证

本项目为个人项目，暂未选定开源许可证。
