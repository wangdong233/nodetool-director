# 92 · Gemini 渠道实施方案(三路对抗终版,2026-09-25)

> 设计过程:草案 v0 → 三路隔离对抗(解耦守卫 SOUND+3δ / 实施现实 NEEDS-CHANGE+接口映射 / 风险重判 AMEND)→ 本终版。**解耦铁律:全部触碰在本包内,零上游文件。**

## 1. 架构(方案 B 修正版)

```
[管理层·Mac]   lasso launch-chrome --port 9225 --profile gemini --idle-ms 0 --no-hard-cap
               (🔴 对抗修正:默认 idle-reaper 60s 会收割渠道 Chrome;--idle-ms 0 仍有 24h 硬顶,须 --no-hard-cap;
                 adapter 每次生成顺带 touch ~/.cache/lasso/chrome-touch-9225 双保险)
[管理层·Windows] 裸命令文档化:chrome --remote-debugging-port=9225 --user-data-dir=<dir> + 开机自启
               (不装 lasso——渲染机无并存冲突,跨平台发现/防双拉价值趋零;lasso 降级为 Mac 便利件=解耦更强)
[执行层]       packages/mediagen-nodes/src/channels/gemini/ ——adapter 直连 CDP(ws),对 lasso 零依赖
```

## 2. 文件清单(全部自有包内)

| 文件 | 内容 | 对抗裁决来源 |
|---|---|---|
| `channels/gemini/cdp.ts` | CdpConnection 移植(ws@^8.21.0 对齐已解析版;MIT 头归因;socket 工厂注入=cdp 单测缝;错误→MediagenChannelError) | δ1/δ2/实施缝 |
| `channels/gemini/transport.ts` | GeminiTransport 接口+CdpGeminiTransport(open/eval/insertText/navigate/dispose;notes 后经 R3-F4 删除);loopback fetch 走 **private-integration 登记**(R1 实证:审计原豁免说法不成立,已登记条目+扩 non-https 模板棘轮) | 实施派 R-egress |
| `channels/gemini/adapter.ts` | image(inline:驱动+180s 自限轮询)+video(submit→handle,poll=单次 eval);模块级 sessions Map+**TTL 10min 清扫**;S303 断言;signal 全程接入(sleepWithSignal) | 实施派 R1-R3 |
| `channels/gemini/manifest.json` | GeminiTextToImage(nano-banana-2)/GeminiTextToVideo(omni,veo-3.1);requiredSettings [];pollIntervalMs 4000;video timeoutSeconds 420(image 180s 自限单源在 adapter——R13-Y5) | — |
| `package.json` | +"ws": "^8.21.0" | δ1 |
| `src/budget.ts` | DEFAULT_MAX_CONCURRENT + gemini:1 | 实施派 R1(S303 必须闸背书) |
| `src/channels/index.ts` | +1 行注册 | — |
| `tests/manifest.test.ts` | +fragment | — |
| `tests/gemini.test.ts` | transport stub 全离线:登录/模式/输入发送/图轮询 canvas 抓取/视频轮询 fetch/S303/S100 映射/TTL/取消 | 测试缝裁决 |

## 3. 错误映射表(adapter 内显式,防 executeMediagenCall 归一陷阱)

| 源 S 码 | 我们的码 | retryable | 语义 |
|---|---|---|---|
| S100(CDP 不可连) | auth | ❌ | 消息带 relaunch 命令(区别于 re-login) |
| S101(无页面 target) | auth | ❌ | 同上 |
| S102(未登录) | auth | ❌ | re-login 提示 |
| S103(evaluate 断连) | network | ✅ | 页面导航/关闭,重连自愈 |
| S200(产物下载失败) | network | ✅(R3-F1 修订) | 页内 fetch 瞬断(CDN 429/5xx)=已计费产物,**轮询内重试至 deadline**;仅 deadline 耗尽才终败 |
| S300/S301(模型/参数) | params | ❌ | — |
| S303(单会话) | quota | ❌(fail-fast) | 消息=先取件再提交 |
| S400(页面报错) | quota 或 result | ❌ | 上限/limit 文案→quota;否则 result |
| S410(轮询超时) | — | — | 不在 adapter 抛:工厂 pollUntilDone 的 timeout 接管 |

## 4. 运维前置(风险派 F1-F3;进 deploy 文档)

出口 IP 持续在可用区(Windows 机首次接入前经 Usage 面板验证)/每机 profile 登录一次/单账号串行+MEDIAGEN_DAILY_LIMIT_GEMINI/adapter **永不自动重启 Chrome**(never-kill 红线)。

## 5. 已知局限(诚实登记)

**R12-Y3 登记(2026-09-26)**:视频产物若以 `blob:` src 呈现 ready——L1 实测教训(2026-09-22)页内 `fetch(blob:)` 恒败("Failed to fetch")——则每 tick 走 S200 重试循环至 S410 超时,会话留至 TTL。**L1 源码同款行为**(gemini-web.ts ready 判据含 blob:),按移植纪律(R7/R8)禁单方偏离;真机首跑验证项:**blob 视频源是否真实出现+页内 fetch 是否恒败**;若证实,先修 L1 源(如 MediaRecorder/canvas 路线或 ready 判据排除 blob:)再回移植。

多 worker 进程绕过进程内信号量与 sessions Map(与 hfspaces 同款);UI 改版断选择器→S101/S103 结构化报错不崩;warnings 无通道→配额警示写入节点 description。

## 6. R1 审查修订(2026-09-25 实施后飞轮,fresh agent R=1 Y=6 全修)

