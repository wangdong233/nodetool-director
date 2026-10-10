# 构建 NodeTool 小程序

小程序是罩在一到多个工作流上的一块界面: 绑到 Input 与 Output 节点的控件、一个运行触发器,以及保存小程序记忆的变量。图还是图。小程序是第二份文档(`ApplicationDocument`),按名字引用它。

用户想要一个能点的东西时用本技能。交付物是图本身时用 `nodetool-workflow-builder`,并且先在那里把图修好: 压在坏工作流上的小程序只会报成小程序坏了。

## 工作流决定小程序能做什么

摆控件之前,先确认被绑定的工作流满足以下四条。每一条都是小程序表面绕不过去的接线失败。

1. 用户会改的任何东西都要有 **Input 节点**。例外是节点设置,经 `op:<id>/prop:<nodeId>#<prop>` 绑定触达。
2. 用户会看的任何东西都要有 **Output 节点**。结尾没有 Output 节点的图产不出任何小程序能显示的东西。
3. 每个输入都要有默认值,让首次运行一键可跑。
4. 先单独把工作流跑通(`nodetool debug` 或 `run_workflow`)。

## 主循环

1. **找到或创建小程序。** `list_apps`,然后 `get_app`。新建: `create_app {name, description, project_id?, from_workflow_id?}`。`from_workflow_id` 会绑好第一个操作,控件一落位立刻就有东西可跑。
2. **读编辑器。** `edit_app {application_id, steps: []}` 不带步骤时返回工具目录与小程序当前状态。会话里的第一次编辑之前先做这一步,别猜 schema。
3. **声明操作。** 一个操作就是一个工作流加它的接线(`ui_app_add_operation`)。有多种模式的小程序就有多个操作,各自持有自己的状态。
4. **读可绑定面。** `ui_app_get_binding_targets` 列出存在的输入、输出、节点设置与变量。绑定指向节点 **id**,所以在图编辑器里改名永远不会弄坏小程序。绝不凭空捏造绑定字符串。
5. **摆放并接线控件。** `ui_app_add_component` / `ui_app_update_component`,小程序要记住的东西再加 `ui_app_declare_variable`,要读或改的文档加 `ui_app_add_resource`。控件目录、绑定形式、动作、条件与格式过滤器见下方**小程序契约**。
6. **检查接线。** `debug_app {application_id, run: false}`。免费、即时,而且只有它能抓到指向空处的绑定。每轮编辑后都跑。
7. **运行。** `debug_app {application_id, interact: [...]}` 执行真实工作流、花真钱。跑它是为了确认小程序能用,不是拿来探索。长运行要几分钟: 传 `poll: true` 拿会话 id,然后轮询 `GET /api/debug/sessions/<id>` 到落定。
8. **报告**小程序 id、它的操作与 verdict。仅凭一次 `run: false` 检查不能声称小程序可用。

`edit_app` 按顺序对已保存文档执行步骤,最后一次性写盘。传 `base_updated_at` 可在文档在底下被改过时拒绝保存。小程序在浏览器里打开时,同一批工具可直接以 `ui_app_*` 对着活文档调用。

## 四种与图无关的 verdict 失败

`debug_app` 会报出这些,每一种都是应用层的错误,各有固定修法。

| Verdict | 含义 | 修法 |
|---|---|---|
| 绑定引用了不存在的输入/输出/变量 | 控件指向工作流已不再有的节点 | 重读 `ui_app_get_binding_targets` 重新绑定 |
| 没有运行触发器 | 界面上没有任何东西能启动操作 | 加一个带 `run` 动作的 Button,或一个 change 事件 |
| 显示控件始终收不到值 | 绑定的输出在一次完成的运行里没产出东西 | 检查图里 Output 节点是否连上 |
| 输出映射到未声明的变量 | 某个操作写一个不存在的变量 | 先 `ui_app_declare_variable` |

## 三种只坑真用户的警告

结构检查全过,小程序照样在使用者手里翻车。交付前先修掉这些。

