# mediagen-nodes

MediaGen channel nodes for NodeTool: image / video / audio generation through
free and low-cost channels (zhipu, agnes, cloudflare, siliconflow, hfspaces,
pixverse), driven by a per-channel manifest + adapter architecture.

## Nodes

| Node | Channel | Kind | Key |
|---|---|---|---|
| ZhipuTextToImage / ZhipuTextToVideo | zhipu | image / video(i2v, keyframes on cogvideox-3) | ZHIPU_API_KEY |
| AgnesTextToImage / AgnesTextToVideo | agnes | image(i2i) / video(i2v, keyframes) | AGNES_API_KEY |
| CloudflareTextToImage | cloudflare | image (8 models, flux-2 multipart family) | CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID |
| SiliconflowTextToImage / SiliconflowTextToVideo | siliconflow | image (Edit i2i) / video (fixed 5s) | SILICONFLOW_API_KEY |
| HfspacesTextToImage / HfspacesImageToVideo / HfspacesMinimaxH3Video | hfspaces | image / video(i2v ≤5s) / video(t2v·i2v·keyframes 2-14s, with audio) | — (optional HF_TOKEN) |
| HfspacesTextToSpeech | hfspaces | audio (Chatterbox, voice-clone via reference_audio) | — |
| PixverseSubmit / PixverseConfirm | pixverse | billing confirm pair (Submit estimates + never bills; Confirm executes with TTL token) | pixverse CLI OAuth or PIXVERSE_ACCESS_KEY |
| DummyTextToImage | dummy | offline 1×1 PNG — mount/smoke node, no network, no key | — |

## Architecture

```
src/
  manifest.ts            # types + combined manifest loader (dist/mediagen-manifest.json)
  mediagen-base.ts       # secrets, media input, executeMediagenCall (single choke point), polling, safeDownload
  mediagen-factory.ts    # manifest entry → BaseNode subclass
  budget.ts              # per-channel concurrency + daily limits (M4)
  channels/<ch>/         # per-channel adapter.ts + manifest.json (self-contained)
  adapters/types.ts      # AdapterContext / MediaBag / PollResult contracts
```

Adding a channel = its directory + one line in `channels/index.ts` + its
manifest fragment registered in `tests/manifest.test.ts` (+ url-egress entry
when it fetches dynamic URLs). No factory/types changes — verified by the M6b
mount drill.

## Budget gate

Every call passes `executeMediagenCall` → `acquireChannelSlot`: hfspaces is
serialized to one in-flight call by default (ZeroGPU is accounted per account).
Raise limits with `MEDIAGEN_MAX_CONCURRENT_<CHANNEL>` /
`MEDIAGEN_DAILY_LIMIT_<CHANNEL>` (0/absent = unlimited). Counters persist to
`~/.local/share/nodetool/mediagen-budget.json` and reset daily.

## Tests

`npm run test --workspace=packages/mediagen-nodes` — 73 offline tests (fetch
and CLI spawns stubbed; assertion provenance is the channel wire contracts).
