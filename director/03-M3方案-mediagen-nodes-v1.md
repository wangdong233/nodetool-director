# M3 方案 · packages/mediagen-nodes v1(v1.1,2026-09-24;v1.0 评审 BLOCK→按 F1-F4 修订)

> 依据:research/01(渠道契约)+04(节点包解剖)+02(测试配方)。v1.0 fresh-agent 对抗评审 verdict=BLOCK(F1 RED:url-egress 审计漏列;F2-F4 YELLOW),本版为修复后复审版。评审记录:iterations/01 附录。

## 1. 目标与范围

**v1 范围**(对齐实施方案验收门1,按契约报告首期序):
- 图节点 ×5 渠道:zhipu / agnes / cloudflare(两族 wire)/ siliconflow / hfspaces(z-image-turbo)
- 视频节点 ×4:zhipu(cogvideox)/ agnes / hfspaces(wan22-i2v + minimax-h3,模型 enum)/ siliconflow(固定5s)
- **明确延后**:pixverse Submit/Confirm 确认节点对(M3.5,含 Windows spawn 适配);gemini/flow(CDP 态,不进 v1);TTS/抠图等 hfspaces 附属工具节点。

## 2. 架构(开闭原则:4 触碰点 + H5 登记豁免)

> ⚠️ 终审 Y3 勘误:下方结构图为 v1.0 原始设计(adapters/ 扁平+单一 manifest),**实际实现以本节底部"新渠道挂载实测清单"为准**(channels/&lt;ch&gt; 自包含目录+构建期合并 dist manifest)。图保留作设计演化留痕,勿据此实施。research/02 windows lane 超时实配 40min(原 30min),以 YAML 为准。

```
packages/mediagen-nodes/
  src/
    index.ts                  # MEDIAGEN_NODES + registerMediagenNodes
    manifest.ts               # manifest 类型 + loadMediagenManifest(loadPackageAssetJson)
    mediagen-manifest.json    # 渠道×能力条目(加渠道=只加条目,M6 演习靶)
    mediagen-factory.ts       # createMediagenNodeClass(spec) → BaseNode 子类
    mediagen-base.ts          # 密钥解析 + executeMediagenCall(唯一集中点:signal/重试/超时/M4预算闸落点)
    adapters/
      types.ts                # MediagenChannelAdapter 接口
      zhipu.ts agnes.ts cloudflare.ts siliconflow.ts hfspaces.ts
  tests/                      # registration / manifest 完整性 / 各节点 fetch-stub / adapter 单测
```

**MediagenChannelAdapter 接口**(adapters/types.ts;F2 修复——PollResult 判别联合补全,url 下载归属 mediagen-base):
```ts
interface AdapterContext { signal?: AbortSignal; secrets: Record<string,string>; fetchFn: typeof fetch }
// PollResult:适配器对 running/终态/配额拒的唯一表达出口
type PollResult =
  | { status: "running" }
  | { status: "done"; kind: "bytes"; data: Uint8Array; mime?: string }   // 图像 mime= detectImageMime
  | { status: "done"; kind: "url"; url: string; mime?: string }          // mediagen-base 统一 safeFetch 下载
  | { status: "failed"; code: string; retryable?: boolean; quota?: boolean };
interface ImageAdapter { submit(req: ImageParams, ctx): Promise<PollResult> }  // 同步图=直接 done
interface VideoAdapter { submit(req: VideoParams, ctx): Promise<{ handle: string } | PollResult>; poll(handle: string, ctx): Promise<PollResult> }
```
- 工厂按 manifest 条目的 `channel` 字段取 adapter,按 `wire`(inline/poll)走同步或异步路径。
- **新渠道挂载实测清单(迭代02 修正:含 M6b 演习实证)**:①渠道目录(adapter.ts+manifest.json) ②`channels/index.ts` 注册一行 ③`tests/manifest.test.ts` fragments 登记(每渠道必有片段,空=手写节点——pixverse 空片段缺失曾致合并脚本 ENOENT) ④网络渠道加 url-egress 登记(H5) ⑤若需 CLI `nodetool run`/DSL 执行,加 C3/H2g(dsl 内建注册表,一次性,非每渠道)。开闭违规判据仍指 factory/adapters/types.ts 的被迫改动。

