/**
 * Tutorials shown on the Tutorials page and the logo menu. Each is a
 * pre-rendered MP4 + poster produced by the Remotion harness in `demo/`, and
 * the videos stream from the
 * documentation site, which serves the same files to
 * [its own Tutorials page](https://docs.nodetool.ai/tutorials), while the
 * posters ship with the app.
 *
 * The split is not only about size. Posters render on every card the moment a
 * page opens, so a poster that depends on a deploy of another site is broken;
 * a video is requested only when someone presses play.
 */
import { DOCS_BASE_URL } from "../../config/docsLinks";
import { i18n } from "../../i18n";

/** A video, streamed from the docs site rather than bundled. */
const tutorialVideo = (file: string): string =>
  `${DOCS_BASE_URL}/assets/tutorials/${file}`;

/** A poster, served by the app itself from `web/public/tutorials/`. */
const tutorialPoster = (file: string): string => `/tutorials/${file}`;
export interface Tutorial {
  resultKey?: string;
  taskKey?: string;
  startingStateKey?: string;
  descriptionKey?: string;
  /** i18n keys for the learn-by-example bullets, when the tutorial has them. */
  learnKeys?: string[];
  taglineKey?: string;
  titleKey?: string;
  /** Stable id, used in the `/tutorials?id=` query param. */
  id: string;
  title: string;
  /** One-line hook shown under the title. */
  tagline: string;
  /** A sentence or two describing what the tutorial covers. */
  description: string;
  /** Difficulty badge text. */
  level: string;
  /** Human-readable runtime, e.g. "0:23". */
  durationLabel: string;
  /** Absolute URL of the rendered video, streamed from the docs site. */
  video: string;
  /** App-served path of the poster still. */
  poster: string;
  /** Accent colour (hex) used for the card and play button. */
  accent: string;
  /** Bullet points: what the viewer will learn. */
  learn: string[];
  /** The surface and state the learner should open after watching. */
  startingState?: string;
  /** The concrete action the learner should take. */
  task?: string;
  /** The observable outcome that confirms the task worked. */
  result?: string;
  /** Existing app entry point for trying the task. */
  launch?: TutorialLaunch;
}

export type TutorialLaunch =
  | { kind: "guided-flow"; flow: "image" | "script" | "storyboard" | "video" | "workflow" }
  | { kind: "chat" }
  | { kind: "examples" };

