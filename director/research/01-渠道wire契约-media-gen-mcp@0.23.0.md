# 渠道 wire 契约报告 · media-gen-mcp@0.23.0(M3 manifest 数据源)

> 来源:fresh Explore agent 白盒提取(2026-09-24,基于 /Users/wangdong/Documents/Project/claude技能/media-gen-mcp 源码,file:line 锚定)。
> 用途:`packages/mediagen-nodes` manifest 编写的唯一契约基准;与《NodeTool二开实施方案》冲突处以本报告为准(差异清单见 §D)。

## A. 共性架构(全渠道)

- **统一请求类型**:`ImageRequest {prompt, model?, size?, n?, images?, mode?, aspect?, seed?, quality?, extra?}`;`VideoRequest {prompt, model?, mode?, image?, keyframes?, images?, audioMediaIds?, videoMediaId?, resolution?, ratio?, numFrames?, frameRate?, seed?, negativePrompt?, durationSeconds?, extra?}`(src/providers/types.ts:21-49, 70-97)。纪律:被丢弃参数必须 WARN;`n` 永不上传(tool 层并发 3 扇出,src/index.ts:777-780,868)。
- **HTTP 重试**:5xx/status=0/fetch TypeError → 指数退避(默认 3 次,1s 基,8s 帽);4xx 即抛(src/providers/http.ts:89-111)。
- **异步视频范式**:createVideo→handle{taskId?,videoId?}→waitVideo 轮询(默认 10s 间隔,900s 超时;src/poll.ts:46-71)。
- **产物管线**:downloadAsset 流式落盘,扩展名按 content-type;命名碰撞加 `-2/-3`(src/download.ts:42-57);outDir 解析:tool 参数→config→env OUT_DIR→cwd/output。data:URI 会从 MCP 响应剥离(url_omitted+local_paths,防上下文爆炸)。
- **跨进程状态目录** `~/.media-gen-mcp/`(仅 `MEDIA_GEN_MCP_CONFIG` 一个 env 可换路径;无通用 STATE_DIR)。
- **manifest 机械生成路径**:`registry.buildListModelsDetail` 每渠道输出 `{models, imageModels, videoModels, videoConstraints, imageConstraints, costCatalog, channelInfo}`(registry.ts:317-353)——node pack manifest 可由一次 list_models 输出+本报告机械生成。

## B. 分渠道契约(首期里程碑序)

### 1. zhipu(首日·免费·文档最好)
- Wire:`POST https://open.bigmodel.cn/api/paas/v4/images/generations`(同步,`data[].url|b64_json`);视频 `POST /paas/v4/videos/generations` `{model,prompt,fps(30|60),size?,duration?(5|10 仅cogvideox-3),image_url?|string[2](关键帧仅cogvideox-3)}` → `{id,task_status}` → 轮询 `GET /paas/v4/async-result/{id}`(PROCESSING/SUCCESS/FAIL;zhipu.ts:286-434)。
- Auth:`Authorization: Bearer {id}.{secret}` 整串;env `ZHIPU_API_KEY`(Code Plan key 拒用)。
- 参数硬约束:图 size 边 512-2880、16 倍数、像素 ≤2^21(snapZhipuImageSize 预吸附,zhipu.ts:69-96);**不支持 i2i**;私有码 1302=并发限速信号(同 agnes 的 429 学习机制)。
- 模型:config 驱动(config.example.json:44-66:cogview-3-flash 免费/cogview-4/glm-image;cogvideox-flash/-2/-3)——**manifest 必须内嵌默认模型清单**,否则节点抛"未配置"。

