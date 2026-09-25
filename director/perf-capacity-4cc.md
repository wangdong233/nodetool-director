# 承载能力分析:4×CC 会话 + NodeTool + Docker 并行(2026-09-25)

> 问题:当前系统(MBP 2015 15", i7-4770HQ 4C8T @2.2GHz, 16GB RAM, macOS 12 Monterey)同时运行 **4 个 CC 会话 + 本导演台(NodeTool)+ 其他 Docker**,能否撑住?
> 方法:实测进程 RSS/memory_pressure/swap + 已知工程结论([[vscode-copy-latency]]/[[mbp-kingston-a2000-ssd]]),建模目标场景。数据采于 08:15-08:25(2 CC 会话在跑,含本会话)。

## 1. 当前基线(实测)

**内存**:物理 free **3.4GB(20%)**;active 4.4GB;inactive 4.4GB(可回收);**swap 已用 6.7GB / 8GB 上限**(加密)——机器已处于持续换页态。

**大户排行(RSS 实测)**:

| 进程 | RSS | 说明 |
|---|---|---|
| 小说引擎全文索引(python sr_*) | **2.0GB**@133%CPU | 第三方负载,波动性大 |
| VSCode Renderer(本会话窗) | **1.9GB**@71%CPU | transcript 越长越大 |
| Docker hyperkit VM | 480MB(硬顶 **2304MB**) | 内含 new-api 实占仅 93MB |
| NodeTool dev 服务器(tsx+watch) | 670MB(两进程) | 生产形态单进程预估 **250-350MB** |
| CC 扩展 native ×4 | ~795MB 合计 | 随窗口/会话数增长 |
| CC CLI ×2 | 474MB | 单会话 240-310MB,随上下文涨 |
| Chrome(多 tab+MCP) | ~600MB | 画布 tab 另计(见下) |
| Spotlight 元数据 | 277MB | 系统性 |

**单 CC 会话全链边际成本(实测推断)**:CLI 240-310MB + 扩展 native 130-290MB + renderer 增长份额 ≈ **500-800MB/会话**(长上下文会话更大)。

**画布 tab**:Chrome renderer 实测最大 307MB(非画布态);带 2900 节点 catalog+React Flow 图的画布 tab 预估 **400-800MB**。

## 2. 目标场景建模

| 项 | 现状 | 目标场景 | 增量 |
|---|---|---|---|
| CC 会话 | 2 | 4 | **+1.0~1.6GB** |
| NodeTool | dev 670MB | 生产形态 300MB + 画布 tab 600MB(中值) | +0.2~0.3GB |
| Docker | 2.3GB 硬顶(new-api 93MB 实占) | 不变(除非加容器) | 0 |
| 小说索引等第三方 | 2.0GB | 假设仍在 | 0 |
| **合计需求增量** | | | **+1.2~1.9GB** |

**结果推演**:free 3.4GB → **1.5~2.2GB**;swap 从 6.7GB → **顶到 8GB 上限并稳态满负荷**;macOS 内存压缩器接管 inactive 页。

### 判定:**能撑住,但处于"降级可用"区间** ✅⚠️

- **不会崩**:macOS 压缩+swap 机制成熟,进程不会被 OOM 杀(16GB 物理兜底);预算闸已把渠道并发串行化,CPU 不会因生成任务叠峰。
- **可感知降级(三条,均有实证依据)**:
  1. **UI 延迟**:Electron 主进程 IPC 共享耦合是既有实测问题([[vscode-copy-latency]]:CC 吐字→IPC 洪流→同窗口复制卡,CPU 低≠响应快)。4 会话同流量时此问题放大 2 倍;swap 满载加剧换入换出停顿。
  2. **吞吐下降**:编译/构建(本仓 turbo 全量 ~7min)在 swap 满载+4C 争用下预计 1.5-2.5×劣化;NodeTool 的 Concat/合成节点是 ffmpeg CPU 突发,与 CC 流式输出争核(8 线程可被瞬时占满)。
  3. **SSD 写入**:swap 稳态满负荷=持续 NVMe 写。A2000×MBP11,4 有 panic 史(~2 次/周),但 08-26 裁定**写压力被证伪为触发器**(panic 与负载无关,为盘×机型固有缺陷)——swap 不特定升高 panic 频率,如实引用;整机冻结史([[media-gen-mcp-project]] Chrome 孤儿舰队事故)与本次无关(单例服务器无浏览器泄漏面)。

## 3. 结论与建议

**结论:4 CC + NodeTool(生产形态)+ Docker(现容器集)可以并行运行,机器进入稳态高压;功能全部可用,代价是交互延迟与构建吞吐的可感知降级。真正的硬约束不在内存余量,而在①Electron IPC 耦合的体验②8GB swap 上限封顶后的压缩开销。**

**建议(按性价比排序)**:
1. **NodeTool 跑生产形态**(`STATIC_FOLDER` 单进程,省 ~350MB,已在 deploy 文档 §2)——已就绪。
2. **画布 tab 用完即关**(单 tab 400-800MB;需要时再开,画布状态在服务器侧持久)。
3. **小说索引等 2GB 级后台任务错峰**(其 133-250% CPU 与 ffmpeg/编译直接争核)。
4. Docker VM 上限 2304MB 对 new-api(93MB 实占)过宽——可降到 **1024MB** 再省 1.2GB 硬顶余量([[newapi-llm-gateway]] 既有先例:2048 也可)。
5. CC 会话勤 `/compact`:CLI RSS 随上下文单调涨,4 会话各省 100MB=省 400MB。
6. 若追求"无感":4 会话中 2 个挪到 Windows 机(它本来就是全流程机,CC CLI 装上即可)——这是唯一把机器拉回 comfort zone 的根治项。

## 4. 复测口径

下次复测直接采:memory_pressure 首行 free% / vm.swapusage / 本表大户 RSS。若 free% <10% 或 swap used=8192M 稳态 → 触发建议 4-6。
