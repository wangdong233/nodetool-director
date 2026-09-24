# 性能基线(M8,2026-09-24,开发机 Intel MBP 2015/16GB/Monterey)

> 测量环境注明:开发机为弱基准机;Windows 目标机预期全面更优(WebGPU 真合成)。02 R-FF-06 趋势起点:后续以同口径复测对比。

## 1. 节点执行(真实渠道,node run 单节点)

| 操作 | 实测 | 备注 |
|---|---|---|
| zhipu 生图(cogview-3-flash 1024²) | 8.3s | 含真实 API 往返+入库 |
| zhipu 生视频(cogvideox-flash 5s) | 68.8s | submit→poll→download 全链 |
| 缺 key 结构化拒绝 | ~1ms | 闸/校验零开销感 |

## 2. 服务与构建

| 项 | 实测 |
|---|---|
| dev:server(tsx watch)冷启动 | 8.2s(注册 8047ms 时刻日志) |
| 生产形态启动(STATIC_FOLDER) | ~3.9s |
| build:packages 全量(turbo,首跑) | ~7min |
| mediagen-nodes 单包增量构建 | ~15s |
| build:web 生产 | ~4min(83MB dist) |
| npm install(首装,含回退重试) | ~15min;重装预期 <8min |
| 包测试全量(44+) | ~11s/轮(vitest transform 占 5 成) |

## 3. 画布 catalog

- 节点总量 2895 → **+mediagen 14**(12 manifest+2 pixverse 手写;含 audio/dummy)=≈2909。metadata 端点 <1s。
- 勘误(终审 Y1):此前"10→13/≈2908"计数有误;14 为 dist 导出 MEDIAGEN_NODES.length 实测值。计数宣称一律以 dist 导出/registration 测试背书。
- 预算闸开销:纯内存信号量+小 JSON 落盘(每次 admitted 一次原子写),单次 <1ms 量级;Y2 修复后 check+increment 为无 await 连续段(并发突发下限额精确)。

## 4. 弱机已知项(非本项目缺陷)

- vite dev 转译在 Intel/Monterey 可能极慢甚至停滞 → 验证走生产形态(已固化 deploy 文档 §7)。
- 上游 scripts 测试(fly-rolling-deploy 等)在本机超时(>10s 限),CI runner 上游绿。

## 5. 待 Windows 机复测项

node run 三项/服务启动/测试全量/WebGPU 合成(RenderTimeline)耗时对比表(部署后回填)。
