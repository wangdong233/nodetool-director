你帮用户配置 AI 模型服务商,并为任务挑对模型。

# 服务商总览

| 服务商 | 类型 | 密钥环境变量 | 模型 |
|----------|------|-------------|--------|
| **OpenAI** | 云端 | `OPENAI_API_KEY` | GPT-5.4 / GPT-5.4-mini、GPT-Image、TTS、Whisper |
| **Anthropic** | 云端 | `ANTHROPIC_API_KEY` | Claude Sonnet 4.6、Haiku |
| **Gemini (Google)** | 云端 | `GEMINI_API_KEY` | Gemini 2.5、Veo、Nano Banana |
| **xAI** | 云端 | `XAI_API_KEY` | Grok 4 |
| **Ollama** | 本地 | `OLLAMA_API_URL` | Qwen、Llama 3、Mistral、任意 GGUF |
| **HuggingFace** | 本地/云端 | `HF_TOKEN` | 1000+ 模型,自动下载 |
| **FAL** | 云端 | `FAL_API_KEY` | 快速图像/视频生成 |
| **Replicate** | 云端 | `REPLICATE_API_TOKEN` | 社区模型 |
| **Comfy Cloud** | 云端 | `COMFY_API_KEY` | 无模型列表;经 `lib.comfy.RunWorkflowOnCloud` 在 Comfy 的 GPU 上运行 ComfyUI 工作流 |
| **vLLM** | 本地 | `VLLM_API_URL` | 自托管,OpenAI 兼容 |
| **llama.cpp** | 本地 | — | GGUF 模型,CPU/GPU |
| **MLX** | 本地 | — | Apple Silicon 优化 |

其他已注册的对话服务商(以下任意一个都是合法的 `-p/--provider`):
`groq`、`mistral`、`deepseek`、`moonshot`、`minimax`、`cerebras`、`alibaba`
(`DASHSCOPE_API_KEY`,Qwen 走阿里云百炼)、`together`、
`openrouter`、`codex`、`claude_agent_sdk`、`lmstudio`。跑 `nodetool models
providers` 看已配置的服务商,`nodetool models recommended` 看精选模型清单。

# API 密钥配置

```bash
# Via CLI (encrypted storage)
nodetool secrets store OPENAI_API_KEY
nodetool secrets store ANTHROPIC_API_KEY
nodetool secrets store GEMINI_API_KEY
nodetool secrets store HF_TOKEN
nodetool secrets store FAL_API_KEY
nodetool secrets store REPLICATE_API_TOKEN
nodetool secrets store COMFY_API_KEY

# Via environment variables
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GEMINI_API_KEY=AI...
export HF_TOKEN=hf_...
export FAL_API_KEY=...
export REPLICATE_API_TOKEN=r8_...
export COMFY_API_KEY=comfyui-...
export OLLAMA_API_URL=http://localhost:11434
```

# 按任务选模型

## 语言 / 聊天

| 需求 | 模型 | 服务商 | 备注 |
|------|-------|----------|-------|
| 最好的质量 | gpt-5.4、claude-sonnet-4-6 | OpenAI、Anthropic | 最强能力 |
| 均衡之选 | gpt-5.4-mini、gemini-2.5-flash | OpenAI、Gemini | 快 + 便宜 |
| 本地/隐私 | Llama 3.3 70B、Qwen 3.5 | Ollama | 数据不出机器 |
| 轻量本地 | Llama 3 8B、Mistral 7B | Ollama | 低内存 |
| 代码 | claude-sonnet-4-6、gpt-5.4 | Anthropic、OpenAI | 最适合写码 |

## 图像生成

| 需求 | 模型 | 服务商 | 备注 |
|------|-------|----------|-------|
| 最好的质量 | FLUX.2 Dev | HuggingFace、FAL | 顶级水准 |
| 快 | FLUX Schnell | HuggingFace | 快速迭代 |
| 全能 | SDXL | HuggingFace | LoRA 生态丰富 |
| 走 API | GPT Image 2、Nano Banana | OpenAI、Gemini/KIE | 无需本地 GPU |

## 视频生成

| 需求 | 模型 | 服务商 |
|------|-------|----------|
| 最好的质量 | Sora 2 Pro | OpenAI (KIE) |
| 快 | Wan 2.6 | KIE |
| 图生视频 | Kling 2.6 | KIE |
| 会说话的数字人 | Kling AI Avatar | KIE |

## 语音与音频

| 需求 | 模型 | 服务商 |
|------|-------|----------|
| TTS(质量) | ElevenLabs | ElevenLabs |
| TTS(快/免费) | Whisper TTS | HuggingFace |
| ASR(精度) | Whisper Large V3 | HuggingFace |
| ASR(快) | Whisper Turbo | HuggingFace |

## 嵌入

| 需求 | 模型 | 服务商 |
|------|-------|----------|
| 通用文本 | text-embedding-3-small | OpenAI |
| 最好的质量 | text-embedding-3-large | OpenAI |
| 本地/免费 | sentence-transformers | HuggingFace |

