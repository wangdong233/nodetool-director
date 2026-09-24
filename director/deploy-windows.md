# Windows 机器部署指南(nodetool-director)

> 目标机:Windows 10/11 x64(全流程机,Chrome WebGPU 走 DX12=真 GPU 合成)。开发仓:github.com/wangdong233/nodetool-director(SSH)。

## 0. 前置清单

| 项 | 要求 | 验证 |
|---|---|---|
| Node | **22.22.1**(nvm-windows 或直装;engines 锁 >=22 <23) | `node -v` |
| npm | 10.9.x(随 Node22;`corepack enable && corepack install` 钉 10.9.7) | `npm -v` |
| git | 任意近期版+SSH key 已加 GitHub | `git ls-remote git@github.com:wangdong233/nodetool-director.git` |
| Chrome/Edge | 最新(chrome://gpu 查 WebGPU=Hardware accelerated) | — |
| ffmpeg | 可选(部分节点) | `ffmpeg -version` |
| 磁盘 | ≥8GB(仓 2G+node_modules 4.5G+构建) | — |

## 1. 取仓与安装

```powershell
git clone git@github.com:wangdong233/nodetool-director.git
cd nodetool-director
# 代理环境(如需): $env:HTTPS_PROXY="http://127.0.0.1:7890"; $env:HTTP_PROXY=同
npm ci --no-audit --no-fund   # 或 npm install;代理不稳时加 ELECTRON_SKIP_BINARY_DOWNLOAD=1
npm run build:packages
```

注意(本机踩坑已固化):npm 缓存如遇 EACCES 属主错(历史遗留),用 `npm config set cache <项目内目录>` 绕行,勿动系统。

## 2. 运行(生产单端口形态——推荐)

```powershell
npm run build --workspace=web   # 或 cd web; npm run build (83MB dist)
$env:STATIC_FOLDER="<绝对路径>\nodetool-director\web\dist"
npm run dev:server              # 画布+API 同在 http://127.0.0.1:7777
```

浏览器开 http://127.0.0.1:7777 → Nodes 面板搜 mediagen(应有 10+ 节点,含 audio)。
(开发形态 `npm run dev`=API 7777+Vite 3000;3000 被占时手动 `npx vite --port 3100`。)

## 3. 渠道密钥(设置页 Settings→Models & Providers / 节点 Inspector 提示)

| 渠道 | env / 设置项 | 说明 |
|---|---|---|
| zhipu | ZHIPU_API_KEY | 智谱开放平台 key |
| agnes | AGNES_API_KEY | 免费中转 |
| siliconflow | SILICONFLOW_API_KEY | Kolors 免费(实名)/其余低价 |
| cloudflare | CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID | Workers AI 10k neurons/天 |
| hfspaces | (可选)HF_TOKEN | 匿名 2min GPU/天;免费号 5min;**并发已被预算闸锁 1** |
| pixverse | OAuth `pixverse login`(CLI)或 PIXVERSE_ACCESS_KEY | 订阅积分;节点对=Submit→人审→Confirm |

M2 零代码双路(可选):①智谱推理:Settings→OpenAI-compatible endpoints→baseUrl `https://open.bigmodel.cn/api/paas/v4`+key;②chat 层挂 media-gen-mcp:Settings→External MCP Servers→stdio `node <全局 node_modules 路径>\media-gen-mcp-server\dist\index.js`。

## 4. 预算闸(M4)

- 默认:hfspaces 并发=1(ZeroGPU 账号级);其余不限。
- env 旋钮:`MEDIAGEN_MAX_CONCURRENT_<渠道>` / `MEDIAGEN_DAILY_LIMIT_<渠道>`(0/缺省=不限)。
- 计数落 `<用户目录>\.local\share\nodetool\mediagen-budget.json`(按日重置);超限=画布结构化 quota 错误。

## 5. Windows 专属注意

- **pixverse CLI spawn**:节点走 `npx -y pixverse@1.4.3`+win32 shell:true(适配已做);CLI 登录态在 `%USERPROFILE%\.pixverse\config.json`(30 天,过期重新 login)。
- 路径:节点包无硬编码 Unix 路径;测试已按 windows-lane 设计(待收尾 CI 验证,见 02-基线 §3)。
- WebGPU:RenderTimeline/timeline 合成走 DX12;`chrome://gpu` 先验。
- gemini/flow(CDP 浏览器态)渠道不进 Windows 白名单(设计如此)。

## 6. 上游同步(月度)

```powershell
git fetch upstream
git merge upstream/main   # 冲突只应出现在 director/02-基线 hook 表登记文件
npm run build:packages && npm run test --workspace=packages/mediagen-nodes
```
首次真实演习记录:director/iterations/02(上游+1 marketing,零冲突)。

## 7. 故障速查

| 症状 | 处置 |
|---|---|
| 端口 7777 占用 | dev-server 会 exit 0 提示(勿误读成功);换 `$env:PORT=8080` |
| 改包后节点不更新 | 装饰器包走 dist:必须 `npm run build --workspace=packages/mediagen-nodes` 再重载 |
| 画布 Loading 卡死 | vite dev 转译在弱机可能极慢/卡;用 §2 生产形态 |
| 测试 EACCES | CI-parity 用空 HOME;本机勿 sudo npm |