| # | 发现 | 修订 |
|---|---|---|
| F1 RED | 每 poll tick 新建 transport 但从不 dispose——WS 句柄泄漏(长驻 server 累积/CLI 进程挂死) | 三个 adapter 入口全部 try/finally `t.dispose?.()`;`dispose` 进 GeminiTransport 接口(可选,stub 兼容);测试断言 dispose 次数 |
| F2 | 计划承诺的 chrome-touch 双保险未实现 | `CdpGeminiTransport.attachPage` 后 touch `~/.cache/lasso/chrome-touch-<port>`(文件存在才 touch;Windows 裸 Chrome 天然 no-op;失败静默——reaper 已被启动旗关闭,touch 仅观察性) |
| F3 | 计划测试清单缺 S100/S101/取消 | 补 S100(open 抛)/S101(菜单缺)/预中止 signal 三用例;另补 S103 重试策略与终态错误释放会话两用例(14 用例) |
| F4 | 位置式 stub 步进:行为破坏仍可绿 | 每 step 强制 marker 匹配(不匹配即抛);产物字节断言去条件化 |
| F5 | 三个用例经泄漏模块状态耦合(-t 定向跑必挂) | `clearGeminiSessionsForTest()` seam + beforeEach 清场,每用例自建会话 |
| F6 | S103 瞬断在视频运行内不可恢复:配额已沉没+S303 锁到 TTL | poll 内策略修订:**可重试 network 错→返回 running**(下一 tick 自愈重试,S410 封顶);**不可重试终态错→删除会话后抛**(即时释放单会话槽,不等 TTL)。§3 表 S103 行为从"重连自愈"精确化为"poll 内转 running 逐 tick 自愈;逃逸仅剩 S410 超时(TTL 10min 兜底扫除)" |
| F7 | 模板字面量 fetch 对 egress 棘轮结构性不可见 | audit 测试追加 non-https 模板 fetch 棘轮(append-only 新测试块+正控;https 模板=常量构造维持豁免);02-基线 H5 登记扩至 audit 测试文件 |
| F12 | package.json description 渠道清单缺 gemini | 补 pixverse+gemini |

**R1 GREEN 不动项**:fork 解耦面干净(仅自有包+H5 登记文件)/cdp.ts 超时-迟响应-关闭机制正确/POLL_VIDEO src 800 截断与 attachPage pages[0] 属 L1 源码忠实移植+专用 profile 运维模型(观察性登记,不改)/取消为协作式(sleep/poll 边界,单次 eval 超时为界)。

## 7. R2 审查修订(2026-09-25 飞轮第二轮,fresh agent R=1 Y=4 G=5 全修)

| # | 发现 | 修订 |
|---|---|---|
| R2-F1 RED | 视频 poll 的 ready 分支**先删会话再取产物**——取产物 eval(最长 60s)若抛可重试 S103,catch 转 running 但会话已删,下一 tick 伪 stale_handle,配额已耗+页面已就绪的视频被弃 | **先取件后删会话**:`fetchReadyArtifact` 成功返回后才 `sessions.delete`(可重试失败→会话完好→下 tick 重试);补回归测试(fetch 瞬断→重试→成功) |
| R2-F2 | 图 inline poll 无 S103 自愈(视频有图没有)——一次瞬断击沉已提交生成 | poll 回调内 catch 可重试错→`t.open()` 重连→返回 running(180s 自限封顶);`__err` 探针内错并入同一自愈路径;补回归测试 |
| R2-F3 | cdp.ts late close 竞态:被替换旧 socket 的迟到 close 会清掉**新** socket 的连接态并拒掉其 pending(正是 F1 要修的泄漏形态) | close 守卫 `if (this.ws !== ws) return`;cdp.test.ts 补"被替换 socket 迟到 close 不误伤继任者"回归 |
| R2-F4 | 测试 stub 的 `Math.min(step, len-1)` 钳位让多余 eval 静默重放末步(守卫成死码) | 改 `script[step]` 直取,耗尽即抛;步数精确(图 8/视频 9) |
| R2-F5 | cdp.ts 零单测(92 §2 明列 socket 工厂=cdp 测试缝但从未兑现) | 新 tests/cdp.test.ts **7 用例**(id 路由/超时+迟响应忽略/错误帧/close 拒 pending+重连/迟到 close 守卫/dispose 拒 pending+terminate/连接期 error→可重试) |
| R2-G6/7/8/9/10 | 观察项顺手收:棘轮已知限注释/缺省端口 9225 常量→DEFAULT_GEMINI_CDP_PORT 单源/测试 afterEach 恢复生产 transport 工厂/dispose 计数收紧 toBe(4)/ | 全部落 |

**R2 clean 判定**(复验 R1 修复全在):预算闸每路径释放/整个 pollUntilDone 单次占用(自愈循环不churn槽位)/fork 解耦面/仓库纪律/manifest-wire 契约/chrome-touch 三文档一致/egress 三角一致。

## 8. R3 审查修订(2026-09-25 飞轮第三轮,fresh agent R=1 Y=3 G=4 全修)

| # | 发现 | 修订 |
|---|---|---|
| R3-F1 RED | 页内产物 fetch 的 `__err`(usercontent CDN 429/5xx 瞬断)走**不可重试 S200**→会话被删+已就绪已计费视频被弃(R2-F1 同款伤害的另扇门;违 repo"billed result 必重试下载"规则;并放大 800 截断观察项) | `fetchReadyArtifact` 的 `__err`/空 b64 改抛 **network+retryable**(两 poll 循环既有自愈路径接管,deadline 封顶);§3 S200 行同步修订;补回归测试(429→下 tick 成功) |
| R3-F2 | 图 poll 自愈里的 `t.open()` 自身抛错会逃出自愈 catch,一次重连竞态击沉整跑(视频路径同错只在 try 内→running) | 重连包独立 try:重连失败若为可重试→同样返回 running;仅环境级 S100/S101/S102 逃出 |
| R3-F3 | transport.eval 两处错误分支置 `this.conn=null` 但不 dispose——命令超时/页面异常时 socket 仍开,adapter finally 摸到 null 成 no-op,句柄泄漏(F1 泄漏类新门) | 两分支先 `this.conn?.dispose()` 再置 null |
| R3-F4 | README 未更 gemini(渠道表/预算段/过期测试数违 AGENTS.md 计数禁令) | 三处全改;另删 write-only 死观测 `notes`/`pushNote`(G 项"surface or drop"取 drop);91 §2 残留 `gemini-web/` 路径草图改 `gemini/` |

## 9. R4 审查修订(2026-09-25 飞轮第四轮,fresh agent **R=0** Y=5 G=8,全修)