## 3. 关键设计决策

| 决策 | 选择 | 理由(反方案) |
|---|---|---|
| 节点粒度 | 每(渠道×模态)一节点,`mediagen.image.ZhipuTextToImage` 等 | 反:单节点+provider enum 下拉——参数并集脏(requiredSettings 随渠道变、忽略参数警告噪音);分节点表单干净、确定性、搜索友好 |
| manifest 与 wire 的关系 | manifest 声明字段/默认值/模型表;wire 全在 adapter 代码 | 反:manifest 内嵌 wire DSL——过度抽象(02 R-ABS-01),wire 差异大(信封/轮询/SSE/multipart)编码进 JSON 必然再造一门语言 |
| 轮询与取消 | adapter poll 一律接受 ctx.signal;工厂把 context.signal 传入 | 上游 minimax/higgsfield 反例:阻塞轮询不接信号,cancel 打不断(研究03 §D) |
| 重试纪律 | 提交 POST 永不重试;下载/幂等 GET 用 fetchWithRetry 语义(自实现薄层或复用 runtime provider-transport) | AGENTS.md External-API Wrapper Nodes 规则 |
| 裸 base64 | 输出一律 *RefFromBytes(data 裸 base64 + type 判别);**mime 策略:图像=detectImageMime(仓内既有,minimax 复用 runtime 导出);视频=对齐 minimax 先例(videoRefFromBytes 不带 mime)**(F2 修复:删笼统"mime 探测"承诺) | 研究04 §E⑦;仓内无视频 mime 助手,不新造 |
| M4 预埋 | 所有渠道调用收敛过 mediagen-base.executeMediagenCall(今天=signal+超时+错误规整;M4=在此挂预算闸,节点零改动) | 解耦要求4;避免每节点散装(02 R-CI-02) |
| 模型清单 | manifest 内嵌默认模型 enum(取 config.example.json 权威值) | 契约:无硬编码兜底会抛错;enum 即表单;后续渠道改表=manifest 改条目 |
| size 策略 | **enum-only**(合法吸附集直接作 enum 值;非法值经 props 注入→工厂结构化拒绝,仿 higgsfield-factory.ts:45-46)——**不做运行时吸附**(F4 修复:enum 拒绝与吸附互斥,选拒绝,策略更简单且工厂先例一致) | 反:str+吸附=第三种归一化策略,与工厂 enum 校验漂移 |
| cloudflare 双 wire | adapter 内部按 model family 分支(JSON/multipart) | 上游目录本身按 family 分类(cloudflare.ts:44-53) |
| hfspaces SSE | adapter 用 fetch 流式读 SSE(ReadableStream+TextDecoder),不是浏览器 | 契约 §B5;纯 fetch 可行 |
| 必填密钥 | requiredSettings 按渠道:[ZHIPU_API_KEY]/[AGNES_API_KEY]/[CLOUDFLARE_API_TOKEN,CLOUDFLARE_ACCOUNT_ID]/[SILICONFLOW_API_KEY]/[] (hfspaces 匿名可用,token 可选→HF_TOKEN 非必填) | 契约 §C;设置 UI 自动出配置项 |
| 命名空间 | `mediagen.`(image/video 模块);包 id `mediagen` | 碰撞 last-write-wins 风险;前缀统一 |

## 4. 错误规整(结构化)

adapter 抛 `MediagenChannelError { channel, code: "mediagen.<channel>.<Sxxx|network|timeout|auth|quota|params|result>", message, retryable? }`;工厂转译为节点错误(error_detail 形态:code+provider=channel)。配额类(cloudflare 3036 / hfspaces H201 / zhipu 1302)统一 `code:"...quota"`,retryable=false——为 M4 预算闸的拒绝路径预留同型错误。

## 5. manifest 条目 schema(v1)

