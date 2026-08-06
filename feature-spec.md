## 产品架构概览

### 技术选型

| 层面 | 选择 | 理由 |
|------|------|------|
| 桌面框架 | **Tauri v2** | 轻量（二进制 ~5MB vs Electron ~100MB），Rust 后端性能优异，原生 Windows 支持 |
| 前端框架 | **React 18 + TypeScript** | 生态丰富，组件化开发效率高，类型安全 |
| UI 组件 | **Tailwind CSS + shadcn/ui** | 原子化样式灵活，shadcn 提供高质量无封装组件 |
| 状态管理 | **Zustand** | 轻量、无模板代码、支持持久化中间件 |
| 本地存储 | **SQLite** (via Tauri SQL plugin) | 单文件数据库，无需安装，适合本地应用 |
| 图表 | **Recharts** | React 原生，声明式 API，满足看板需求 |
| 拖拽 | **@dnd-kit** | 现代拖拽库，支持键盘操作和多种布局 |

**备选方案**：如果 Tauri 的 Rust 学习曲线成为阻碍，可使用 **Electron + better-sqlite3** 作为 fallback，牺牲包体积换取更快的开发速度。

### 目录结构

```
personal-plan-helper/
├── src-tauri/            # Tauri Rust 后端
│   ├── src/
│   │   ├── db/           # SQLite 连接与迁移
│   │   ├── commands/     # Tauri invoke 命令
│   │   └── models/       # 数据结构定义
│   └── Cargo.toml
├── src/                  # React 前端
│   ├── components/       # 通用组件（Button, Modal, Tag, …）
│   ├── features/         # 功能模块
│   │   ├── tasks/        # 任务 CRUD
│   │   ├── matrix/       # 艾森豪威尔矩阵
│   │   ├── calendar/     # 时间周期视图
│   │   ├── workflow/     # 标签工作流
│   │   ├── dashboard/    # 数据看板
│   │   └── categories/   # 分类管理
│   ├── stores/           # Zustand stores
│   ├── hooks/            # 自定义 hooks
│   ├── types/            # TypeScript 类型
│   ├── lib/              # 工具函数
│   └── App.tsx
├── package.json
└── tailwind.config.ts
```

### 数据模型

```sql
-- 计划分类
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,           -- 工作计划 / 学习计划 / 日常计划 / 个人任务
  color TEXT NOT NULL,          -- 标签颜色
  icon TEXT,                    -- 图标名称
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 标签工作流模板
CREATE TABLE tag_workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,           -- 如"开发任务流程"
  steps TEXT NOT NULL,          -- JSON: ["需求分析","方案设计","代码开发","测试验证","已合入dev","已合入主干","闭环"]
  created_at TEXT NOT NULL
);

-- 核心：计划/任务
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category_id TEXT REFERENCES categories(id),
  parent_id TEXT REFERENCES plans(id),  -- 子任务支持
  importance INTEGER NOT NULL DEFAULT 0 CHECK(importance BETWEEN 0 AND 4),  -- 0-4 重要程度
  urgency INTEGER NOT NULL DEFAULT 0 CHECK(urgency BETWEEN 0 AND 4),        -- 0-4 紧急程度
  ddl TEXT,                     -- ISO 8601 截止日期
  tag_workflow_id TEXT REFERENCES tag_workflows(id),
  current_step_index INTEGER DEFAULT 0,
  period_type TEXT CHECK(period_type IN ('daily','monthly','quarterly','yearly')),
  period_value TEXT,            -- 如 "2026-08", "2026-Q3", "2026"
  status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 操作日志
CREATE TABLE plan_logs (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  action TEXT NOT NULL,         -- created / updated / status_changed / step_advanced
  detail TEXT,                  -- JSON 描述变更
  created_at TEXT NOT NULL
);
```

### 核心视图设计

1. **艾森豪威尔矩阵** — 默认首页，四象限（重要紧急 / 重要不紧急 / 不重要紧急 / 不重要不紧急），支持拖拽调整优先级
2. **看板视图** — 按标签工作流的当前步骤分列，拖拽推进计划状态
3. **时间视图** — 日历/甘特图形式，按日/月/季/年切换，DDL 高亮
4. **列表视图** — 支持多条件筛选排序，批量操作
5. **数据看板** — 完成率、分类分布、趋势折线图

### 功能优先级