| # | 发现 | 修订 |
|---|---|---|
| R4-Y1 | typeAndSend 漏 `__err` 分支:focus 探针页内异常被误分类 S101 auth 不可重试(其他探针均有 __err→network 先行分支) | focus/send 两探针补 `__err`→network/retryable 先行分支;补测试 |
| R4-Y2 | 发送点击后 transport 级瞬断:点击可能已落页但会话未记录,可重试错误会诱导调用方盲目重提→双计费(repo"非幂等提交禁盲重试"规则) | send eval 的 transport 级可重试错误改抛**不可重试"提交结果不确定"**(提示人工确认页面,勿自动重试);`{ok:false}`(确定没点上)维持可重试;补测试 |
| R4-Y3 | R3-F2 嵌套 try(重连自身失败→running)无判别测试,删了也全绿 | 补"poll eval 瞬断+重连自身再瞬断一次→下一 tick 痊愈"用例(open 覆写模式) |
| R4-Y4 | `ws` 类型仅靠根 hoist 的 @types/ws(8.18 types vs 8.21 运行时静默偏斜;兄弟包丢弃即裸断) | package.json devDependencies 显式 `@types/ws ^8.18.0`+lockfile 登记 |
| R4-Y5 | 03 档案行的"9 用例"落地即过期(R3-F4 刚清完 README 计数,自己又写进一个) | 03 行改"全分支(双套)"去数字——**AGENTS.md 计数禁令对 director 文档同样执行** |

## 10. R5 审查修订(2026-09-26 飞轮第五轮,fresh agent R=1 Y=3 G=6,全修)

| # | 发现 | 修订 |
|---|---|---|
| R5-R1 RED | 图 poll 的 `return fetchReadyArtifact(...)` 是 **bare return promise**:try 块内裸 return 的 rejection 不经 catch(只有 `return await` 被捕获)——**图路径取件自愈四轮从未生效**,R3-F1 修复在图侧是空话;视频侧因先 await 进局部变量而正确;R3 回归测试只有视频版所以 masked | 改 `return await`;补图侧孪生回归测试(canvas-grab 页内 429→下 tick 成功);**判别力实证**:临时还原 bare return→测试即红,恢复→绿 |
| R5-Y1 | 91 §2 残留第二处 `gemini-web/` 路径(R3-F4 只改了一处,台账与文件自相矛盾) | 改 `gemini/` |
| R5-Y2 | 视频歧义提交(点击可能已落页)抛错时**无会话记录**——S303 无法机械拦截盲目重提,操作员重跑节点即导航走可能正在生成的视频,配额无声沉没 | `ambiguousSubmitError` 打标;视频 submit 捕获后**先落 S303 守卫会话再抛**(TTL 兜底);补测试(歧义→守卫会话在→重提 S303) |
| R5-Y3 | `dispose()` 在连接建立中调用时 `this.ws` 尚为 null——终止不了任何东西,socket 若随后 open 即成无人释放的活句柄(当前无调用路径触达,但契约自邀未来调用方) | 新增 `connectingSocket` 追踪;dispose 终止 `ws ?? connectingSocket`;close-while-connecting 分支 settle opening promise(不再悬挂);补 cdp 测试 |

**R5 clean**:R4 三测判别力逐一 traced(删分支即红)/focus-__err 无循环风险(提交前一次性)/全 wiring/解耦/文档面干净。

## 11. R6 审查修订(2026-09-26 飞轮第六轮,fresh agent **R=0** Y=2 G=10,全修)

| # | 发现 | 修订 |
|---|---|---|
| R6-Y1 | dispose 的 `ws ?? connectingSocket` 在超越窗口短路(stale CLOSING ws + 继任者连接中→只终止 stale);继任者迟到 open 无 disposed 检查→**复活已释放连接**(F1/R3-F3 泄漏类;当前调用路径不触达,契约自邀未来调用方——与 R5-Y3 同型) | dispose 终止**两个**候选;新增 `disposed` 旗标,open handler 见旗标即 terminate+拒绝(settled 语义保持);补"迟到 open 不复活"回归 |
| R6-Y2 | 视频 poll 页面报错分支(S400 行)无视频侧测试——删掉该分支套件仍绿(页错视频会静默降级为 S410 无配额标号) | 补视频 S400 判别测试(quota 编码+会话即时释放双断言) |

**R6 clean(十项)**:R5 三测判别力逐一 traced/守卫会话与正常 handle 无碰撞(共享单调 seq)/cdp 其余竞态(并发 send 去重/超时清理/迟关守卫/跨 socket id 无碰撞)/六文件 JS 语义扫描无裸 return promise/会话生命周期完整/wiring·manifest·budget 正确/ws+@types 配对入 lockfile/egress 三角一致/文档面全净/fork 解耦保持。

## 12. R7 审查修订(2026-09-26 飞轮第七轮,fresh agent R=1 Y=1 G=0,全修)

| # | 发现 | 修订 |
|---|---|---|
| R7-R1 RED | **候选标签表转录漂移**:手写表偏离 L1 源(gemini-web.ts 表 T)——`Image`/`Video` 短标签被我写成 "Make an image/a video"(真机 UI 形态覆盖净损失→误导性 S101 auth 硬失败);丢了 `Submit`(该形态发送钮找不到);加了裸 `上传`/`Upload`(includes 匹配+首 DOM 序 find 可误点任意上传类控件)。离线测试全绿是因为 stub 用的就是漂移表——**L1 校验必须对着源文件 diff,不能凭记忆转录** | 四表逐字恢复 L1(源文件 sed 读取对齐);表上方加"禁手抄、改前 diff L1"注释;标签表列入真机验证清单(03 档案) |
| R7-Y1 | 92 §2 transport 行仍列 `notes`(§8 R3-F4 已删)且保留已被 R1 实证推翻的"审计豁免"说法——文档内自相矛盾 | §2 行改为终态(dispose 入列/notes 标注已删/egress 改 private-integration 登记口径) |

## 13. R8 审查修订(2026-09-26 飞轮第八轮,fresh agent **R=0** Y=2 G=2,全修)

| # | 发现 | 修订 |
|---|---|---|
| R8-Y1 | R7-R1 台账承诺的"标签表列入 03 真机验证清单"未落盘——修复记录写了没做(与 R7 主题同类的 claims-vs-disk 漂移) | 03 gemini 行真机验证格补"首跑须验 UI 四标签表对 L1 源(R7 转录漂移复发面)" |
| R8-Y2 | 探针 `__err` 分支 5 缺 4:登录/菜单/模式项/发送无判别测试(删掉即绿,探针崩溃会被误分类 S101/S102 auth→错误运维指引);视频 poll 的 `__err` 显式分支与 fall-through 重复=no-op | 补登录+菜单开 `__err`→network/retryable 两判别测试(模式项/发送同构由 typeAndSend 共享路径覆盖);删重复分支(fold 进 fall-through;折叠时一度吞掉 fall-through return,tsc+套件即时抓回) |
| R8-G3 | gemini 两个 quota 抛错未带第 5 参 `quota=true`(四个 REST 兄弟渠道都带;当前无消费方,纯对齐) | S303/S400-quota 补旗标 |