```json
{ "configVersion": 1, "channel": "zhipu", "className": "ZhipuTextToImage", "moduleName": "image",
  "wire": "inline", "outputType": "image", "title": "Zhipu 文生图", "description": "…(含搜索关键词行)",
  "sourceUrl": "https://open.bigmodel.cn/…", "models": ["cogview-3-flash","cogview-4","glm-image"],
  "pollIntervalMs": 5000, "timeoutSeconds": 300,
  "requiredSettings": ["ZHIPU_API_KEY"],
  "fields": [ {"name":"prompt","type":"str","required":true,"default":""}, {"name":"model","type":"enum","values":"@models","default":"cogview-3-flash"}, {"name":"size","type":"enum","values":["1024x1024",…],"default":"1024x1024"}, … ] }
```
- `values:"@models"` 引用 models 数组(工厂解析);字段类型对齐 higgsfield 工厂已支持集。
- 每条目 sourceUrl=https 强制(manifest 完整性测试);schemaFixture v1 不做(上游是 schema 漂移防护,我们渠道契约已锚 research/01,先轻后重)。

## 6. 测试计划(offline 全量)

1. registration:registry.has 每个 nodeType + MEDIAGEN_NODES 数量=manifest 条目数。
2. manifest 完整性:configVersion/sourceUrl https/enum values 引用可解析/requiredSettings 非空(除 hfspaces)。
3. 节点行为(每节点≥1):stub fetch → 断言 URL/body/Auth/输出 ref(PNG 魔数);轮询节点串行 mockResolvedValueOnce(提交→轮询→下载);错误路径:4xx→结构化错误;配额(3036/H201)→ quota 码 + retryable=false。
4. adapter 单测:cloudflare multipart 组装(flux-2 多参考<512 约束)、**非法 size 经 props 注入→结构化拒绝**(F4 修复:替代原吸附测试)、agnes numFrames 合法集、hfspaces SSE 解析(event_id 流+H201 data:null→{status:"failed",quota:true})。
5. **egress 登记面测试(F1)**:断言本包每个含动态 URL fetch/safeFetch 调用的源文件都在 URL_EGRESS_INVENTORY 中有 guarded 条目(仿 url-egress-audit 断言的包内前移版)。
6. 断言来源纪律:期望值全部来自 research/01 契约(producer 源码锚),禁从实现输出反推。

## 7. 包外触碰(全部已在 02-基线 H2/H4/H5 登记)

R1-R4 必需 + C1/C2(CLI registry,单节点 harness 验证必需)+ C4(package-asset-registry)+ C7(harness gate 认领)+ **C8/H5(url-egress 出口登记:packages/runtime/tests/url-egress-inventory.ts 每文件 guarded 条目 + docs/url-egress-inventory.md 读者文档;下载一律 safeFetch)**(F1 修复)。

**已知降级(F3,显式接受)**:v1 不做 web 侧 key-gating UX(web/src/utils/nodeProvider.ts 的 namespace→secretKey 硬编码映射不含 mediagen)——mediagen 节点在未配 key 时也常显(摆出后运行会得到结构化缺 key 错误)。已登记为 02-基线 H6 可选后续 hook;不做,不阻塞 M3 DoD。

## 8. 明确不做(v1 rejected-by-design)

- 不做 provider 统一下拉 mega 节点;不做 manifest wire DSL;不做动态模型目录拉取(list_models 在线拉)——静态表+manifest 改动;不做 pixverse(见 §1);不动上游现有节点(minimax/higgsfield 反例不修,不扩大触碰面);**不做 web key-gating(F3 显式降级)**。

## 9. 验收门(M3 DoD)

- [ ] `npm run test --workspace=packages/mediagen-nodes` 全绿 ×2 连续
- [ ] `npm run typecheck` + `npm run lint`(oxlint+包内 tsc)过
- [ ] **packages/runtime url-egress-audit 测试绿**(F1 闸)
- [ ] `npm run dev:nodetool -- harness gate --base origin/main` 过(C7 已认领)
- [ ] `nodetool node run mediagen.image.<X> --no-secrets` 优雅报缺 key(登记面验证)
- [ ] dev 服务器起后 /api/nodes/metadata 含 mediagen 命名空间(curl 断言)
- [ ] 画布(浏览器)摆节点→表单枚举正确→(带真实 key 的 zhipu/agnes)出图入资产库——真机验证,lasso 截图证据
- [ ] CI windows lane 绿(新 workflow,H4)
- [ ] 单节点改参数重跑仅本节点(缓存语义抽验)