- **运行按钮没在 `op:<id>/exec#running` 上配 `disabledWhen`。** 没有策略拦下第二次点击,用户就在亲手制造竞态: 按操作的并发规则,这次运行会被取消重启、堆叠,或并排再起一个。
- **某个操作没有东西绑到 `exec#error`。** 运行失败而小程序看起来闲着。把 Text 或 Markdown 控件绑到错误字段上。
- **媒体输入控件没有默认值,又坐在无守卫的运行触发器后面。** Image、Sketch Pad、Camera Capture、Audio、Audio Recorder、Video 与 Document 都允许输入空着就开跑——那是一通用户还没来得及填就要付钱的调用。用 `notEmpty` 条件守住触发器。Workflow Form 豁免: 它会渲染所属操作的全部输入,不存在需要守卫的单一绑定。

## 无头检查模拟不到什么

布局、样式、焦点与滚动。已存的资源集合: 运行从不读数据库,所以要以 `{"seedResource": {"id": "<binding>", "items": [...]}}` 作为一步交互,或在 `params` 里给一个 `resource:<binding>` 键来播种。`openResource` 没有可打开的编辑器。报告把这一切列在 `notSimulated` 下——报告绿灯之前先读它。

## 交付

- `nodetool apps export-bundle <id> -o my.app.json` 把小程序连同它绑定的每个工作流的完整图打包。`apps import-bundle` 把两者都重建,并把 bundle 内部的工作流键改写成真实 id。
- **发布**取快照: 把当前界面存为一个版本,并锁定小程序运行的每个工作流的当前图,让已发布的小程序在草稿继续演进时保持可用。消费上限封住它最多花多少,每次运行都计入(tRPC 上的 `applications.publish`、`released`、`budget`、`usage`)。
- 随产品附带的示例: `GET /api/applications/examples`,用 `POST /api/applications/examples/:slug/install` 安装。
- `nodetool app build "<prompt>" -p <provider> -m <model>` 跑完 spec → plan → author → check → run → judge 整个循环并产出一个经过验证的 bundle。它是面向 CLI 与评测套件的批量构建。**不存在 `build_app` 智能体工具**: 智能体像人一样用 `create_app`、`edit_app` 与 `debug_app` 搭小程序。

## 参考

下方**小程序契约**承载控件、绑定、动作、条件、格式过滤器与文档形状。

在 NodeTool checkout 里,这些仓库源码走得更远:

- `docs/mini-apps-guide.md` —— 十一个实操配方,从一次性表单到聊天小程序。
- `docs/mini-apps-reference.md` —— 每个控件与设置的完整定义。
- `docs/harnesses.md` § nodetool app debug —— 该 harness、它的 bundle 布局与构建循环。

## 小程序契约

小程序由这些零件装配而成。checkout 里的
`docs/mini-apps-reference.md` 载有每个控件与设置的完整定义。

### 工具

每个工具都收 `application_id`。绝不接受工作流 id: 小程序运行的工作流由其操作上的 `target_workflow_id` 命名。

| 区域 | 工具 |
|---|---|
| 布局 | `ui_app_get_snapshot`、`ui_app_list_component_types`、`ui_app_add_component`、`ui_app_update_component`、`ui_app_remove_component`、`ui_app_select_component`、`ui_app_set_title` |
| 操作 | `ui_app_list_operations`、`ui_app_add_operation`、`ui_app_update_operation`、`ui_app_remove_operation` |
| 变量 | `ui_app_list_variables`、`ui_app_declare_variable`、`ui_app_update_variable`、`ui_app_remove_variable` |
| 资源 | `ui_app_list_resources`、`ui_app_add_resource`、`ui_app_remove_resource` |
| 绑定 | `ui_app_get_binding_targets` |

无头模式下,每一样都是 `edit_app {application_id, steps: [{tool, input}]}` 里的一步。步骤里 `ui_app_` 前缀可省。小程序在浏览器里打开时可直接调用。

### 绑定

| 绑定 | 指向 |
|---|---|
| `op:<opId>/in:<nodeId>` | 小程序某个工作流的一个输入 |
| `op:<opId>/out:<nodeId>` | 小程序某个工作流的一个输出 |
| `op:<opId>/prop:<nodeId>#<prop>` | 由控件驱动的节点设置 |
| `op:<opId>/exec#<field>` | 运行状态: `running`、`progress`、`error`、`activity` |
| `var:<variableId>` | 小程序记住的一个值 |
| `view:<componentId>#<prop>` | 归单个控件所有的状态,永不保存 |