**R8 core 判定**:R7 修复**机械验证通过**——九表达式+四表+全部行为常量对 L1 源程序化 diff,字节级一致(仅缩进/420×1000 数值等价差);六源文件无新正确性缺陷;wiring/配对/解耦/文档面全净。

## 14. R9 审查修订(2026-09-26 飞轮第九轮,fresh agent **R=0** Y=3 G=5,全修)

| # | 发现 | 修订 |
|---|---|---|
| R9-Y1 | 可删分支家族第三批:模式项 `__err`/`{ok:false}`、focus `{ok:false}`、send `__err`/`{ok:false}`、视频 poll 探针 `__err`→running、R8-G3 quota 旗标——逐一删除均不红(R8 的"同构覆盖"论断不成立:模式项在 enterMode 非 typeAndSend) | 补六判别测试(模式项双形态/focus ok:false/send 双形态/视频探针 __err→running)+两 quota 测试补 `err.quota===true` 断言 |
| R9-Y2 | budget `gemini:1` 未被钉住(删掉不红)——且它是**承重**默认:图提交不建会话,信号量是唯一防并发图节点导航走生成中图片的进程内闸 | 镜像 hfspaces 测试补 gemini 串行化用例 |
| R9-Y3 | 迭代 04 现状表携带活计数("25/25""108/108"等)——R8 当轮还在改它,落地即过期(与 R4-Y5 同类) | 现状表去数字化(全分支描述;§4 历史行保留) |

**R9 clean**:R8 折叠无分类回归/L1 表与九表达式复核仍一致/六文件语义扫描净(一处注释 nit:transport eval dispose 分支注释提"per-command timeout"但该路径实走 instanceof-rethrow——行为安全,注释不精确,观察登记)/wiring·配对·解耦·文档全净。

## 15. R10 审查修订(2026-09-26 飞轮第十轮,fresh agent **R=0** Y=4 G=5,全修)

| # | 发现 | 修订 |
|---|---|---|
| R10-Y1 | `mapPageError` 非 quota 分支双路径可删(只喂过"已达到使用上限";塌缩成 always-quota 全绿)——瞬态页错会误报"5h 窗耗尽"给错误运维指引 | 图+视频两测试喂 "Something went wrong"→断言 code=result/quota falsy(视频侧并断言会话释放) |
| R10-Y2 | cdp connect 的 10s open-timeout 分支未钉(永不完成握手的 socket 删掉定时器=connect 永挂,套件仍绿) | fake timers 测试:advance 10s→拒绝/连接超时/+socket terminated |
| R10-Y3 | **迭代 04 R9 行损坏**:去数字化编辑的前缀替换留下前几轮处置列副本(六格重复)——轮次台账是飞轮的证据链,损坏即失真 | 截断回三格;教训:表格行编辑禁用前缀 replace,须整行匹配 |
| R10-Y4 | 图 poll 探针 `__err` payload 从未喂过(视频孪生已钉) | 补图侧探针 __err→running 重试用例 |

**R10 clean**:R9 修复在盘无回归/L1 四表+九表达式再复核仍字节级一致/wiring·manifest·budget·注册干净(assertNoLiveSession 在图路径对 submit→poll 信号量缺口形成兜底)/egress 三角一致/解耦与 director 文档全净(budget.ts:9 注释措辞 nit 观察登记)。

## 16. R11 审查修订(2026-09-26 飞轮第十一轮,fresh agent **R=0** Y=3 G=5,全修)

| # | 发现 | 修订 |
|---|---|---|
| R11-Y1 | 台账损坏**复发且下移一行**:R10 修复截断 R9 行时,被移除的尾巴粘到了 R10 行尾(R10-Y3 教训在修复动作本身上重演) | R10 行整行重建三格;R12 起台账行编辑一律整行生成,禁任何前缀操作 |
| R11-Y2 | 图路径 `assertNoLiveSession` 未钉(删掉全绿)——它是 submit→poll 信号量缺口间防"图节点导航走未取件计费视频"的唯一进程内兜底(R10 clean 注自己点名承重) | 补测试:视频会话在→图 submit 拒 S303 |
| R11-Y3 | `MEDIAGEN_MAX_CONCURRENT_<CH>` 环境旋钮未钉(测试里设的值与内置默认相同=什么都没测;README 面向运维文档承诺此旋钮) | 补测试:zhipu(无内置默认)设 1→串行化生效 |

**R11 clean**:R10 四修复在盘全过(fake-timers 测试无泄漏)/六源文件正确性净(abort 不会误删视频会话:删会话的 catch 在 tick 内,sleepWithSignal 抛在 tick 间)/L1 四表+九表达式+模型数组+S400 正则再复核仍逐字一致/全 wiring·配对·egress 三角·解耦·文档纪律净。

## 17. R12 审查修订(2026-09-26 飞轮第十二轮,fresh agent **R=0** Y=3 G=5,全修)

| # | 发现 | 修订 |
|---|---|---|
| R12-Y1 | R11-Y2 的图路径 S303 测试**空洞**:stub 抛错消息自身含"S303",`/S303/` 正则在删掉守卫分支后依然绿(空洞测试类在"修空洞"的动作里复发) | 改结构化断言(code=quota/quota=true/含 S303)+stub 消息去 S303 字样;对照=视频侧孪生测试本就结构化 |
| R12-Y2 | budget `envNumber` 非法值回退未钉:守卫若退化为 `Math.trunc(Number(raw))`,`"abc"`→NaN 容量→**全渠道静默死锁**且套件绿 | 补测试:`"abc"` 视为未设=不限,两并发准入成功 |
| R12-Y3 | 视频 blob: src **结构性不可取**:L1 实测(09-22)页内 `fetch(blob:)` 恒败→blob 视频必走 S200 重试循环至 S410+TTL 锁;L1 同款行为,移植纪律禁单方偏离 | §5 已知局限登记+03 真机清单加验证项(blob 源是否真实出现/页内 fetch 是否恒败);若证实先修 L1 源再回移植 |

