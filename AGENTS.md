# 工程约定

本项目是 Vue 3、TypeScript、Pinia 和 Tauri 2 桌面应用，只提供 Tauri 运行模式。修改代码前先沿着现有调用链确认数据从哪里来、在哪里修改、何时写入磁盘。保持页面、配置状态、业务逻辑和平台 API 的职责清晰。

## 编码规范

- TypeScript 和 Vue 使用空格缩进，每级 2 个空格、单引号、语句末尾分号，行宽以 120 字符为准；以 `.oxfmtrc.json` 为准执行格式化。
- `if`、`else`、`for` 等控制语句始终使用大括号，代码块内容另起一行。`.oxlintrc.json` 仅配置了 `curly` 规则，不为目录职责添加额外 Lint 限制。
- 开启严格类型检查。为数据边界和公开函数声明明确类型；避免用类型断言掩盖不确定的输入。
- 注释写在关键逻辑、异步时序、数据迁移和安全边界处，说明原因与约束。普通赋值、简单调用和显而易见的 UI 绑定不逐行注释。
- JavaScript、TypeScript 及 Vue 脚本中的注释统一使用 `//`，不使用 `/* */`、`/** */`，也不写 `---`、`===` 等分隔符注释。
- Rust 代码遵循 `rustfmt` 的格式和现有 Tauri 结构。

## 目录与职责

- `src/main.ts`、`src/App.vue` 和样式文件位于 `src` 根目录。`main.ts` 负责创建应用，`App.vue` 负责应用外壳与生命周期。
- `src/views/` 放页面；`src/components/` 放可复用的界面组件；`src/routers/` 放路由。
- `src/pinia/config.ts` 是运行期间配置的唯一可写入口，负责配置操作、加载状态、自动保存和显式持久化。页面只读取配置，并调用 store action 修改；选中项、搜索词、弹窗和本次操作的临时结果属于页面状态。
- `src/services/` 放配置模型与预设、存储、Shell 生成、文件与网络操作、窗口生命周期等逻辑。Tauri API、WebView 的 DOM 与窗口事件在这里封装；页面和 Pinia 不直接访问 Tauri API 或 `window` 属性。与页面交互有关的 service 可以返回局部状态，但不另存一份配置。
- `src-tauri/` 放 Rust 入口、能力声明、打包配置和图标。`dist/`、`node_modules/`、`src-tauri/target/` 与 `src-tauri/gen/` 是生成内容，不手工修改。

## 配置与文件操作

- 持久化格式以 `src/services/config.ts` 的 `Config` 和 `parseConfig()` 为准。读取本地文件、导入 JSON 和恢复 Gist 都经过相同的校验入口；保留旧版配置的迁移路径。
- 所有变量都必须填写 Key，包括加入 PATH 的变量；空 Key 只可作为编辑中的草稿，不能生成 Profile 或导入替换。导入和恢复使用完整配置替换当前配置，清空操作恢复默认配置。
- 配置写入 Tauri 应用数据目录的 `config.json`。JSON 导入和导出保留 GitHub Token；Gist 备份只写 Token 占位符，恢复时保留本机当前 Token。
- 编辑通过 Pinia action 提交。异步保存按顺序写入；写入期间的新编辑必须继续保存，旧写入结果不能覆盖新状态。加载失败时不得用默认配置覆盖原文件。
- 生成 Profile、接入 rc 文件、导出和备份要使用独立配置快照。预览文件修改后，实际写入前再次核对目标文件，避免覆盖其他程序在预览期间做出的更改。
- 环境块包含变量和 Shell 子块。生成 Profile 时，先按环境块顺序设置变量并执行已启用的 Shell 子块，最后统一追加 PATH；停用父块也停用其子块。

## 工具与依赖

- 本仓库已有 `package.json`。Node.js 依赖使用项目本地的 `npm install <package>` 或 `npm install -D <package>`；临时工具可使用 `npx`。不要全局安装 npm 包。
- 如任务确需 Python 工具，先在当前工作目录运行 `uv venv`，在该虚拟环境中用 `uv pip install <package>` 安装，并使用虚拟环境中的 Python。不要直接运行 `pip install`、`python -m pip install` 或使用 `--break-system-packages`。全局安装工具需要先征得用户同意，再使用 `uv tool`。
- 代码修改后按影响范围执行格式、类型、Lint、前端构建或 Rust 编译检查；不要把构建产物加入源码。

## 版本号维护

- `package.json` 的 `version` 是应用版本号的唯一维护入口。升级版本时先更新它，再执行 `npm run sync:version`；不要单独修改其他文件中的应用版本号。
- 同步命令把该版本写入 `src-tauri/Cargo.toml` 的 `[package].version`、`src/App.vue` 侧栏显示的版本号和 `src-tauri/tauri.conf.json` 的顶层 `version`。
- `package-lock.json` 和 `src-tauri/Cargo.lock` 是依赖锁文件，其中的应用版本号由对应包管理工具维护，不作为版本号来源。

## Git 提交

仅使用本次提交实际涉及的 `[mod]`、`[add]`、`[del]` 标签。标签与第一条说明在同一行，多条说明也写在同一行，例如：

```text
[mod] 1. 调整配置保存流程。 2. 修复关闭窗口时的写入时序。
[add] 1. 增加文件导出服务。
```