export const TUTORIALS: Tutorial[] = [
  {
    id: "sketch-assistant",
    title: "Edit a sketch by asking", titleKey: "tools:tutorials.sketch-assistant.title",
    tagline: "Sketch editor · the assistant paints the layer", taglineKey: "tools:tutorials.sketch-assistant.tagline",
    description:
      i18n.t("tools:tutorials.sketch-assistant.description", { defaultValue: "Say what you want changed and the assistant works the real layer tools: it adds the layer, sets the blend mode, and dials in opacity while you watch the panel update." }), descriptionKey: "tools:tutorials.sketch-assistant.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:19",
    video: tutorialVideo("sketch-assistant.mp4"),
    poster: tutorialPoster("sketch-assistant.jpg"),
    accent: "#d946ef",
    learn: [
      "Asking for an edit against the layer stack you already have",
      "Watching layers appear in the panel as the assistant works",
      "Taking over by hand — every edit stays yours to change",
    ],
    learnKeys: ["tools:tutorials.sketch-assistant.learn0", "tools:tutorials.sketch-assistant.learn1", "tools:tutorials.sketch-assistant.learn2"],
    startingState: "A new sketch with a blank layer stack.", startingStateKey: "tools:tutorials.sketch-assistant.startingState",
    task: "Ask the assistant to add a soft wash layer and set its blend mode and opacity.", taskKey: "tools:tutorials.sketch-assistant.task",
    result: "The wash layer appears in the layer panel with the requested blend mode and opacity.", resultKey: "tools:tutorials.sketch-assistant.result",
    launch: { kind: "guided-flow", flow: "image" },
  },
  {
    id: "script-assistant",
    title: "Write and voice a script", titleKey: "tools:tutorials.script-assistant.title",
    tagline: "Script editor · cast, lines, takes", taglineKey: "tools:tutorials.script-assistant.tagline",
    description:
      i18n.t("tools:tutorials.script-assistant.description", { defaultValue: "From a blank page to voiced audio in one ask: the assistant casts the speakers, writes their lines, then synthesizes a take for each one." }), descriptionKey: "tools:tutorials.script-assistant.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:22",
    video: tutorialVideo("script-assistant.mp4"),
    poster: tutorialPoster("script-assistant.jpg"),
    accent: "#0ea5e9",
    learn: [
      "Describing a script by length, voices, and tone",
      "How speakers are cast before any line is written",
      "Voicing lines into takes you can swap or re-record",
    ],
    learnKeys: ["tools:tutorials.script-assistant.learn0", "tools:tutorials.script-assistant.learn1", "tools:tutorials.script-assistant.learn2"],
    startingState: "A new script with no cast or dialogue.", startingStateKey: "tools:tutorials.script-assistant.startingState",
    task: "Ask the assistant for a short two-speaker script, then have it voice the lines.", taskKey: "tools:tutorials.script-assistant.task",
    result: "The script contains cast speakers, written lines, and an audio take for each speaker.", resultKey: "tools:tutorials.script-assistant.result",
    launch: { kind: "guided-flow", flow: "script" },
  },
  {
    id: "storyboard-assistant",
    title: "Board a shot list", titleKey: "tools:tutorials.storyboard-assistant.title",
    tagline: "Storyboard · direction, then stills", taglineKey: "tools:tutorials.storyboard-assistant.tagline",
    description:
      i18n.t("tools:tutorials.storyboard-assistant.description", { defaultValue: "Describe the piece and the assistant writes the shots — camera and all — before spending a frame. Approve the board, then the stills render shot by shot." }), descriptionKey: "tools:tutorials.storyboard-assistant.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:34",
    video: tutorialVideo("storyboard-assistant.mp4"),
    poster: tutorialPoster("storyboard-assistant.jpg"),
    accent: "#ef4444",
    learn: [
      "Getting a shot list before any image is generated",
      "Revising a shot while it is still free to change",
      "Rendering stills across the board in one call",
    ],
    learnKeys: ["tools:tutorials.storyboard-assistant.learn0", "tools:tutorials.storyboard-assistant.learn1", "tools:tutorials.storyboard-assistant.learn2"],
    startingState: "A new storyboard with an empty shot list.", startingStateKey: "tools:tutorials.storyboard-assistant.startingState",
    task: "Describe a short piece, review the generated shot list, and approve it for rendering.", taskKey: "tools:tutorials.storyboard-assistant.task",
    result: "The board contains an approved shot list with a rendered still for each shot.", resultKey: "tools:tutorials.storyboard-assistant.result",
    launch: { kind: "guided-flow", flow: "storyboard" },
  },
  {
    id: "app-assistant",
    title: "Build a mini app", titleKey: "tools:tutorials.app-assistant.title",
    tagline: "App builder · operation, setting, widgets", taglineKey: "tools:tutorials.app-assistant.tagline",
    description:
      i18n.t("tools:tutorials.app-assistant.description", { defaultValue: "Describe an app in a sentence — an input, a button, an answer — and the assistant binds the workflow as an operation and places each widget against something the app declares." }), descriptionKey: "tools:tutorials.app-assistant.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:23",
    video: tutorialVideo("app-assistant.mp4"),
    poster: tutorialPoster("app-assistant.jpg"),
    accent: "#6366f1",
    learn: [
      "Turning a workflow into an app anyone can run",
      "Saving a value as a setting that persists between sessions",
      "Binding widgets to inputs, outputs, and variables",
    ],
    learnKeys: ["tools:tutorials.app-assistant.learn0", "tools:tutorials.app-assistant.learn1", "tools:tutorials.app-assistant.learn2"],
    startingState: "The Examples page with the mini-app gallery ready to browse.", startingStateKey: "tools:tutorials.app-assistant.startingState",
    task: "Open a mini app, provide its input, and run it once from the app surface.", taskKey: "tools:tutorials.app-assistant.task",
    result: "The app displays a completed answer and its input/output widgets remain bound.", resultKey: "tools:tutorials.app-assistant.result",
    launch: { kind: "examples" },
  },
  {
    id: "jsscript-assistant",
    title: "Write a JS script", titleKey: "tools:tutorials.jsscript-assistant.title",
    tagline: "JS scripts · ports, body, saved test", taglineKey: "tools:tutorials.jsscript-assistant.tagline",
    description:
      i18n.t("tools:tutorials.jsscript-assistant.description", { defaultValue: "Say what goes in and what should come out. The assistant declares the ports first, writes the body, and saves a test case that grades it in the sandbox." }), descriptionKey: "tools:tutorials.jsscript-assistant.description",
    level: i18n.t("tools:tutorials.level.Intermediate", { defaultValue: "Intermediate" }),
    durationLabel: "0:30",
    video: tutorialVideo("jsscript-assistant.mp4"),
    poster: tutorialPoster("jsscript-assistant.jpg"),
    accent: "#84cc16",
    learn: [
      "Declaring ports as the script's contract",
      "Reading a body that runs sandboxed — no filesystem access",
      "Keeping a saved case that catches the next breaking edit",
    ],
    learnKeys: ["tools:tutorials.jsscript-assistant.learn0", "tools:tutorials.jsscript-assistant.learn1", "tools:tutorials.jsscript-assistant.learn2"],
  },
  {
    id: "sketch-correction",
    title: "Correct it without starting over", titleKey: "tools:tutorials.sketch-correction.title",
    tagline: "Sketch editor · the second ask amends the first", taglineKey: "tools:tutorials.sketch-correction.tagline",
    description:
      i18n.t("tools:tutorials.sketch-correction.description", { defaultValue: "The wash comes back too strong. Saying so in the next message edits the layer that is already there — the stack stays the same size and nothing is regenerated." }), descriptionKey: "tools:tutorials.sketch-correction.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:25",
    video: tutorialVideo("sketch-correction.mp4"),
    poster: tutorialPoster("sketch-correction.jpg"),
    accent: "#2563eb",
    learn: [
      "Correcting a result instead of starting the ask again",
      "Reading which tool call the correction actually ran",
      "Taking the last step yourself with the panel controls",
    ],
    learnKeys: ["tools:tutorials.sketch-correction.learn0", "tools:tutorials.sketch-correction.learn1", "tools:tutorials.sketch-correction.learn2"],
    startingState: "A new sketch ready for an assistant-led edit.", startingStateKey: "tools:tutorials.sketch-correction.startingState",
    task: "Make one assistant edit, then ask it to reduce the effect without creating another layer.", taskKey: "tools:tutorials.sketch-correction.task",
    result: "The existing layer is amended in place and the layer count stays unchanged.", resultKey: "tools:tutorials.sketch-correction.result",
    launch: { kind: "guided-flow", flow: "image" },
  },
  {
    id: "storyboard-ask",
    title: "It asks before it spends", titleKey: "tools:tutorials.storyboard-ask.title",
    tagline: "Storyboard · a question, not a guess", taglineKey: "tools:tutorials.storyboard-ask.tagline",
    description:
      i18n.t("tools:tutorials.storyboard-ask.description", { defaultValue: "An under-specified brief gets a question back. The board stays empty and nothing renders while you decide, then your answer picks the format and the shot count." }), descriptionKey: "tools:tutorials.storyboard-ask.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:23",
    video: tutorialVideo("storyboard-ask.mp4"),
    poster: tutorialPoster("storyboard-ask.jpg"),
    accent: "#be123c",
    learn: [
      "Why an ambiguous brief comes back as a question",
      "What the assistant does while it waits on you: nothing",
      "Approving the spend once the shots read right",
    ],
    learnKeys: ["tools:tutorials.storyboard-ask.learn0", "tools:tutorials.storyboard-ask.learn1", "tools:tutorials.storyboard-ask.learn2"],
    startingState: "A new storyboard with no shots and no render started.", startingStateKey: "tools:tutorials.storyboard-ask.startingState",
    task: "Give the assistant an incomplete brief, answer its follow-up question, and approve the board.", taskKey: "tools:tutorials.storyboard-ask.task",
    result: "The assistant waits before spending, then creates the clarified shot list after your answer.", resultKey: "tools:tutorials.storyboard-ask.result",
    launch: { kind: "guided-flow", flow: "storyboard" },
  },
  {
    id: "jsscript-repair",
    title: "A test catches it", titleKey: "tools:tutorials.jsscript-repair.title",
    tagline: "JS scripts · red, then the repair, then green", taglineKey: "tools:tutorials.jsscript-repair.tagline",
    description:
      i18n.t("tools:tutorials.jsscript-repair.description", { defaultValue: "Name the edge case you do not trust. The assistant saves it as a test, runs it red with the reason in the open, repairs the body, and runs the same cases green." }), descriptionKey: "tools:tutorials.jsscript-repair.description",
    level: i18n.t("tools:tutorials.level.Intermediate", { defaultValue: "Intermediate" }),
    durationLabel: "0:35",
    video: tutorialVideo("jsscript-repair.mp4"),
    poster: tutorialPoster("jsscript-repair.jpg"),
    accent: "#0d9488",
    learn: [
      "Asking for the check before asking for the fix",
      "Reading a failing run instead of a summary of one",
      "Keeping the case saved so the next edit fails here first",
    ],
    learnKeys: ["tools:tutorials.jsscript-repair.learn0", "tools:tutorials.jsscript-repair.learn1", "tools:tutorials.jsscript-repair.learn2"],
  },
  {
    id: "chat-agent-qa",
    title: "Ask the chat agent", titleKey: "tools:tutorials.chat-agent-qa.title",
    tagline: "Global Chat · tool calls, streamed live", taglineKey: "tools:tutorials.chat-agent-qa.tagline",
    description:
      i18n.t("tools:tutorials.chat-agent-qa.description", { defaultValue: "A question goes straight to Global Chat: the agent calls a web-search tool in the open, then streams its answer back token by token." }), descriptionKey: "tools:tutorials.chat-agent-qa.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:25",
    video: tutorialVideo("chat-agent-qa.mp4"),
    poster: tutorialPoster("chat-agent-qa.jpg"),
    accent: "#06b6d4",
    learn: [
      "Sending a message from Global Chat",
      "Watching a tool call run in the open",
      "Reading a streamed answer as it arrives",
    ],
    learnKeys: ["tools:tutorials.chat-agent-qa.learn0", "tools:tutorials.chat-agent-qa.learn1", "tools:tutorials.chat-agent-qa.learn2"],
    startingState: "A new Global Chat conversation with an empty composer.", startingStateKey: "tools:tutorials.chat-agent-qa.startingState",
    task: "Ask a current-facts question that requires a web search.", taskKey: "tools:tutorials.chat-agent-qa.task",
    result: "The chat shows a web-search tool call followed by a streamed answer.", resultKey: "tools:tutorials.chat-agent-qa.result",
    launch: { kind: "chat" },
  },
  {
    id: "first-workflow",
    title: "Build your first workflow", titleKey: "tools:tutorials.first-workflow.title",
    tagline: "Text → enhance → image, end to end", taglineKey: "tools:tutorials.first-workflow.tagline",
    description:
      i18n.t("tools:tutorials.first-workflow.description", { defaultValue: "Watch a complete AI pipeline run on the canvas: a prompt is enhanced by an LLM, then turned into an image — all from connected nodes, no code." }), descriptionKey: "tools:tutorials.first-workflow.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:31",
    video: tutorialVideo("first-workflow.mp4"),
    poster: tutorialPoster("first-workflow.jpg"),
    accent: "#f59e0b",
    learn: [
      "How nodes pass data through their handles",
      "Reading live status: running rings, streaming text, progress",
      "Where generated outputs appear on the canvas",
    ],
    learnKeys: ["tools:tutorials.first-workflow.learn0", "tools:tutorials.first-workflow.learn1", "tools:tutorials.first-workflow.learn2"],
    startingState: "A new workflow in the guided workflow setup.", startingStateKey: "tools:tutorials.first-workflow.startingState",
    task: "Build a text-to-image graph with a text input, an enhancement step, and an image generator, then run it.", taskKey: "tools:tutorials.first-workflow.task",
    result: "The graph completes and the generated image appears on the canvas.", resultKey: "tools:tutorials.first-workflow.result",
    launch: { kind: "guided-flow", flow: "workflow" },
  },
  {
    id: "connect-run",
    title: "Connect & run", titleKey: "tools:tutorials.connect-run.title",
    tagline: "Follow a connected graph from input to output", taglineKey: "tools:tutorials.connect-run.tagline",
    description:
      i18n.t("tools:tutorials.connect-run.description", { defaultValue: "Trace the existing connections from a text input through Uppercase, watch the nodes execute, and read HELLO NODETOOL in Preview." }), descriptionKey: "tools:tutorials.connect-run.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:23",
    video: tutorialVideo("connect-run.mp4"),
    poster: tutorialPoster("connect-run.jpg"),
    accent: "#22c55e",
    learn: [
      "Inputs, outputs, and how handles connect",
      "Running a graph and watching nodes complete",
      "Finding a node's result in a Preview",
    ],
    learnKeys: ["tools:tutorials.connect-run.learn0", "tools:tutorials.connect-run.learn1", "tools:tutorials.connect-run.learn2"],
    startingState: "A new workflow canvas ready for a small connected graph.", startingStateKey: "tools:tutorials.connect-run.startingState",
    task: "Connect a text input to Uppercase and then to Preview, run it with hello nodetool, and inspect the output.", taskKey: "tools:tutorials.connect-run.task",
    result: "Preview shows HELLO NODETOOL and each connected node reports completion.", resultKey: "tools:tutorials.connect-run.result",
    launch: { kind: "guided-flow", flow: "workflow" },
  },
  {
    id: "list-generator",
    title: "Generate a list", titleKey: "tools:tutorials.list-generator.title",
    tagline: "One prompt, many results", taglineKey: "tools:tutorials.list-generator.tagline",
    description:
      i18n.t("tools:tutorials.list-generator.description", { defaultValue: "Turn a single topic into a structured list with one LLM node, then feed it downstream. The pattern behind batching, looping, and bulk generation." }), descriptionKey: "tools:tutorials.list-generator.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:26",
    video: tutorialVideo("list-generator.mp4"),
    poster: tutorialPoster("list-generator.jpg"),
    accent: "#8b5cf6",
    learn: [
      "Driving an LLM node from an input",
      "Streaming multi-item output as it arrives",
      "Passing a list into the rest of a workflow",
    ],
    learnKeys: ["tools:tutorials.list-generator.learn0", "tools:tutorials.list-generator.learn1", "tools:tutorials.list-generator.learn2"],
    startingState: "A new workflow canvas with no nodes connected.", startingStateKey: "tools:tutorials.list-generator.startingState",
    task: "Connect a topic input to a list-generating LLM node and run it for weekend trip ideas.", taskKey: "tools:tutorials.list-generator.task",
    result: "The output contains multiple list items that can be passed to a downstream node.", resultKey: "tools:tutorials.list-generator.result",
    launch: { kind: "guided-flow", flow: "workflow" },
  },
  {
    id: "ask-ai",
    title: "Ask the AI", titleKey: "tools:tutorials.ask-ai.title",
    tagline: "A question in, a streamed answer out", taglineKey: "tools:tutorials.ask-ai.tagline",
    description:
      i18n.t("tools:tutorials.ask-ai.description", { defaultValue: "The simplest chat-style graph: type a question, send it to an LLM node, and watch the answer stream in phrase by phrase before it lands in a Preview." }), descriptionKey: "tools:tutorials.ask-ai.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:24",
    video: tutorialVideo("ask-ai.mp4"),
    poster: tutorialPoster("ask-ai.jpg"),
    accent: "#06b6d4",
    learn: [
      "Feeding a question into an LLM node",
      "Watching an answer stream as it generates",
      "Reusing the answer downstream",
    ],
    learnKeys: ["tools:tutorials.ask-ai.learn0", "tools:tutorials.ask-ai.learn1", "tools:tutorials.ask-ai.learn2"],
    startingState: "A new workflow canvas with an empty input and output path.", startingStateKey: "tools:tutorials.ask-ai.startingState",
    task: "Connect a question input to an LLM node, ask for a short API explanation, and run it.", taskKey: "tools:tutorials.ask-ai.task",
    result: "The answer streams into the output and remains available to the next node.", resultKey: "tools:tutorials.ask-ai.result",
    launch: { kind: "guided-flow", flow: "workflow" },
  },
  {
    id: "combine-inputs",
    title: "Combine two inputs", titleKey: "tools:tutorials.combine-inputs.title",
    tagline: "Merge values with a template", taglineKey: "tools:tutorials.combine-inputs.tagline",
    description:
      i18n.t("tools:tutorials.combine-inputs.description", { defaultValue: "The first graph that branches in: two text inputs flow into one Prompt node that fills a template, composing a single result from reusable parts." }), descriptionKey: "tools:tutorials.combine-inputs.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:26",
    video: tutorialVideo("combine-inputs.mp4"),
    poster: tutorialPoster("combine-inputs.jpg"),
    accent: "#ec4899",
    learn: [
      "Wiring several inputs into one node",
      "Composing text with {{ placeholders }}",
      "Building prompts from reusable parts",
    ],
    learnKeys: ["tools:tutorials.combine-inputs.learn0", "tools:tutorials.combine-inputs.learn1", "tools:tutorials.combine-inputs.learn2"],
    startingState: "A new workflow canvas with two text inputs ready to connect.", startingStateKey: "tools:tutorials.combine-inputs.startingState",
    task: "Connect name and topic inputs to a template prompt, fill both values, and run it.", taskKey: "tools:tutorials.combine-inputs.task",
    result: "Preview shows the completed template with both input values substituted.", resultKey: "tools:tutorials.combine-inputs.result",
    launch: { kind: "guided-flow", flow: "workflow" },
  },
  {
    id: "summarize-text",
    title: "Summarize a document", titleKey: "tools:tutorials.summarize-text.title",
    tagline: "Long text in, key points out", taglineKey: "tools:tutorials.summarize-text.tagline",
    description:
      i18n.t("tools:tutorials.summarize-text.description", { defaultValue: "Condense an article, transcript, or any block of text into a short summary with a single Summarizer node, streaming it as it writes." }), descriptionKey: "tools:tutorials.summarize-text.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:26",
    video: tutorialVideo("summarize-text.mp4"),
    poster: tutorialPoster("summarize-text.jpg"),
    accent: "#14b8a6",
    learn: [
      "Feeding a long passage into a Summarizer node",
      "Watching the summary stream as it generates",
      "Passing the result into the rest of a workflow",
    ],
    learnKeys: ["tools:tutorials.summarize-text.learn0", "tools:tutorials.summarize-text.learn1", "tools:tutorials.summarize-text.learn2"],
    startingState: "A new workflow canvas with an empty text path.", startingStateKey: "tools:tutorials.summarize-text.startingState",
    task: "Feed a long passage into a Summarizer node, run it, and send the summary to Preview.", taskKey: "tools:tutorials.summarize-text.task",
    result: "Preview contains a shorter set of key points while the source remains available for comparison.", resultKey: "tools:tutorials.summarize-text.result",
    launch: { kind: "guided-flow", flow: "workflow" },
  },
  {
    id: "describe-image",
    title: "Describe an image", titleKey: "tools:tutorials.describe-image.title",
    tagline: "Show the AI a picture, get words back", taglineKey: "tools:tutorials.describe-image.tagline",
    description:
      i18n.t("tools:tutorials.describe-image.description", { defaultValue: "The first multimodal graph: drop a picture into an Image Input, wire it into an Agent, and watch the model look at the image and describe it in words." }), descriptionKey: "tools:tutorials.describe-image.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:26",
    video: tutorialVideo("describe-image.mp4"),
    poster: tutorialPoster("describe-image.jpg"),
    accent: "#f97316",
    learn: [
      "Bringing an image into a graph",
      "Sending a picture to a vision model",
      "Reusing the streamed description downstream",
    ],
    learnKeys: ["tools:tutorials.describe-image.learn0", "tools:tutorials.describe-image.learn1", "tools:tutorials.describe-image.learn2"],
    startingState: "A new workflow canvas with an image input ready to fill.", startingStateKey: "tools:tutorials.describe-image.startingState",
    task: "Add an image, connect it to an Agent, and run the graph to describe what is visible.", taskKey: "tools:tutorials.describe-image.task",
    result: "The vision response describes the image and is available in the downstream output.", resultKey: "tools:tutorials.describe-image.result",
    launch: { kind: "guided-flow", flow: "workflow" },
  },
  {
    id: "timeline-trim-arrange",
    title: "Cut a scene together", titleKey: "tools:tutorials.timeline-trim-arrange.title",
    tagline: "Timeline editor · trim, arrange, caption", taglineKey: "tools:tutorials.timeline-trim-arrange.tagline",
    description:
      i18n.t("tools:tutorials.timeline-trim-arrange.description", { defaultValue: "Watch the opening clip shorten, the next shot meet its edge, and a caption appear on its track. Then preview the finished cut." }), descriptionKey: "tools:tutorials.timeline-trim-arrange.description",
    level: i18n.t("tools:tutorials.level.Beginner", { defaultValue: "Beginner" }),
    durationLabel: "0:28",
    video: tutorialVideo("timeline-trim-arrange.mp4"),
    poster: tutorialPoster("timeline-trim-arrange.jpg"),
    accent: "#8b5cf6",
    learn: [
      "Trimming and arranging clips on tracks",
      "Adding a caption synced word-by-word",
      "Scrubbing and previewing the cut live",
    ],
    learnKeys: ["tools:tutorials.timeline-trim-arrange.learn0", "tools:tutorials.timeline-trim-arrange.learn1", "tools:tutorials.timeline-trim-arrange.learn2"],
    startingState: "A new timeline with empty tracks and no clips.", startingStateKey: "tools:tutorials.timeline-trim-arrange.startingState",
    task: "Place two clips, trim their cut, add a caption, and preview the finished sequence.", taskKey: "tools:tutorials.timeline-trim-arrange.task",
    result: "The timeline plays the arranged cut with the caption aligned to the dialogue.", resultKey: "tools:tutorials.timeline-trim-arrange.result",
    launch: { kind: "guided-flow", flow: "video" },
  },
];

export const getTutorial = (id: string | null | undefined): Tutorial =>
  TUTORIALS.find((t) => t.id === id) ?? TUTORIALS[0];
