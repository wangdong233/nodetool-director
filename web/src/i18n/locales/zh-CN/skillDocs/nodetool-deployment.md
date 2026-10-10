你帮用户把 NodeTool 部署到各种环境。按需求选对部署类型。

# 决策树

```
Need GPU? ──yes──→ Own hardware? ──yes──→ Self-Hosted (Docker/SSH)
    │                    │
    no                   no──→ RunPod (serverless GPU)
    │
    ├── Need auth/storage? ──yes──→ Supabase + any deployment
    │
    └── Just API server? ──→ GCP Cloud Run or Self-Hosted
```

# 部署模式

| 模式 | 鉴权 | 用例 |
|------|------|----------|
| `desktop` | `local` | 本地开发、Electron 应用 |
| `private` | `static` | 团队/个人服务器,单一令牌 |
| `public` | `supabase` | 多用户,完整鉴权与存储 |

# 快速开始

```bash
nodetool deploy init              # Create deployment.yaml
nodetool deploy add <name>        # Add a deployment
nodetool deploy list              # List deployments
nodetool deploy show <name>       # Show config
nodetool deploy plan <name>       # Preview changes
nodetool deploy apply <name>      # Deploy
nodetool deploy status <name>     # Check status
nodetool deploy logs <name>       # View logs
nodetool deploy destroy <name>    # Tear down
```

# 环境变量(所有部署)

```bash
# Required
NODETOOL_ENV=production
NODETOOL_SERVER_MODE=private      # desktop | private | public

# Auth (pick one)
AUTH_PROVIDER=static              # none | local | static | supabase
SERVER_AUTH_TOKEN=<token>         # for static auth

# Security
SECRETS_MASTER_KEY=<strong-random-key>
ADMIN_TOKEN=<admin-token>

# Database
DB_PATH=/workspace/nodetool.sqlite3

# API Keys (as needed)
OPENAI_API_KEY=<key>
ANTHROPIC_API_KEY=<key>
GEMINI_API_KEY=<key>
HF_TOKEN=<token>
FAL_API_KEY=<key>
OLLAMA_API_URL=http://localhost:11434
```

# 自托管: Docker

## deployment.yaml
```yaml
deployments:
  my-server:
    type: docker
    host: 192.168.1.10
    ssh:
      user: ubuntu
      key_path: ~/.ssh/id_rsa
    container:
      name: nodetool-server
      port: 8000
      gpu: "0"                    # GPU device ID, or omit
    paths:
      workspace: /data/nodetool
      hf_cache: /data/hf-cache
    image:
      name: ghcr.io/nodetool-ai/nodetool
      tag: latest
```

## Docker 运行(手工)
```bash
docker run --gpus all --memory 8g --cpus 4 \
  -p 7777:7777 \
  -e NODETOOL_ENV=production \
  -e NODETOOL_SERVER_MODE=private \
  -e AUTH_PROVIDER=static \
  -e SERVER_AUTH_TOKEN=<token> \
  -e SECRETS_MASTER_KEY=<secret> \
  -v $(pwd)/workspace:/workspace \
  -v $(pwd)/hf-cache:/hf-cache:ro \
  -e HF_HOME=/hf-cache \
  nodetool:latest
```

## 资源限制
```yaml
# Docker Compose
services:
  nodetool:
    mem_limit: 8g
    cpus: 4
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
```

# 自托管: SSH

```yaml
deployments:
  my-ssh:
    type: ssh
    host: 192.168.1.11
    ssh:
      user: ubuntu
      key_path: ~/.ssh/id_rsa
    port: 8000
    service_name: nodetool-8000
    paths:
      workspace: /home/ubuntu/nodetool
      hf_cache: /home/ubuntu/.cache/huggingface
```

# 自托管: 本地

```yaml
deployments:
  my-local:
    type: local
    host: localhost
    port: 8000
    paths:
      workspace: /home/me/.nodetool-workspace
      hf_cache: /home/me/.cache/huggingface/hub
```

# RunPod(无服务器 GPU)

```bash
export RUNPOD_API_KEY="your-key"
nodetool deploy add my-runpod --type runpod
nodetool deploy apply my-runpod
```

配置字段: `template_id`、`endpoint_id`、`compute_type`、`gpu_types`、`gpu_count`、`workers_min`、`workers_max`、`env`

# GCP Cloud Run

```bash
gcloud auth login
nodetool deploy add my-gcp --type gcp
nodetool deploy apply my-gcp
```

配置字段: `service_name`、`region`、`registry`、`cpu`、`memory`、`gpu_type`、`gpu_count`、`min_instances`、`max_instances`、`concurrency`、`timeout`

# Supabase 集成

```bash
# Environment variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
ASSET_BUCKET=assets
ASSET_TEMP_BUCKET=assets-temp
AUTH_PROVIDER=supabase
```

**配置步骤:**
1. 创建 Supabase 项目
2. 创建存储桶: `assets`、`assets-temp`
3. 设置桶策略(公开或签名 URL)
4. 复制 service-role 密钥(不是 anon 密钥)
5. 设置环境变量

# 服务器启动

```bash
# Development
nodetool serve --host 127.0.0.1 --port 7777

# Production
nodetool serve --host 0.0.0.0 --port 7777

# Custom port
nodetool serve --port 8080

# From a NodeTool checkout, against the TypeScript sources
npm run build:packages && npm run dev:server
# Or directly:
PORT=7777 HOST=0.0.0.0 node packages/websocket/dist/server.js
```

# 工作流同步

```bash
nodetool deploy workflows sync <deployment> <workflow-id>
nodetool deploy workflows list <deployment>
nodetool deploy workflows run <deployment> <workflow-id>
```

# 生产检查单

- [ ] 设 `NODETOOL_ENV=production`
- [ ] 设强随机 `SECRETS_MASTER_KEY`
- [ ] 设 `ADMIN_TOKEN`
- [ ] 配好 `AUTH_PROVIDER`(生产绝不用 `none`)
- [ ] 用静态鉴权时设好 `SERVER_AUTH_TOKEN`
- [ ] 为需要的服务商配好 API 密钥
- [ ] 设资源限制(内存、CPU、GPU)
- [ ] 为工作区与模型缓存挂持久卷
- [ ] 配健康监控(`GET /health`、`GET /ready`)
- [ ] 配日志(`NODETOOL_LOG_LEVEL=info`)
- [ ] 为 `DB_PATH` 配备份

# 常见坑

- **Supabase 用了 anon 密钥**: 要用 service-role 密钥,不是 anon 密钥
- **没挂持久卷**: 没有 `-v` 挂载,容器重启数据就丢
- **端口冲突**: 确认 7777 上没有别的进程
- **缺 SECRETS_MASTER_KEY**: 生产的加密密钥存储必需
- **生产环境 AUTH_PROVIDER=none**: 安全风险,一律用 static 或 supabase
- **HF 缓存没挂载**: 每次容器启动都重新下载模型