**R12 clean**:§4 台账全部行程序化解析恰三格(损坏未复发)/R11-Y3 zhipu 测试判别成立且无状态泄漏/L1 四表+九表达式再复核仍逐字一致/六源文件无新缺陷(cdp 竞态含 R5-Y3 测试语义复核)/全 wiring·配对·egress·解耦·文档净/全包复跑吻合(计数随轮演进,以 iterations/04 各行为准——本轮产物禁带活计数)。

## 18. R13 审查修订(2026-09-26 飞轮第十三轮,fresh agent **R=0** Y=5 G=5,全修;该轮以**变异测试**验证判别力)

| # | 发现 | 修订 |
|---|---|---|
| R13-Y1 | R12-Y2 测试选 zhipu(无内置默认)——"垃圾值视为未设"vs"视为 0"在该渠道**观测等价**(变异:回退改 0 仍全绿; defaulted 渠道垃圾值会静默解除 gemini/hfspaces 内建串行=S303 兜底失效) | 补 defaulted 渠道用例:HFSPACES="abc"→内建默认 1 仍强制(第二准入必阻塞) |
| R13-Y2 | `geminiError()` S1xx 分类表零直接测试(adapter 测试全部注入预分类错误,S100 测试自产自销;变异:全改 auth 仍 45 绿——真机上 S103→auth 杀自愈/S100→network 死 Chrome 拖到 deadline) | 新 tests/transport.test.ts 三用例(stub 全局 fetch):S100→auth 不可重试带 launch 提示/无 wsDebuggerUrl→network 可重试/未 open 先 eval→S103 |
| R13-Y3 | S200 守卫的 `!fetched?.b64` 半边可删(所有取件失败测试只喂 `__err`;删后无 __err 无 b64 的探针=**零字节产物当成功交付**;L1 另有独立守卫) | 补测试:空 b64 无 __err→可重试 S200→下 tick 成功 |
| R13-Y4 | 92 §17 clean 行"121/121"vs 台账"122×2"vs 盘上 122 同轮自相矛盾(活计数禁令违例) | 改"全包复跑吻合(计数以 iterations/04 为准)" |
| R13-Y5 | 图 manifest `timeoutSeconds:180` 装饰性(工厂只 poll 分支读;真限=adapter IMAGE_DEADLINE_MS;双份 180 一份生效) | manifest 删该字段,自限说明入 description(单源化至 adapter) |

**R13 clean(变异测试背书)**:R12 两修复变异运行即红(判别力实证)/本轮全接触面空洞断言清扫=零幸存/六源文件再追踪净(cdp 四竞态+分层重连+无裸 return promise)/L1 四表九表达式再 diff 逐字一致/wiring·配对·egress·台账三格·fork 边界全净。

## 19. R14 审查修订(2026-09-26 飞轮第十四轮,fresh agent **R=0** Y=2 G=9,全修;变异测试在 /tmp 隔离副本)

| # | 发现 | 修订 |
|---|---|---|
| R14-Y1 | 视频 poll **ready 判在 err 前**:与 L1(err 先)及同文件图路径(err 先)不一致,且无测试——重试后页面残留旧错误文案+新视频就绪时,L1 的 err-first 会 S400 弃掉已计费产物(自愈流的真实场景) | 按对抗推荐**保留 ready-first 并明示为已评审偏离**(代码注释+92 登记);补 both-set 钉住测试(ready+err 同帧→交付产物) |
| R14-Y2 | budget 容错两分支可删(变异:loadState catch 重抛/ persistState catch 重抛均全绿)——损坏状态文件会让全渠道每调用 SyntaxError 拒绝 | 补两测试:损坏 JSON 状态文件→视为新日仍准入;不可写路径→仍准入(persist=可观测性非闸正确性);首版测试曾漏还原 env 毒化 beforeEach,当场抓回 |

**R14 clean(变异背书扩展)**:R13 五修复变异全红(含 forced-auth/forced-network/garbage→0/空 b64 守卫)/图 S303/超越守卫/bare-return/always-quota 扩展变异亦全红(钉住面完整)/六源文件除 Y1 外无新缺陷/L1 程序化再 diff 逐字一致(标识符重命名+缩进外)/wiring·配对·台账三格·fork 边界全净。

## 20. R15 审查修订(2026-09-26 飞轮第十五轮,fresh agent **R=0 Y=1 G=1**,全修;变异在 /tmp 副本且用后字节校验回收)

| # | 发现 | 修订 |
|---|---|---|
| R15-Y1 | **开页自愈整块可删**(变异:删 openTab+settle+复探换成立即 S101,66 测试仍全绿)——零配置恢复(92 §1 设计承诺/91 §7)完全无钉;openTab/healNewTabSettleMs/touchActivitySignal 同盲区 | transport.test.ts 补两用例:①无 gemini 页→PUT /json/new→settle(测试置 1ms)→复探→attach 成功+断言 PUT 确发(fake socket 供临时 navigate)②PUT 失败+复探仍空→S101 auth 带"自动开页未果"+复探次数断言 |

**R15 clean**:R14 两修复变异复验(ready-first 还原即红/容错 catch 重抛各自只杀对应测试)/六源文件除 Y1 外零新缺陷/预算·wiring·配对全钉/130/130 隔离副本复跑吻合/egress 13/13/台账三格·H1-H6 hook 面·文档全净/L1 四表+九表达式字节一致(err-first 确认→ready-first 偏离声明准确)。

## 21. R16 审查修订(2026-09-26 飞轮第十六轮,fresh agent **R=0** Y=3 G=1,全修;变异在 /tmp 副本字节校验后回收)