### 2. agnes(首日·免费)
- Wire:`POST {apihub.agnes-ai.com/v1}/images/generations` `{model,prompt,size?,image?[]}`(同步);视频 `POST /videos` `{model,prompt,num_frames,frame_rate(仅24),resolution(默认720p),ratio?,seed?,negative_prompt?,image?,mode:"ti2vid"|"keyframes"}` → `{task_id,video_id,status}` → `GET /videos/{taskId}`(agnes.ts:247-375)。
- Auth:Bearer;env `AGNES_API_KEY`。免费中转,503 自动重试。
- numFrames 合法集 `81/121/161/241/441`;maxFramesFor:1080p→241/720p→441;durationSeconds→最近帧数。
- 基线限速:视频间隔默认 62s;429 文本学习进 config(rateLimits,TTL 7天)。

### 3. cloudflare(免费额度最大·image-only)
- Wire:`POST https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/run/{@cf/模型}`。**两族请求体**:A) JSON `{prompt,steps,width,height,seed,image_b64}`;B) **flux-2 全族走 multipart FormData**(纯 t2i 也是),参考图 ≤4 且每张 <512×512(cloudflare.ts:207-245)。响应 v4 信封 `result.image`(裸 base64 无前缀)。
- Auth:Bearer Token+AccountId 双要素;env `CLOUDFLARE_API_TOKEN`+`CLOUDFLARE_ACCOUNT_ID`。
- 配额:10,000 neurons/天(00:00 UTC 重置);**429+cf code 3036=日配额尽→冷却到 0 点不重试**;静态目录 8 模型含 neurons/图(cloudflare.ts:44-53);flux-schnell 拒 seed(schema 漂移已实测)。

### 4. siliconflow(付费低价·⚠非 OpenAI 形状)
- 三偏差(siliconflow.ts:6-10):①响应信封 `images[].url` 非 `data[]`;②图 URL 1h TTL→须立即下载;③batch_size 已被上游移除。
- 图 `POST /v1/images/generations` `{model,prompt,image_size,seed?,image?}`(i2i 仅 Qwen-Image-Edit 族);视频 `POST /v1/video/submit` `{model,prompt,image_size,seed?,image?}`→`{requestId}`→`POST /v1/video/status`(终态 Succeed/Failed;结果保留 10min/URL 1h;**getVideo 内部阻塞轮询** 5s/600s)。
- 定价(静态 CNY):Kolors 免费(需实名)/Z-Image-Turbo ¥0.10/Qwen 族 ¥0.30/图,Wan2.2 视频 ¥2/条;无确认门,仅价格警告;视频固定 5s/24fps。
- 错误族 S1xx 环境/S2xx 网络(429 不重试)/S3xx 参数/S4xx 结果。

### 5. hfspaces(唯一免费视频·gradio REST)
- Wire:`POST https://{sub}.hf.space/gradio_api/call/{api}` `{data:[...]}`→`{event_id}`→`GET .../{event_id}` **SSE**(complete|error;hfspaces.ts:221-249)。可选 Bearer HF_TOKEN。
- 视频目标表:wan22-i2v(data:URI 输入,≤5s,内嵌 mp4)/wan22-relay(首尾帧,≤10s)/minimax-h3(2-14s,**带音轨**,t2v/i2v/关键帧,10 步默认)/cogvideox(t2v 兜底)。图:z-image-turbo(t2i)/qwen-image-edit(i2i)。
- **H201=SSE error data:null=ZeroGPU 配额拒(匿名 2min/天,免费号 5min/天,PRO 40min)→结构化节点错误**;H301=Space 消失/漂移(目标表 config 可刷)。
- videoConstraints:numFrames {56,80,120,160}@16fps。