- **P0 MVP**：任务 CRUD + 艾森豪威尔矩阵 + 分类管理
- **P1**：标签工作流 + 多时间周期视图 + DDL
- **P2**：数据看板 + 子任务 + 操作日志
- **P3**：数据导出 + 云同步 + 快捷键自定义

---

## 子 Issue 拆分

### Stage 1: 基础架构搭建

**JER-3**: 项目脚手架搭建与基础配置
- 初始化 Tauri v2 + React 18 + TypeScript 项目
- 配置 Tailwind CSS、shadcn/ui 组件库
- 配置 Zustand 状态管理、React Router 路由
- 搭建基础布局框架（侧边栏导航 + 主内容区）
- 验收：`npm run tauri dev` 可启动空窗口，显示导航框架
- 预估：1~2 天

**JER-4**: 数据模型设计与本地数据库搭建
- 实现 SQLite 数据库初始化与迁移（Rust 侧）
- 封装 Tauri commands：CRUD 基础操作
- 前端 TypeScript 类型定义 + API 调用层
- 编写种子数据脚本用于开发调试
- 验收：可通过 Tauri invoke 读写 plans/categories 表
- 预估：1~2 天

### Stage 2: MVP 核心功能

**JER-5**: 任务 CRUD 与艾森豪威尔四象限视图
- 任务创建/编辑/删除表单（含所有字段）
- 艾森豪威尔矩阵四象限渲染
- 拖拽调整重要/紧急程度（@dnd-kit）
- 计划状态切换（active/completed/cancelled）
- 验收：可创建计划并在四象限中拖拽调整位置
- 预估：2~3 天

**JER-6**: 计划分类管理与筛选系统
- 四类计划分区管理（工作/学习/日常/个人）
- 分类 CRUD（自定义分类名称、颜色）
- 全局筛选器（按分类、状态、时间段筛选）
- 列表视图：支持排序、批量选择
- 验收：可切换分类查看、创建/编辑分类、多条件筛选
- 预估：1~2 天

### Stage 3: 高级功能与可视化

**JER-7**: 自定义标签工作流引擎
- 工作流模板 CRUD（定义步骤列表）
- 计划绑定工作流，步骤推进/回退
- 看板视图：按步骤分列，拖拽推进
- 验收：可创建自定义工作流，在看板中拖拽计划改变步骤
- 预估：2~3 天

**JER-8**: 多时间周期视图与 DDL 管理
- 日/月/季/年视图切换，时间段筛选
- 日历视图集成（月视图/周视图）
- DDL 设置与编辑（日期选择器）
- 即将到期/已过期计划高亮提醒
- 验收：可切换时间周期查看对应计划，DDL 到期高亮
- 预估：2~3 天

**JER-9**: 数据看板与可视化
- 统计卡片（总任务数、完成率、今日待办、逾期数）
- 分类占比饼图、趋势折线图（Recharts）
- 完成率进度条、周/月完成趋势
- 验收：看板展示统计数据，图表可交互
- 预估：1~2 天

### Stage 4: 收尾

**JER-10**: UI/UX 打磨
- 页面过渡动画、骨架屏加载态
- 全局 Toast 通知、错误处理
- 键盘快捷键（快速创建、搜索、切换视图）
- 空状态设计、引导提示
- 验收：整体体验流畅，异常状态处理完善
- 预估：1~2 天

**JER-11**: 测试与 Windows 打包
- 关键流程集成测试
- Tauri build 配置，Windows .msi 安装包构建
- 应用图标、启动画面
- README 使用说明
- 验收：可构建出可安装的 Windows 安装包
- 预估：1~2 天

### 依赖关系

```
Stage 1 (JER-3, JER-4) → Stage 2 (JER-5, JER-6) → Stage 3 (JER-7, JER-8, JER-9) → Stage 4 (JER-10, JER-11)
```

- JER-3, JER-4 可并行
- JER-5, JER-6 依赖 Stage 1，彼此可并行
- JER-7, JER-8, JER-9 依赖 Stage 2，彼此可并行
- JER-10, JER-11 依赖 Stage 3，彼此可并行

### 建议的开发智能体

- **前端开发智能体** — 负责 React/TypeScript/UI 组件开发
- **后端开发智能体** — 负责 Tauri Rust 命令/数据库操作
- **测试智能体** — 负责集成测试与打包验证