| # | 发现 | 修订 |
|---|---|---|
| R16-Y1 | 自愈**块内**仍可删:R15 钉的"heal fired"只断言了 PUT,没断言 navigate 落地——删 `tmp.navigate`(L1 注释明示 /json/new 的 url 参数不导航,新页停在 about:blank)或删 settle,66 测试仍绿=零配置恢复在真机上静默失效 | heal 测试改**navigate 耦合建模**:/json/list 仅在观察到 Page.navigate 帧后才返回 gemini 页(杀两变异);另补"navigate 永不落地→S101"变异测试(15s navigate 超时预算) |
| R16-Y2 | eval 两错误分支可删:CDP 错误帧(cdp 拒为裸 Error)与 exceptionDetails(页面上下文销毁)不包 S103→裸错穿 adapter 可重试检查=终态删会话弃计费视频;exceptionDetails 删→eval 返 undefined→误判 S102 | transport.test.ts 补两用例(fake socket 手工回帧):CDP 错误帧→network 可重试"CDP evaluate 失败"/exceptionDetails→network 可重试"页面执行异常" |
| R16-Y3 | 残余防御面可删:touchActivitySignal(R15 发现文里点名却未钉)/cdp 非 JSON 帧容忍(删=长驻 server 上畸形帧变未捕获异常)/同步 send 抛 catch | touch 用**真实临时 HOME**(os.homedir 遵循 $HOME,mtime 增量为可观测,零模块 mock);cdp 补非 JSON 帧后继续服务+同步 send 抛→S103 发送失败两用例 |

**R16 clean**:R15 修复变异复验(删 heal 块两测试即红)/L1 序列偏离全数入账(ready-first/S200 重试/notes 删/blob 限/EXTR_MODE_BADGE 随 notes 删除被吸收)/六源文件零新缺陷/wiring·配对·台账·fork 边界全净。

## 22. R17 审查修订(2026-09-26 飞轮第十七轮,fresh agent **R=1** Y=2 G=8,全修;变异在 /tmp 副本字节校验后回收)

| # | 发现 | 修订 |
|---|---|---|
| R17-R1 RED | R16 的同步 send 测试**未处理 rejection**:pending 在 flush 宏任务后才挂 .catch,Node 先发 unhandledRejection——**138/138 全过但进程退出码 1**,CI 在进程级失败;前轮"全绿×2"只验了断言数没验退出码 | catch 改**创建即挂**;**验证纪律修正:全绿判定必须含退出码**(本轮起 exit=0 入复验口径);"never-lands"测试同步改 ack-不-commit 模型(免 15s navigate 超时挂钟风险) |
| R17-Y1 | heal **settle 行**仍可删(变异绿):R16 的"杀两变异"半假——navigate 耦合 fake 在**发帧时同步**翻 flag,settle 的让出不可观测;真机上 ACK 先于 commit,不睡即探=与 URL 翻转竞态→零配置恢复路径偶发 S101 | fake 改 **commit-after-ack 模型**(flag 在 ACK 之后的宏任务翻)——settle 的 yield 成为 ack→commit 的桥,删 settle 即红 |
| R17-Y2 | budget `value >= 0` 半边未钉:删后 `"-1"`→capacity -1→不限,**负数手滑静默解除 gemini 串行兜底** | 补 defaulted 渠道负值用例("-1"→内建 1 仍强制) |

**R17 clean**:R16 六修复变异全红/历史钉(R4-Y3/R11-Y2/TTL/R13-Y3/R14-Y1/R2-F3/R2-F1/R5-R1/R5-Y2)逐一变异复验仍红/**定论:17 轮变异清扫后全接触面仅剩 Y1 settle 与 Y2 半边两处可删(均已修);其余未钉行属当下不可达契约线**/L1 程序化 diff 字节一致/wiring·配对·台账·fork 边界全净。

## 23. R18 审查修订(2026-09-26 飞轮第十八轮,fresh agent **R=1** Y=3 G=9,全修)

| # | 发现 | 修订 |
|---|---|---|
| R18-R1 RED | R17-Y1 修复**无效**:flip 定时器在 send() 同步段先于 reply 注册,Node 把 setTimeout(0) 钳到 1ms→同延迟按注册序→flip 先于 ack→settle 仍不可观测;"删 settle 即红"台账声明为假 | 严格三段时序:reply(钳 1ms)<flip(2ms)<settle(测试 3ms);**主线自变异复证**(mutant exit=1→还原 exit=0)后才记账;时序模型的钳位陷阱入教训 |
| R18-Y2 | openTab 临时连接 dispose 未钉(删 finally 泄漏每自愈一个 WS,恰在操作员关标签页的 S101 重试循环下反复) | 成功 heal 测试补 `sockets[0].terminated === true` |
| R18-Y3 | eval-catch 的 dispose+null 对未钉(R3-F3 修复本身无钉;R16-Y2 只钉了分类没钉释放) | CDP 错误帧测试补后续 eval→"未连接"分类断言(仅当 conn 已置 null 才触发) |
| R18-Y4 | budget `capacity <= 0` 子句未钉:删后**文档明示的 0=不限**变成全员永久停车 | 补 0 值测试(两并发准入;变异则超时红,显式 timeout 5s) |

**R18 clean**:R17-R1 修复复验健全(退出码 0+零 unhandled;还原旧式即复现 exit 1)/R17-Y2 负值守卫变异红/ack-no-commit 测试在盘/L1 再 diff 一致/台账 19 行三格+时序正/全 wiring·配对·egress·fork·AGENTS 净。

## 24. R19 审查修订(2026-09-26 飞轮第十九轮,fresh agent **R=0** Y=4 G=8,全修;变异 /tmp 副本字节校验后回收)

| # | 发现 | 修订 |
|---|---|---|
| R19-Y1 | exceptionDetails 分支的 dispose+null 对可删(R18-Y3 只钉了 catch 分支)——页面异常后残留 stale conn→自愈 `t.open()` 早退→可重试失败旋到 S410 而非恢复 | exceptionDetails 测试补同款后续 eval"未连接"断言 |
| R19-Y2 | budget.ts 头注释"lazy per acquire"失实:仅 dailyLimit 懒;容量在首取时定格(运行中改 MAX_CONCURRENT 静默无效至重启) | 注释改为如实描述(两条路径分别说明);不改行为(定格是有意设计) |
| R19-Y3 | 负载下一次未复现 flake(变异 M5 下 1/46;净副本 4 路 CPU 饱和 20/20+3/3 全绿);1<2<3ms 时序**结构性健全**(libuv 按到期时刻触发,晚醒只延迟不重排) | 观察项:**CI 首次复发即抓测试名后再放宽边距**——禁预先盲放宽 |
| R19-Y4 | packages/AGENTS.md 包总览表漏 mediagen-nodes 行(上游规则"guidance moves with code") | 表补行+**02-基线登记 H7**(表追加,未来上游 PR 必含) |

