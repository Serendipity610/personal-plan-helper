# Git 工作流规范

## 分支策略

本项目采用 **GitHub Flow + develop 分支** 策略：

```
master ───────────────────────────── ● (release)
  │                                   │
  └── develop ──────────────────── ● (integration)
        │                            │
        └── feat/JER-X-task-name ── ● (feature branch)
```

| 分支 | 用途 |
|------|------|
| `master` | 生产就绪代码，仅通过 PR 从 `develop` 合并 |
| `develop` | 开发主线，所有功能分支的合并目标 |
| `feat/*` | 功能开发分支，命名格式 `feat/JER-{issue}-{short-desc}` |
| `fix/*` | Bug 修复分支，命名格式 `fix/{short-desc}` |

## 开发流程

### 1. 开始新功能

```bash
git checkout develop
git pull origin develop
git checkout -b feat/JER-{issue号}-{简短描述}
```

### 2. Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

[optional body]
```

**类型（type）**：
- `feat` — 新功能
- `fix` — Bug 修复
- `refactor` — 重构
- `style` — 代码格式（不影响功能）
- `docs` — 文档更新
- `test` — 测试
- `chore` — 构建/工具/依赖

**示例**：
```
feat(plans): add Eisenhower matrix drag-and-drop
fix(db): resolve SQLite migration race condition
refactor(store): extract plan selectors to separate file
```

### 3. 提交前检查清单

- [ ] `pnpm build` 通过（TypeScript + Vite 构建）
- [ ] `cargo build` 通过（Rust 后端编译）
- [ ] 新功能包含对应的类型定义（`src/types/`）
- [ ] 不提交调试代码、console.log、注释掉的代码

### 4. 创建 Pull Request

```bash
git push -u origin feat/JER-{issue号}-{简短描述}
# 然后在 GitHub 上创建 PR，目标分支为 develop
```

**PR 标题格式**：`[JER-{issue号}] {功能简述}`

**PR 描述必须包含**：
- 变更说明
- 验收标准 checklist
- 相关 Issue 链接（`Closes #N`）

### 5. 合并策略

- **Squash & Merge** — 将功能分支的所有 commit 压缩为一个，保持 `develop` 历史整洁
- 合并后删除远程功能分支

## 禁止事项

- ❌ 直接推送到 `master` 或 `develop`
- ❌ 提交包含密钥/Token 的文件
- ❌ `git push --force` 到共享分支
- ❌ 提交 `node_modules/`、`target/`、`dist/` 等构建产物
- ❌ 提交大型二进制文件（图标除外，需放 `src-tauri/icons/`）

## .gitignore 覆盖

已配置忽略以下目录/文件：
- `node_modules/`、`dist/`、`app/dist/`
- `app/src-tauri/target/`、`app/src-tauri/gen/`
- `.env` 系列、`.agent_context/`、`.claude/`、`.multica/`
- `personal-website/`（外部仓库）
