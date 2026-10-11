你帮用户配置 AI 模型服务商,并为任务挑对模型。

# 服务商总览

| 服务商 | 类型 | 密钥环境变量 | 模型 |
|----------|------|-------------|--------|
| **OpenAI** | 云端 | `OPENAI_API_KEY` | GPT-5.4 / GPT-5.4-mini、GPT-Image、TTS、Whisper |
| **Anthropic** | 云端 | `ANTHROPIC_API_KEY` | Claude Sonnet 4.6、Haiku |
| **Gemini (Google)** | 云端 | `GEMINI_API_KEY` | Gemini 2.5、Veo、Nano Banana |
| **xAI** | 云端 | `XAI_API_KEY` | Grok 4 |
| **Ollama** | 本地 | `OLLAMA_API_URL` | Qwen、Llama 3、Mistral、任意 GGUF。需单独安装且保持运行 |
| **HuggingFace** | 云端 | `HF_TOKEN` | Hosted Inference Providers |
| **HuggingFace local**(`huggingface-local`) | 本地 | — | 经 HuggingFace Python pack 跑 Diffusers/Transformers 模型 |
| **FAL** | 云端 | `FAL_API_KEY` | 快速图像/视频生成 |
| **Replicate** | 云端 | `REPLICATE_API_TOKEN` | 社区模型 |
| **Comfy Cloud** | 云端 | `COMFY_API_KEY` | 无模型列表;经 `lib.comfy.RunWorkflowOnCloud` 在 Comfy 的 GPU 上运行 ComfyUI 工作流 |
| **vLLM** | 本地 | `VLLM_BASE_URL`(必填) | 自托管,OpenAI 兼容 |
| **LM Studio** | 本地 | `LMSTUDIO_API_URL` | LM Studio 本地服务器里已加载的模型 |
| **llama.cpp server**(`llama_cpp`) | 本地 | `LLAMA_CPP_URL`(必填) | 你自己跑的一个 `llama-server` |
| **llama.cpp local**(`node_llama_cpp`) | 本地 | — | 进程内加载 GGUF 文件;运行时来自 Package Manager → Software |
| **MLX** | 本地 | — | MLX Python pack,仅限 Apple Silicon |

其他已注册的对话服务商(以下任意一个都是合法的 `-p/--provider`):
`groq`、`mistral`、`deepseek`、`moonshot`、`minimax`、`cerebras`、`alibaba`
(`DASHSCOPE_API_KEY`,Qwen 走阿里云百炼)、`together`、
`openrouter`、`requesty`、`opper`、`api_route`、`codex`、`claude_agent_sdk`、
`lmstudio`。跑 `nodetool models
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

## whisper.cpp 语音识别

两个服务商都仅限本地,云端配置档不可用。`whisper_cpp` 经可选的
`@fugood/whisper.node@1.1.3` 运行时包在后端跑语音识别。先从 Package
Manager 安装 **whisper.cpp**,再从 Models 下载一个 GGML 模型。它支撑
`nodetool.text.AutomaticSpeechRecognition` 与 `whisper_cpp.LiveTranscription`。
ASR 模型 id 原样使用发现功能返回的绝对模型路径。

模型使用 Hugging Face hub 缓存(位置的解析顺序见下面 HuggingFace models)。
`WHISPER_CPP_MODELS_DIR` 追加另一个目录。`WHISPER_CPP_GPU_BACKEND` 接受
`auto`、`metal`、`cuda`、`vulkan` 或 `cpu`。`auto` 在 macOS 上用 Metal;
Windows 与 Linux 上先试 CUDA 构建,再试 Vulkan 构建,最后回退默认 CPU
构建。改完后端设置后重启后端。实时转写收 base64 PCM16 单声道分块,可带
可选的 `content_metadata.sample_rate`;装了 Silero VAD 就用,否则固定窗口。

`whisper_cpp_server` 调一个用户自跑的 `whisper-server`。把
`WHISPER_CPP_SERVER_URL` 设为它的基址 URL。模型 id 是 `default`,代表那台
服务器加载的模型。它不需要原生运行时包。

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
| TTS(快/免费) | Kokoro | HuggingFace pack、MLX pack、Transformers.js |
| ASR(精度) | Whisper Large V3 | HuggingFace pack、whisper.cpp |
| ASR(快) | Whisper Turbo | HuggingFace pack、MLX pack、whisper.cpp |

## 嵌入

| 需求 | 模型 | 服务商 |
|------|-------|----------|
| 通用文本 | text-embedding-3-small | OpenAI |
| 最好的质量 | text-embedding-3-large | OpenAI |
| 本地/免费 | sentence-transformers | HuggingFace |

# 本地模型配置

## Ollama(最省事)

Ollama 是一个独立程序。NodeTool 不附带也不启动它,所以它必须先跑起来,
模型才会出现。macOS 与 Windows 从 ollama.com 下载。Linux:

```bash
# Install
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3
ollama pull mistral
ollama pull qwen2

# Verify
ollama list