**R19 clean**:R18 四修复变异全红(M1-M4 逐一复验)+还原字节校验/六源文件零新缺陷/L1 九表达式+四表再 diff 字节一致/140/140 exit 0+egress 13/13/台账 18 行三格时序正/其余 92 §6-§23 修复声明全部在盘。

## 25. R20 审查修订(2026-09-26 飞轮第二十轮,fresh agent **R=0** Y=3 G=7,全修;变异 /tmp 副本字节校验后回收)

| # | 发现 | 修订 |
|---|---|---|
| R20-Y1 | daily-limit 拒绝路径的 `release()` 未钉(变异删掉 15/15 仍绿)——容量 1 渠道(gemini/hfspaces)一次限额拒绝即**永久卡死**后续全部调用(检查在 acquire 后,槽泄漏跨 UTC 翻日) | 补 jam 钉:限额拒一次→删 env(**不 reset 闸**)→后续 acquire 必须在 5s 内解出(泄漏则超时红) |
| R20-Y2 | ~~**仓库级陈年伤**:…~~ **(R21-R1 撤回:判断全反——.agents 是真目录/规则 8 上游陈旧/所建链接成环 88 文件险删/check 绿是空绿;见 §26)** | ~~转符号链接~~ → R21 已恢复真目录并正修检查脚本(规则对齐翻转布局+计数守卫) |
| R20-Y3 | manifest.ts 注释"five manifest.json entries"过期数字(盘上 8 个;根 AGENTS 计数禁令) | 去数字化表述 |

**R20 clean**:R19 三修复在盘且 exceptionDetails dispose 对变异红/六源文件零新缺陷/L1 四表+九表达式+全部时间常量再 diff 逐字一致/**测试基岩判定(R23 修正:绝对化措辞撤回——『仅剩一行』被 R23-Y1 图重连块变异存活证伪;基岩结论只对已探针面成立,新探针可再出幸存者)**/140/140 exit 0+egress 13/13 复现/台账 19 行三格时序正/92 §5-§24 声明抽查在盘。

## 26. R21 审查修订(2026-09-26 飞轮第二十一轮,fresh agent **R=1** Y=1 G=5;会话中断后重派,变异 /tmp 副本字节校验后回收)

| # | 发现 | 修订 |
|---|---|---|
| R21-R1 RED | **R20-Y2"修复"方向完全反了**:`.agents` 本就是真实跟踪目录(上游 2c7028443 已翻转布局,`.claude→.agents` 才是链接;检查规则 8 是上游自带陈旧规则,净 clone 上游同样红)。我建 `.agents→.claude` 造成**符号链接环**:88 个跟踪文件被 git 视为已删除(下一次 add -A 即灾难),所有路径 ELOOP 不可解析;R20 的"diff 一致"是**目录经环自比**(恒真),"check 绿"是**计数塌零的空绿**(0 linked/0 readable 仍 exit 0) | `rm .agents && git checkout -- .agents` 恢复真目录(ls-files -d=0,88 文件零丢失);**正修检查脚本**:规则 8 对齐现行布局(.claude 链接→.agents 真目录)+ Y1 计数盲绿守卫(shipped>0 而 linked/readable=0 即 fail);check 真绿且计数真实(53/24/49)。§25 R20-Y2 行加撤回注记;教训入 iterations/04 §5.4:**改布局前先看 git 索引与上游 commit 史,勿凭检查器报错反推"正确形态";"diff 一致"穿过符号链接=自比** |
| R21-Y1 | check:agents-docs 计数盲绿(shipped 53 而 linked/readable 塌 0 仍 exit 0;R20 把 exit 0 记为"全绿"没读计数=R17 断言数盲区同款) | 守卫入脚本(见上);与 vitest exit-code 纪律同源:**绿必须带着真实计数绿** |