### 6. pixverse(第二波·订阅积分·确认节点对范本)
- Wire:**spawn 官方 CLI** `pixverse --json`(锁定 1.4.3;bin 解析:PIXVERSE_BIN→本地 node_modules/.bin→`npx -y pixverse@1.4.3`;Node ≥22.12)。
- 确认门(**图+视频双模态**):首调无 token→零成本预检(余额+槽位)→返回 `{needConfirm, estimatedCost, costSource, currentBalance, estimatedBalanceAfter, confirmToken, expiresInSeconds(600s), warnings}` **不提交**;同参数+token 复调→HMAC 验证→提交。digest 绑定 mode|model|quality|duration|count|audio|offPeak|promptFp|inputsFp,改动即失效;单次消费;幂等键复用(pixverse.ts:858-1044)。
- CLI 退出码表 0-7(2 TIMEOUT 部分恢复/3 AUTH→S103/4 QUOTA→S402/5 失败/6 参数/7 并发→5/10/20s×3 退避同幂等键);状态机 done=1/retry={5,9,10}/failed={7,8};轮询梯 2/5/10s。
- 🔴 **Windows 缺陷**:bin 解析只认 Unix 形态(.bin/pixverse、裸 npx),Windows 需 .cmd/shell:true(仓内 browser-pool.ts:145-169 有 win32 模式但未用于此)——我们的 node pack 直接走官方 REST?不可(无公开 REST);方案:node pack 里 spawn 时自带 win32 适配,或 `PIXVERSE_BIN` 指向完整命令。

### 7-8. gemini(web)/flow(web)——排除于 Windows 里程碑
- CDP 通路本身跨平台(http 127.0.0.1/json/list+WS),但 launch 提示 Mac 路径且 flow 渠道已死(L3 区域门禁 2026-09-10);gemini 单会话串行(S303)。仅留档:flow 视频确认门 fvc1(token 结构与 pixverse 同构,TTL 600s)。

## C. 汇总表

| 渠道 | 传输 | auth(env) | 图 | 视频 | 确认门 | Windows | 成本 |
|---|---|---|---|---|---|---|---|
| zhipu | REST | ZHIPU_API_KEY | t2i | t2v/i2v/关键帧(cogvideox-3) | 无 | ✓ | 免费档 |
| agnes | REST | AGNES_API_KEY | t2i+i2i | t2v/i2v/关键帧 | 无 | ✓ | 免费 |
| cloudflare | REST(JSON+multipart) | CLOUDFLARE_API_TOKEN+ACCOUNT_ID | t2i/多参考 | ✗ | 无 | ✓ | 10k neurons/天 |
| siliconflow | REST(三偏差) | SILICONFLOW_API_KEY | t2i+i2i(Edit) | t2v/i2v 固定5s | 无(价格警告) | ✓ | ¥0.1-0.3/图 ¥2/视频 |
| hfspaces | gradio SSE | HF_TOKEN(可选) | t2i/i2i | i2v/首尾帧/H3带音频 | 无 | ✓ | 免费配额 |
| pixverse | CLI spawn | PIXVERSE_ACCESS_KEY/OAuth | ✓ | ✓(关键帧=P2拒) | **双模态 pvc1** | ⚠需spawn适配 | 订阅积分 |
| gemini/flow | CDP | 浏览器态 | — | — | (flow fvc1) | 排除 | — |

## D. 对《实施方案》的修正(6 处)

1. "智谱/硅基流动等 OpenAI 形状渠道"——**siliconflow 不是**(三偏差+私有 submit/status 对);不能走 custom provider 下拉,须专属节点。
2. "免费渠道(agnes/zhipu)单节点直通"——需 API key,且**无硬编码模型兜底**,manifest 必须内嵌默认模型清单(取 config.example.json:26-66)。
3. 确认门渠道——flow 也有视频门(fvc1)但渠道已死;gemini 故意无门(配额+S303 串行)。Windows 范围内 pixverse 是唯一确认对范本,结论不变。
4. hfspaces data:null→结构化错误:确认;补充 hfspaces/siliconflow/cloudflare/pixverse 都**不在工厂默认白名单** `["agnes","zhipu"]` 里(MCP 消费需白名单;node pack 直连不受此限)。
5. "gemini/flow Mac 专属"——机制上 CDP 跨平台,排除决策正确。
6. "pixverse Windows 重新配凭据即可"——低估:另有 Node≥22.12 硬要求(我们 22.22.1 满足)+spawn 链 Unix 倾向缺陷需补。
