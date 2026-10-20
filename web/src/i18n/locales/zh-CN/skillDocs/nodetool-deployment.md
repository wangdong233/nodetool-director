你帮用户把 NodeTool 跑在桌面以外的任何地方。下面的每条命令都在用户的 shell 里运行。产品内 agent 没有 shell 也没有部署工具,它讲解步骤,把运行留给用户。

# 选哪个

| 需求 | 用 |
|------|-----|
| 一个长期运行、别人连进来的服务器 | Docker:仓库里的 `docker-compose.yml`,或对远程宿主走 SSH 的 `nodetool deploy` |
| 一块按分钟计费、用户的 NodeTool 主动连出去的租用 GPU | Runpod 或 Vast 上的 `nodetool worker` |

`nodetool deploy` 只支持一种目标类型 `docker`。没有 SSH-service、Runpod-endpoint 或 Cloud Run 部署类型。Runpod 和 Vast 走 `nodetool worker`。

# 服务器鉴权

服务器只凭 `SUPABASE_URL` 和 `SUPABASE_KEY` 决定鉴权模式,既不读 `AUTH_PROVIDER` 也不读 `NODETOOL_SERVER_MODE`。

| 模式 | 开启条件 | 接受的凭证 |
|------|------------|----------------------|
| Local | 默认,Supabase 变量未设 | 回环连接以用户 `"1"` 运行、免令牌。`NODETOOL_TRUST_LOCALHOST=false` 关掉它。`NODETOOL_TRUST_LOCAL_NETWORKS` 里的来源(逗号分隔的 CIDR)同样以用户 `"1"` 免令牌运行。等于 `SERVER_AUTH_TOKEN` 的 bearer 以用户 `"1"` 运行。`nodetool deploy users-add` 签发的令牌以该 API 用户运行。其余一律 `401`。 |
| Supabase | `SUPABASE_URL` 和 `SUPABASE_KEY` 都已设 | 每个非公开请求都要有效的 Supabase JWT。`SERVER_AUTH_TOKEN`、`NODETOOL_TRUST_LOCAL_NETWORKS` 和 API 用户令牌被忽略。回环只在 `NODETOOL_TRUST_LOCALHOST=true` 时受信。 |

两种模式下,在 **Settings → MCP → Connect an agent remotely** 创建的访问令牌(`ntk_…`)以创建者的身份鉴权。令牌以 `Authorization: Bearer <token>` 发送。无法设置请求头的 WebSocket 客户端在 `/ws` URL 上传 `?api_key=<token>`。

Docker 会 NAT 发布端口的连接,来源是网桥网关而非回环。Local 模式下这意味着 `401`,直到该来源网段进入 `NODETOOL_TRUST_LOCAL_NETWORKS` 或客户端带上令牌。列出的每个网段都以用户 `"1"` 免密运行,所以只列你控制的网络。要被别人从公网访问的服务器用 Supabase 模式,并设上 `SUPABASE_ANON_KEY`,否则网页登录页用不了。

# Docker Compose(单机)

仓库里的 `docker-compose.yml` 是参考自托管配置。

```bash
cp .env.example .env          # 填入你用的服务商密钥
docker compose up -d          # 服务在 http://localhost:17777
```

- 它以 Local 模式运行,默认信任 Docker 网桥网段(`172.16.0.0/12,192.168.65.0/24`)。笔记本、局域网或 VPN 上安全。把端口公开前,在 `.env` 里设 `SUPABASE_URL`、`SUPABASE_KEY` 和 `SUPABASE_ANON_KEY`。
- 所有状态(数据库、资产、向量库、模型缓存、生成的密钥)都在 `nodetool-data` 卷的 `/workspace` 下。
- `NODETOOL_PORT` 改宿主端口。`NODETOOL_VERSION` 钉住镜像标签。

# `nodetool deploy`(远程 Docker 宿主)

`deployment.yaml` 在用户配置目录里,不在工作目录。用 `nodetool deploy edit` 打开,别猜路径。

```bash
nodetool deploy init                         # 创建 deployment.yaml
nodetool deploy add my-server --type docker  # 描述一个目标
nodetool deploy plan my-server               # 动宿主之前先审阅
nodetool deploy apply my-server              # --dry-run 只打印步骤
nodetool deploy status my-server
nodetool deploy logs my-server --follow --tail 200
nodetool deploy list                         # 每个目标的实时状态
nodetool deploy show my-server               # 只看配置,无远程调用
nodetool deploy destroy my-server            # --force 跳过确认
```

```yaml
deployments:
  my-server:
    type: docker
    host: 192.168.1.10        # localhost 跳过 SSH,用本地 Docker
    ssh:
      user: ubuntu
      key_path: ~/.ssh/id_ed25519
    image:
      name: ghcr.io/nodetool-ai/nodetool
      tag: latest
    container:
      name: nodetool-server
      port: 8000              # 宿主端口
      gpu: "0"                # GPU 设备 id,或省略
      environment:            # 额外环境变量,如 SUPABASE_URL、服务商密钥
        OPENAI_API_KEY: "..."
    paths:
      workspace: ~/nodetool_data/workspace
      hf_cache: ~/nodetool_data/hf-cache
```