**R21 clean**:jam 钉变异红(5008ms 超时)/gemini:1 与 exceptionDetails dispose 对两基岩探针变异红/L1 四表+探针正则字节一致/141/141×2+13/13 主线日志完整非截断/全 wiring·配对·H5 纯追加·台账三格时序正/**未再发现六源文件新可删点(R20 基岩判定在其探针面全部成立)**。

## 27. R22 审查修订(2026-09-26 飞轮第二十二轮,fresh agent **R=0** Y=2 G=8,全修)

| # | 发现 | 修订 |
|---|---|---|
| R22-Y1 | 必读文档三句仍教**反向布局**(AGENTS.md"Skills live in .claude/skills/"、.agents/README 两处".agents 是链接")——正是误导 R20 建环的原文;与检查脚本同属上游陈旧(2c7028443 翻转时未改),修后可回馈 | 反向布局陈述翻转为真(.agents=跟踪树/.claude=链接;R23 又抓到同文件第四句——计数声明一律去数字化);AGENTS.md+.agents/README.md 入 H7 触面 |
| R22-Y2 | 92 §26 引用不存在的"迭代 05 草稿"(台账承诺未落盘类) | 教训实落 iterations/04 §5.4;92 §26 指针改指真处 |

**R22 clean**:R21 修复双布局验证成立(翻转布局绿+真计数;旧布局与环态均 FAIL——环态由计数守卫独立拦截)/88 文件零孤儿/git 模式 120000 确认/六源文件零新缺陷/141/141×2 exit 0/egress 13/13/H5 纯追加/H7 论证对上游 commit 史成立/台账 21 行三格时序正含撤回渲染/L1 再 diff 逐字一致。

## 28. R23 审查修订(2026-09-26 飞轮第二十三轮,fresh agent **R=1** Y=1 G=9,全修;9 变异 8 杀 1 存→存者即发现)

| # | 发现 | 修订 |
|---|---|---|
| R23-R1 RED | **第四句**反向布局陈述(.agents/README.md:122-124 "fails on a .agents that stops pointing at .claude")——就在 R22 修过的同文件下一自然段;"三句全部"计数声明超额(计数声明自邀打脸) | 句子翻转;H7 与 92 §27 措辞**去数字化**(sweep 干净,不再数句子) |
| R23-Y1 | 图 poll 自愈**重连块**变异存活(stub 不建模 eval 失败后 conn 置空→删整块套件仍绿;生产上=一次 WS 掉线后图生成必旋到 180s 死线)——**证伪 R20 基岩绝对化声明** | stubTransport 升级:eval 抛错后 connNulled,后续 eval 合成"未连接"可重试错直至 open() 复位(**主线自变异复证**:删重连→2 测试红 exit=1→还原绿);§25 基岩措辞撤回绝对化 |

**R23 clean**:9 变异 8 杀(bare-return/终态释放/S303/eval-catch dispose/daily-limit release/connecting-socket/navigate/ready-first 全红)/六源文件零新缺陷/141/141×2+egress 13/13+check 真计数/H5/H7 面对上游 commit 史成立/台账行三格时序正/L1 逐字一致。(台账注:本节与 §25 软化、iterations/04 R23 行首落因 python 引号冲突+相对路径错误未写盘,即时发现重落——又一条"落盘后须验落"实例)

## 29. R24 审查修订(2026-09-26 飞轮第二十四轮,fresh agent **R=0** Y=1 G=5,全修)

| # | 发现 | 修订 |
|---|---|---|
| R24-Y1 | H7 行仍带两处"三句"计数(首落失败批次丢失的去数字化编辑;既错数又重演"计数声明自邀打脸") | 两处改非数字措辞(布局陈述句/布局句翻转) |

**R24 clean**:重连钉**双向独立变异复证**(图自愈块删→9 测试红;视频 poll 顶部 open 删→钉住测试红)/stub conn-null 模型零假阳性交互/六源文件零新缺陷(exprClickSend __err 分类经 DOM 派发语义复核成立)/L1 四表+九表达式+全部时间常量精确一致/全 wiring·配对·egress·fork·布局 sweep 净/**基岩判定(非绝对化):今日探针面(两新变异+定向绿跑)无可删钉幸存;非穷尽扫,新探针类仍可能出幸存者**。

## 30. R25 审查修订(2026-09-26 飞轮第二十五轮,fresh agent **R=0** Y=2 G=0,全修)

| # | 发现 | 修订 |
|---|---|---|
| R25-Y1 | H7 行 **5 格出现在 4 列表**(R24 去数字化编辑残留空格——编辑残渣家族 R10-Y3/R11-Y1 同款;H7 冲突面列因此渲染为空) | 格合并回 4 列 |
| R25-Y2 | 92 §2 manifest 行仍写 image timeout 180(R13-Y5 已删该字段,180s 单源在 adapter)——终态表 vs 盘漂移 | §2 行改真(video 420;image 180s 自限单源在 adapter) |

**R25 clean**:R24 双重连钉独立变异复证红/141/141×2 exit 0/计数短语全域 sweep 净(历史行保留原文)/台账 24 行三格时序正/92 §6-§29 修复声明逐项在盘/egress 三角+H5 纯追加/wiring·配对·fork·布局全净/L1 四表+九表达式+全部时间常量逐字一致(仅两处已登记偏离)/基岩(非绝对化):今日探针面无可删幸存。(台账注:本节首落被 cd 中文路径失败部分短路+重落时一度重复追加,均即时发现修正——cd 中文路径不稳,台账编辑一律绝对路径)


## 31. R26 审查修订(2026-09-26 飞轮第二十六轮,fresh agent **R=0** Y=2 G=1,全修)

| # | 发现 | 修订 |
|---|---|---|
| R26-Y1 | **LAUNCH_HINT 纪律与 L1 反向**:三个瞬态 S103 位点(无 wsDebuggerUrl/未连接/eval 失败)默认挂"重启渠道 Chrome"提示——L1 刻意只在连接期带 hint;运维误导=瞬态错诱导操作员执行唯一会沉掉在途计费生成的动作;无测试钉 hint 内容 | 三位点显式空 hint;三测试补 `not.toMatch(/launch-chrome/)` 钉住(S100 位点保留 hint 并已有正断言) |
| R26-Y2 | 92 §7 R2 行未转义 `\|\|9225` 致 3 列表裂 5 格(该缺陷家族首次出现在 92 内部轮表,前清扫只扫 iterations/04) | 措辞重写去竖线;**台账清扫范围扩至 92 全文件轮表** |

G1(manifest.ts moduleName 注释错挂 wire 说明)=上游既有,仅 Opportunistic 登记,不动。


## 32. R27 审查修订(2026-09-26 飞轮第二十七轮,fresh agent **R=0** Y=1 G=1,全修;hint 摘除变异红复证)

| # | 发现 | 修订 |
|---|---|---|
| R27-Y1 | hint 纪律钉住 3/4 可达瞬态位;**默认极性** `hint = LAUNCH_HINT` 自邀回归(未来新 S103 位点漏传参即重演 R26-Y1);exceptionDetails 位(第 4)消息钉了 hint 没钉(变异存活);S101 hint 亦未正钉 | 默认翻转为空串(盘上零行为变化,S100 本就显式传)+注释固化极性理由;exceptionDetails 测试补 not.toMatch(launch-chrome) |
| R27-G2 | §31 行内指针"§6"应为"§7" | 已改 |

**R27 clean**:R26 修复变异红(摘""即红=判别)/八 geminiError 位点全数复核对齐 L1 与 92 §3/92+iterations 全表程序化扫格零裂/六源文件零新缺陷/141/141 exit 0 独立复跑/egress 13/13/fork·布局·文档全净。


## 33. R28 终局(2026-09-26 飞轮第二十八轮,fresh agent **R=0 Y=0 G=2 —— 零发现,停机条件达成**)

- R27 修复变异双证:默认翻转盘上零行为变化(Mutant A 绿)+未来位点漏传参必被钉拦(Mutant B 红)
- G1(S101 hint 无正钉,低风险)/G2(adapter.ts:331 冗余 delete,行为等价已登记防幻影)——均观察项零动作
- L1 保真程序化终验:5 常量表达式字节级+4 箭头表达式(仅标识符名差)+4 标签表 JSON 一致+全部时间常量/perMessageDeflate/navigate 15s 一致;已登记偏离(ready-first/S200 重试/重连自愈/TTL/歧义守卫/hint 纪律)不变
- 台账 32 节时序正;转义感知扫格零裂;fork 面=声明面零出超

**飞轮停机**:28 轮累计 8 RED+51 YELLOW 全修;测试 74→141(离线全分支+变异判别背书);验证口径演进=断言数→+退出码→+变异判别→+主线自变异复证。停机后动作:提交 main→push origin→切 feat/i18n-zh 开工 M10。