# 本地模型配置

## Ollama(最省事)

```bash
# Install
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull llama3
ollama pull mistral
ollama pull qwen2

# Verify
ollama list

# NodeTool auto-discovers Ollama at localhost:11434
# Override: export OLLAMA_API_URL=http://host:11434
```

## HuggingFace(自动下载)

模型首次使用时自动下载到 `~/.cache/huggingface/`。

门控模型:
1. 在 HuggingFace Hub 上接受条款
2. 设置 `HF_TOKEN`
3. 模型自动下载

## llama.cpp

手工加载 GGUF 模型。最适合 CPU 推理与量化模型。

## MLX(仅限 Apple Silicon)

为 M1/M2/M3 芯片优化。内存占用低于标准 PyTorch。

# 本地推理性能

| 框架 | 吞吐 | 内存 | 硬件 |
|-----------|-----------|--------|----------|
| **llama.cpp** | 中 | 极佳 | CPU、GPU |
| **MLX** | 好 | 极佳 | Apple Silicon |
| **Nunchaku** | 极佳 | 极佳 | NVIDIA GPU |
| **Transformers** | 中 | 好 | 任意 |

# 服务商无关的节点

这些节点配哪个服务商都行——选好模型即可:

| 节点 | 用途 |
|------|---------|
| `nodetool.agents.Agent` | 任意 LLM 做聊天/推理 |
| `nodetool.image.TextToImage` | 任意图像生成模型 |
| `nodetool.image.ImageToImage` | 任意图像变换模型 |
| `nodetool.video.TextToVideo` | 任意视频生成模型 |
| `nodetool.video.ImageToVideo` | 任意图生视频模型 |
| `nodetool.audio.TextToSpeech` | 任意 TTS 模型 |
| `nodetool.text.AutomaticSpeechRecognition` | 任意 ASR 模型 |

# 自定义服务商开发

服务商扩展 `@nodetool-ai/runtime` 的 `BaseProvider`(不是 `@nodetool-ai/core`)。
`generateMessage` 与 `generateMessages` 都收单个**参数对象**。

```typescript
import {
  BaseProvider,
  type ProviderId,
  type Message,
  type ProviderStreamItem,
  type ProviderTool,
  type LanguageModel,
} from "@nodetool-ai/runtime";

export class MyProvider extends BaseProvider {
  private apiKey: string;

  constructor(kwargs: Record<string, unknown> = {}) {
    super("my_provider" as ProviderId);
    this.apiKey = String(kwargs["MY_API_KEY"] ?? process.env.MY_API_KEY ?? "");
  }

  static override requiredSecrets(): string[] {
    return ["MY_API_KEY"];
  }

  // Non-streaming: return a single assistant Message.
  async generateMessage(args: {
    messages: Message[];
    model: string;
    tools?: ProviderTool[];
  }): Promise<Message> {
    // Call your API with args.messages / args.model …
    return { role: "assistant", content: "response text" };
  }

  // Streaming: yield ProviderStreamItem chunks.
  async *generateMessages(args: {
    messages: Message[];
    model: string;
    tools?: ProviderTool[];
  }): AsyncGenerator<ProviderStreamItem> {
    yield { type: "chunk", content: "response text", done: false };
  }

  override async getAvailableLanguageModels(): Promise<LanguageModel[]> {
    return [{ id: "my-model", name: "My Model", provider: "my_provider" }];
  }
}
```

用 `@nodetool-ai/runtime` 的 `registerProvider("my_provider", MyProvider)` 注册它。

# 服务商能力

| 能力 | OpenAI | Anthropic | Google | Ollama | HF |
|-----------|--------|-----------|--------|--------|-----|
| 聊天/文本 | 是 | 是 | 是 | 是 | 是 |
| 视觉 | 是 | 是 | 是 | 部分 | 是 |
| 图像生成 | 是 (GPT-Image) | 否 | 否 | 否 | 是 |
| 视频生成 | 否 | 否 | 是 (Veo) | 否 | 部分 |
| TTS | 是 | 否 | 否 | 否 | 是 |
| ASR | 是 (Whisper) | 否 | 否 | 否 | 是 |
| 嵌入 | 是 | 否 | 是 | 是 | 是 |
| 工具调用 | 是 | 是 | 是 | 部分 | 否 |

# 常见坑

- **密钥环境变量名写错**: 每个服务商名字固定(见上表)
- **Ollama 没在跑**: 先 `ollama serve` 再用
- **HF 门控模型**: 必须先在 hub.huggingface.co 接受条款
- **GPU 内存**: 大模型要 8-24GB 显存;用量化版本
- **限流**: 云端服务商有限流;做重试或改用本地
- **模型 ID 不匹配**: 用服务商的准确模型 ID(如 `gpt-5.4`、`claude-sonnet-4-6`)——`nodetool models by-provider <provider>` 可列出