CLI 会为缺少它们的目标把生成的 `server_auth_token` 和 `container.environment.SECRETS_MASTER_KEY` 写进 `deployment.yaml`。`apply` 以该令牌作 `SERVER_AUTH_TOKEN` 启动容器,所以 Local 模式下客户端用 `Authorization: Bearer <server_auth_token>` 鉴权。容器的数据库、资产、向量库和 API 用户都在 `/workspace` 下。

## 远程工作流与 API 用户

这些动词发送管理员 bearer 令牌:`--token <token>`,否则 `NODETOOL_ADMIN_TOKEN`,否则交互式提示。

```bash
nodetool deploy workflows sync my-server <workflow_id>   # 资产和模型必须已就位
nodetool deploy workflows list my-server
nodetool deploy workflows run my-server <workflow_id> -p prompt="a red fox"
nodetool deploy workflows delete my-server <workflow_id>

nodetool deploy users-add my-server alice --role admin   # 打印 alice 的令牌
nodetool deploy users-list my-server
nodetool deploy users-reset-token my-server alice
nodetool deploy users-remove my-server alice
```

API 用户令牌只在 Local 模式有效(§ 服务器鉴权)。

# `nodetool worker`(租用 GPU)

worker 是一台 Runpod 或 Vast 实例,供用户的 NodeTool 接入跑 GPU 节点。按分钟计费,直到停止。创建前与用户确认 GPU 型号和预计时长,并总是设自动停止保护。

先存服务商密钥:`nodetool secrets store RUNPOD_API_KEY`(或 `VAST_API_KEY`)。

```bash
nodetool worker profile add hf-a40 --target runpod \
  --image ghcr.io/nodetool-ai/nodetool-worker:latest \
  --gpu "NVIDIA A40" --idle-timeout 15 --max-lifetime 240
nodetool worker create --profile hf-a40 --attach

nodetool worker list
nodetool worker status <instance-id>
nodetool worker stop <instance-id>     # 或 --all
```

- `--idle-timeout <minutes>` 停掉闲置的 worker;`--max-lifetime <minutes>` 是硬上限。两个都设,忘掉的 worker 会一直计费。
- `--disk <gb>` 决定放模型缓存的持久卷大小(默认 100)。`--ssh-key <path.pub>` 开 SSH 供调试。
- `--attach` 打印 `NODETOOL_WORKER_URL`。另一个 shell 里,export `NODETOOL_WORKER_TOKEN=$(nodetool worker token <instance-id>)`。
- `nodetool worker models download --repo-id <owner/name>` 在运行前把权重拉到已接入的 worker 上,首次运行就不用为下载付 GPU 时间。`models list` 和 `models delete` 管理缓存。

# 环境变量

| 变量 | 用途 |
|----------|---------|
| `SUPABASE_URL`、`SUPABASE_KEY` | 开启 Supabase 模式。`SUPABASE_KEY` 是 service-role 密钥 |
| `SUPABASE_ANON_KEY` | 登录页用的公钥。没有它没人能登录 |
| `SECRETS_MASTER_KEY` | 加密存储的密钥。显式设置(`openssl rand -base64 32`)。丢了它所有已存密钥不可读 |
| `NODETOOL_TRUST_LOCAL_NETWORKS` | 仅 Local 模式:以用户 `"1"` 免令牌运行的 CIDR |
| `NODETOOL_TRUST_LOCALHOST` | 覆盖回环是否免鉴权 |
| `NODETOOL_ENABLE_MCP=1` | 在生产服务器上服务 `/mcp` |
| `NODETOOL_STORAGE_BACKEND` | `file`(默认)、`s3` 或 `supabase`,配 `ASSET_BUCKET` 与 `TEMP_BUCKET` |
| `DB_PATH`、`ASSET_FOLDER`、`VECTORSTORE_DB_PATH`、`HF_HOME` | 放在持久卷上 |
| `HOST`、`PORT` | 绑定地址。镜像绑定 `0.0.0.0` |
| `NODETOOL_LOG_LEVEL` | 日志级别,默认 `info` |
| 服务商密钥 | 按需 `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GEMINI_API_KEY`、`HF_TOKEN`、`FAL_API_KEY` |

镜像已设 `NODETOOL_ENV=production`。生产模式关掉 Python 桥、文件浏览器和 `/mcp`(除非显式开启),只加载允许清单上的节点包。桌面或开发安装不要设它。

# 直接运行服务器

```bash
nodetool serve                          # 127.0.0.1:7777
nodetool serve --host 0.0.0.0 --port 8080
```

健康检查:`GET /health`(存活,免鉴权)和 `GET /ready`。

# 常见坑

- **UI 能加载但 Docker 里每个 API 调用都 `401`**:发布端口来自网桥网关。把网桥网段加进 `NODETOOL_TRUST_LOCAL_NETWORKS`,或发令牌。
- **加了 Supabase 后 `SERVER_AUTH_TOKEN` 或 `NODETOOL_TRUST_LOCAL_NETWORKS` 失效**:Supabase 模式忽略两者。客户端必须登录或用访问令牌。
- **`SUPABASE_KEY` 里放了 anon key**:服务器在那里要 service-role 密钥。
- **没有持久卷**:容器重建时数据库、资产和密钥键全部消失。
- **worker 忘了关**:`nodetool worker list`,然后 `nodetool worker stop --all`。
