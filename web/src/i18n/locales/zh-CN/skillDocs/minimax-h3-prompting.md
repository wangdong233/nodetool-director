# MiniMax H3 → 一个上下文,多路参考

H3 是通用多模态视频模型,不是一组任务模型。文字、图像、视频与音频进入同一个上下文,所以一次请求可以从照片带出角色身份、从片段带出镜头语言与剪切节奏、从录音带出嗓音,并把它们解析成一条带原生立体声的镜头。输出为 5 到 15 秒、24 fps、2K,提示词可写到 7000 字符——一整份带声音设计的分镜表装得进一次请求。

用 `find_model` 查 `text_to_video` 或 `image_to_video`,再走 `generate_video` / `animate_image`。

一次请求里的带时间码分镜表,也正是让原生音频跨剪切连续的东西——整条多场景作品何时装进单次生成,见 `video-audio-continuity`。

## 选哪个端点

规则是机械的:

- **请求里没有媒体** → 文生视频。适合一切你能完整描述的东西,以及想让
  模型发明观感而不是匹配观感的场合。独特的手绘风格,光靠提示词能走得
  意外地远。
- **一张恰是首帧或尾帧的图** → 首尾帧。一张图开场,或两张图开场加收尾,
  H3 生成中间的运动。静态海报、UI 样机或关键美术图要动起来,就用这条。
  输出跟随上传图的宽高比。
- **任何你当参考用的东西** → 参考图生视频。最多 9 张图、3 条 2 到 15 秒的
  视频片段、3 条音频,合计 12 个文件。身份锁定、运动与镜头迁移、风格
  匹配、声音克隆、以及编辑既有片段,都住在这里。手头有素材时就默认
  走它。

## 八项技法

**1. 给每张参考指派职责。**这是改变最大的一条习惯。"Use Image 1 for the overall mood, location and film texture; Image 2 for the talent; Image 3 for the bag; and Image 4 for the closing brand mark"(图 1 出整体情绪、地点与胶片质感;图 2 出演员;图 3 出包;图 4 出收尾品牌标)胜过四张图加一段描述。跨模态同样成立:"Match the camera move in Video 1. Make the subject in Video 2 sing, using Video 3 as the reference for both the vocal performance and physical delivery."(匹配视频 1 的运镜。让视频 2 的主体唱歌,视频 3 同时当演唱与肢体表现的参考。)

**2. 超过一个节拍就写带时间的分镜表。**时间码块锁住节奏:"[0 to 2 seconds] High-angle overhead shot… [2 to 4 seconds] Smoothly push in to her right arm… [10 to 15 seconds] As she stands, the full world loads around her."。没有它们,一次 15 秒的生成会漂成幻灯片。

**3. 导声音。**它是原生生成的,所以像导镜头一样导它:"a deep sub-bass pulse, distant metallic resonance, and one restrained hit as the title locks into focus"(一记深沉低频脉冲、远处的金属共振、标题锁定焦点时克制的一击),或 "ice tapping crystal, a faint cigar burn, subtle room air, clothing movement, controlled breathing"(冰块敲水晶、隐约的雪茄燃声、细微的房间空气、衣物摩擦、受控呼吸)。写音乐时,描述配器与结构随时间的变化,包括节拍落在哪。

**4. 写明你不要什么。**负向指令异常有效,且越具体越有回报。"No soft dissolves or fluid morphs."(不要软溶解或流体变形。)"Do not introduce garbled characters or misspellings."(不要引入乱码或错字。)"No tearing, black frames, obvious VFX, or compositing seams."(不要撕裂、黑帧、明显特效或合成接缝。)这些能拦住一条风格化提示词滑进隔壁类型片。

**5. 列细节锁定身份。**"Preserve the half-up long black hair, openwork silver crown, indigo ribbon, layered pale hanfu, translucent blue outer robe, deep-blue sash, silver floral fastener, and long tassels."(保住半扎黑长发、镂空银冠、靛蓝发带、层叠素色汉服、透蓝外袍、深蓝腰带、银花扣与长流苏。)点名特征给了模型可抓的东西。对产品、布景与字体同样管用。

**6. 编辑时,改动与约束一起说。**把替换写成清单:"Replace the newspaper with a green hardcover book; replace the chair with a red sofa; remove the subject's sunglasses and reveal a clear face."(把报纸换成绿色精装书;把椅子换成红沙发;去掉主体墨镜,露出清晰的脸。)每处改动配上必须稳定的东西,你得到的是局部编辑,而不是重造的镜头。

**7. 用镜头与胶片语言。**镜头选择、运动、曝光行为与胶片性格都翻译得动:"subtle handheld shake, then push in quickly and rack focus"(轻微手持晃动,随即快速推近并移焦)、"wide angle with strong perspective distortion"(广角加强透视畸变)、"fine grain, soft highlight halation, restrained colour"(细颗粒、柔高光晕、克制色彩)、"backlit exposure breathing, slightly coarse noise in the shadows"(逆光曝光呼吸、阴影里略粗的噪点)。

**8. 把转场写成事件,不写成名字。**"Fast binocular-scan transitions with whip movement, motion blur, optical smearing, and brief exposure flicker. Cut at peak blur, then settle and snap back into focus."(双筒扫描式快速转场,带甩动、运动模糊、光学拖影与短暂曝光闪烁。在最糊处剪切,然后落定并回焦。)黑胶唱片式圆形擦除、车门式竖切、超大字母遮罩,描述出来都比报个名字落得好。

## 它格外擅长什么

一次读多路参考、渲染可读的文字与界面、对你已有的视频做精确局部编辑。这个组合覆盖品牌片与预告片、片头序列与动效拼贴、竖屏短剧、产品与电商广告、游戏与网页 UI 动效、角色与动作迁移、声音克隆、绿幕替换——全部出自同一个模型。

两个形状值得偷。片头序列:点名设计语言、转场词汇、字幕排印规则("each role and each name appears once",每个职位与每个名字只出现一次),与一份定时的 BGM 简报。时尚或产品片:把情绪、演员、产品与品牌标分给各张图,故事保持简单,让参考扛住观感。

用 `analyze_video`、`detect_video_scenes` 与 `understand_video` 检查渲染;`analyze_audio` 查你导的那版混音。

改编自 fal 的 MiniMax H3 提示词指南:
https://fal.ai/learn/devs/minimax-h3-prompting-guide