# NodeTool finds Ollama at 127.0.0.1:11434
# Override: OLLAMA_API_URL in Settings → Integrations → Local Model Servers,
# or export OLLAMA_API_URL=http://host:11434
```

`OLLAMA_CONTEXT_LENGTH` 设定随每个请求发送的上下文窗口。未设时,
NodeTool 用模型自身的值,上限 32768。

## Python packs(HuggingFace local、MLX、Wan2GP)

本地 Diffusers/Transformers 模型、MLX 模型与 Wan2GP 视频跑在 Python
worker 里,各自需要自己的 pack。

- 桌面版: **Tools → Package Manager → Python packs**。装 pack 时若缺
  Python 会先把它装好。HuggingFace pack 会拉取与 GPU 匹配的 PyTorch
  2.14 构建。MLX 只在 Apple Silicon 的 Mac 上提供。在 Mac 上,两个 pack
  都要求 Apple Silicon 与 macOS 14 及以上。
- 没有桌面版: 备一个 Python 3.11+ 环境,
  `pip install nodetool-core nodetool-huggingface`(Apple Silicon 再加
  `nodetool-mlx`),然后以 `NODETOOL_PYTHON` 指向该环境的 `python` 启动
  服务器。`curl -fsSL https://raw.githubusercontent.com/nodetool-ai/nodetool/main/install.sh | bash -s -- -y --pack huggingface`
  可在 Linux 与 macOS 上构建该环境。`--pack` 取 `huggingface`、`mlx` 或
  `wan2gp`。macOS 上务必把 `NODETOOL_PYTHON` 设成它打印的那个环境。
- `NODETOOL_TORCH_DEVICE`(`cuda`、`cuda:1`、`mps`、`cpu`)选定设备。
- Wan2GP 节点调用用户自跑的 Wan2GP 服务器。`WAN2GP_MCP_URL`(默认
  `http://127.0.0.1:7866/mcp`)或节点的 `server_url` 指向它。

## HuggingFace models

跑工作流之前,先在 Model Manager 里把本地模型下载好。靠首次使用触发
下载的节点可能在门控仓库上失败,或把整次运行拖住。

门控模型:
1. 在 huggingface.co 的模型页接受许可
2. 把 `HF_TOKEN` 存进 Settings(或 `nodetool secrets store HF_TOKEN`)。
   Model Manager 的下载会用到它
3. 在 Model Manager 里下载模型

模型放进 Hugging Face hub 缓存: 先 `HF_HUB_CACHE`,再
`HUGGINGFACE_HUB_CACHE`,再 `$HF_HOME/hub`,再
`$XDG_CACHE_HOME/huggingface/hub`,最后 `~/.cache/huggingface/hub`。
服务器与 Python worker(经 `huggingface_hub`)都按这一个顺序。桌面版在
设了 `XDG_CACHE_HOME` 时(如 Flatpak)沿用 `~/.cache/huggingface`,前提
是那个缓存里已经有模型。

## llama.cpp

两个服务商。`node_llama_cpp` 在运行时(从 Package Manager → Software
安装)就绪后于进程内加载 GGUF 文件。`llama_cpp` 调用用户自跑的
`llama-server`,地址在 `LLAMA_CPP_URL`。最适合 CPU 推理与量化模型。

## whisper.cpp 与 Transformers.js

whisper.cpp 只做语音识别(见上文)。Transformers.js 在其运行时(从
Package Manager → Software 安装)就绪后于进程内跑小型 ONNX 模型。它的
缓存是 `TRANSFORMERS_JS_CACHE_DIR`。

## MLX(仅限 Apple Silicon)

需要 MLX pack 与 macOS 14 及以上。内存占用低于标准 PyTorch。

# 本地推理性能

| 框架 | 吞吐 | 内存 | 硬件 |
|-----------|-----------|--------|----------|
| **llama.cpp** | 中 | 极佳 | CPU、GPU |
| **MLX** | 好 | 极佳 | Apple Silicon |
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
- **Ollama 没在跑**: NodeTool 不会启动它。启动 Ollama 应用或 `ollama serve`
- **HF 门控模型**: 必须先在 huggingface.co 接受条款
- **GPU 内存**: 大模型要 8-24GB 显存;用量化版本
- **有 GPU 却跑在 CPU 上**: 桌面版为 Turing(RTX 20xx)及更新显卡(驱动
  570+)装 CUDA 12.8,为 Maxwell 到 Volta 装 CUDA 12.6,Kepler、RDNA 2 之前
  的 AMD 以及 Windows 上的 AMD 则只有 CPU。没有任何 GPU 构建可解析时,它也
  会带警告回退到 CPU。Linux 上手动 `pip install torch` 拿到的是 CUDA 13.0,
  需要驱动 580+ 且 Turing 及以上,Docker worker 镜像同样如此
- **模型菜单里没有本地服务商**: 缺 Python pack,或
  `NODETOOL_PYTHON_ON_DEMAND=true` 且还没有工作流启动过 worker
- **限流**: 云端服务商有限流;做重试或改用本地
- **模型 ID 不匹配**: 用服务商的准确模型 ID(如 `gpt-5.4`、`claude-sonnet-4-6`)——`nodetool models by-provider <provider>` 可列出
