# M3 方案 · packages/mediagen-nodes v1(v1.0,2026-09-24)

> 依据:research/01(渠道契约)+04(节点包解剖)+02(测试配方)。研究相已完成,本文件是方案相产物,过对抗评审后进实施相。

## 1. 目标与范围

**v1 范围**(对齐实施方案验收门1,按契约报告首期序):
- 图节点 ×5 渠道:zhipu / agnes / cloudflare(两族 wire)/ siliconflow / hfspaces(z-image-turbo)
- 视频节点 ×4:zhipu(cogvideox)/ agnes / hfspaces(wan22-i2v + minimax-h3,模型 enum)/ siliconflow(固定5s)
- **明确延后**:pixverse Submit/Confirm 确认节点对(M3.5,含 Windows spawn 适配);gemini/flow(CDP 态,不进 v1);TTS/抠图等 hfspaces 附属工具节点。

## 2. 架构(开闭原则的一处改动点)

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

**MediagenChannelAdapter 接口**(adapters/types.ts):
```ts
interface AdapterContext { signal?: AbortSignal; secrets: Record<string,string>; fetchFn: typeof fetch }
interface ImageAdapter { submit(req: ImageParams, ctx): Promise<{kind:"bytes", data:Uint8Array, mime:string} | {kind:"url", url:string}> }
interface VideoAdapter { submit(req: VideoParams, ctx): Promise<{kind:"handle", handle:string}>; poll(handle, ctx): Promise<PollResult> }
```
- 工厂按 manifest 条目的 `channel` 字段取 adapter,按 `wire`(inline/poll)走同步或异步路径。
- **新渠道挂载 = 1 个 manifest 条目 + 1 个 adapter 文件 + index 注册一行**(M6 演习判据;若需改 factory/adapters/types.ts = 开闭违规,飞轮记录)。

## 3. 关键设计决策

| 决策 | 选择 | 理由(反方案) |
|---|---|---|
| 节点粒度 | 每(渠道×模态)一节点,`mediagen.image.ZhipuTextToImage` 等 | 反:单节点+provider enum 下拉——参数并集脏(requiredSettings 随渠道变、忽略参数警告噪音);分节点表单干净、确定性、搜索友好 |
| manifest 与 wire 的关系 | manifest 声明字段/默认值/模型表;wire 全在 adapter 代码 | 反:manifest 内嵌 wire DSL——过度抽象(02 R-ABS-01),wire 差异大(信封/轮询/SSE/multipart)编码进 JSON 必然再造一门语言 |
| 轮询与取消 | adapter poll 一律接受 ctx.signal;工厂把 context.signal 传入 | 上游 minimax/higgsfield 反例:阻塞轮询不接信号,cancel 打不断(研究03 §D) |
| 重试纪律 | 提交 POST 永不重试;下载/幂等 GET 用 fetchWithRetry 语义(自实现薄层或复用 runtime provider-transport) | AGENTS.md External-API Wrapper Nodes 规则 |
| 裸 base64 | 输出一律 *RefFromBytes(data 裸 base64 + type 判别 + mime 探测) | 研究04 §E⑦ |
| M4 预埋 | 所有渠道调用收敛过 mediagen-base.executeMediagenCall(今天=signal+超时+错误规整;M4=在此挂预算闸,节点零改动) | 解耦要求4;避免每节点散装(02 R-CI-02) |
| 模型清单 | manifest 内嵌默认模型 enum(取 config.example.json 权威值)+ `custom` 自由输入兜底? → **否,enum only** | 契约:无硬编码兜底会抛错;enum 即表单;后续渠道改表=manifest 改条目 |
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
4. adapter 单测:cloudflare multipart 组装(flux-2 多参考<512 约束)、zhipu size 吸附(512-2880/16 倍数)、agnes numFrames 合法集、hfspaces SSE 解析。
5. 断言来源纪律:期望值全部来自 research/01 契约(producer 源码锚),禁从实现输出反推。

## 7. 包外触碰(全部已在 02-基线 H2 登记)

R1-R4 必需 + C1/C2(CLI registry,单节点 harness 验证必需)+ C4(package-asset-registry)+ C7(harness gate 认领)。不触碰 web/。

## 8. 明确不做(v1 rejected-by-design)

- 不做 provider 统一下拉 mega 节点;不做 manifest wire DSL;不做动态模型目录拉取(list_models 在线拉)——静态表+manifest 改动;不做 pixverse(见 §1);不动上游现有节点(minimax/higgsfield 反例不修,不扩大触碰面)。

## 9. 验收门(M3 DoD)

- [ ] `npm run test --workspace=packages/mediagen-nodes` 全绿 ×2 连续
- [ ] `npm run typecheck` + `npm run lint`(oxlint+包内 tsc)过
- [ ] `npm run dev:nodetool -- harness gate --base origin/main` 过(C7 已认领)
- [ ] `nodetool node run mediagen.image.<X> --no-secrets` 优雅报缺 key(登记面验证)
- [ ] dev 服务器起后 /api/nodes/metadata 含 mediagen 命名空间(curl 断言)
- [ ] 画布(浏览器)摆节点→表单枚举正确→(带真实 key 的 zhipu/agnes)出图入资产库——真机验证,lasso 截图证据
- [ ] CI windows lane 绿(新 workflow,H4)
- [ ] 单节点改参数重跑仅本节点(缓存语义抽验)