两种旧式写法仍可解析: 作用于默认操作的 `node:<nodeId>#<prop>`,以及在活图里按裸名查找。匹配不到名字是错误,不是静默空操作。新东西一律用 id 形式。

### 动作

一个控件事件触发一个动作。没有写代码的地方。

| 动作 | 设置 |
|---|---|
| `run` | `operationId` |
| `cancel` | `operationId`,可选 `invocationId` |
| `setVariable` | `variableId`,加一个 `value` 或控件自身的值 |
| `toggleVariable` | `variableId` |
| `resourceCommand` | `resourceBindingId`、`command`: `read`、`create`、`update`、`delete`、`upload` |
| `openResource` | `resourceBindingId` |

事件在 `click`(按钮)或 `change`(用户编辑的一切控件)上触发。change 事件有节奏: `live`、`release`(仅在会提交的控件上)或 `debounce`。

### 条件

`visibleWhen` 与 `disabledWhen` 各持有一个绑定、一个运算符和一个按文本书写再转换匹配的比较值。运算符: `notEmpty`、`empty`、`eq`、`neq`、`gt`、`gte`、`lt`、`lte`、`contains`。绑定指向空处的条件视同没有条件,所以坏接线永远不会把控件悄悄藏起来。

### 格式模板

`format` 替换 `{binding}` 记号,可选再过一道过滤器:
`{op:main/out:n1|truncate:80}`。过滤器: `number`、`date`、`upper`、`lower`、
`join`、`truncate`。未知过滤器或死绑定渲染为空。

### 控件

**展示用:** Heading、Text、Markdown(流式正文的首选)、Image、Audio、Video、Sketch、Timeline、JSON、Table、Output、Progress、Gallery、Image Compare。

Sketch 与 Timeline 收文档引用,`{type: "sketch", id}` 或
`{type: "timeline", id}`,正是产出它们的节点所发射的形态。把它绑到 Image 或 Video 上什么也不显示: 引用不是媒体 URL。

**收输入:** Workflow Form、Workflow Input、Text Input、Number Input、Slider、Switch、Select、Image Input、Sketch Pad、Audio Input、Audio Recorder、Video Input、Camera Capture、Document Input、Color Input、Resource Picker、Resource Gallery、Storyboard Scenes。

Workflow Form 按图顺序渲染某个操作的全部输入,所以后加的 Input 节点不用改小程序就会自己出现。布局讲究时逐个摆放输入。Audio Recorder 与 Camera Capture 写出的就是上传会写的同款 `{type, uri, asset_id}` 引用。Sketch Pad 把每一笔压平成一张以内联 data URI 传输的 PNG,所以守住它 512×384 的默认值,别顶到 2048px 上限。

**聊天:** Chat Thread(`binding` 是对话本体,`streamBinding` 是当前运行正在抵达的回复)、Chat Composer、Model Select。线程把落定的回复折叠进对话变量——只有当 `binding` 是变量且 `streamBinding` 是输出时才会发生。

**按钮与布局:** Button、Panel、Columns(`left` 与 `right` 两个槽位)、Divider。

### 文档形状

```ts
interface ApplicationDocument {
  schemaVersion: number;      // 3
  ui: PuckData;               // { root, content, zones }
  operations: OperationBinding[];
  resources: ResourceBinding[];
  variables: VariableDeclaration[];
  theme?: { id: string };
}
```

资源是小程序可读或可改的真实文档的句柄:
`{id, name, kind: "asset" | "timeline" | "storyboard" | "sketch", scope, operations}`。

bundle 是小程序加上它运行的每个工作流的完整图,其中每个操作的
`workflowId` 先持有一个 bundle 内部键,导入时换成的真实 id。

### 运行时状态,按键分组

| 组 | 键 | 存什么 |
|---|---|---|
| `inputs` | `opId:nodeId` 或 `opId:nodeId#prop` | `{value, dirty, revision}` |
| `outputs` | `opId:nodeId` | `{value, invocationId, status, revision}` |
| `variables` | 变量 id | 当前值 |
| `view` | `componentId:prop` | 单个控件自身的状态 |
| `invocations` | 任务 id | `{id, operationId, status, progress, error, startedAt}` |

输出状态为 `empty`、`pending`、`streaming` 或 `done`。流式值会累积: 文本拼接,结构化条目收进列表。输出槽在每次运行开始时清空。
