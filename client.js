/**
 * @local/debao-media — Client half.
 *
 * 一个挂在小红书内容工作流上的"生成器"面板：
 *   拆解 / 仿写 / 原创 / 选题 / 封面
 *
 * 它只做一件事：把你的输入拼成一段高质量指令，一键复制，再丢给对话里的助手去执行。
 * 不联网、不调模型、不 import 任何 Harness 客户端包 —— 所以断网也能用，也不会卡住聊天。
 */
window.__ModuleLoader__.load({
  id: '@local/debao-media',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const useState = React.useState
    const useEffect = React.useEffect
    const useMemo = React.useMemo
    const useRef = React.useRef
    const useCallback = React.useCallback

    const NS = 'debao-media'
    const FORM_KEY = 'dsh.debao.form.v1'
    const DRAFT_KEY = 'dsh.debao.drafts.v1'
    const PLATFORM_KEY = 'dsh.debao.platform.v1'

    /* ------------------------------------------------------------------ *
     * 文案
     * ------------------------------------------------------------------ */
    const STRINGS = {
      zh: {
        'app.title': '德饱自媒体助手',
        'app.sub': '小红书 + 抖音 · 采集 / 拆解 / 仿写 / 选题 / 封面 / 视频解析 / 账号学习',
        'app.foot': '复制 → 粘到对话里 → 助手按这段跑完。数据都留在本机。',

        'tab.board': '总览看板',
        'tab.hot': '热榜',
        'tab.search': '搜索 & 热榜',
        'tab.insp': '灵感库',
        'tab.worksLearn': '拆解学习库',
        'tab.study': '学习库',
        'tab.worksOrig': '原创库',
        'tab.accounts': '我的账号',
        'tab.bloggers': '找博主',
        'g.work': '工作台',
        'g.create': '创作',
        'g.learn': '拆解与学习',
        'g.orig': '原创',
        'g.mine': '我的',
        'rail.drag': '拖动调宽（双击恢复默认）',
        'hot.title': '当日热榜',
        'hot.sub': '抖音挑战榜 / 关键词榜单（小红书无公开热榜，走关键词）',
        'hot.modeHot': '抖音挑战榜',
        'hot.modeKw': '关键词榜单',
        'hot.kwPh': '关键词，例如 手机摄影 / 租房改造',
        'hot.run': '生成榜单',
        'hot.loading': '抓取中…',
        'hot.refresh': '刷新',
        'hot.empty': '还没有榜单数据，点右上「刷新」或切到关键词榜单',
        'hot.emptyKw': '填个关键词再点「生成榜单」',
        'hot.hotSrc': '数据源',
        'acc.title': '我的账号',
        'acc.sub': '多账号 · 星标监控 · 每次同步留一条粉丝/赞/作品快照',
        'acc.ph': '贴主页链接或账号 id',
        'acc.add': '添加',
        'acc.sync': '同步全部',
        'acc.empty': '还没有添加账号：贴一个小红书/抖音主页链接，它就归到「我的账号」里',
        'blog.title': '找博主',
        'blog.sub': '按关键词搜人 → 抓主页数据 → 作品入库（入库后可拆解/仿写）',
        'blog.ph': '搜博主关键词，例如 摄影师 / 旅拍',
        'blog.search': '搜索',
        'blog.empty': '还没有结果：输入关键词搜人',
        'tab.capture': '采集库',
        'tab.deconstruct': '拆解',
        'tab.imitate': '仿写',
        'tab.original': '原创',
        'tab.topics': '选题',
        'tab.cover': '封面',
        'tab.media': '视频/音乐',
        'tab.learn': '账号学习',
        'tab.idea': '创意',
        'tab.works': '作品库',
      'tab.drafts': '草稿',
      'tab.account': '后台数据',
      'tab.backend': '后台分析',
      'tab.settings': '设置',
      'works.title': '作品库',
      'works.learnTitle': '拆解学习库',
      'works.origTitle': '原创库',
      'works.learnSub': '拆解、仿写、账号诊断都存这儿，按页签筛选',
      'works.origSub': '原创文案 / 脚本 / 选题 / 创意，按页签筛选',
      'insp.title': '灵感库',
      'insp.sub': '碎片先记下，别让它跑掉；攒够了再拿去做选题',
      'insp.ph': '一句话记下来：现象 / 反直觉的细节 / 想说没说出口的话',
      'insp.add': '记一下',
      'insp.empty': '还没有灵感：上面写一句就能存',
      'insp.all': '全部',
      'insp.done': '已用完',
      'insp.del': '删除',
      'insp.toTopics': '做选题',
      'insp.toIdea': '做创意',
      'insp.tags': '标签（逗号分隔）',
      'works.sub': '在这里回看豆包写过的每一份成品，标记采用、改标题、直接复制',
      'works.empty': '还没有成品：去「拆解 / 仿写 / 原创 / 选题 / 封面」点「一键生成」',
      'works.loading': '读取中…',
      'works.all': '全部',
      'works.adopt': '采用',
      'works.adopted': '已采用',
      'works.copy': '复制',
      'works.remove': '删除',
      'works.note': '生成后自动存这里，关掉对话框也不会丢',
      'gen.hint': '点一下就由豆包写好成品，直接出现在右边',

        'lib.card': '卡片模式',
        'lib.list': '列表模式',
        'lib.all': '全部',
        'lib.image': '图文',
        'lib.video': '视频',
        'lib.hot': '爆款',
        'lib.sortRecent': '最近采集',
        'lib.sortRatio': '按收藏率',
        'lib.sortCraft': '按评论率',
        'lib.sortLikes': '点赞数',
        'lib.col.item': '内容素材概要',
        'lib.col.score': '内容评分',
        'lib.col.metric': '爆款指标',
        'lib.col.data': '数据',
        'lib.col.tags': '正文标签',
        'lib.col.act': '操作',
        'lib.parsed': '已解析',
        'lib.unparsed': '未解析',
        'lib.direct': '直链',
        'lib.local': '本机',
        'lib.ratioCollect': '收藏率',
        'lib.ratioComment': '评论率',
        'lib.score': '评分',
        'lib.group': '分组',
        'lib.groupNone': '不分组',

        'board.title': '总览看板',
        'board.sub': '一眼看清库里的量、质、节奏，点一行直接拆解或解析',
        'board.total': '采集总数',
        'board.video': '视频',
        'board.parsed': '已解析',
        'board.avgLikes': '平均点赞',
        'board.avgCollect': '收藏率中位',
        'board.hot': '爆款（赞 ≥ 1万）',
        'board.table': '素材表',
        'board.byTag': '高频标签',
        'board.byCat': '分类分布',
        'board.byAuthor': '高频作者',
        'board.usage': '豆包用量',
        'board.calls': '解析次数',
        'board.tokens': 'token',
        'board.cost': '预估费用',
        'board.empty': '库里还没有素材。装好扩展、打开小红书/抖音点一下采集，这里就有数了。',

        'plat.xhs': '小红书',
        'plat.douyin': '抖音',
        'plat.switch': '当前平台',

        'common.copy': '复制这段',
        'common.copied': '已复制，粘到对话里就行',
        'common.copyFail': '复制被浏览器拦了，手动全选吧',
        'common.save': '存草稿',
        'common.saved': '已存进草稿箱',
        'common.clear': '清空这页',
        'common.load': '载入',
        'common.del': '删除',
        'common.empty': '这一页还是空的，先把左边填上。',
      },
      en: {
        'app.title': 'Debao Media Assistant',
        'app.sub': 'XHS + Douyin · capture / decode / rewrite / topics / cover / video / learn',
        'app.foot': 'Copy, paste into the chat, let the assistant run it.',

        'tab.board': 'Dashboard',
        'tab.hot': 'Trending',
        'tab.search': 'Search & trending',
        'tab.insp': 'Inspiration',
        'tab.worksLearn': 'Decode library',
        'tab.study': 'Study library',
        'tab.worksOrig': 'Original library',
        'tab.accounts': 'My accounts',
        'tab.bloggers': 'Find creators',
        'g.work': 'Workbench',
        'g.create': 'Create',
        'g.learn': 'Decode & learn',
        'g.orig': 'Create',
        'g.mine': 'Mine',
        'hot.title': 'Today trending',
        'hot.sub': 'Douyin challenge board / keyword board',
        'hot.modeHot': 'Douyin board',
        'hot.modeKw': 'Keyword board',
        'hot.kwPh': 'keyword',
        'hot.run': 'Build board',
        'hot.loading': 'Loading…',
        'hot.refresh': 'Refresh',
        'hot.empty': 'No data yet',
        'hot.emptyKw': 'Type a keyword first',
        'hot.hotSrc': 'Source',
        'acc.title': 'My accounts',
        'acc.sub': 'Multi-account · starred monitoring · daily snapshots',
        'acc.ph': 'profile url or id',
        'acc.add': 'Add',
        'acc.sync': 'Sync all',
        'acc.empty': 'No account yet',
        'blog.title': 'Find creators',
        'blog.sub': 'Search creators, fetch profile and posts',
        'blog.ph': 'keyword',
        'blog.search': 'Search',
        'blog.empty': 'No result yet',
        'tab.capture': 'Library',
        'tab.deconstruct': 'Decode',
        'tab.imitate': 'Rewrite',
        'tab.original': 'Create',
        'tab.topics': 'Topics',
        'tab.cover': 'Cover',
        'tab.media': 'Video/Audio',
        'tab.learn': 'Account',
        'tab.idea': 'Ideas',
        'tab.works': 'Works',
      'tab.drafts': 'Drafts',
      'tab.account': 'Backend',
      'tab.backend': 'Backend analysis',
      'tab.settings': 'Settings',
      'works.title': 'Works',
      'works.sub': 'Everything the model wrote, kept locally: adopt, rename, copy.',
      'works.empty': 'Nothing yet — hit Auto-write in Decode / Rewrite / Create / Topics / Cover',
      'works.loading': 'Loading…',
      'works.all': 'All',
      'works.adopt': 'Adopt',
      'works.adopted': 'Adopted',
      'works.copy': 'Copy',
      'works.remove': 'Delete',
      'works.note': 'Saved automatically after each run',
      'gen.hint': 'One click and the finished draft shows up on the right',

        'lib.card': 'Cards',
        'lib.list': 'Table',
        'lib.all': 'All',
        'lib.image': 'Image',
        'lib.video': 'Video',
        'lib.hot': 'Viral',
        'lib.sortRecent': 'Recent',
        'lib.sortRatio': 'Collect ratio',
        'lib.sortCraft': 'Comment ratio',
        'lib.sortLikes': 'Likes',
        'lib.col.item': 'Item',
        'lib.col.score': 'Score',
        'lib.col.metric': 'Viral',
        'lib.col.data': 'Data',
        'lib.col.tags': 'Tags',
        'lib.col.act': 'Actions',
        'lib.parsed': 'parsed',
        'lib.unparsed': 'unparsed',
        'lib.direct': 'direct',
        'lib.local': 'local',
        'lib.ratioCollect': 'Save%',
        'lib.ratioComment': 'Cmt%',
        'lib.score': 'Score',
        'lib.group': 'Group',
        'lib.groupNone': 'None',

        'board.title': 'Overview',
        'board.sub': 'Volume, quality and rhythm at a glance — click a row to decode',
        'board.total': 'Total',
        'board.video': 'Videos',
        'board.parsed': 'Parsed',
        'board.avgLikes': 'Avg likes',
        'board.avgCollect': 'Collect rate',
        'board.hot': 'Viral (≥10k)',
        'board.table': 'Items',
        'board.byTag': 'Top tags',
        'board.byCat': 'Categories',
        'board.byAuthor': 'Top authors',
        'board.usage': 'Doubao usage',
        'board.calls': 'Calls',
        'board.tokens': 'tokens',
        'board.cost': 'Est. cost',
        'board.empty': 'Empty library. Install the extension and capture something first.',

        'plat.xhs': 'XHS',
        'plat.douyin': 'Douyin',
        'plat.switch': 'Platform',

        'common.copy': 'Copy prompt',
        'common.copied': 'Copied',
        'common.copyFail': 'Copy blocked, select manually',
        'common.save': 'Save draft',
        'common.saved': 'Saved',
        'common.clear': 'Clear',
        'common.load': 'Load',
        'common.del': 'Delete',
        'common.empty': 'Nothing yet — fill the left side.',
      },
    }

    let translate = function (key) {
      const zh = STRINGS.zh
      return Object.prototype.hasOwnProperty.call(zh, key) ? zh[key] : key
    }
    function t(key) {
      try {
        return translate(key)
      } catch (e) {
        return key
      }
    }

    /* ------------------------------------------------------------------ *
     * 爆款元素（选题用）
     * ------------------------------------------------------------------ */
    const TOPIC_KINDS = [
      {
        key: '奇葩另类',
        desc: '让人一眼"啊？"的反常识，靠脑回路取胜',
        seeds: ['脑回路清奇的', '外行绝对不知道的', '行业内幕操作', '内行人的神奇操作', '匪夷所思的做法'],
      },
      {
        key: '群体记忆',
        desc: '勾共同经历，一开口就把人拉回某个年代',
        seeds: ['二十年前经典的', '古代人是怎么做到的', '小时候最难忘的', '当年最火的', '曾经贵得离谱的'],
      },
      {
        key: '最差最好',
        desc: '极端词最省事，争议自带评论区',
        seeds: ['贬值最快的', '最难用的', '差评最多的', '最没面子的', '最赚钱的', '最不靠谱的', '反人类设计的'],
      },
      {
        key: '借助势能',
        desc: '蹭大牌、名人、大额数字，借别人的流量',
        seeds: ['跟大牌比差在哪', '名人也踩过的坑', '大佬的日常 vs 我的日常', '月入十万的人怎么做这件小事'],
      },
      {
        key: '两性话题',
        desc: '异性视角永远有话题，注意分寸别越界',
        seeds: ['异性会多看你一眼的', '一秒下头的', '自以为很好看其实很糟的', '相亲时最加分的', '最容易翻车的'],
      },
      {
        key: '反差对比',
        desc: '两组人对撞，差异一眼可见',
        seeds: ['穷人 vs 富人', '南方 vs 北方', '男生 vs 女生', '十年前 vs 现在', '有良心 vs 没良心'],
      },
      {
        key: '利他思维',
        desc: '直接给方法、替人省钱，收藏率最高',
        seeds: ['两分钟教会你', '行业内不会主动说的坑', '普通人也能照做的步骤', '这一步省下多少钱'],
      },
    ]

    /* ------------------------------------------------------------------ *
     * 指令生成
     * ------------------------------------------------------------------ */
    function nz(v, fallback) {
      const s = (v == null ? '' : String(v)).trim()
      return s.length ? s : fallback
    }

    function buildDeconstruct(f) {
      const title = nz(f.title, '（未填标题）')
      const body = nz(f.body, '（未填正文）')
      const tags = nz(f.tags, '（无）')
      const likes = nz(f.likes, '?')
      const collects = nz(f.collects, '?')
      const comments = nz(f.comments, '?')
      return [
        '你是一名内容编导，按方法论把这篇笔记拆到「换个主题就能照着再写一篇」的程度，并判断它为什么成立、哪里可以更稳。',
        '',
        '【笔记】',
        '标题：' + title,
        '正文：' + body,
        '话题标签：' + tags,
        '数据：点赞 ' + likes + ' / 收藏 ' + collects + ' / 评论 ' + comments + '（没有分母和时间就标「未核实」，不要据此下强度结论）',
        '',
        '请依次输出八段，每段都要落到能直接用的结论，不要空泛评价，不要复述原文：',
        '',
        '## 一、用户任务与需求层级',
        '写一句任务句：当【情境】时，【谁】想从【原状态】到【目标状态】，但被【阻碍】卡住。',
        '再标出需求层级：价值层（情绪 / 信息）、认知层（好奇 / 认同 / 得到）、选题层（审美 / 共鸣 / 成长 / 猎奇 / 情绪 / 解决问题）。',
        '',
        '## 二、爆款四必要条件诊断',
        '低理解成本、大群体链接、满足核心需求、产生互动动机——逐条给「成立 / 偏弱 / 不成立」，并引用原文里支撑它的具体句子。',
        '',
        '## 三、内容路径归属',
        '判断它属于哪种路径：情感共鸣（共享记忆）/ 稀缺视角（硬素材）/ 反差节奏（快中慢·繁中简·闹中静），指出它用的骨架，并逐段对应到本文。',
        '',
        '## 四、标题与预期管理',
        '把标题抽象成公式，指出负责勾人的那个词；判断标题承诺与正文证据是否匹配（有没有超卖）；再按同一公式换皮给 5 个标题。',
        '',
        '## 五、结构与节奏',
        '逐段写这一段在干什么（拉停 / 共情 / 给料 / 转折 / 收口）以及它改变了读者什么；标出句子长度、停顿点、有没有清单化；若用了反差，说清是哪一层（时间 / 信息 / 感官）。',
        '',
        '## 六、读者心理与互动动机',
        '点进来的人想看到什么？在哪一句被说服？收藏动机（怕忘 / 怕亏 / 想模仿 / 想转发）？评论区最可能吵什么？',
        '',
        '## 七、可复用模板与系列承接',
        '把整篇压成三步填空骨架；再给 3 条同承诺的后续选题，并注明属于「同一问题 / 同一变化 / 同一人物世界 / 同一形式 / 同一能力」中的哪一种，凑成系列。',
        '',
        '## 八、边界与风险',
        '这条在什么人群、什么平台上会失效？哪句最容易翻车（夸大、绝对化、无法核实）？复刻时必须改掉什么？',
        '',
        '最后附一行机读评分，照抄格式，不要解释：',
        '<metadata>{"potential": 0到10的整数, "burden": "低|中|高", "arousal": "弱|中|强", "hook_type": "标题的钩子类型", "path": "悲|奇|反", "necessities": {"clarity": "是|弱|否", "reach": "是|弱|否", "need": "是|弱|否", "interact": "是|弱|否"}}</metadata>',
      ].join('\n')
    }

    function buildImitate(f) {
      const source = nz(f.source, '（还没粘参考笔记）')
      const replace = nz(f.replace, '（没说换成什么）')
      const sim = String(f.similarity || 50)
      const aspect = nz(f.aspect, '正文')
      return [
        '你是一名小红书仿写手。目标：留住原笔记的节奏和钩子结构，换掉主体信息，做出相似度约 ' + sim + '% 的新版本。',
        '',
        '【参考笔记】',
        source,
        '',
        '【要换进去的信息】',
        replace,
        '',
        '【这次主要产出】' + aspect,
        '',
        '请输出：',
        '1. 结构对照：原笔记每一段的作用 → 新笔记对应段落写什么，一行一段。',
        '2. 正文成稿：按原节奏写完整一版，字数与原稿相差 ±15%。',
        '3. 标题 5 个：分属「利益诱导 / 焦虑扎心 / 情绪反差」三型，每条不超过 20 字，带 1 个 emoji。',
        '4. 话题标签 8 个：2 个大词 + 4 个精准词 + 2 个长尾词。',
        '5. 撞车检查：列出必须换掉的句子（原句 + 你的替换句），并估计整体相似度。',
        '',
        '硬性要求：不复述原句，不解释创作思路，直接给能发的东西；相似度别超过 ' + sim + '%，句子必须重写。',
        '',
        '最后加一段「机制复制检查」（复制机制，不复制表面），逐条回答：',
        '- 原文真正强的是哪个用户任务？（不是哪句话好听）',
        '- 我的素材差异在哪，够不够撑起同一个任务？',
        '- 它的结构是怎么降低理解成本的？我这一版保留了吗？',
        '- 哪一处会触发互动（评论 / 收藏 / 转发）？我有没有留同一个口子？',
        '- 这条能变成系列吗？下一条的承诺是什么？',
      ].join('\n')
    }

    function buildOriginal(f) {
      const topic = nz(f.topic, '（主题没填）')
      const audience = nz(f.audience, '（没限定人群）')
      const pain = nz(f.pain, '（痛点没填）')
      const selling = nz(f.selling, '（没有独特证据就先写"无"，别编数据）')
      const keywords = nz(f.keywords, '（无）')
      const tone = nz(f.tone, '像朋友说话')
      const words = String(f.words || 600)
      if (f.mode === 'script') {
        return [
          '你是一名短视频编导，按方法论把一个选题写成能直接开拍的脚本，而不是文案模板。',
          '',
          '【我的输入】',
          '主题 / 想拍什么：' + topic,
          '拍给谁看：' + audience,
          '他现在的处境 / 痛点：' + pain,
          '我手上真有什么（场景、人、道具、经历）：' + selling,
          '想埋的关键词 / 话题：' + keywords,
          '口吻：' + tone,
          '成片时长目标：' + nz(f.duration, '45-60 秒'),
          '',
          '请输出：',
          '',
          '## 一、这条片子在解决谁的什么',
          '一行任务句（当【情境】时，【谁】想从【原状态】到【目标状态】，但被【阻碍】卡住），再标需求层级与内容路径。',
          '',
          '## 二、分镜表',
          '必须是 Markdown 表格，表头固定为：| 镜号 | 时长 | 画面（怎么拍） | 台词 / 口播 | 字幕 / 字卡 | 声音 / 音乐 | 作用 |',
          '6-12 个镜头，总时长与目标一致；第一镜必须在前 3 秒说清"这条能给我什么"；每镜只写一件能拍的事，不要写"展现氛围"这种空话。',
          '',
          '## 三、口播逐字稿',
          '按镜头顺序给完整口播，短句、口语、有停顿标记（/ 表示停顿）；开头两句必须是钩子，结尾一句收口 + 一句轻互动。',
          '',
          '## 四、拍摄清单',
          '场地、光线、道具、服装、要不要三脚架/补光；每项写一句"为什么需要它"。',
          '',
          '## 五、标题 6 个',
          '利益诱导 / 焦虑扎心 / 情绪反差 三型各 2 个，不超过 20 字，带 emoji；每个后面标它承诺了什么，超卖的换掉。',
          '',
          '## 六、首图 / 封面',
          '封面大字（不超过 8 字）+ 一版即梦可用的出图提示词（3:4、写实、不要出现"AI/生成/高清画质"这类词）。',
          '',
          '## 七、发布前自查',
          '5 条：前 3 秒有没有钩子 / 有没有信息缺口 / 有没有能抄走的东西 / 有没有互动钩子 / 有没有超卖。哪条不达标就直接说。',
          '',
          '禁：编造具体数字、绝对化用语、医疗与投资承诺；没有证据的地方用"我自己的情况"兜住。',
        ].join('\n')
      }
      return [
        '你是一名原创写手，按方法论写一篇能直接发的成品，而不是文案模板。',
        '',
        '【我的输入】',
        '主题：' + topic,
        '写给谁：' + audience,
        '他现在的处境 / 痛点：' + pain,
        '我的独特证据或卖点：' + selling,
        '想埋的关键词：' + keywords,
        '口吻：' + tone,
        '正文目标字数：' + words,
        '',
        '请输出：',
        '',
        '## 一、任务单',
        '八行，每行一句话：目标用户与情境 / 看完的变化 / 首要目标（播放·关注·信任·转化）/ 平台入口 / 主要路径（情感共鸣·稀缺视角·反差节奏）/ 核心主张 / 证据状态（我手上真有什么）/ 系列归属。缺的写「待补」，不要编。',
        '',
        '## 二、结构选择',
        '从知识口播（用户问题→核心判断→2-4 理由→证据→反例与边界→下一步）、案例复盘（结果与口径→起点约束→关键选择→执行→数据→替代解释→可复用与不可复制）、人物/VLOG（目标→阻碍→选择→关系→变化→余波）里挑一个，说明为什么，并按它的分段列出来。',
        '',
        '## 三、正文成稿',
        '前两句必须是钩子（制造信息缺口或戳中处境），中段给能执行的料（步骤、数字、清单、对比），结尾一句收口 + 一句轻互动。凡是不能落地的形容一律删掉。',
        '',
        '## 四、标题 6 个',
        '利益诱导 / 焦虑扎心 / 情绪反差 三型各 2 个，不超过 20 字，带 emoji。每个标题后标一句它承诺了什么，再检查这个承诺有没有超过正文证据——超卖的删掉换一个。',
        '',
        '## 五、话题标签 8 个',
        '2 个大词 + 4 个精准词 + 2 个长尾词。',
        '',
        '## 六、首图文案',
        '主文案不超过 12 字，副文案不超过 18 字。',
        '',
        '## 七、证据清单',
        '正文里出现的每个数字与事实拎出来，标来源（我提供的 / 可公开查证 / 我的推算）。写不出来源的直接删掉，别留着当装饰。',
        '',
        '禁：编造具体数字、绝对化用语、医疗与投资承诺；没有证据的地方用"我自己的情况"兜住。',
      ].join('\n')
    }

    function buildTopics(f) {
      const industry = nz(f.industry, '（行业没填）')
      const picked = TOPIC_KINDS.filter(function (k) {
        return f.kinds && f.kinds[k.key] !== false
      })
      const list = picked.length ? picked : TOPIC_KINDS
      const count = list.length * 3
      const lines = []
      lines.push('你是一名选题策划，按方法论给我选题，不要给行业黑话和泛泛标题。')
      lines.push('')
      lines.push('行业 / 我的身份：' + industry)
      lines.push('')
      lines.push('先用一行写出我的用户任务：当【情境】时，【谁】想从【原状态】到【目标状态】，但被【阻碍】卡住。')
      lines.push('')
      lines.push('然后按下面这些元素各给 3 条（共 ' + count + ' 条）。每条都必须是一个能立刻开拍的选题，并标出：')
      lines.push('- 服务哪种需求：价值层（情绪 / 信息）、认知层（好奇 / 认同 / 得到）')
      lines.push('- 走哪条路径：情感共鸣（共享记忆）/ 稀缺视角（硬素材）/ 反差节奏（快中慢·繁中简·闹中静）')
      lines.push('')
      list.forEach(function (k, i) {
        lines.push('元素' + (i + 1) + '：' + k.key + '（这类内容靠的是：' + k.desc + '）')
        lines.push('可用句式参考：' + k.seeds.join(' / '))
        lines.push('')
      })
      lines.push('输出格式：按元素分组，每条一行，形如 `1. 选题句 —— 需求：信息 / 路径：反`，不要解释、不要总结。')
      lines.push('')
      lines.push('## 评分卡（六维各 0-2 分）')
      lines.push('给上面每条打分：用户任务清晰度 / 资源真实性（我到底能不能拍到）/ 差异性 / 价值强度 / 系列潜力 / 证据可得。')
      lines.push('只保留总分 ≥ 8 的前 10 条，按分数从高到低排；「用户任务 / 资源真实性 / 证据可得」任一项为 0 的直接排除并说明原因。')
      lines.push('')
      lines.push('## 系列归属与拍摄成本')
      lines.push('把入选的 10 条归到两条以上系列（同一问题 / 同一变化 / 同一人物世界 / 同一形式 / 同一能力），每条系列给一句稳定承诺。')
      lines.push('再从里面挑 3 条最好拍的，各写一句怎么拍（机位 / 素材 / 要不要出镜）。')
      lines.push('')
      lines.push('## 热点四问（可选）')
      lines.push('给 3 个当下能蹭的热点，各回答：和我的用户任务有没有关系、我有什么独有素材、会不会惹麻烦、蹭完留下什么。')
      return lines.join('\n')
    }

    function buildCover(f) {
      const type = nz(f.type, '大字报')
      const main = nz(f.main, '（主文案没填）')
      const sub = nz(f.sub, '（无）')
      const subject = nz(f.subject, '（无）')
      const vibe = nz(f.vibe, '干净、有冲击力')
      const rule =
        type === '大字报'
          ? [
              '- 2D 扁平矢量风格，主文案占画面 60% 以上，字体粗重，纯色块背景。',
              '- 严禁写实人物、照片质感、3D 渲染。',
              '- 主文案按视觉重量分两行排版，可以挑一个字换色强调。',
            ]
          : [
              '- 先描述一个具体场景：地点、时间、光线、人物动作、关键道具。',
              '- 文字作为贴纸或便签压在上方，画面中下方留出文字安全区。',
              '- 场景要有真实生活痕迹，别像样板间。',
            ]
      return [
        '你是一名小红书封面设计指导。请直接写一段能粘进即梦（Jimeng 4.0）的生图提示词。',
        '',
        '【封面设定】',
        '类型：' + type,
        '主文案：' + main,
        '副文案：' + sub,
        '主体：' + subject,
        '气质：' + vibe,
        '',
        '规则：',
        '- 图片比例 3:4，竖版。',
      ]
        .concat(rule)
        .concat([
          '- 输出只给一段中文提示词：先写画面，再写文字排版，最后写风格与比例。',
          '- 提示词里不要出现「AI」「生成」「高清画质」这类无效词。',
          '- 主文案原样保留，不要改写我给的文字。',
        ])
        .join('\n')
    }

    /* ------------------------------------------------------------------ *
     * 平台差异：同一套方法论，两个平台的算法和语法不一样
     * ------------------------------------------------------------------ */
    const PLATFORMS = {
      xhs: {
        key: 'xhs',
        label: '小红书',
        titleLimit: 20,
        coverRatio: '3:4 竖版（1080×1440）',
        tags: '话题写在正文里，5-10 个，前 2 个必须精准；标题要含搜索词',
        algo: '推荐页 + 搜索双入口：封面决定点击，正文前 2 行决定停留；收藏率高于点赞率才算过关，评论区是第二战场',
        hook: '像朋友分享：第一人称、具体金额 / 时长 / 地点',
        caption: '正文 300-600 字，分段短句，emoji 少用但要准',
      },
      douyin: {
        key: 'douyin',
        label: '抖音',
        titleLimit: 30,
        coverRatio: '9:16 竖版（1080×1920），封面文字要大，3 秒读完',
        tags: '话题 3-5 个，多了稀释；第 1 个必须强相关，热点放第 2、3 个',
        algo: '完播率 + 互动率 + 复看：前 3 秒给冲突 / 结果 / 反常识，中段每 5-8 秒一个小钩子；评论区置顶做引导',
        hook: '开口第一句就是结论或冲突：短句、口语、有情绪',
        caption: '口播稿按秒写，每 5-8 秒一个信息点，结尾一句引导关注或评论区',
      },
    }

    // 每个页签在不同平台要补的一段话
    const PLATFORM_NOTES = {
      xhs: {
        deconstruct: '【平台校准 · 小红书】标题 ≤ 20 字且含搜索词；正文前 2 行是钩子；话题 5-10 个写进正文；收藏率是核心指标。',
        imitate: '【平台校准 · 小红书】正文 300-600 字、分段短句；话题写进正文；封面 3:4；不要用抖音那种喊话式开头。',
        original: '【平台校准 · 小红书】标题 ≤ 20 字含搜索词；正文 300-600 字；结尾轻互动；话题 8 个写进正文。',
        topics: '【平台校准 · 小红书】选题要能「被搜到」：标题里带一个搜索词，内容可收藏（清单 / 步骤 / 对比）。',
        cover: '【平台校准 · 小红书】比例 3:4；主文案占画面 60%；避免写实人物与 3D。',
      },
      douyin: {
        deconstruct: '【平台校准 · 抖音】标题 ≤ 30 字但只占一小块；真正决定完播率的是前 3 秒口播；结构按「3 秒钩子 → 痛点 → 给方案 → 结果 → 引导」拆；话题 3-5 个。',
        imitate: '【平台校准 · 抖音】输出口播稿：标出 0-3s / 3-10s / 10-25s 每段说什么，配镜头提示；句子短、口语、每 5-8 秒一个钩子。',
        original: '【平台校准 · 抖音】给口播稿 + 分镜表（时间轴 / 画面 / 字幕）；前 3 秒必须给结论或冲突；结尾一句引导。',
        topics: '【平台校准 · 抖音】选题要有「3 秒能说清的反差」；优先能做前后对比、踩坑复盘、行业内幕；每条标出开头第一句。',
        cover: '【平台校准 · 抖音】比例 9:16；封面文字 8-12 字、大字粗体；手机小屏 3 秒内能读完。',
      },
    }

    function platformOf(ctx) {
      const key = ctx && ctx.platform
      return PLATFORMS[key] || PLATFORMS.xhs
    }

    function platformBlock(ctx, tab) {
      const p = platformOf(ctx)
      const notes = PLATFORM_NOTES[p.key] || PLATFORM_NOTES.xhs
      return notes[tab] || ''
    }

    // 一条采集数据属于哪个平台（老数据没有 platform 字段，按域名猜）
    function platOfItem(it) {
      if (it && (it.platform === 'xhs' || it.platform === 'douyin')) return it.platform
      const u = String((it && it.url) || '')
      return /douyin\.com/.test(u) ? 'douyin' : 'xhs'
    }

    function kindOfItem(it) {
      if (it && (it.mediaType === 'video' || it.mediaType === 'image')) return it.mediaType
      return it && it.videoUrl ? 'video' : 'image'
    }

    /* ------------------------------------------------------------------ *
     * 视频 / 音乐：给助手一条能落地的解析流水线
     * ------------------------------------------------------------------ */
    function buildMedia(f, ctx) {
      const p = platformOf(ctx)
      const mode = f.mode === 'music' ? '音乐 / 声音' : '视频画面 + 口播'
      const desc = nz(f.desc, '（没填，我会自己看）')
      const link = nz(f.link, '（没有链接，用采集队列里的那条）')
      const goal = f.goal === 'copy' ? '仿写（照着它的结构做一条我的）' : '拆解（先看懂它为什么火）'
      return [
        '你是短视频内容分析员，现在要用本机工具把一条' + p.label + '内容拆到能复用的程度。',
        '',
        '【素材】',
        '类型：' + mode,
        '链接 / 文件名：' + link,
        '已知描述：' + desc,
        '目标：' + goal,
        '',
        '【执行顺序】',
        '1. 取文件：优先用采集队列里那条（bridge/data/queue.json）的 videoUrl；没有就用本地文件；都没有就先让我把文件放进来。',
        '2. 技术面：ffprobe 拿时长 / 分辨率 / 帧率 / 音轨；口播有无人声也要记。',
        '3. 画面：每 3-5 秒抽一帧（最多 12 帧），逐帧写「画面里有什么、字卡写了什么、镜头在做什么」。',
        '4. 声音：口播逐句转写并标时间；BGM 写情绪、节拍、有没有卡点；音效标在哪个动作上。',
        '5. 结构：切成「钩子 / 铺垫 / 展开 / 转折 / 收尾」五段，标出每段的秒数。',
        '6. 归因：这条为什么能起来——给了什么信息缺口、情绪是什么、哪一秒是峰值。',
        '',
        '【可用命令】（本机 ffmpeg/ffprobe 已装，别让我自己再折腾）',
        '  取素材：cd bridge && node fetch-media.mjs --latest',
        '  探参数：ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_type -of json <file>',
        '  抽帧  ：ffmpeg -y -i <file> -vf "fps=1/4,scale=640:-1" -frames:v 12 frames/f%02d.jpg',
        '  抽音轨：ffmpeg -y -i <file> -vn -ac 1 -ar 16000 voice.wav',
        '  有画面就直接调视频理解工具（豆包视觉模型已配好），别自己猜画面内容。',
        '',
        '【输出】',
        'A. 一句话结论（它靠什么留住人）。',
        'B. 时间轴表：秒数 | 画面 | 字幕/字卡 | 口播 | 声音。',
        'C. 路径与结构归类：属于情感共鸣 / 稀缺视角 / 反差节奏哪一条；用的是知识口播 / 案例复盘 / 人物·VLOG 哪种结构模板；节奏在哪一层做变化（句内 / 段落 / 视听 / 信息流）。',
        'D. 可复用模板：把它的结构抽象成填空，3-5 步。',
        'E. 仿写脚本：按这个模板给我一条我的版本（口播逐句 + 分镜），' + platformBlock(ctx, 'imitate'),
        'F. 机读 JSON：{"kind":"video|music","hook":"","structure":["",""],"rhythm":"","peakSec":0,"reusable":"","tags":[]}',
        '',
        '做完把 F 存进本地库（POST http://127.0.0.1:53210/api/analysis，带上 noteId）。',
      ].join('\n')
    }

    /* ------------------------------------------------------------------ *
     * 账号学习：把「你的方向」沉淀成本地画像
     * ------------------------------------------------------------------ */
    function buildLearn(f, ctx) {
      const p = platformOf(ctx)
      const stage = nz(f.stage, '起步（0-1 万粉）')
      const goal = nz(f.goal, '（没写，按现状给建议）')
      const stats = nz(f.stats, '（点「读本地统计」自动填）')
      const extra = nz(f.extra, '（无）')
      return [
        '你是我的长期内容教练。请基于本地数据更新「我的账号画像」，再用画像反推下一步；不要给通用运营建议。',
        '',
        '【平台】' + p.label + '：' + p.algo,
        '【阶段】' + stage,
        '【当前目标】' + goal,
        '【本地统计】',
        stats,
        '【补充说明】' + extra,
        '',
        '【做四件事】',
        '',
        '## 一、账号画像（JSON）',
        '定位一句话 / 目标用户与他们的用户任务 / 内容支柱 3-5 个（每条写明服务哪个用户任务）/ IP 识别系统（ID、视觉、语言、人格、能力、缺点）/ 语言指纹（常用句式、口头禅、emoji 习惯）/ 结构偏好 / 封面风格 / 发布规律 / 已验证的爆款结构 / 已知的失败模式 / 不能碰的禁忌。',
        '',
        '## 二、起号体检（Step0–Step8）',
        '逐条给「过 / 偏弱 / 缺」+ 一句证据：',
        'Step0 成功定义（播放·关注·权威·线索，先选一个主目标）；Step1 我是谁（经历/能力/身份/关系/审美/价值观 六行盘点）；Step2 用户任务写清了没有；Step3 平台消费场景（读者搜什么、什么时候刷、看完想干什么）；Step4 IP 识别系统稳不稳；Step5 有没有两条以上系列；Step6 最小生产 SOP；Step7 发布节奏；Step8 复盘机制。',
        '',
        '## 三、数据诊断（沿行为链）',
        '曝光 → 进入 → 观看 → 互动 → 主页 → 关注 → 转化：找出第一个明显弱点，并给两个替代解释（不许只给一个），每条都引用具体条目，不要泛泛而谈。',
        '',
        '## 四、下一周三个实验',
        '每条写清「改什么 / 怎么判断成不成 / 阈值多少」。三条之间只动一个变量。',
        '',
        '【硬性要求】',
        '- 只从数据里推结论，数据不支持的写「暂无证据」，不要编。',
        '- 建议必须落在我的方向上：改的是表达方式和结构，不是换成另一个赛道。',
        '- 最后把画像 JSON 用 POST http://127.0.0.1:53210/api/kb/profile 存回本地。',
      ].join('\n')
    }

    /* ------------------------------------------------------------------ *
     * 创意建议：基于画像，不跑偏
     * ------------------------------------------------------------------ */
    function buildStrategy(f, ctx) {
      const p = platformOf(ctx)
      const direction = nz(f.direction, '（没填，用画像里的定位）')
      const format = nz(f.format, '不限')
      const count = Number(f.count) || 10
      const constraint = nz(f.constraint, '（无）')
      return [
        '你已经在帮我做' + p.label + '，现在要基于「我的账号画像」给创意，不要给通用建议。',
        '',
        '方向：' + direction,
        '形式偏好：' + format,
        '条数：' + count,
        '限制条件：' + constraint,
        '',
        '先读本地画像（GET http://127.0.0.1:53210/api/kb），然后按下面固定格式出 ' + count + ' 条，每条都要能直接开拍：',
        '',
        '1. 选题句（能直接念出来）+ 用户任务句：当【情境】时，【谁】想从【原状态】到【目标状态】，但被【阻碍】卡住。',
        '2. 路径与必要条件：属于 悲 / 奇 / 反 哪一条；四必要条件各一句——怎么做到低理解成本、链接哪个大群体、满足什么核心需求、靠什么引发互动（评论 / 收藏 / 转发）。',
        '3. 前 3 秒怎么说（逐字，' + p.hook + '）。',
        '4. 结构骨架 4-6 步，并注明用的是哪个结构模板（知识口播 / 案例复盘 / 人物·VLOG）。',
        '5. 需要什么素材 + 证据状态（我手上已有的 / 还得补的）。',
        '6. 为什么符合我（引用画像里的哪一条）。',
        '7. 六维评分（用户任务·资源真实性·差异性·价值强度·系列潜力·证据可得，各 0-2）+ 判断标准（' + (p.key === 'douyin' ? '3 秒留存 / 完播率' : '点击率 / 收藏率') + '到多少算成）。',
        '8. 系列承接：这条之后还能接着做哪 2 条同一承诺的内容。',
        '',
        '最后单独一行写「这一周不要做的 3 件事」，并说明理由。',
        '不要客套、不要总结陈词、不要给平台大词。',
      ].join('\n')
    }

    // 给原有的五个页签补上「平台校准」那一段：同一条方法论，两个平台的语法不同
    function withPlatform(tab, fn) {
      return function (f, ctx) {
        const out = fn(f || {}, ctx)
        const note = platformBlock(ctx, tab)
        return note ? out + '\n\n' + note : out
      }
    }

    const BUILDERS = {
      deconstruct: withPlatform('deconstruct', buildDeconstruct),
      imitate: withPlatform('imitate', buildImitate),
      original: withPlatform('original', buildOriginal),
      topics: withPlatform('topics', buildTopics),
      cover: withPlatform('cover', buildCover),
      media: buildMedia,
      learn: buildLearn,
      strategy: buildStrategy,
    }

    /* 两大板块：拆解与学习（学别人） / 原创（做自己）。别再加散页签，新东西往这两块里塞。 */
    const TAB_KEYS = ['board', 'capture', 'deconstruct', 'imitate', 'search', 'bloggers', 'learn', 'study',
      'original', 'topics', 'idea', 'insp', 'account', 'accounts', 'worksOrig', 'drafts', 'settings']
  const TAB_GROUPS = [
    { key: 'g.work', keys: ['board'] },
    { key: 'g.learn', keys: ['capture', 'deconstruct', 'imitate', 'search', 'bloggers', 'learn', 'study'] },
    { key: 'g.orig', keys: ['original', 'topics', 'idea', 'insp'] },
    { key: 'g.mine', keys: ['account', 'accounts', 'worksOrig', 'drafts', 'settings'] },
  ]
    const TAB_ICONS = {
      board: '▤',
      capture: '★',
      deconstruct: '⌕',
      imitate: '✎',
      search: '◈',
      bloggers: '☰',
      learn: '◍',
      study: '▦',
      original: '✦',
      topics: '❖',
      idea: '✧',
      insp: '✩',
      accounts: '◉',
      worksOrig: '❑',
      drafts: '▢',
      account: '◎',
      settings: '⚙',
    }
    const BRIDGE_BASE = (globalThis.__DEBAO_BRIDGE_BASE || 'http://127.0.0.1:53210')

    /* 自检钩子：node 里跑一遍用，浏览器里 globalThis.__DEBAO_TEST__ 是 undefined，不生效 */
    try {
      if (typeof globalThis !== 'undefined' && globalThis.__DEBAO_TEST__) {
        globalThis.__debao = {
          STRINGS: STRINGS,
          BUILDERS: BUILDERS,
          TOPIC_KINDS: TOPIC_KINDS,
          defaultForm: defaultForm,
          defaultKinds: defaultKinds,
          TAB_KEYS: TAB_KEYS,
          TAB_GROUPS: TAB_GROUPS,
          BRIDGE_BASE: BRIDGE_BASE,
          PLATFORMS: PLATFORMS,
          PLATFORM_NOTES: PLATFORM_NOTES,
          platOfItem: platOfItem,
          renderForm: renderForm,
          MediaResult: MediaResult,
          buildMediaReport: buildMediaReport,
          Page: Page,
          Capture: Capture,
          Board: Board,
          GenResult: GenResult,
          Works: Works,
          Hot: Hot,
          Accounts: Accounts,
          Bloggers: Bloggers,
          fmtHot: fmtHot,
          costOfUsage: costOfUsage,
          fmtMs: fmtMs,
          fmtDur: fmtDur,
          itemCountText: itemCountText,
          hotOf: hotOf,
          fmtNum: fmtNum,
          fmtMoney: fmtMoney,
          starsOf: starsOf,
          collectRatio: collectRatio,
          commentRatio: commentRatio,
            buildBackendAnalyze: buildBackendAnalyze,
}
      }
    } catch (e) {
      /* ignore */
    }

    /* ------------------------------------------------------------------ *
     * 表单默认值 + 存取
     * ------------------------------------------------------------------ */
    function defaultKinds() {
      const m = {}
      TOPIC_KINDS.forEach(function (k) {
        m[k.key] = true
      })
      return m
    }

    function defaultForm() {
      return {
        deconstruct: { title: '', body: '', tags: '', likes: '', collects: '', comments: '' },
        imitate: { source: '', replace: '', aspect: '正文', similarity: 50 },
        original: {
          mode: 'note',
          topic: '',
          audience: '',
          pain: '',
          selling: '',
          keywords: '',
          tone: '像朋友说话',
          words: 600,
          duration: '45-60 秒',
        },
        topics: { industry: '', kinds: defaultKinds() },
        cover: { type: '大字报', main: '', sub: '', subject: '', vibe: '干净、有冲击力' },
        media: { mode: 'video', how: 'auto', link: '', desc: '', goal: 'decode', frames: 0 },
        learn: { stage: '起步（0-1 万粉）', goal: '', stats: '', extra: '' },
        strategy: { direction: '', format: '不限', count: 10, constraint: '' },
      }
    }

    function readJSON(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return fallback
        const data = JSON.parse(raw)
        return data && typeof data === 'object' ? data : fallback
      } catch (e) {
        return fallback
      }
    }

    function writeJSON(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch (e) {
        /* 存不进去就算了，别把界面搞崩 */
      }
    }

    function loadForm() {
      const base = defaultForm()
      const saved = readJSON(FORM_KEY, null)
      if (!saved) return base
      Object.keys(base).forEach(function (g) {
        if (saved[g] && typeof saved[g] === 'object') {
          base[g] = Object.assign({}, base[g], saved[g])
          if (g === 'topics') base[g].kinds = Object.assign(defaultKinds(), saved[g].kinds || {})
        }
      })
      return base
    }

    function loadDrafts() {
      const arr = readJSON(DRAFT_KEY, [])
      return Array.isArray(arr) ? arr : []
    }

    /* 桌面版会通过 window.__DEBAO_PREFS 传初始偏好；网页版（DSH 插件）没有这个对象 */
    function prefs() {
      try {
        return (typeof window !== 'undefined' && window.__DEBAO_PREFS) || {}
      } catch (e) {
        return {}
      }
    }

    function loadPlatform() {
      try {
        const p = prefs().platform
        if (p === 'douyin' || p === 'xhs') return p
        const v = window.localStorage.getItem(PLATFORM_KEY)
        if (v === 'douyin' || v === 'xhs') return v
        return 'xhs'
      } catch (e) {
        return 'xhs'
      }
    }

    const RAILW_KEY = 'dsh.debao.railw.v1'

    function loadRailW() {
      try {
        const v = Number(window.localStorage.getItem(RAILW_KEY))
        if (v >= 92 && v <= 300) return v
      } catch (e) {
        /* ignore */
      }
      const p = Number(prefs().railWidth)
      return p >= 92 && p <= 300 ? p : 126
    }

    function loadStartTab() {
      const p = prefs().startTab
      const ok = ['board', 'capture', 'search', 'bloggers', 'accounts', 'insp', 'study', 'worksOrig', 'deconstruct']
      return ok.indexOf(p) >= 0 ? p : 'board'
    }

    function prefFrames() {
      const n = Number(prefs().frames)
      return n === 4 || n === 8 || n === 12 ? n : 8
    }

    function prefKb() {
      return prefs().kb !== false
    }

    function savePlatform(v) {
      try {
        window.localStorage.setItem(PLATFORM_KEY, v === 'douyin' ? 'douyin' : 'xhs')
      } catch (e) {
        /* ignore */
      }
    }

    /* ------------------------------------------------------------------ *
     * 复制
     * ------------------------------------------------------------------ */
    function copyText(text) {
      return new Promise(function (resolve) {
        let done = false
        const finish = function (ok) {
          if (done) return
          done = true
          resolve(ok)
        }
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
              function () {
                finish(true)
              },
              function () {
                finish(fallbackCopy(text))
              },
            )
            return
          }
        } catch (e) {
          /* 落到兜底 */
        }
        finish(fallbackCopy(text))
      })
    }

    function fallbackCopy(text) {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', 'readonly')
        ta.style.position = 'fixed'
        ta.style.top = '-1000px'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        return !!ok
      } catch (e) {
        return false
      }
    }

    /* ------------------------------------------------------------------ *
     * 样式
     * ------------------------------------------------------------------ */
    const CSS = [
      '.xm-page{height:100%;display:flex;flex-direction:column;overflow:hidden;}',
      '.xm-head{padding:18px 24px 10px;flex:0 0 auto;}',
      '.xm-title{font-size:19px;font-weight:650;letter-spacing:.2px;display:flex;align-items:center;gap:8px;}',
      '.xm-dot{width:8px;height:8px;border-radius:50%;background:#ff2e4d;}',
      '.xm-sub{margin-top:4px;font-size:12px;opacity:.55;}',
      '.xm-plat{display:inline-flex;gap:4px;margin-top:10px;padding:3px;border-radius:999px;background:rgba(128,128,128,.1);border:1px solid rgba(128,128,128,.16);}',
      '.xm-plat-btn{border:0;background:transparent;color:inherit;font:inherit;font-size:12px;padding:4px 14px;border-radius:999px;cursor:pointer;opacity:.6;transition:.15s;}',
      '.xm-plat-btn:hover{opacity:.9;}',
      '.xm-plat-btn.on{background:rgba(255,46,77,.16);color:#ff4d68;opacity:1;font-weight:600;}',
      '.xm-tabs{display:flex;gap:6px;padding:10px 24px 0;flex-wrap:wrap;flex:0 0 auto;}',
      '.xm-tab{border:1px solid rgba(128,128,128,.28);background:transparent;color:inherit;font:inherit;font-size:13px;padding:6px 13px;border-radius:999px;cursor:pointer;opacity:.7;transition:.15s;}',
      '.xm-tab:hover{opacity:1;border-color:rgba(255,46,77,.45);}',
      '.xm-tab.on{background:rgba(255,46,77,.12);border-color:rgba(255,46,77,.55);color:#ff4d68;opacity:1;font-weight:600;}',
      '.xm-body{flex:1 1 auto;min-height:0;display:flex;gap:18px;padding:14px 22px 18px;overflow:hidden;}',
      '.xm-col{min-height:0;display:flex;flex-direction:column;}',
      '.xm-left{flex:0 0 46%;max-width:620px;overflow:auto;padding-right:6px;}',
      '.xm-right{flex:1 1 auto;min-width:0;}',
      '.xm-label{font-size:12px;opacity:.6;margin:12px 0 5px;display:flex;justify-content:space-between;align-items:baseline;}',
      '.xm-label:first-child{margin-top:0;}',
      '.xm-hint{font-size:11px;opacity:.45;}',
      '.xm-in,.xm-ta{width:100%;box-sizing:border-box;background:rgba(128,128,128,.06);border:1px solid rgba(128,128,128,.24);border-radius:9px;color:inherit;font:inherit;font-size:13px;line-height:1.6;padding:8px 10px;outline:none;transition:.15s;}',
      '.xm-in:focus,.xm-ta:focus{border-color:rgba(255,46,77,.5);background:rgba(128,128,128,.1);}',
      '.xm-ta{resize:vertical;min-height:84px;font-family:inherit;}',
      '.xm-row{display:flex;gap:10px;}',
      '.xm-row>.xm-cell{flex:1 1 0;min-width:0;}',
      '.xm-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:4px;}',
      '.xm-chip{background:transparent;color:inherit;font:inherit;font-size:12px;border:1px solid rgba(128,128,128,.28);border-radius:980px;padding:5px 11px;cursor:pointer;user-select:none;transition:.15s;opacity:.72;}',
      '.xm-chip:hover{opacity:1;}',
      '.xm-chip.on{background:rgba(255,46,77,.14);border-color:rgba(255,46,77,.5);color:#ff4d68;opacity:1;}',
      '.xm-out{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;border:1px solid rgba(128,128,128,.22);border-radius:12px;overflow:hidden;background:rgba(128,128,128,.04);}',
      '.xm-outbar{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;border-bottom:1px solid rgba(128,128,128,.16);font-size:12px;opacity:.75;}',
      '.xm-outbody{flex:1 1 auto;min-height:0;overflow:auto;padding:12px 14px;}',
      '.xm-pre{margin:0;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.75;opacity:.92;}',
      '.xm-btn{border:1px solid rgba(128,128,128,.3);background:transparent;color:inherit;font:inherit;font-size:12px;padding:4px 11px;border-radius:7px;cursor:pointer;transition:.15s;}',
      '.xm-btn:hover{border-color:rgba(255,46,77,.5);color:#ff4d68;}',
      '.xm-btn.primary{background:rgba(255,46,77,.14);border-color:rgba(255,46,77,.5);color:#ff4d68;font-weight:600;}',
      '.xm-btn:disabled{opacity:.4;cursor:not-allowed;}',
      '.xm-tools{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}',
      '.xm-foot{flex:0 0 auto;padding:8px 24px 14px;font-size:11.5px;opacity:.45;}',
      '.xm-toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:rgba(20,20,22,.92);color:#fff;font-size:12.5px;padding:8px 16px;border-radius:999px;box-shadow:0 6px 24px rgba(0,0,0,.28);z-index:9999;}',
      '.xm-draft{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid rgba(128,128,128,.2);border-radius:10px;margin-bottom:8px;font-size:12.5px;}',
      '.xm-draft .grow{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.xm-draft .meta{opacity:.5;font-size:11px;}',
      '.xm-left.xm-full{flex:1 1 auto;max-width:none;}',
      /* 左侧导航 + 外壳 */
      '.xm-shell{display:flex;flex:1 1 auto;min-height:0;gap:0;}',
      '.xm-rail{flex:0 0 126px;display:flex;flex-direction:column;gap:2px;padding:10px 8px 10px 10px;border-right:1px solid rgba(128,128,128,.16);}',
      '.xm-rail-item{display:flex;align-items:center;gap:8px;padding:7px 9px;border:0;background:transparent;color:inherit;font:inherit;font-size:12.5px;opacity:.6;border-radius:8px;cursor:pointer;text-align:left;white-space:nowrap;transition:.15s;}',
      '.xm-rail-item:hover{opacity:1;background:rgba(128,128,128,.08);}',
      '.xm-rail-item.on{opacity:1;background:rgba(255,46,77,.12);color:#ff4d68;font-weight:600;}',
      '.xm-rail-ico{width:16px;text-align:center;font-size:13px;opacity:.9;}',
      '.xm-shell-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;}',
      /* 表格视图 */
      '.xm-tbl-wrap{max-width:100%;overflow:auto;border:1px solid rgba(128,128,128,.18);border-radius:12px;}',
      '.xm-tbl{min-width:980px;}',
      '.xm-trow{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(128,128,128,.12);}',
      '.xm-trow:last-child{border-bottom:0;}',
      '.xm-trow.done{background:rgba(46,204,113,.045);}',
      '.xm-trow.picked{background:rgba(255,46,77,.07);box-shadow:inset 3px 0 0 #ff2e4d;}',
      '.xm-thead{position:sticky;top:0;background:rgba(128,128,128,.1);font-size:11px;letter-spacing:.04em;opacity:.72;z-index:1;}',
      '.xm-tcell{min-width:0;}',
      '.xm-tc-check{flex:0 0 18px;}',
      '.xm-tc-item{flex:1 1 240px;min-width:196px;display:flex;gap:10px;align-items:center;}',
      '.xm-tthumb{flex:0 0 44px;width:44px;height:56px;border-radius:7px;object-fit:cover;background:rgba(128,128,128,.14);}',
      '.xm-tmain{min-width:0;}',
      '.xm-tname{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:250px;}',
      '.xm-tmeta{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:4px;font-size:11px;opacity:.8;}',
      '.xm-tc-score{flex:0 0 104px;display:flex;flex-direction:column;gap:3px;font-size:11px;}',
      '.xm-stars{color:#f6c445;letter-spacing:1px;font-size:11.5px;}',
      '.xm-tc-hot{flex:0 0 118px;display:flex;gap:8px;align-items:center;}',
      '.xm-hot{width:20px;height:20px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;}',
      '.hot-s{background:rgba(255,46,77,.18);color:#ff4d68;}',
      '.hot-a{background:rgba(255,159,64,.18);color:#ff9f40;}',
      '.hot-b{background:rgba(64,158,255,.16);color:#409eff;}',
      '.hot-c{background:rgba(128,128,128,.14);color:inherit;}',
      '.xm-tmetrics{font-size:10.5px;opacity:.72;line-height:1.55;}',
      '.xm-tmetrics i{font-style:normal;opacity:.6;}',
      '.xm-tc-data{flex:0 0 84px;font-size:11px;line-height:1.6;}',
      '.xm-tdata{opacity:.82;white-space:nowrap;}',
      '.xm-tc-tags{flex:0 0 138px;display:flex;gap:4px;flex-wrap:wrap;align-items:center;}',
      '.xm-tc-act{flex:0 0 152px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end;}',
      '.xm-tc-act .xm-btn{padding:3px 8px;font-size:11.5px;border-radius:7px;line-height:1.5;}',
      '.xm-thead.xm-trow{padding:8px 14px;}',
      /* 学习库（多维表格） */
      '.xm-lib{display:flex;flex-direction:column;gap:10px;padding:4px 2px 30px;min-height:0;}',
      '.xm-lib-h{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;}',
      '.xm-lib-h b{font-size:17px;font-weight:700;}',
      '.xm-lib-bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}',
      '.xm-lib-sep{width:1px;height:16px;background:rgba(128,128,128,.24);margin:0 4px;}',
      '.xm-lib-q{flex:1 1 200px;min-width:160px;max-width:320px;}',
      '.xm-lib-add{display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid rgba(128,128,128,.18);border-radius:12px;background:rgba(255,255,255,.03);}',
      '.xm-lib-addrow{display:flex;gap:8px;flex-wrap:wrap;}',
      '.xm-lib-ta{min-height:76px;resize:vertical;font:inherit;}',
      '.xm-lib-addact{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}',
      '.xm-lib-tbl{max-height:none;}',
      '.xm-lib-tbl .xm-tbl{min-width:0;width:100%;}',
      '.xm-tr{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(128,128,128,.12);}',
      '.xm-tr:last-child{border-bottom:0;}',
      '.xm-tr.picked{background:rgba(255,46,77,.07);box-shadow:inset 3px 0 0 #ff2e4d;}',
      '.xm-tr.xm-tr-head{position:sticky;top:0;background:rgba(128,128,128,.1);font-size:11px;letter-spacing:.04em;opacity:.72;z-index:1;padding:8px 12px;}',
      '.xm-lc-check{flex:0 0 20px;}',
      '.xm-lc-kind{flex:0 0 78px;}',
      '.xm-lc-main{flex:1 1 280px;min-width:200px;cursor:pointer;}',
      '.xm-lc-src{flex:0 0 118px;display:flex;gap:6px;align-items:center;overflow:hidden;}',
      '.xm-lc-data{flex:0 0 128px;font-size:11px;opacity:.85;}',
      '.xm-lc-tags{flex:0 0 120px;display:flex;gap:4px;flex-wrap:wrap;}',
      '.xm-lc-time{flex:0 0 78px;font-size:11px;opacity:.7;}',
      '.xm-lc-act{flex:0 0 168px;display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;}',
      '.xm-lc-act .xm-btn{padding:3px 7px;font-size:11.5px;border-radius:7px;}',
      '.xm-lib-t{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.xm-lib-s{font-size:11.5px;opacity:.62;margin-top:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
      '.xm-lib-author{font-size:11px;opacity:.72;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.xm-lib-kind{font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(128,128,128,.16);white-space:nowrap;}',
      '.xm-lib-kind.k-deconstruct{background:rgba(255,46,77,.16);color:#ff6b82;}',
      '.xm-lib-kind.k-imitate{background:rgba(64,158,255,.16);color:#66b1ff;}',
      '.xm-lib-kind.k-analysis{background:rgba(46,204,113,.16);color:#4ade80;}',
      '.xm-lib-kind.k-blogger{background:rgba(246,196,69,.18);color:#f6c445;}',
      '.xm-lib-kind.k-learn,.xm-lib-kind.k-backend{background:rgba(155,120,255,.18);color:#b39bff;}',
      '.xm-lib-kind.k-manual{background:rgba(128,128,128,.2);}',
      '.xm-lib-empty{padding:36px 16px;text-align:center;font-size:12.5px;opacity:.6;}',
      '.xm-lib-mask{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);z-index:60;display:flex;justify-content:flex-end;}',
      '.xm-lib-drawer{width:min(720px,92vw);height:100%;overflow:auto;background:#141518;border-left:1px solid rgba(255,255,255,.1);padding:16px 18px 40px;display:flex;flex-direction:column;gap:8px;color:#f2f3f5;}',
      '.xm-lib-dhead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}',
      '.xm-lib-dhead b{font-size:15px;line-height:1.4;}',
      '.xm-lib-dmeta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:11.5px;opacity:.8;}',
      '.xm-lib-dact{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 6px;}',
      '.xm-lib-pre{white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.75;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px;margin:0;max-height:none;}',

      '.xm-seg{display:inline-flex;border:1px solid rgba(128,128,128,.26);border-radius:8px;overflow:hidden;}',
      '.xm-seg-btn{border:0;background:transparent;color:inherit;font:inherit;font-size:11.5px;padding:4px 9px;cursor:pointer;opacity:.62;}',
      '.xm-seg-btn.on{background:rgba(255,46,77,.16);color:#ff4d68;opacity:1;}',
      /* 看板 */
      '.xm-board{display:flex;flex-direction:column;gap:14px;padding:4px 2px 24px;min-height:0;overflow:auto;}',
      '.xm-board-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}',
      '.xm-board-title{font-size:17px;font-weight:700;}',
      '.xm-board-sub{font-size:12px;opacity:.55;margin-top:3px;}',
      '.xm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:10px;}',
      '.xm-stat{border:1px solid rgba(128,128,128,.18);border-radius:12px;padding:11px 13px;background:rgba(128,128,128,.04);}',
      '.xm-stat-k{font-size:11.5px;opacity:.6;}',
      '.xm-stat-v{font-size:22px;font-weight:700;margin-top:4px;letter-spacing:-.02em;}',
      '.xm-stat-s{font-size:11px;opacity:.55;margin-top:3px;}',
      '.xm-board-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:10px;}',
      '.xm-dist{border:1px solid rgba(128,128,128,.18);border-radius:12px;padding:11px 13px;}',
      '.xm-dist-h{font-size:12px;font-weight:600;opacity:.8;margin-bottom:8px;}',
      '.xm-dist-row{display:flex;align-items:center;gap:8px;font-size:11.5px;margin-bottom:5px;}',
      '.xm-dist-k{flex:0 0 92px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.8;}',
      '.xm-dist-track{flex:1 1 auto;height:6px;border-radius:999px;background:rgba(128,128,128,.16);overflow:hidden;}',
      '.xm-dist-track i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ff2e4d,#ff6a3d);}',
      '.xm-dist-n{flex:0 0 26px;text-align:right;opacity:.6;}',
      '.xm-usage{font-size:12px;line-height:1.9;}',
      '.xm-usage-cost{color:#ff4d68;font-weight:600;}',
      '.xm-dim{opacity:.55;font-size:11.5px;}',
      '.xm-board-tablehead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;font-size:12.5px;font-weight:600;}',
      '.xm-cap{display:flex;flex-direction:column;gap:9px;}',
      '.xm-cap-bar{display:flex;align-items:center;gap:8px;font-size:12px;opacity:.72;margin-bottom:2px;flex-wrap:wrap;}',
      '.xm-cap-item{display:flex;gap:10px;padding:9px 10px;border:1px solid rgba(128,128,128,.2);border-radius:10px;background:rgba(128,128,128,.03);}',
      '.xm-cap-item img{width:52px;height:52px;border-radius:8px;object-fit:cover;flex:0 0 auto;background:rgba(128,128,128,.12);}',
      '.xm-cap-ph{width:52px;height:52px;border-radius:8px;flex:0 0 auto;background:rgba(128,128,128,.12);}',
      '.xm-cap-main{flex:1 1 auto;min-width:0;}',
      '.xm-cap-title{font-size:13px;font-weight:600;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
      '.xm-cap-meta{font-size:11px;opacity:.55;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.xm-cap-act{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap;}',
      '.xm-cap-filters{display:inline-flex;gap:4px;}',
      '.xm-mini{border:1px solid rgba(128,128,128,.24);background:transparent;color:inherit;font:inherit;font-size:11px;padding:2px 9px;border-radius:999px;cursor:pointer;opacity:.6;}',
      '.xm-mini:hover{opacity:.9;}',
      '.xm-mini.on{background:rgba(255,46,77,.14);border-color:rgba(255,46,77,.5);color:#ff4d68;opacity:1;}',
      '.xm-cap-badges{display:flex;gap:5px;row-gap:4px;flex-wrap:wrap;margin-bottom:4px;align-items:center;}',
      '.xm-badge{font-size:10px;line-height:1;padding:3px 6px;border-radius:4px;background:rgba(128,128,128,.16);opacity:.8;white-space:nowrap;flex:0 0 auto;}',
      '.xm-badge.plat-xhs{background:rgba(255,46,77,.16);color:#ff4d68;}',
      '.xm-badge.plat-douyin{background:rgba(37,244,238,.16);color:#00c9c4;}',
      '.xm-cap-empty{padding:16px 16px;border:1px dashed rgba(128,128,128,.32);border-radius:12px;font-size:12.5px;line-height:2;opacity:.8;}',
      '.xm-cap-empty b{opacity:.95;}',
        '.xm-tk{margin:6px 0 2px;padding:10px 12px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.03);display:flex;flex-direction:column;gap:8px;}',
  '.xm-tk-h{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;}',
  '.xm-tk-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
  '.xm-tk-row .xm-cap-search{flex:1 1 260px;min-width:200px;}','.xm-cap-search{border:1px solid rgba(128,128,128,.24);background:transparent;color:inherit;font:inherit;font-size:11.5px;padding:3px 9px;border-radius:999px;width:150px;outline:none;}',
      '.xm-cap-search:focus{border-color:rgba(255,46,77,.55);}',
      '.xm-cap-note{font-size:11.5px;line-height:1.7;padding:6px 10px;border-radius:8px;background:rgba(255,171,0,.1);border:1px solid rgba(255,171,0,.28);}',
      '.xm-cap-prog{position:relative;height:22px;border-radius:999px;background:rgba(128,128,128,.14);overflow:hidden;}',
      '.xm-cap-prog i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#ff2e4d,#ff6a3d);transition:width .4s;}',
      '.xm-cap-prog span{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:11px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4);}',
      '.xm-cap-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;}',
      '.xm-cap-card{display:flex;gap:10px;padding:9px;border:1px solid rgba(128,128,128,.2);border-radius:11px;background:rgba(128,128,128,.03);}',
      '.xm-cap-card.done{border-color:rgba(61,220,132,.34);background:rgba(61,220,132,.05);}',
      '.xm-genbar{display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:10px 12px;border:1px solid rgba(255,70,90,.28);border-radius:12px;background:linear-gradient(90deg,rgba(255,46,77,.10),rgba(255,106,61,.04));flex-wrap:wrap;}',
'.xm-genbtn{font-weight:700;letter-spacing:.5px;}',
'.xm-genhint{font-size:12px;color:#9aa0a6;flex:1 1 160px;min-width:120px;}',
'.xm-gen{display:flex;flex-direction:column;gap:10px;height:100%;}',
'.xm-genpre{flex:1 1 auto;margin:0;white-space:pre-wrap;}',
'.xm-genmeta{font-size:12px;color:#9aa0a6;border-top:1px dashed rgba(255,255,255,.10);padding-top:8px;}',
        '.xm-kb{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:8px 0 6px;}',
        '.xm-kb-h{font-size:12px;color:#9aa0a6;}',
        '.xm-kb-chip{font-size:12px;padding:2px 8px;border-radius:999px;background:rgba(255,120,90,.12);color:#ffb9a8;border:1px solid rgba(255,120,90,.28);max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
'.xm-works{display:flex;flex-direction:column;gap:10px;}',
'.xm-works-h{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}',
'.xm-works-h b{font-size:15px;}',
'.xm-work{border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:10px 12px;background:rgba(255,255,255,.02);display:flex;flex-direction:column;gap:8px;}',
'.xm-work.adopted{border-color:rgba(80,200,140,.45);background:rgba(80,200,140,.05);}',
'.xm-work-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
'.xm-work-t{font-weight:600;font-size:13px;}',
'.xm-work-time{margin-left:auto;font-size:11px;}',
'.xm-work-body{font-size:13px;color:#cfd3d8;white-space:pre-wrap;line-height:1.6;max-height:220px;overflow:auto;}',
'.xm-work-act{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
'.xm-btn.xs{padding:4px 10px;font-size:12px;border-radius:8px;}',
'.xm-btn.xs.danger{color:#ff6b81;border-color:rgba(255,107,129,.35);}',
'.xm-cap-card.picked{border-color:rgba(255,46,77,.5);background:rgba(255,46,77,.07);}',
      '.xm-cap-check{position:absolute;left:5px;top:5px;width:15px;height:15px;margin:0;accent-color:#ff2e4d;cursor:pointer;z-index:2;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5));}',
      '.xm-cap-sel{font-size:11.5px;color:#ff6a3d;white-space:nowrap;}',
      '.xm-bulk{padding:9px 11px;border-radius:11px;border:1px solid rgba(255,46,77,.28);background:rgba(255,46,77,.06);display:flex;flex-direction:column;gap:8px;}',
      '.xm-bulk-h{font-size:11.5px;opacity:.8;}',
      '.xm-bulk-row{display:flex;gap:10px;flex-wrap:wrap;}',
      '.xm-bulk-row label{display:flex;flex-direction:column;gap:3px;font-size:11px;opacity:.85;}',
      '.xm-bulk-in{border:1px solid rgba(128,128,128,.26);background:transparent;color:inherit;font:inherit;font-size:11.5px;padding:4px 8px;border-radius:7px;outline:none;min-width:130px;}',
      '.xm-bulk-in:focus{border-color:rgba(255,46,77,.55);}',
      '.xm-bulk-act{display:flex;gap:8px;}',
      '.xm-btn.danger{border-color:rgba(255,46,77,.4);color:#ff6a6a;}',
      '.xm-cap-cover{position:relative;width:74px;height:98px;flex:0 0 auto;border-radius:8px;overflow:hidden;background:rgba(128,128,128,.12);}',
      '.xm-cap-cover img{width:100%;height:100%;object-fit:cover;display:block;}',
      '.xm-cap-cover .xm-cap-ph{width:100%;height:100%;border-radius:0;}',
      '.xm-cap-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:26px;height:26px;line-height:26px;text-align:center;font-size:11px;color:#fff;background:rgba(0,0,0,.5);border-radius:50%;}',
      '.xm-cap-dur{position:absolute;right:3px;bottom:3px;font-size:10px;padding:1px 4px;border-radius:3px;background:rgba(0,0,0,.62);color:#fff;}',
      '.xm-cap-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;}',
      '.xm-cap-sum{font-size:11px;line-height:1.6;margin-top:4px;opacity:.72;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
      '.xm-cap-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;}',
      '.xm-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(128,128,128,.12);opacity:.72;}',
      '.xm-badge.ok{background:rgba(61,220,132,.18);color:#2fb96b;}',
      '.xm-cap-code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;background:rgba(128,128,128,.14);padding:1px 5px;border-radius:4px;word-break:break-all;}',
      '.xm-prog{height:6px;border-radius:99px;background:rgba(128,128,128,.2);overflow:hidden;margin:8px 0 6px;}',
      '.xm-prog i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#ff2e4d,#ff6a3d);transition:width .35s ease;}',
      '.xm-stage{font-size:12px;opacity:.8;display:flex;justify-content:space-between;gap:10px;}',
      '.xm-err{color:#ff6a6a;font-size:12.5px;line-height:1.8;padding:10px 12px;border:1px solid rgba(255,90,90,.35);background:rgba(255,90,90,.08);border-radius:10px;}',
      '.xm-mx{display:flex;flex-direction:column;gap:14px;}',
      '.xm-mx-sec{border:1px solid rgba(128,128,128,.16);border-radius:10px;padding:10px 12px;background:rgba(128,128,128,.03);}',
      '.xm-mx-h{font-size:11.5px;letter-spacing:.06em;opacity:.55;margin-bottom:6px;text-transform:uppercase;}',
      '.xm-mx-t{font-size:13px;line-height:1.85;white-space:pre-wrap;word-break:break-word;}',
      '.xm-linkbox{display:flex;gap:8px;margin:0 0 10px;}',
      '.xm-linkbox .xm-input{flex:1;}',
      '.xm-mx-via{display:inline-block;margin-top:6px;padding:2px 9px;border-radius:980px;background:rgba(10,132,255,.14);color:#4aa8ff;font-size:12px;}',
      '.xm-mx-kv{display:flex;gap:8px;font-size:12.5px;line-height:1.9;}',
      '.xm-mx-kv b{flex:0 0 52px;opacity:.6;font-weight:400;}',
      '.xm-tl-row{display:flex;gap:10px;font-size:12.5px;line-height:1.75;padding:6px 0;border-top:1px dashed rgba(128,128,128,.16);}',
      '.xm-tl-row:first-child{border-top:0;}',
      '.xm-tl-t{flex:0 0 42px;font-family:ui-monospace,Menlo,Consolas,monospace;opacity:.65;}',
      '.xm-frames{display:flex;gap:8px;overflow-x:auto;padding:2px 0 6px;}',
      '.xm-frame{flex:0 0 auto;width:118px;border-radius:8px;overflow:hidden;border:1px solid rgba(128,128,128,.24);background:#000;}',
      '.xm-frame img{width:100%;display:block;aspect-ratio:9/16;object-fit:cover;}',
      '.xm-frame span{display:block;font-size:11px;padding:3px 6px;opacity:.75;background:rgba(0,0,0,.4);color:#fff;}',
      '.xm-mx-act{display:flex;gap:8px;flex-wrap:wrap;}',
      /* ---------- Apple-ish refresh：字体 / 圆角 / 留白 / 蓝色强调 ---------- */
      '.xm-page{color:inherit;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","PingFang SC","Helvetica Neue",Arial,sans-serif;letter-spacing:.1px;}',
      '.xm-h1{font-size:22px;font-weight:600;letter-spacing:-.28px;line-height:1.16;}',
      '.xm-h2{font-size:17px;font-weight:600;letter-spacing:-.2px;}',
      '.xm-dim{opacity:.56;}',
      '.xm-rail{padding:10px 8px;gap:4px;}',
  


    '.xm-md{display:flex;flex-direction:column;gap:8px;font-size:13.2px;line-height:1.72;padding:2px 2px 10px;}',
    '.xm-md-h{font-weight:650;letter-spacing:-.01em;margin-top:6px;}',
    '.xm-md-h1{font-size:19px;}.xm-md-h2{font-size:16.5px;}.xm-md-h3{font-size:14.6px;}.xm-md-h4{font-size:13.6px;}',
    '.xm-md-p{white-space:pre-wrap;opacity:.94;}',
    '.xm-md-list{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:3px;}',
    '.xm-md-q{border-left:2px solid rgba(74,168,255,.6);padding:2px 0 2px 10px;opacity:.8;white-space:pre-wrap;}',
    '.xm-md-tblwrap{overflow:auto;border:1px solid rgba(255,255,255,.09);border-radius:10px;}',
    '.xm-md-tbl{width:100%;border-collapse:collapse;font-size:12.6px;}',
    '.xm-md-tbl th{text-align:left;font-weight:600;padding:8px 10px;background:rgba(255,255,255,.05);white-space:nowrap;}',
    '.xm-md-tbl td{padding:8px 10px;border-top:1px solid rgba(255,255,255,.07);vertical-align:top;}',
    '.xm-pick{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);}',
    '.xm-pick-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;}',
    '.xm-pick-body{display:flex;flex-direction:column;gap:4px;}',
    '.xm-pick-t{font-size:14px;font-weight:600;}',
    '.xm-pick-p{font-size:12.5px;line-height:1.6;opacity:.66;white-space:pre-wrap;}',
    '.xm-pick-list{display:flex;flex-direction:column;gap:6px;max-height:340px;overflow:auto;padding-top:6px;}',
    '.xm-pick-item{display:flex;align-items:center;gap:8px;text-align:left;font:inherit;font-size:12.5px;color:inherit;background:transparent;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 10px;cursor:pointer;}',
    '.xm-pick-item:hover{background:rgba(255,255,255,.06);}',
    '.xm-pick-item-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.xm-insp{display:flex;flex-direction:column;gap:10px;padding:16px 18px;}',
    '.xm-insp-add{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:14px;background:rgba(255,255,255,.04);}',
    '.xm-insp-ta{min-height:62px;resize:vertical;font:inherit;font-size:13px;line-height:1.6;color:inherit;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 10px;}',
    '.xm-insp-list{display:flex;flex-direction:column;gap:8px;}',
    '.xm-insp-item{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.045);}',
    '.xm-insp-item.done{opacity:.55;}',
    '.xm-insp-txt{font-size:13px;line-height:1.65;white-space:pre-wrap;}',
    '.xm-insp-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;}',
    '.xm-input{font:inherit;font-size:12.5px;color:inherit;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.1);border-radius:980px;padding:6px 12px;}',
    '.xm-rail-group{display:flex;flex-direction:column;gap:2px;margin-bottom:10px;}',
    '.xm-rail{position:relative;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;overscroll-behavior:contain;}',
    '.xm-rail::-webkit-scrollbar{width:6px;}',
    '.xm-rail::-webkit-scrollbar-thumb{background:rgba(255,255,255,.16);border-radius:3px;}',
    '.xm-rail-group{flex:0 0 auto;}',
    '.xm-rail-grip{position:absolute;top:0;right:0;width:7px;height:100%;cursor:col-resize;display:flex;align-items:center;justify-content:center;z-index:3;}',
    '.xm-rail-grip:hover,.xm-rail-grip:active{background:rgba(10,132,255,.22);}',
    '.xm-rail-grip-dot{width:2px;height:28px;border-radius:2px;background:rgba(255,255,255,.22);}',
    '.xm-rail-grip:hover .xm-rail-grip-dot{background:#4aa8ff;}',
    '.xm-rail-txt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}',
      '.xm-rail-label{font-size:10.5px;letter-spacing:.6px;opacity:.36;padding:6px 9px 4px;text-transform:uppercase;}',
      '.xm-rail-item{flex:0 0 auto;padding:7px 10px;border-radius:9px;font-size:12.5px;opacity:.72;}',
      '.xm-rail-item:hover{opacity:1;background:rgba(255,255,255,.06);}',
      '.xm-rail-item.on{background:rgba(10,132,255,.16);color:#4aa8ff;font-weight:600;opacity:1;}',
      '.xm-btn{border-radius:980px;padding:7px 15px;font-weight:500;transition:.16s;}',
      '.xm-btn:hover{filter:brightness(1.08);}',
      '.xm-btn.xs{padding:4px 11px;font-size:12px;}',
      '.xm-mini{border-radius:980px;padding:3px 10px;}',
      '.xm-mini.on{background:rgba(10,132,255,.2);color:#6fb6ff;border-color:transparent;}',
      '.xm-sel{border-radius:9px;padding:6px 10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:inherit;font:inherit;font-size:12.5px;}',
      '.xm-cap-card,.xm-work,.xm-tbl-wrap,.xm-tk,.xm-mx-sec{border-radius:14px;}',
      '.xm-cap-card{transition:transform .16s ease,box-shadow .16s ease;}',
      '.xm-cap-card:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(0,0,0,.34);}',
      '.xm-kb-chip{border-radius:980px;}',
      '.xm-spark{display:block;opacity:.9;}',
      '.xm-up{color:#32d74b;}',
      '.xm-down{color:#ff453a;}',

      /* ---------- 热榜 ---------- */
      '.xm-hotpage{display:flex;flex-direction:column;gap:12px;padding:16px 18px;overflow:visible;}',
      '.xm-hot-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}',
      '.xm-hot-h b{font-size:20px;letter-spacing:-.3px;}',
      '.xm-hot-bar{display:flex;flex-direction:column;gap:8px;}',
      '.xm-hot-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
      '.xm-hot-row .xm-cap-search{flex:1 1 280px;min-width:200px;}',
      '.xm-hot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;}',
      '.xm-hot-card{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.045);}',
      '.xm-hot-rank{font-size:15px;font-weight:700;color:#4aa8ff;min-width:34px;}',
      '.xm-hot-main{flex:1;min-width:0;}',
      '.xm-hot-title{font-size:14px;font-weight:600;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
      '.xm-hot-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;opacity:.62;margin-top:4px;}',
      '.xm-hot-card{flex-direction:column;gap:8px;align-items:stretch;}',
      '.xm-hot-top{display:flex;gap:10px;align-items:flex-start;}',
      '.xm-hot-main{flex:1;min-width:0;}',
      '.xm-hot-side{display:flex;align-items:center;gap:6px;}',
      '.xm-hot-grid{align-items:start;}',
      '.xm-hotpage{scroll-behavior:auto;}',
      '.xm-hot-kcard{display:flex;gap:10px;padding:10px;border-radius:14px;background:rgba(255,255,255,.045);}',
      '.xm-hot-cover{width:82px;height:110px;object-fit:cover;border-radius:10px;background:rgba(255,255,255,.06);flex:0 0 82px;}',
      '.xm-hot-cover.xm-ph{display:block;}',
      '.xm-hot-kbody{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;}',
      '.xm-hot-act{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;}',

      /* ---------- 我的账号 / 找博主 ---------- */
      '.xm-accpage,.xm-blogpage{display:flex;flex-direction:column;gap:12px;padding:16px 18px;overflow:visible;}',
      '.xm-hotpage,.xm-accpage,.xm-blogpage{width:100%;box-sizing:border-box;align-self:stretch;min-width:0;flex:0 0 auto;height:auto;color:inherit;align-items:stretch;overflow:visible;}',
      '.xm-hotpage *,.xm-accpage *,.xm-blogpage *{color:inherit;}',
      '.xm-hot-rank,.xm-hot-title b{color:#4aa8ff;}',
      '.xm-left > *{min-width:0;}',
      '.xm-acc-card,.xm-blog-card,.xm-blog-profile{display:flex;gap:12px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.045);align-items:flex-start;}',
      '.xm-acc-card.star{box-shadow:inset 0 0 0 1px rgba(10,132,255,.45);}',
      '.xm-blog-profile{background:rgba(10,132,255,.1);}',
      '.xm-acc-av{width:46px;height:46px;border-radius:50%;object-fit:cover;background:rgba(255,255,255,.08);flex:0 0 46px;}',
      '.xm-acc-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;}',
      '.xm-acc-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:14px;}',
      '.xm-page{color:#f2f3f5;}',
    '.xm-set,.xm-set *{box-sizing:border-box;}',
    '.xm-set{display:flex;flex-direction:column;gap:10px;padding:2px 2px 24px;max-width:100%;min-width:0;color:inherit;}',
    '.xm-set .xm-h1{font-size:20px;font-weight:600;letter-spacing:-.3px;}',
    '.xm-set .xm-h2{font-size:13px;font-weight:600;margin-top:8px;opacity:.9;}',
    '.xm-set .xm-sub{font-size:12px;opacity:.62;line-height:1.6;color:inherit;}',
    '.xm-set .xm-note{font-size:12px;color:#4aa8ff;background:rgba(10,132,255,.12);border-radius:8px;padding:7px 10px;}',
    '.xm-keycard{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:7px;}',
    '.xm-keycard.ok{border-color:rgba(48,209,88,.28);background:rgba(48,209,88,.05);}',
    '.xm-keyhead{display:flex;align-items:center;gap:8px;}',
    '.xm-keyt{font-size:13px;font-weight:600;}',
    '.xm-keybadge{font-size:10.5px;padding:1px 7px;border-radius:999px;background:rgba(255,255,255,.09);opacity:.7;}',
    '.xm-keybadge.on{background:rgba(48,209,88,.18);color:#5ce07a;opacity:1;}',
    '.xm-keyfrom{font-size:11px;opacity:.45;margin-left:auto;}',
    '.xm-keytip{font-size:11.5px;opacity:.62;line-height:1.55;color:inherit;}',
    '.xm-keycard .xm-input{width:100%;font-size:12px;}',
    '.xm-stat4{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;}',
    '.xm-mini-card{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 12px;background:rgba(255,255,255,.03);display:flex;flex-direction:column;gap:3px;}',
    '.xm-mini-k{font-size:11px;opacity:.66;color:inherit;}',
    '.xm-mini-v{font-size:18px;font-weight:600;letter-spacing:-.2px;}',
    '.xm-mini-s{font-size:11px;opacity:.6;color:inherit;}',
    '.xm-tbl-s{width:100%;min-width:0;table-layout:auto;border-collapse:collapse;font-size:12px;}',
    '.xm-tbl-s th{text-align:left;font-weight:500;font-size:11px;opacity:.45;padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.08);}',
    '.xm-tbl-s td{padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.05);opacity:.85;}',
    '.xm-lab{display:flex;flex-direction:column;gap:4px;font-size:11px;opacity:.7;flex:1 1 140px;min-width:0;color:inherit;}',
    '.xm-bk{display:flex;flex-direction:column;gap:12px;max-width:100%;min-width:0;}',
    '.xm-bk,.xm-bk *{box-sizing:border-box;}',
    '.xm-bk-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}',
    '.xm-bk-empty{border:1px dashed rgba(255,255,255,.16);border-radius:14px;padding:22px;display:flex;flex-direction:column;gap:12px;}',
    '.xm-bk-emptyt{font-size:15px;font-weight:600;}',
    '.xm-bk-steps{margin:0;padding-left:20px;font-size:12.5px;line-height:2;opacity:.8;}',
    '.xm-bk-acc{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);}',
    '.xm-bk-ava{width:46px;height:46px;border-radius:50%;object-fit:cover;flex:0 0 auto;}',
    '.xm-bk-accinfo{min-width:0;flex:1 1 auto;}',
    '.xm-bk-nick{font-size:14px;font-weight:600;}',
    '.xm-bk-sig{font-size:11.5px;opacity:.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.xm-bk-accnums{display:flex;gap:18px;flex:0 0 auto;}',
    '.xm-bk-accnums div{display:flex;flex-direction:column;align-items:flex-end;font-size:10.5px;opacity:.6;}',
    '.xm-bk-accnums .xm-num{font-size:15px;font-weight:600;opacity:1;}',
    '.xm-bk-cell{display:flex;align-items:center;gap:9px;min-width:0;}',
    '.xm-bk-cover{width:44px;height:44px;border-radius:8px;object-fit:cover;flex:0 0 auto;background:rgba(255,255,255,.06);}',
    '.xm-bk-cover.ph{display:inline-block;}',
    '.xm-bk-title{font-size:12.5px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;max-width:420px;}',
    '.xm-bk-tt{display:flex;flex-direction:column;gap:3px;min-width:0;}',
    '.xm-bk-tags{display:flex;gap:5px;flex-wrap:wrap;}',
    '.xm-bk-tag{font-style:normal;font-size:10px;line-height:1;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,.08);opacity:.6;}',
    '.xm-bk-tag.mine{background:rgba(48,209,88,.16);color:#5ce07a;opacity:1;}',
    '.xm-bk-tag.feed{background:rgba(255,159,10,.14);color:#ffb340;opacity:1;}',
    '.xm-bk-tag.q{background:rgba(0,113,227,.16);color:#7fbcff;opacity:1;}',
    '.xm-bk-mx{display:flex;flex-direction:column;gap:14px;padding:14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);}',
    '.xm-bk-mxh{font-size:12.5px;font-weight:600;opacity:.75;margin-bottom:8px;}',
    '.xm-mxgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:8px;}',
    '.xm-mx-card{padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.06);}',
    '.xm-mx-k{font-size:10.5px;opacity:.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.xm-mx-v{font-size:16px;font-weight:600;margin-top:3px;letter-spacing:-.2px;}',
    '.xm-ptgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;}',
    '.xm-pt{padding:10px 11px;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);}',
    '.xm-pt-h{font-size:11px;opacity:.55;margin-bottom:6px;}',
    '.xm-pt-row{display:flex;align-items:center;gap:7px;margin:3px 0;font-size:11.5px;}',
    '.xm-pt-n{width:56px;flex:0 0 auto;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.xm-pt-bar{flex:1 1 auto;height:6px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden;}',
    '.xm-pt-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ff4d5e,#ff8a3d);}',
    '.xm-pt-v{width:46px;text-align:right;flex:0 0 auto;opacity:.6;font-variant-numeric:tabular-nums;}',
    '.xm-bk-acts{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;}',
    '.xm-bk-act{display:flex;gap:10px;padding:10px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);}',
    '.xm-bk-actimg{width:54px;height:54px;border-radius:9px;object-fit:cover;flex:0 0 auto;}',
    '.xm-bk-actbody{min-width:0;display:flex;flex-direction:column;gap:3px;}',
    '.xm-bk-actname{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.xm-bk-acttip{font-size:11px;opacity:.55;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '.xm-bk-actmeta{font-size:10.5px;opacity:.42;}',
    '.xm-bk-src{font-size:11.5px;opacity:.55;}',
    '.xm-bk-src summary{cursor:pointer;opacity:.75;}',
    '.xm-bk-src ul{margin:6px 0 0;padding-left:18px;line-height:1.7;}',
    '.xm-bk-do{display:flex;gap:8px;flex-wrap:wrap;flex:0 0 auto;}',
    '.xm-bk-filters{display:flex;flex-direction:column;gap:8px;}',
    '.xm-bk-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
    '.xm-bk-lb{font-size:11.5px;opacity:.5;min-width:30px;}',
    '.xm-bk-accops{gap:8px;flex-wrap:wrap;align-items:center;}',
    '.xm-bk-rename{display:inline-flex;gap:6px;align-items:center;}',
    '.xm-bk-namein{min-width:180px;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;font:inherit;font-size:12px;}',
    '.xm-bk-new{display:inline-flex;gap:6px;align-items:center;margin-left:auto;flex-wrap:wrap;}',
    '.xm-bk-platsel{padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.16);background:rgba(20,21,25,.9);color:inherit;font:inherit;font-size:12px;}',
    '.xm-bk-uplist{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 8px;}',
    '.xm-bk-upitem{padding:4px 9px;border-radius:980px;background:rgba(0,113,227,.14);border:1px solid rgba(0,113,227,.3);color:#7fbcff;font-size:11px;}',
    '.xm-bk-up{padding:12px 14px;border-radius:12px;background:rgba(0,113,227,.1);border:1px solid rgba(0,113,227,.28);display:flex;flex-direction:column;gap:10px;}',
    '.xm-bk-up-h{font-size:12.5px;color:#9ecbff;}',
    '.xm-bk-uphint{font-size:11.5px;color:rgba(255,255,255,.55);margin:-4px 0 2px;}',
    '.xm-bk-tip{margin-left:auto;font-size:11.5px;color:rgba(255,255,255,.5);align-self:center;}',
    '.xm-bk-tt{display:flex;flex-direction:column;gap:4px;min-width:0;}',
    '.xm-bk-tags{display:flex;gap:6px;flex-wrap:wrap;}',
    '.xm-bk-tag{font-style:normal;font-size:10.5px;padding:1px 7px;border-radius:999px;background:rgba(255,255,255,.09);opacity:.85;}',
    '.xm-bk-tag.mine{background:rgba(0,113,227,.24);color:#9ecbff;opacity:1;}',
    '.xm-bk-tag.feed{background:rgba(255,138,0,.18);color:#ffbe6b;opacity:1;}',
    '.xm-bk-gen{padding:14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);display:flex;flex-direction:column;gap:10px;}',
    '.xm-bk-genh{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;opacity:.8;}',
    '.xm-bk-gmeta{font-size:11.5px;color:#9ecbff;}',
    '.xm-kbcard{border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:14px;background:rgba(255,255,255,.03);display:flex;flex-direction:column;gap:10px;}',
    '.xm-kbcard-h{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12.5px;opacity:.85;}',
    '.xm-kbsrc{font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(52,199,89,.16);color:#7fe0a0;}',
    '.xm-kbsrc.warn{background:rgba(255,159,10,.16);color:#ffcf7a;}',
    '.xm-kbline{display:flex;gap:8px;flex-wrap:wrap;}',
    '.xm-kbdocs{display:flex;gap:6px;flex-wrap:wrap;max-height:132px;overflow:auto;}',
    '.xm-kbdoc{font:inherit;font-size:11.5px;color:inherit;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:4px 9px;cursor:pointer;}',
    '.xm-kbdoc:hover{background:rgba(0,113,227,.22);border-color:rgba(0,113,227,.4);}',
    '.xm-kbsearch{display:flex;gap:8px;}',
    '.xm-kbhits{display:flex;flex-direction:column;gap:8px;}',
    '.xm-kbhit{display:flex;flex-direction:column;gap:3px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);font-size:11.5px;}',
    '.xm-kbhit b{font-weight:600;color:#9ecbff;}',
    '.xm-kbhit span{opacity:.7;line-height:1.55;}',
    '.xm-kbdocbox{border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;}',
    '.xm-kbdocbox-h{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;background:rgba(255,255,255,.05);font-size:12px;}',
    '.xm-keydone{padding:10px 12px;border-radius:10px;background:rgba(52,199,89,.12);border:1px solid rgba(52,199,89,.28);font-size:12px;color:#8fe3ab;}',
    '.xm-kbdocpre{margin:0;padding:12px;max-height:320px;overflow:auto;font-size:12px;line-height:1.7;white-space:pre-wrap;word-break:break-word;background:rgba(0,0,0,.2);}',
    '.xm-kv{display:flex;gap:10px;font-size:12px;}',
    '.xm-kv-k{opacity:.45;flex:0 0 76px;}',
    '.xm-kv-v{opacity:.85;word-break:break-all;}',
    '@media (max-width:900px){.xm-body{flex-direction:column;overflow:auto;}.xm-left{flex:0 0 auto;max-width:none;overflow:visible;}.xm-right{min-height:320px;}}',
    ].join('')

    function useStyles() {
      useEffect(function () {
        const id = 'debao-media-style'
        if (document.getElementById(id)) return
        const el = document.createElement('style')
        el.id = id
        el.textContent = CSS
        document.head.appendChild(el)
        return function () {
          const node = document.getElementById(id)
          if (node && node.parentNode) node.parentNode.removeChild(node)
        }
      }, [])
    }

    /* ------------------------------------------------------------------ *
     * 小组件
     * ------------------------------------------------------------------ */
    function Label(props) {
      return h(
        'div',
        { className: 'xm-label' },
        h('span', null, props.text),
        props.hint ? h('span', { className: 'xm-hint' }, props.hint) : null,
      )
    }

    function Input(props) {
      return h('input', {
        className: 'xm-in',
        value: props.value,
        placeholder: props.placeholder || '',
        type: props.type || 'text',
        onChange: function (e) {
          props.onChange(e.target.value)
        },
      })
    }

    function Area(props) {
      return h('textarea', {
        className: 'xm-ta',
        value: props.value,
        placeholder: props.placeholder || '',
        style: props.style || null,
        onChange: function (e) {
          props.onChange(e.target.value)
        },
      })
    }

    function Chips(props) {
      return h(
        'div',
        { className: 'xm-chips' },
        props.items.map(function (item) {
          const on = !!props.value[item.key]
          return h(
            'div',
            {
              key: item.key,
              className: 'xm-chip' + (on ? ' on' : ''),
              title: item.desc,
              onClick: function () {
                props.onToggle(item.key, !on)
              },
            },
            item.key,
          )
        }),
      )
    }

    function Drafts(props) {
      if (!props.items.length) return h('div', { className: 'xm-hint', style: { paddingTop: 6 } }, t('common.empty'))
      return h(
        'div',
        null,
        props.items.map(function (d) {
          return h(
            'div',
            { key: d.id, className: 'xm-draft' },
            h('span', { className: 'grow', title: d.label }, d.label || '(未命名)'),
            h('span', { className: 'meta' }, d.tabLabel + ' · ' + new Date(d.at).toLocaleString()),
            h(
              'button',
              {
                className: 'xm-btn',
                onClick: function () {
                  props.onLoad(d)
                },
              },
              t('common.load'),
            ),
            h(
              'button',
              {
                className: 'xm-btn',
                onClick: function () {
                  props.onDelete(d.id)
                },
              },
              t('common.del'),
            ),
          )
        }),
      )
    }

    /* ------------------------------------------------------------------ *
     * 页面
     * ------------------------------------------------------------------ */
    function Capture(props) {
      const [items, setItems] = useState([])
      const [analyses, setAnalyses] = useState([])
      const [state, setState] = useState('loading')
      const [err, setErr] = useState('')
      const [platFilter, setPlatFilter] = useState('all')
      const [kindFilter, setKindFilter] = useState('all')
      const [linkOnly, setLinkOnly] = useState(false)
      const [q, setQ] = useState('')
      const [busy, setBusy] = useState(null)
      const [batch, setBatch] = useState(null)
      const [note, setNote] = useState('')
      /* 勾选 + 批量编辑（删/改分类·评分·备注） */
      const [sel, setSel] = useState([])
      const [editOpen, setEditOpen] = useState(false)
      const [ef, setEf] = useState({ category: '', rating: '', remark: '' })
      /* 卡片 / 列表两种视图，排序（学多维表格那一套） */
      const [view, setView] = useState(function () {
        try {
          return localStorage.getItem('dsh.debao.view.v1') || 'card'
        } catch (e) {
          return 'card'
        }
      })
      const [sort, setSort] = useState('recent')
      /* 云端拉取（TikHub）：贴链接/博主/关键词就能进库，不用开浏览器 */
      const [tkOpen, setTkOpen] = useState(false)
      const [tkMode, setTkMode] = useState('note')
      const [tkPlat, setTkPlat] = useState('xhs')
      const [tkInput, setTkInput] = useState('')
      const [tkPages, setTkPages] = useState(1)
      const [tkBusy, setTkBusy] = useState(false)
      const [tkMsg, setTkMsg] = useState('')
      const [tkStat, setTkStat] = useState(null)

      const load = useCallback(function () {
        Promise.all([
          fetch(BRIDGE_BASE + '/api/queue', { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status)
            return r.json()
          }),
          fetch(BRIDGE_BASE + '/api/analyses', { cache: 'no-store' })
            .then(function (r) {
              return r.ok ? r.json() : { items: [] }
            })
            .catch(function () {
              return { items: [] }
            }),
        ])
          .then(function (res) {
            setItems(Array.isArray(res[0].items) ? res[0].items : [])
            setAnalyses(Array.isArray(res[1].items) ? res[1].items : [])
            setState('ok')
            setErr('')
          })
          .catch(function (e) {
            setState('offline')
            setErr(String((e && e.message) || e))
          })
      }, [])

      const parsedOf = function (it) {
        for (let i = 0; i < analyses.length; i++) {
          const a = analyses[i]
          if (a && (a.ref === it.id || (it.videoUrl && a.ref === it.videoUrl))) return a
        }
        return null
      }

      const pollJob = function (jobId, onTick) {
        return new Promise(function (resolve) {
          let n = 0
          const step = function () {
            fetch(BRIDGE_BASE + '/api/analyze/status?id=' + encodeURIComponent(jobId), { cache: 'no-store' })
              .then(function (r) {
                return r.json()
              })
              .then(function (j) {
                if (onTick) onTick(j)
                if (j && j.done) return resolve(j)
                n++
                if (n > 300) return resolve({ ok: false, error: '等太久了（超过 6 分钟）' })
                setTimeout(step, 1200)
              })
              .catch(function (e) {
                resolve({ ok: false, error: String((e && e.message) || e) })
              })
          }
          step()
        })
      }

      const diagText = function (it) {
        const d = it.diag || {}
        const bits = [
          'vue ' + (d.vue ? '有' : '无'),
          'fiber ' + (d.fiber ? '有' : '无'),
          '后台旁观 ' + ((d.sw || []).length || 0) + ' 条',
          '页面候选 ' + ((d.pageCandidates || []).length || 0) + ' 条',
        ]
        return bits.join(' / ')
      }

      const analyzeOne = function (it) {
        if (!it.videoUrl && !it.localFile) {
          const d = it.diag ? '（上次采集诊断：' + diagText(it) + '）' : ''
          setNote('这条没有视频直链：回浏览器打开它、按一下播放，再点「采集到自媒体库」（扩展会把视频直接存到本机），然后刷新这里' + d)
          return Promise.resolve(null)
        }
        setNote('')
        setBusy({ id: it.id, pct: 3, stage: '提交…' })
        return fetch(BRIDGE_BASE + '/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: it.id,
            link: it.localFile || it.videoUrl,
            desc: [it.title || '', it.desc || ''].filter(Boolean).join('\n').slice(0, 600),
            platform: platOfItem(it),
            mode: 'video',
            how: 'auto',
            frames: 0,
          }),
        })
          .then(function (r) {
            return r.json()
          })
          .then(function (j) {
            if (!j || !j.ok || !j.id) throw new Error((j && j.error) || '解析没起来')
            return pollJob(j.id, function (s) {
              setBusy({ id: it.id, pct: (s && s.pct) || 5, stage: (s && s.stage) || '' })
            })
          })
          .then(function (done) {
            if (done && done.error) throw new Error(done.error)
            if (!done || !done.result) throw new Error('没有拿到解析结果')
            if (props.onShowResult) props.onShowResult(done.result)
            setNote('解析完成：' + (done.result.result && done.result.result.summary ? done.result.result.summary.slice(0, 30) : '已出结果'))
            return done.result
          })
          .catch(function (e) {
            setNote('解析失败：' + String((e && e.message) || e))
            return null
          })
          .then(function (out) {
            setBusy(null)
            load()
            return out
          })
      }

      const analyzeBatch = function () {
        const todo = items.filter(function (it) {
          return (!!it.videoUrl || !!it.localFile) && !parsedOf(it)
        })
        if (!todo.length) {
          setNote('没有待解析的视频了（要么都解析过，要么还没采到带直链的视频）')
          return
        }
        const list = todo.slice(0, 6)
        setBatch({ total: list.length, done: 0 })
        let i = 0
        const next = function () {
          if (i >= list.length) {
            setBatch(null)
            setNote('批量解析完成：' + list.length + ' 条')
            load()
            return
          }
          const cur = list[i]
          setBatch({ total: list.length, done: i, title: cur.title || '' })
          analyzeOne(cur).then(function () {
            i++
            next()
          })
        }
        next()
      }


      useEffect(
        function () {
          load()
        },
        [load],
      )

      const del = function (id) {
        fetch(BRIDGE_BASE + '/api/item?id=' + encodeURIComponent(id), { method: 'DELETE' })
          .then(function () {
            load()
          })
          .catch(function () {
            setState('offline')
          })
      }

      const clearAll = function () {
        fetch(BRIDGE_BASE + '/api/clear', { method: 'POST' })
          .then(function () {
            load()
          })
          .catch(function () {
            setState('offline')
          })
      }

      if (state === 'offline') {
        return h(
          'div',
          { className: 'xm-cap-empty' },
          h('div', null, h('b', null, '采集服务没连上'), err ? h('span', { style: { opacity: 0.55 } }, '  (' + err + ')') : null),
          h('div', null, '① 双击运行：'),
          h('div', null, h('span', { className: 'xm-cap-code' }, 'plugins\\debao-media\\bridge\\start-bridge.bat')),
          h('div', null, '② 装浏览器扩展（只需一次）：打开 ', h('span', { className: 'xm-cap-code' }, 'chrome://extensions'), ' → 右上角开「开发者模式」→「加载已解压的扩展程序」→ 选 ', h('span', { className: 'xm-cap-code' }, 'plugins\\debao-media\\bridge\\extension'), ' 这个文件夹'),
          h('div', null, '③ 打开小红书笔记页或抖音视频页，点右下角「采集到德饱」，然后回到这里按「刷新」。'),
          h('div', { style: { marginTop: 8 } }, h('button', { className: 'xm-btn', onClick: load }, '重新连接')),
        )
      }

      const platOf = function (it) {
        return platOfItem(it)
      }
      const kw = q.trim().toLowerCase()
      const shown = items.filter(function (it) {
        if (platFilter !== 'all' && platOf(it) !== platFilter) return false
        const kind = kindOfItem(it)
        if (kindFilter === 'video' && kind !== 'video') return false
        if (kindFilter === 'image' && kind === 'video') return false
        if (linkOnly && !it.videoUrl && !it.localFile) return false
        if (kw) {
          const hay = [it.title, it.desc, (it.tags || []).join(' '), (it.author || {}).name].join(' ').toLowerCase()
          if (hay.indexOf(kw) < 0) return false
        }
        return true
      })
      const videoCount = items.filter(function (it) {
        return kindOfItem(it) === 'video'
      }).length
      const linkCount = items.filter(function (it) {
        return !!it.videoUrl || !!it.localFile
      }).length
      const doneCount = items.filter(function (it) {
        return !!parsedOf(it)
      }).length

      /* 排序：看的是同一条内容在同类里排第几，不是绝对数 */
      const sorted = shown.slice().sort(function (a, b) {
        if (sort === 'likes') return numOf(a) - numOf(b)
        if (sort === 'collect') return collectRatio(b) - collectRatio(a)
        if (sort === 'comment') return commentRatio(b) - commentRatio(a)
        return Number(b.capturedAt || 0) - Number(a.capturedAt || 0)
      })
      const setViewAnd = function (v) {
        setView(v)
        try {
          localStorage.setItem('dsh.debao.view.v1', v)
        } catch (e) {
          /* ignore */
        }
      }

      const chip = function (label, on) {
        return { label: label, on: on }
      }

      /* ---------------- 勾选 / 批量操作 ---------------- */
      const toggleSel = function (id) {
        setSel(function (cur) {
          return cur.indexOf(id) >= 0
            ? cur.filter(function (x) {
                return x !== id
              })
            : cur.concat([id])
        })
      }
      const bulk = function (path, body) {
        setNote('处理中…')
        return fetch(BRIDGE_BASE + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then(function (r) {
            return r.json()
          })
          .then(function (j) {
            if (!j || !j.ok) throw new Error((j && j.error) || '操作失败')
            return j
          })
      }
      const bulkDelete = function () {
        if (!sel.length) return
        const ids = sel.slice()
        bulk('/api/bulk-delete', { ids: ids })
          .then(function (j) {
            setSel([])
            setEditOpen(false)
            setNote('已删除 ' + (j.removed || ids.length) + ' 条')
            load()
          })
          .catch(function (e) {
            setNote('删除失败：' + ((e && e.message) || e))
          })
      }
      const bulkApply = function () {
        if (!sel.length) return
        const body = { ids: sel.slice() }
        const clear = []
        if (String(ef.category || '').trim()) body.category = String(ef.category).trim()
        else clear.push('category')
        if (String(ef.remark || '').trim()) body.remark = String(ef.remark).trim()
        else clear.push('remark')
        if (String(ef.rating || '').trim()) body.rating = Number(ef.rating)
        else clear.push('rating')
        if (clear.length) body.clear = clear
        bulk('/api/bulk-patch', body)
          .then(function (j) {
            setNote('已更新 ' + (j.updated || sel.length) + ' 条')
            setEditOpen(false)
            load()
          })
          .catch(function (e) {
            setNote('保存失败：' + ((e && e.message) || e))
          })
      }
      const mkChips = function (list, cur, set) {
        return h(
          'div',
          { className: 'xm-cap-filters' },
          list.map(function (o) {
            return h(
              'button',
              {
                key: o.k,
                className: 'xm-mini' + (cur === o.k ? ' on' : ''),
                onClick: function () {
                  set(o.k)
                },
              },
              o.label,
            )
          }),
        )
      }

      const shownIds = sorted.map(function (it) {
        return it.id
      })
      const allChecked = shownIds.length > 0 && shownIds.every(function (id) {
        return sel.indexOf(id) >= 0
      })
      const toggleAll = function () {
        setSel(allChecked ? [] : shownIds.slice())
      }

      const tkStatus = function () {
        fetch(BRIDGE_BASE + '/api/tikhub/status?usage=1', { cache: 'no-store' })
          .then(function (r) {
            return r.json()
          })
          .then(function (j) {
            if (j && j.ok) setTkStat(j)
          })
          .catch(function () {})
      }

      const tkPull = function () {
        const input = String(tkInput || '').trim()
        if (!input) {
          setTkMsg('先贴一条链接 / 用户主页 / 关键词')
          return
        }
        setTkBusy(true)
        setTkMsg('正在向 TikHub 拉取…')
        const body = { platform: tkPlat, pages: tkPages, save: true }
        let path = '/api/tikhub/fetch'
        if (tkMode === 'user') {
          path = '/api/tikhub/user'
          body.input = input
        } else if (tkMode === 'search') {
          path = '/api/tikhub/search'
          body.keyword = input
        } else {
          body.input = input
        }
        fetch(BRIDGE_BASE + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then(function (r) {
            return r.json().then(function (j) {
              return { ok: r.ok, j: j || {} }
            })
          })
          .then(function (res) {
            setTkBusy(false)
            if (!res.ok || !res.j.ok) {
              setTkMsg('失败：' + (res.j.error || '未知错误'))
              return
            }
            setTkMsg('拉回 ' + res.j.count + ' 条，入库 ' + res.j.saved + ' 条')
            load()
          })
          .catch(function (e) {
            setTkBusy(false)
            setTkMsg('采集桥没响应：' + String((e && e.message) || e))
          })
      }

      const bar = h(
        'div',
        { className: 'xm-cap-bar' },
        h(
          'span',
          null,
          itemCountText({ total: items.length, shown: shown.length, video: videoCount, link: linkCount, done: doneCount }),
        ),
        mkChips(
          [
            { k: 'all', label: '全部' },
            { k: 'xhs', label: '小红书' },
            { k: 'douyin', label: '抖音' },
          ],
          platFilter,
          setPlatFilter,
        ),
        mkChips(
          [
            { k: 'all', label: '全部类型' },
            { k: 'video', label: '视频' },
            { k: 'image', label: '图文' },
          ],
          kindFilter,
          setKindFilter,
        ),
        h(
          'button',
          {
            className: 'xm-mini' + (linkOnly ? ' on' : ''),
            onClick: function () {
              setLinkOnly(!linkOnly)
            },
            title: '只显示带视频直链的',
          },
          '有直链',
        ),
        h('input', {
          className: 'xm-cap-search',
          placeholder: '搜标题 / 作者 / 标签',
          value: q,
          onChange: function (e) {
            setQ(e.target.value)
          },
        }),
        h('span', { style: { flex: '1 1 auto' } }),
        h(
          'div',
          { className: 'xm-seg' },
          h(
            'button',
            { className: 'xm-seg-btn' + (view === 'card' ? ' on' : ''), onClick: function () { setViewAnd('card') } },
            '▦ ' + t('lib.card'),
          ),
          h(
            'button',
            { className: 'xm-seg-btn' + (view === 'list' ? ' on' : ''), onClick: function () { setViewAnd('list') } },
            '☰ ' + t('lib.list'),
          ),
        ),
        h(
          'select',
          {
            className: 'xm-cap-search',
            style: { width: 108 },
            value: sort,
            onChange: function (e) {
              setSort(e.target.value)
            },
            title: '排序',
          },
          [
            { k: 'recent', label: t('lib.sortRecent') },
            { k: 'likes', label: t('lib.sortLikes') },
            { k: 'collect', label: t('lib.sortRatio') },
            { k: 'comment', label: t('lib.sortCraft') },
          ].map(function (o) {
            return h('option', { key: o.k, value: o.k }, o.label)
          }),
        ),
        h(
          'button',
          {
            className: 'xm-mini' + (allChecked ? ' on' : ''),
            onClick: toggleAll,
            title: '全选当前筛选出来的结果',
          },
          allChecked ? '取消全选' : '全选',
        ),
        sel.length ? h('span', { className: 'xm-cap-sel' }, '已选 ' + sel.length) : null,
        sel.length
          ? h(
              'button',
              {
                className: 'xm-btn',
                onClick: function () {
                  setEditOpen(!editOpen)
                },
              },
              editOpen ? '收起编辑' : '编辑选中',
            )
          : null,
        sel.length ? h('button', { className: 'xm-btn danger', onClick: bulkDelete }, '删除选中') : null,
        h(
          'button',
          {
            className: 'xm-btn primary',
            onClick: analyzeBatch,
            disabled: !!batch,
            title: '把还没解析过的视频挨个跑一遍（最多 6 条）',
          },
          batch ? '批量解析 ' + batch.done + '/' + batch.total : '一键解析全部视频',
        ),
        h(
          'button',
          {
            className: 'xm-btn' + (tkOpen ? ' primary' : ''),
            onClick: function () {
              setTkOpen(!tkOpen)
              if (!tkOpen) tkStatus()
            },
            title: '不用打开浏览器：贴链接 / 博主主页 / 关键词，直接从云端拉进库',
          },
          tkOpen ? '收起云端' : '☁ 云端拉取',
        ),
        h('button', { className: 'xm-btn', onClick: load }, '刷新'),
        items.length ? h('button', { className: 'xm-btn', onClick: clearAll }, '清空') : null,
      )

      const status = []
      if (batch) {
        status.push(
          h(
            'div',
            { className: 'xm-cap-note' },
            '批量解析中：' + batch.done + ' / ' + batch.total + (batch.title ? ' · ' + batch.title.slice(0, 24) : ''),
          ),
        )
      }
      if (busy) {
        status.push(
          h(
            'div',
            { className: 'xm-cap-prog' },
            h('i', { style: { width: Math.max(3, busy.pct || 3) + '%' } }),
            h('span', null, (busy.stage || '解析中') + ' · ' + Math.round(busy.pct || 0) + '%'),
          ),
        )
      }
      if (note) status.push(h('div', { className: 'xm-cap-note' }, note))

      if (tkOpen) {
        status.push(
          h(
            'div',
            { className: 'xm-tk' },
            h(
              'div',
              { className: 'xm-tk-h' },
              '☁ 云端拉取（TikHub）',
              h(
                'span',
                { className: 'xm-dim' },
                tkPlat === 'douyin'
                  ? '抖音单条可用免费额度 · 约 ¥0.01/次'
                  : '小红书接口需付费余额（不接受免费额度）',
              ),
            ),
            tkStat && tkStat.usage
              ? h(
                  'div',
                  { className: 'xm-dim', style: { fontSize: 12, lineHeight: '20px', minHeight: 20, whiteSpace: 'normal' } },
                  '账号 ' +
                    (tkStat.usage.email || '?') +
                    ' · 今日 ' +
                    (tkStat.usage.total || 0) +
                    ' 次 · 已用 $' +
                    Number(tkStat.usage.usage || 0).toFixed(4) +
                    '（小红书 / 关键词搜索这两类接口不接受免费额度，余额为 0 时会直接报 402）',
                )
              : null,
            h(
              'div',
              { className: 'xm-tk-row' },
              mkChips(
                [
                  { k: 'xhs', label: '小红书' },
                  { k: 'douyin', label: '抖音' },
                ],
                tkPlat,
                setTkPlat,
              ),
              mkChips(
                [
                  { k: 'note', label: '单条链接' },
                  { k: 'user', label: '博主主页' },
                  { k: 'search', label: '关键词搜索' },
                ],
                tkMode,
                setTkMode,
              ),
            ),
            h(
              'div',
              { className: 'xm-tk-row' },
              h('input', {
                className: 'xm-cap-search',
                placeholder:
                  tkMode === 'search'
                    ? '关键词，例如：露营装备'
                    : tkMode === 'user'
                      ? '博主主页链接（/user/profile/… 或 /user/MS4w…）'
                      : '笔记 / 视频链接，或纯 id',
                value: tkInput,
                onChange: function (e) {
                  setTkInput(e.target.value)
                },
                onKeyDown: function (e) {
                  if (e.key === 'Enter') tkPull()
                },
              }),
              tkMode === 'note'
                ? null
                : h(
                    'select',
                    {
                      className: 'xm-cap-search',
                      style: { width: 92 },
                      value: String(tkPages),
                      onChange: function (e) {
                        setTkPages(Number(e.target.value))
                      },
                      title: '抓几页（每页 20 条左右）',
                    },
                    [1, 2, 3, 4, 5].map(function (n) {
                      return h('option', { key: 'tkp' + n, value: String(n) }, n + ' 页')
                    }),
                  ),
              h(
                'button',
                { className: 'xm-btn primary', onClick: tkPull, disabled: tkBusy },
                tkBusy ? '拉取中…' : '拉取并入库',
              ),
              h(
                'button',
                {
                  className: 'xm-btn',
                  onClick: function () {
                    setTkOpen(false)
                  },
                },
                '收起',
              ),
            ),
            tkMsg ? h('div', { className: 'xm-cap-note' }, tkMsg) : null,
          ),
        )
      }

      if (editOpen && sel.length) {
        const setE = function (k) {
          return function (e) {
            setEf(Object.assign({}, ef, { [k]: e.target.value }))
          }
        }
        status.push(
          h(
            'div',
            { className: 'xm-bulk' },
            h('div', { className: 'xm-bulk-h' }, '批量编辑 ' + sel.length + ' 条（留空 = 清空该字段）'),
            h(
              'div',
              { className: 'xm-bulk-row' },
              h('label', null, '分类', h('input', { className: 'xm-bulk-in', value: ef.category, placeholder: '对标 / 我的 / 选题素材', onChange: setE('category') })),
              h(
                'label',
                null,
                '对标评分',
                h(
                  'select',
                  { className: 'xm-bulk-in', value: ef.rating, onChange: setE('rating') },
                  ['', '1', '2', '3', '4', '5'].map(function (v) {
                    return h('option', { key: 'r' + v, value: v }, v ? v + ' 星' : '（清空）')
                  }),
                ),
              ),
              h('label', null, '备注', h('input', { className: 'xm-bulk-in', value: ef.remark, placeholder: '例如：结构可抄 / 封面要学', onChange: setE('remark') })),
            ),
            h(
              'div',
              { className: 'xm-bulk-act' },
              h('button', { className: 'xm-btn primary', onClick: bulkApply }, '应用到 ' + sel.length + ' 条'),
              h(
                'button',
                {
                  className: 'xm-btn',
                  onClick: function () {
                    setEditOpen(false)
                  },
                },
                '取消',
              ),
            ),
          ),
        )
      }

      if (state === 'offline') {
        return h(
          'div',
          { className: 'xm-cap-empty' },
          h('div', null, h('b', null, '采集服务没连上'), err ? h('span', { style: { opacity: 0.55 } }, '  (' + err + ')') : null),
          h('div', null, '① 双击运行：'),
          h('div', null, h('span', { className: 'xm-cap-code' }, 'plugins\\debao-media\\bridge\\start-bridge.bat')),
          h('div', null, '② 装浏览器扩展（只需一次）：打开 ', h('span', { className: 'xm-cap-code' }, 'chrome://extensions'), ' → 右上角开「开发者模式」→「加载已解压的扩展程序」→ 选 ', h('span', { className: 'xm-cap-code' }, 'plugins\\debao-media\\bridge\\extension'), ' 这个文件夹'),
          h('div', null, '③ 打开小红书笔记页或抖音视频页，点右下角「采集到自媒体库」，然后回到这里按「刷新」。'),
          h('div', { style: { marginTop: 8 } }, h('button', { className: 'xm-btn', onClick: load }, '重新连接')),
        )
      }

      if (!items.length) {
        return h(
          'div',
          { className: 'xm-cap' },
          bar,
          status,
          h(
            'div',
            { className: 'xm-cap-empty' },
            h('div', null, h('b', null, '库里还没有东西。')),
            h('div', null, '打开小红书笔记页或抖音视频页 → 点右下角「采集到自媒体库」→ 回到这里按「刷新」，标题、正文、标签、赞藏评会一起进来；视频会带上能直接解析的流地址。'),
            h('div', { style: { opacity: 0.6 } }, '采集只走本机 127.0.0.1:53210，不联网、不上传。采集卡右上角能看到「直链」标记，有标记才能一键解析。'),
          ),
        )
      }

      const grid = h(
        'div',
        { className: 'xm-cap-grid' },
        sorted.map(function (it) {
          const s = it.stats || {}
          const a = it.author || {}
          const kind = kindOfItem(it)
          const done = parsedOf(it)
          const isBusy = busy && busy.id === it.id
          const meta = [a.name || '未知作者', '赞 ' + (s.likes || 0), '藏 ' + (s.collects || 0), '评 ' + (s.comments || 0)]
            .filter(Boolean)
            .join(' · ')
          const summary = done && done.result && done.result.summary ? done.result.summary : ''
          return h(
            'div',
            { key: it.id, className: 'xm-cap-card' + (done ? ' done' : '') + (sel.indexOf(it.id) >= 0 ? ' picked' : '') },
            h(
              'div',
              { className: 'xm-cap-cover' },
              it.coverUrl ? h('img', { src: it.coverUrl, alt: '', loading: 'lazy', referrerPolicy: 'no-referrer' }) : h('div', { className: 'xm-cap-ph' }),
              kind === 'video' ? h('span', { className: 'xm-cap-play' }, '▶') : null,
              it.durationSec ? h('span', { className: 'xm-cap-dur' }, fmtDur(it.durationSec)) : null,
              h('input', {
                type: 'checkbox',
                className: 'xm-cap-check',
                checked: sel.indexOf(it.id) >= 0,
                title: '勾选后可批量删除 / 改分类·评分·备注',
                onChange: function () {
                  toggleSel(it.id)
                },
              }),
            ),
            h(
              'div',
              { className: 'xm-cap-body' },
              h(
                'div',
                { className: 'xm-cap-badges' },
                h('span', { className: 'xm-badge plat-' + platOf(it) }, t('plat.' + platOf(it))),
                h('span', { className: 'xm-badge' }, kind === 'video' ? '视频' : '图文'),
                it.source === 'creator' ? h('span', { className: 'xm-badge' }, '后台') : null,
                it.localFile ? h('span', { className: 'xm-badge ok', title: it.localFile }, '本机') : null,
                it.videoUrl
                  ? h('span', { className: 'xm-badge ok', title: '来源：' + (it.videoUrlFrom || '采集时带上') + '\n' + it.videoUrl }, '直链')
                  : null,
                done ? h('span', { className: 'xm-badge ok' }, '已解析') : null,
              ),
              h('div', { className: 'xm-cap-title', title: it.title }, it.title || '(无标题)'),
              h('div', { className: 'xm-cap-meta', title: meta }, meta),
              summary ? h('div', { className: 'xm-cap-sum' }, '解析：' + summary) : null,
              it.tags && it.tags.length
                ? h(
                    'div',
                    { className: 'xm-cap-tags' },
                    it.tags.slice(0, 5).map(function (x) {
                      return h('span', { key: x, className: 'xm-tag' }, '#' + x)
                    }),
                  )
                : null,
              h(
                'div',
                { className: 'xm-cap-act' },
                kind === 'video'
                  ? h(
                      'button',
                      { className: 'xm-btn primary', disabled: isBusy || !!batch, onClick: function () { analyzeOne(it) } },
                      isBusy ? '解析中…' : done ? '重新解析' : '解析视频',
                    )
                  : null,
                done
                  ? h(
                      'button',
                      { className: 'xm-btn', onClick: function () { if (props.onShowResult) props.onShowResult(done) } },
                      '看解析',
                    )
                  : null,
                h('button', { className: 'xm-btn', onClick: function () { props.onUse(it, 'deconstruct') } }, '拆解'),
                h('button', { className: 'xm-btn', onClick: function () { props.onUse(it, 'imitate') } }, '仿写'),
                it.url ? h('a', { className: 'xm-btn', href: it.url, target: '_blank', rel: 'noreferrer', style: { textDecoration: 'none' } }, '原帖') : null,
                h('button', { className: 'xm-btn', onClick: function () { del(it.id) } }, '删除'),
              ),
            ),
          )
        }),
      )

      /* 列表模式：一列一列看，像多维表格 */
      const rows = sorted.map(function (it) {
        const s = it.stats || {}
        const a = it.author || {}
        const kind = kindOfItem(it)
        const done = parsedOf(it)
        const hot = hotOf(it)
        const isBusy = busy && busy.id === it.id
        return h(
          'div',
          { key: it.id, className: 'xm-trow' + (sel.indexOf(it.id) >= 0 ? ' picked' : '') + (done ? ' done' : '') },
          h(
            'div',
            { className: 'xm-tcell xm-tc-check' },
            h('input', {
              type: 'checkbox',
              className: 'xm-cap-check',
              checked: sel.indexOf(it.id) >= 0,
              onChange: function () {
                toggleSel(it.id)
              },
            }),
          ),
          h(
            'div',
            { className: 'xm-tcell xm-tc-item' },
            it.coverUrl
              ? h('img', { className: 'xm-tthumb', src: it.coverUrl, alt: '', loading: 'lazy', referrerPolicy: 'no-referrer' })
              : h('div', { className: 'xm-tthumb xm-cap-ph' }),
            h(
              'div',
              { className: 'xm-tmain' },
              h('div', { className: 'xm-tname', title: it.title }, it.title || '(无标题)'),
              h(
                'div',
                { className: 'xm-tmeta' },
                h('span', { className: 'xm-badge plat-' + platOf(it) }, t('plat.' + platOf(it))),
                h('span', { className: 'xm-badge' }, kind === 'video' ? '视频 ' + (it.durationSec ? fmtDur(it.durationSec) : '') : '图文'),
                it.localFile ? h('span', { className: 'xm-badge ok' }, '本机') : null,
                it.videoUrl ? h('span', { className: 'xm-badge ok' }, '直链') : null,
                a.name ? h('span', { className: 'xm-dim' }, a.name) : null,
              ),
            ),
          ),
          h(
            'div',
            { className: 'xm-tcell xm-tc-score' },
            h('span', { className: 'xm-stars', title: '对标评分' }, it.rating ? starsOf(it.rating) : '☆☆☆☆☆'),
            it.category ? h('span', { className: 'xm-dim' }, it.category) : null,
          ),
          h(
            'div',
            { className: 'xm-tcell xm-tc-hot' },
            h('span', { className: 'xm-hot ' + hot.cls }, hot.label),
            h(
              'div',
              { className: 'xm-tmetrics' },
              h('div', null, h('i', null, t('lib.ratioCollect')), ' ' + collectRatio(it).toFixed(1) + '%'),
              h('div', null, h('i', null, t('lib.ratioComment')), ' ' + commentRatio(it).toFixed(1) + '%'),
            ),
          ),
          h(
            'div',
            { className: 'xm-tcell xm-tc-data' },
            h('div', { className: 'xm-tdata' }, '赞 ' + fmtNum(s.likes || 0)),
            h('div', { className: 'xm-tdata' }, '藏 ' + fmtNum(s.collects || 0)),
            h('div', { className: 'xm-tdata' }, '评 ' + fmtNum(s.comments || 0)),
          ),
          h(
            'div',
            { className: 'xm-tcell xm-tc-tags' },
            (it.tags || []).slice(0, 3).map(function (x) {
              return h('span', { key: x, className: 'xm-tag' }, '#' + x)
            }),
            done ? h('span', { className: 'xm-badge ok' }, '已解析') : null,
          ),
          h(
            'div',
            { className: 'xm-tcell xm-tc-act' },
            kind === 'video'
              ? h(
                  'button',
                  { className: 'xm-btn primary', disabled: isBusy || !!batch, onClick: function () { analyzeOne(it) } },
                  isBusy ? '解析中…' : done ? '重解析' : '解析',
                )
              : null,
            h('button', { className: 'xm-btn', onClick: function () { props.onUse(it, 'deconstruct') } }, '拆解'),
            h('button', { className: 'xm-btn', onClick: function () { props.onUse(it, 'imitate') } }, '仿写'),
            done
              ? h('button', { className: 'xm-btn', onClick: function () { if (props.onShowResult) props.onShowResult(done) } }, '看解析')
              : null,
            it.url ? h('a', { className: 'xm-btn', href: it.url, target: '_blank', rel: 'noreferrer', style: { textDecoration: 'none' } }, '原帖') : null,
            h('button', { className: 'xm-btn', onClick: function () { del(it.id) } }, '删'),
          ),
        )
      })

      const listView = h(
        'div',
        { className: 'xm-tbl-wrap' },
        h(
          'div',
          { className: 'xm-tbl' },
          h(
            'div',
            { className: 'xm-trow xm-thead' },
            h('div', { className: 'xm-tcell xm-tc-check' }, ''),
            h('div', { className: 'xm-tcell xm-tc-item' }, t('lib.col.item')),
            h('div', { className: 'xm-tcell xm-tc-score' }, t('lib.col.score')),
            h('div', { className: 'xm-tcell xm-tc-hot' }, t('lib.col.metric')),
            h('div', { className: 'xm-tcell xm-tc-data' }, t('lib.col.data')),
            h('div', { className: 'xm-tcell xm-tc-tags' }, t('lib.col.tags')),
            h('div', { className: 'xm-tcell xm-tc-act' }, t('lib.col.act')),
          ),
          rows,
        ),
      )

      return h(
        'div',
        { className: 'xm-cap' },
        bar,
        status,
        sorted.length ? (view === 'list' ? listView : grid) : h('div', { className: 'xm-cap-empty' }, '这个筛选下没有内容，换个条件试试。'),
      )
    }

    function itemCountText(c) {
      const base = '库 ' + c.total + ' 条 · 视频 ' + c.video + ' · 有直链 ' + c.link + ' · 已解析 ' + c.done
      return c.shown === c.total ? base : base + ' · 当前显示 ' + c.shown
    }

    function fmtDur(sec) {
      const n = Math.max(0, Math.round(Number(sec) || 0))
      const m = Math.floor(n / 60)
      const s = n % 60
      return m + ':' + (s < 10 ? '0' : '') + s
    }

    /* 多维表格那几个指标：收藏率、评论率、爆款等级（比率均为百分比 0-100） */
    function numOf(it) {
      const s = (it && it.stats) || {}
      return Number(s.likes) || 0
    }
    function collectRatio(it) {
      const s = (it && it.stats) || {}
      const l = Number(s.likes) || 0
      const c = Number(s.collects) || 0
      return l > 0 ? (c / l) * 100 : 0
    }
    function commentRatio(it) {
      const s = (it && it.stats) || {}
      const l = Number(s.likes) || 0
      const c = Number(s.comments) || 0
      return l > 0 ? (c / l) * 100 : 0
    }
    function hotOf(it) {
      const l = numOf(it)
      if (l >= 100000) return { key: 'S', label: 'S', cls: 'hot-s' }
      if (l >= 10000) return { key: 'A', label: 'A', cls: 'hot-a' }
      if (l >= 1000) return { key: 'B', label: 'B', cls: 'hot-b' }
      return { key: 'C', label: 'C', cls: 'hot-c' }
    }
    function fmtNum(n) {
      const v = Number(n) || 0
      if (v >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '万'
      return String(v)
    }
    function fmtMoney(n) {
      const v = Number(n) || 0
      return v < 0.01 ? '¥' + v.toFixed(4) : '¥' + v.toFixed(2)
    }
    function starsOf(n) {
      const r = Math.max(0, Math.min(5, Math.round(Number(n) || 0)))
      return '★★★★★'.slice(0, r) + '☆☆☆☆☆'.slice(0, 5 - r)
    }

    function buildMediaReport(r) {
      if (!r) return ''
      const x = r.result || {}
      const p = r.probe || {}
      const L = []
      L.push('【视频解析】' + (r.model || '') + ' · ' + (r.platform === 'douyin' ? '抖音' : r.platform === 'xhs' ? '小红书' : '通用'))
      L.push('素材：' + (p.duration || 0) + 's · ' + (p.width || 0) + '×' + (p.height || 0) + ' · ' + (p.fps || 0) + 'fps · ' + (p.hasAudio ? '有声' : '静音'))
      L.push('')
      L.push('【一句话结论】' + (x.summary || ''))
      L.push('【前 3 秒钩子】' + (x.hook || ''))
      if (Array.isArray(x.timeline) && x.timeline.length) {
        L.push('')
        L.push('【时间线】')
        x.timeline.forEach(function (t) {
          L.push('· ' + String(t.t) + 's ｜画面：' + (t.shot || '') + '｜字卡：' + (t.card || '') + '｜作用：' + (t.what || ''))
        })
      }
      if (Array.isArray(x.structure) && x.structure.length) {
        L.push('')
        L.push('【结构】')
        x.structure.forEach(function (s) {
          L.push('· ' + (s.name || '') + ' ' + (s.from || '') + '-' + (s.to || '') + 's：' + (s.what || ''))
        })
      }
      if (Array.isArray(x.reusable) && x.reusable.length) {
        L.push('')
        L.push('【可复用模板】')
        x.reusable.forEach(function (s, i) {
          L.push(i + 1 + '. ' + s)
        })
      }
      L.push('')
      L.push('【情绪】' + (x.emotion || '') + ' ｜【信息缺口】' + (x.gap || '') + ' ｜【峰值】' + (x.peakSec || '?') + 's')
      L.push('【标签】' + (x.tags || []).join(' / '))
      return L.join('\n')
    }

    function MediaResult(props) {
      const job = props.job || {}
      const r = job.result || null
      const x = (r && r.result) || {}
      const p = (r && r.probe) || {}
      const frames = (r && r.frames) || []
      const sec = function (title, node) {
        return h('div', { className: 'xm-mx-sec' }, h('div', { className: 'xm-mx-h' }, title), node)
      }
      const busy = !!job.busy && !r
      return h(
        'div',
        { className: 'xm-mx' },
        busy
          ? h(
              'div',
              null,
              h('div', { className: 'xm-prog' }, h('i', { style: { width: (job.pct || 4) + '%' } })),
              h(
                'div',
                { className: 'xm-stage' },
                h('span', null, job.stage || '准备中…'),
                h('span', null, (job.pct || 0) + '%'),
              ),
            )
          : null,
        job.error ? h('div', { className: 'xm-err' }, '解析失败：' + job.error) : null,
        r
          ? h(
              'div',
              null,
              sec(
                '素材',
                h(
                  'div',
                  null,
                  h('div', { className: 'xm-mx-t' }, (p.duration || 0) + 's · ' + (p.width || 0) + '×' + (p.height || 0) + ' · ' + (p.fps || 0) + 'fps · ' + (p.hasAudio ? '有声' : '静音') + ' · ' + (r.source && r.source.kind === 'local' ? '本地文件' : '在线直链')),
                  h(
                    'div',
                    { className: 'xm-mx-via' },
                    r.source && r.source.mode === 'video'
                      ? '整段视频理解（模型看完整段）'
                      : '抽帧 ' + frames.length + ' 帧',
                  ),
                  frames.length
                    ? h(
                        'div',
                        { className: 'xm-frames' },
                        frames.map(function (f) {
                          const url = BRIDGE_BASE + '/api/frames/' + r.id + '/' + String(f.file || '').split('/').pop()
                          return h(
                            'div',
                            { key: f.t + f.file, className: 'xm-frame' },
                            h('a', { href: url, target: '_blank', rel: 'noreferrer' }, h('img', { src: url, alt: String(f.t) + 's' })),
                            h('span', null, String(f.t) + 's'),
                          )
                        }),
                      )
                    : null,
                ),
              ),
              sec('一句话结论', h('div', { className: 'xm-mx-t' }, x.summary || '—')),
              sec('前 3 秒钩子', h('div', { className: 'xm-mx-t' }, x.hook || '—')),
              Array.isArray(x.timeline) && x.timeline.length
                ? sec(
                    '时间线',
                    h(
                      'div',
                      null,
                      x.timeline.map(function (t, i) {
                        return h(
                          'div',
                          { key: 'tl' + i, className: 'xm-tl-row', title: '画面：' + (t.shot || '') + '\n字卡：' + (t.card || '') },
                          h('div', { className: 'xm-tl-t' }, String(t.t) + 's'),
                          h('div', { style: { flex: '1 1 auto' } }, t.what || ''),
                        )
                      }),
                    ),
                  )
                : null,
              Array.isArray(x.structure) && x.structure.length
                ? sec(
                    '结构',
                    h(
                      'div',
                      null,
                      x.structure.map(function (s, i) {
                        return h(
                          'div',
                          { key: 'st' + i, className: 'xm-tl-row' },
                          h('div', { className: 'xm-tl-t' }, (s.name || '') + '\n' + (s.from || '') + '-' + (s.to || '')),
                          h('div', { style: { flex: '1 1 auto' } }, s.what || ''),
                        )
                      }),
                    ),
                  )
                : null,
              Array.isArray(x.reusable) && x.reusable.length
                ? sec(
                    '可复用模板',
                    h(
                      'div',
                      { className: 'xm-mx-t' },
                      x.reusable.map(function (s, i) {
                        return String(i + 1) + '. ' + s
                      }).join('\n'),
                    ),
                  )
                : null,
              sec(
                '情绪 / 缺口 / 峰值',
                h(
                  'div',
                  null,
                  h('div', { className: 'xm-mx-kv' }, h('b', null, '情绪'), h('span', null, x.emotion || '—')),
                  h('div', { className: 'xm-mx-kv' }, h('b', null, '缺口'), h('span', null, x.gap || '—')),
                  h('div', { className: 'xm-mx-kv' }, h('b', null, '峰值'), h('span', null, String(x.peakSec || '?') + 's')),
                  Array.isArray(x.tags) && x.tags.length
                    ? h(
                        'div',
                        { className: 'xm-chips', style: { marginTop: 6 } },
                        x.tags.map(function (tg) {
                          return h('span', { key: tg, className: 'xm-chip' }, '#' + tg)
                        }),
                      )
                    : null,
                ),
              ),
              h(
                'div',
                { className: 'xm-mx-act' },
                h('button', { className: 'xm-btn primary', onClick: props.onCopyReport }, '复制结论'),
                h('button', { className: 'xm-btn', onClick: props.onAgain }, '重新解析'),
                h('button', { className: 'xm-btn', onClick: props.onToImitate }, '照这个结构仿写 →'),
              ),
            )
          : null,
        !r && !job.error && !busy ? props.empty : null,
      )
    }

    /* ------------------------------------------------------------------ *
     * 总览看板：量 / 质 / 节奏 / 用量 一屏看完
     * ------------------------------------------------------------------ */
    function Board(props) {
      const [items, setItems] = useState([])
      const [analyses, setAnalyses] = useState([])
      const [usage, setUsage] = useState(null)
      const [state, setState] = useState('loading')
      const [sort, setSort] = useState('likes')

      const load = useCallback(function () {
        const j = function (p, d) {
          return fetch(BRIDGE_BASE + p, { cache: 'no-store' })
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status)
              return r.json()
            })
            .catch(function () {
              return d
            })
        }
        Promise.all([j('/api/queue', { items: [] }), j('/api/analyses', { items: [] }), j('/api/usage', null)])
          .then(function (res) {
            setItems((res[0] && res[0].items) || [])
            setAnalyses((res[1] && res[1].items) || [])
            setUsage(res[2] || null)
            setState('ok')
          })
          .catch(function () {
            setState('offline')
          })
      }, [])

      useEffect(function () {
        load()
      }, [load])

      if (state === 'offline') {
        return h('div', { className: 'xm-cap-empty' }, h('b', null, '采集桥没起来'), h('div', null, '双击 bridge\\start-bridge.bat，再回来按刷新。'))
      }

      const parsedOfId = function (id) {
        return analyses.filter(function (a) {
          return a && (a.ref === id || (a.meta && a.meta.url && a.meta.url === id))
        })[0]
      }
      const total = items.length
      const videoCount = items.filter(function (it) {
        return kindOfItem(it) === 'video'
      }).length
      const parsedCount = items.filter(function (it) {
        return !!parsedOfId(it.id)
      }).length
      const likes = items.map(numOf).filter(function (n) {
        return n > 0
      })
      const avgLikes = likes.length
        ? Math.round(likes.reduce(function (a, b) {
            return a + b
          }, 0) / likes.length)
        : 0
      const hotCount = likes.filter(function (n) {
        return n >= 10000
      }).length
      const ratios = items.map(collectRatio).filter(function (n) {
        return n > 0
      })
      ratios.sort(function (a, b) {
        return a - b
      })
      const collectMedian = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0

      const tagMap = {}
      items.forEach(function (it) {
        (it.tags || []).forEach(function (x) {
          const k = String(x).trim()
          if (!k) return
          tagMap[k] = tagMap[k] || { tag: k, n: 0, likes: 0 }
          tagMap[k].n += 1
          tagMap[k].likes += numOf(it)
        })
      })
      const topTags = Object.keys(tagMap)
        .map(function (k) {
          return tagMap[k]
        })
        .sort(function (a, b) {
          return b.n - a.n || b.likes - a.likes
        })
        .slice(0, 8)

      const catMap = {}
      items.forEach(function (it) {
        const k = String(it.category || '未分类').trim()
        catMap[k] = (catMap[k] || 0) + 1
      })
      const cats = Object.keys(catMap)
        .map(function (k) {
          return { k: k, n: catMap[k] }
        })
        .sort(function (a, b) {
          return b.n - a.n
        })

      const auMap = {}
      items.forEach(function (it) {
        const n = (it.author && it.author.name) || '未知作者'
        auMap[n] = auMap[n] || { n: n, c: 0, likes: 0 }
        auMap[n].c += 1
        auMap[n].likes += numOf(it)
      })
      const authors = Object.keys(auMap)
        .map(function (k) {
          return auMap[k]
        })
        .sort(function (a, b) {
          return b.c - a.c || b.likes - a.likes
        })
        .slice(0, 6)

      const card = function (label, value, sub) {
        return h(
          'div',
          { className: 'xm-stat' },
          h('div', { className: 'xm-stat-k' }, label),
          h('div', { className: 'xm-stat-v' }, value),
          sub ? h('div', { className: 'xm-stat-s' }, sub) : null,
        )
      }

      const sortedItems = items.slice().sort(function (a, b) {
        if (sort === 'likes') return numOf(b) - numOf(a)
        if (sort === 'collect') return collectRatio(b) - collectRatio(a)
        if (sort === 'recent') return Number(b.capturedAt || 0) - Number(a.capturedAt || 0)
        return numOf(b) - numOf(a)
      })

      const rows = sortedItems.map(function (it) {
        const s = it.stats || {}
        const a = it.author || {}
        const an = parsedOfId(it.id)
        const hot = hotOf(it)
        return h(
          'div',
          { key: it.id, className: 'xm-trow' },
          h(
            'div',
            { className: 'xm-tcell xm-tc-item' },
            it.coverUrl ? h('img', { className: 'xm-tthumb', src: it.coverUrl, alt: '', loading: 'lazy', referrerPolicy: 'no-referrer' }) : h('div', { className: 'xm-tthumb xm-cap-ph' }),
            h(
              'div',
              { className: 'xm-tmain' },
              h('div', { className: 'xm-tname', title: it.title }, it.title || '(无标题)'),
              h(
                'div',
                { className: 'xm-tmeta' },
                h('span', { className: 'xm-badge plat-' + platOfItem(it) }, t('plat.' + platOfItem(it))),
                h('span', { className: 'xm-badge' }, kindOfItem(it) === 'video' ? '视频' : '图文'),
                an ? h('span', { className: 'xm-badge ok' }, '已解析') : null,
                it.category ? h('span', { className: 'xm-dim' }, it.category) : null,
                a.name ? h('span', { className: 'xm-dim' }, a.name) : null,
              ),
            ),
          ),
          h(
            'div',
            { className: 'xm-tcell xm-tc-score' },
            h('span', { className: 'xm-stars' }, it.rating ? starsOf(it.rating) : '☆☆☆☆☆'),
          ),
          h(
            'div',
            { className: 'xm-tcell xm-tc-hot' },
            h('span', { className: 'xm-hot ' + hot.cls }, hot.label),
            h('div', { className: 'xm-tmetrics' }, h('div', null, '收藏率 ' + collectRatio(it).toFixed(1) + '%'), h('div', null, '评论率 ' + commentRatio(it).toFixed(1) + '%')),
          ),
          h(
            'div',
            { className: 'xm-tcell xm-tc-data' },
            h('div', { className: 'xm-tdata' }, '赞 ' + fmtNum(s.likes || 0)),
            h('div', { className: 'xm-tdata' }, '藏 ' + fmtNum(s.collects || 0)),
            h('div', { className: 'xm-tdata' }, '评 ' + fmtNum(s.comments || 0)),
          ),
          h(
            'div',
            { className: 'xm-tcell xm-tc-tags' },
            (it.tags || []).slice(0, 3).map(function (x) {
              return h('span', { key: x, className: 'xm-tag' }, '#' + x)
            }),
          ),
          h(
            'div',
            { className: 'xm-tcell xm-tc-act' },
            an
              ? h('button', { className: 'xm-btn', onClick: function () { if (props.onShowResult) props.onShowResult(an) } }, '看解析')
              : null,
            h('button', { className: 'xm-btn', onClick: function () { if (props.onUse) props.onUse(it, 'deconstruct') } }, '拆解'),
            h('button', { className: 'xm-btn', onClick: function () { if (props.onUse) props.onUse(it, 'imitate') } }, '仿写'),
            it.url ? h('a', { className: 'xm-btn', href: it.url, target: '_blank', rel: 'noreferrer', style: { textDecoration: 'none' } }, '原帖') : null,
          ),
        )
      })

      const bar = function (label, n, max) {
        const w = max > 0 ? Math.max(4, Math.round((n / max) * 100)) : 0
        return h('div', { className: 'xm-dist-row' }, h('span', { className: 'xm-dist-k' }, label), h('div', { className: 'xm-dist-track' }, h('i', { style: { width: w + '%' } })), h('span', { className: 'xm-dist-n' }, n))
      }
      const tagMax = topTags.length ? topTags[0].n : 0
      const catMax = cats.length ? cats[0].n : 0
      const auMax = authors.length ? authors[0].c : 0

      return h(
        'div',
        { className: 'xm-board' },
        h(
          'div',
          { className: 'xm-board-head' },
          h('div', null, h('div', { className: 'xm-board-title' }, t('board.title')), h('div', { className: 'xm-board-sub' }, t('board.sub'))),
          h(
          'button',
          {
            className: 'xm-btn',
            onClick: load,
          },
          '刷新',
        ),
        ),
        h(
          'div',
          { className: 'xm-stats' },
          card(t('board.total'), total, '小红书 + 抖音'),
          card(t('board.video'), videoCount, total ? Math.round((videoCount / total) * 100) + '% 是视频' : '—'),
          card(t('board.parsed'), parsedCount, total ? Math.round((parsedCount / total) * 100) + '% 已解析' : '—'),
          card(t('board.avgLikes'), fmtNum(avgLikes), '中位收藏率 ' + (collectMedian * 100).toFixed(0) + '%'),
          card(t('board.hot'), hotCount, '赞 ≥ 1 万'),
          card(
            t('board.calls'),
            usage ? String(usage.calls || 0) : '—',
            usage ? '≈ ' + fmtNum(usage.totalTokens || 0) + ' token · ' + fmtMoney(usage.cost || 0) : '桥没报用量',
          ),
        ),
        h(
          'div',
          { className: 'xm-board-cols' },
          h(
            'div',
            { className: 'xm-dist' },
            h('div', { className: 'xm-dist-h' }, t('board.byTag')),
            topTags.length ? topTags.map(function (x) { return bar('#' + x.tag, x.n, tagMax) }) : h('div', { className: 'xm-dim' }, '还没有标签'),
          ),
          h(
            'div',
            { className: 'xm-dist' },
            h('div', { className: 'xm-dist-h' }, t('board.byCat')),
            cats.length ? cats.slice(0, 8).map(function (x) { return bar(x.k, x.n, catMax) }) : h('div', { className: 'xm-dim' }, '还没有分类（批量编辑里可改）'),
          ),
          h(
            'div',
            { className: 'xm-dist' },
            h('div', { className: 'xm-dist-h' }, t('board.byAuthor')),
            authors.length ? authors.map(function (x) { return bar(x.n, x.c, auMax) }) : h('div', { className: 'xm-dim' }, '还没有作者'),
          ),
          h(
            'div',
            { className: 'xm-dist' },
            h('div', { className: 'xm-dist-h' }, t('board.usage')),
            usage
              ? h(
                  'div',
                  { className: 'xm-usage' },
                  h('div', null, t('board.calls') + '：' + (usage.calls || 0) + ' 次 · 帧 ' + (usage.frames || 0)),
                  h('div', null, '输入 ' + fmtNum(usage.promptTokens || 0) + ' · 输出 ' + fmtNum(usage.completionTokens || 0)),
                  h('div', null, '均值：in ' + (usage.avgPrompt || 0) + ' / out ' + (usage.avgCompletion || 0) + ' · 耗时 ' + Math.round((usage.avgMs || 0) / 1000) + 's'),
                  h('div', { className: 'xm-usage-cost' }, '预估 ' + fmtMoney(usage.cost || 0) + '（' + usage.priceIn + '/' + usage.priceOut + ' 元每百万）'),
                  h('div', { className: 'xm-dim' }, '只算本机桥调豆包的解析用量；对话里的模型用量不在这里。'),
                )
              : h('div', { className: 'xm-dim' }, '还没解析过，或者桥不是 2.1.0 以上。'),
          ),
        ),
        h(
          'div',
          { className: 'xm-board-table' },
          h(
            'div',
            { className: 'xm-board-tablehead' },
            h('span', null, t('board.table') + '（' + items.length + '）'),
            h(
              'select',
              {
                className: 'xm-cap-search',
                style: { width: 110 },
                value: sort,
                onChange: function (e) {
                  setSort(e.target.value)
                },
              },
              [
                { k: 'likes', label: '按点赞' },
                { k: 'collect', label: '按收藏率' },
                { k: 'recent', label: '按采集时间' },
              ].map(function (o) {
                return h('option', { key: o.k, value: o.k }, o.label)
              }),
            ),
          ),
          items.length
            ? h(
                'div',
                { className: 'xm-tbl-wrap' },
                h(
                  'div',
                  { className: 'xm-tbl' },
                  h(
                    'div',
                    { className: 'xm-trow xm-thead' },
                    h('div', { className: 'xm-tcell xm-tc-item' }, t('lib.col.item')),
                    h('div', { className: 'xm-tcell xm-tc-score' }, t('lib.col.score')),
                    h('div', { className: 'xm-tcell xm-tc-hot' }, t('lib.col.metric')),
                    h('div', { className: 'xm-tcell xm-tc-data' }, t('lib.col.data')),
                    h('div', { className: 'xm-tcell xm-tc-tags' }, t('lib.col.tags')),
                    h('div', { className: 'xm-tcell xm-tc-act' }, t('lib.col.act')),
                  ),
                  rows,
                ),
              )
            : h('div', { className: 'xm-cap-empty' }, t('board.empty')),
        ),
      )
    }

    function costOfUsage(u) {
      if (!u) return 0
      const pin = Number(u.prompt_tokens) || 0
      const pout = Number(u.completion_tokens) || 0
      return (pin * 0.3 + pout * 0.6) / 1000000
    }

    function fmtMs(ms) {
      const s = (Number(ms) || 0) / 1000
      return s >= 10 ? Math.round(s) + 's' : s.toFixed(1) + 's'
    }

    /* 右侧成品面板：流式显示豆包写的内容 */
    function GenResult(props) {
      const g = props.gen || {}
      const u = g.usage || {}
      const tok = Number(u.total_tokens) || 0
      const kbHits = Array.isArray(g.kb) ? g.kb : []
      const meta = g.busy
        ? '生成中…'
        : [
            String(g.model || '').replace('doubao-', ''),
            g.ms ? fmtMs(g.ms) : '',
            tok ? tok + ' tok' : '',
            tok ? '≈¥' + costOfUsage(u).toFixed(4) : '',
          ]
            .filter(Boolean)
            .join(' · ')
      return h(
        'div',
        { className: 'xm-gen' },
        g.error ? h('div', { className: 'xm-err' }, '生成失败：' + g.error) : null,
        !g.busy && !g.text && !g.error ? h('div', { className: 'xm-empty' }, props.empty || '点左边「一键生成」') : null,
        g.busy && !g.text ? h('div', { className: 'xm-stage' }, '豆包正在写…（通常 3-10 秒）') : null,
        kbHits.length
          ? h(
              'div',
              { className: 'xm-kb' },
              h('span', { className: 'xm-kb-h' }, '依据'),
              kbHits.map(function (k, i) {
                const file = String(k.file || '')
                const base = (file.split('/').pop() || String(k.doc || '')).replace(/\.md$/, '')
                const sec = String(k.section || '')
                return h(
                  'span',
                  {
                    key: 'kb' + i,
                    className: 'xm-kb-chip',
                    title: '匹配度 ' + Number(k.score || 0).toFixed(1) + (k.snippet ? '\n' + k.snippet : ''),
                  },
                  base + (sec ? ' › ' + sec.slice(0, 20) : ''),
                )
              }),
            )
          : null,
        g.text ? h(MdText, { text: g.text }) : h('pre', { className: 'xm-pre xm-genpre' }, g.busy ? '…' : '—'),
        h('div', { className: 'xm-genmeta' }, meta),
      )
    }

    /* 作品库：每次自动生成都会落库，能回看 / 复制 / 采用 / 删 */
    function fmtHot(n) {
    const v = Number(n) || 0
    if (v >= 100000000) return (v / 100000000).toFixed(1) + '亿'
    if (v >= 10000) return (v / 10000).toFixed(v >= 100000 ? 0 : 1) + '万'
    return String(Math.round(v))
  }

  function agoOf(ts) {
    const n = Number(ts) || 0
    if (!n) return ''
    const d = Date.now() - n
    if (d < 0) return ''
    const m = Math.floor(d / 60000)
    if (m < 60) return m + ' 分钟前'
    const hr = Math.floor(m / 60)
    if (hr < 24) return hr + ' 小时前'
    return Math.floor(hr / 24) + ' 天前'
  }

  function Spark(props) {
    const vals = (props.values || []).map(function (x) {
      return Number(x) || 0
    })
    if (vals.length < 2) return null
    const w = props.width || 76
    const hh = props.height || 20
    const min = Math.min.apply(null, vals)
    const max = Math.max.apply(null, vals)
    const span = max - min || 1
    const pts = vals
      .map(function (v, i) {
        const x = (i / (vals.length - 1)) * w
        const y = hh - ((v - min) / span) * (hh - 2) - 1
        return x.toFixed(1) + ',' + y.toFixed(1)
      })
      .join(' ')
    return h(
      'svg',
      { width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, className: 'xm-spark' },
      h('polyline', { points: pts, fill: 'none', stroke: props.color || '#0a84ff', strokeWidth: 1.5, strokeLinejoin: 'round', strokeLinecap: 'round' }),
    )
  }

  function Hot(props) {
    const boxRef = useRef(null)
    useEffect(
      function () {
        if (boxRef.current) boxRef.current.scrollTop = 0
      },
      [],
    )
    const [kind, setKind] = useState('hot')
    const [platform, setPlatform] = useState('douyin')
    const [keyword, setKeyword] = useState('')
    const [days, setDays] = useState(1)
    const [sort, setSort] = useState('like')
    const [list, setList] = useState([])
    const [meta, setMeta] = useState(null)
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    const [note, setNote] = useState('')

    const load = useCallback(
      function (fresh) {
        setBusy(true)
        setErr('')
        const qs = ['kind=' + kind, 'platform=' + platform, 'days=' + days, 'sort=' + sort]
        if (kind === 'keyword') qs.push('keyword=' + encodeURIComponent(keyword))
        if (fresh) qs.push('fresh=1')
        fetch(BRIDGE_BASE + '/api/hot?' + qs.join('&'), { cache: 'no-store' })
          .then(function (r) {
            return r.json()
          })
          .then(function (j) {
            if (!j || !j.ok) throw new Error((j && j.error) || '读取失败')
            setList(j.items || [])
            setMeta({ at: j.at || Date.now(), cached: !!j.cached, scanned: j.scanned || 0, kind: j.kind || kind })
          })
          .catch(function (e) {
            setList([])
            setErr(String((e && e.message) || e))
          })
          .then(function () {
            setBusy(false)
          })
      },
      [kind, platform, keyword, days, sort],
    )

    useEffect(
      function () {
        if (kind === 'keyword' && !keyword.trim()) return
        load(false)
      },
      [load],
    )

    const save = function (it) {
      fetch(BRIDGE_BASE + '/api/capture', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: [it] }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          setNote(j && j.ok ? '已入库' : '入库失败')
        })
        .catch(function () {
          setNote('采集桥没响应')
        })
    }

    return h(
      'div',
      { className: 'xm-hotpage', ref: boxRef },
      h(
        'div',
        { className: 'xm-hot-h' },
        h('b', null, t('hot.title')),
        h('span', { className: 'xm-dim' }, meta && meta.at ? '更新于 ' + agoOf(meta.at) + (meta.cached ? ' · 缓存' : '') : t('hot.sub')),
        h('span', { style: { flex: 1 } }),
        h(
          'button',
          { className: 'xm-mini' + (kind === 'hot' ? ' on' : ''), onClick: function () { setKind('hot'); setPlatform('douyin') } },
          t('hot.modeHot'),
        ),
        h(
          'button',
          { className: 'xm-mini' + (kind === 'keyword' ? ' on' : ''), onClick: function () { setKind('keyword') } },
          t('hot.modeKw'),
        ),
      ),
      h(
        'div',
        { className: 'xm-hot-bar' },
        kind === 'keyword'
          ? h(
              'div',
              { className: 'xm-hot-row' },
              h('input', {
                className: 'xm-cap-search',
                placeholder: t('hot.kwPh'),
                value: keyword,
                onChange: function (e) {
                  setKeyword(e.target.value)
                },
                onKeyDown: function (e) {
                  if (e.key === 'Enter') load(true)
                },
              }),
              h(
                'select',
                { className: 'xm-sel', value: platform, onChange: function (e) { setPlatform(e.target.value) } },
                h('option', { value: 'douyin' }, '抖音'),
                h('option', { value: 'xhs' }, '小红书'),
              ),
              h(
                'select',
                { className: 'xm-sel', value: String(days), onChange: function (e) { setDays(Number(e.target.value)) } },
                h('option', { value: '1' }, '当日'),
                h('option', { value: '3' }, '3 天'),
                h('option', { value: '7' }, '7 天'),
                h('option', { value: '30' }, '30 天'),
              ),
              h(
                'select',
                { className: 'xm-sel', value: sort, onChange: function (e) { setSort(e.target.value) } },
                h('option', { value: 'like' }, '按点赞'),
                h('option', { value: 'collect' }, '按收藏'),
                h('option', { value: 'recent' }, '按时间'),
              ),
              h(
                'button',
                { className: 'xm-btn', onClick: function () { load(true) }, disabled: busy || !keyword.trim() },
                busy ? t('hot.loading') : t('hot.run'),
              ),
            )
          : h(
              'div',
              { className: 'xm-hot-row' },
              h('span', { className: 'xm-dim' }, t('hot.hotSrc')),
              h(
                'button',
                { className: 'xm-mini' + (platform === 'douyin' ? ' on' : ''), onClick: function () { setPlatform('douyin') } },
                '抖音挑战榜',
              ),
              h(
                'button',
                { className: 'xm-mini' + (platform === 'xhs' ? ' on' : ''), onClick: function () { setPlatform('xhs') } },
                '小红书（走关键词）',
              ),
              h(
                'button',
                { className: 'xm-mini', onClick: function () { load(true) }, disabled: busy },
                t('hot.refresh'),
              ),
            ),
        note ? h('div', { className: 'xm-cap-note' }, note) : null,
      ),
      err
        ? h('div', { className: 'xm-err' }, '读取失败：' + err)
        : busy && !list.length
          ? h('div', { className: 'xm-cap-empty' }, t('hot.loading'))
          : !list.length
            ? h('div', { className: 'xm-cap-empty' }, kind === 'keyword' ? t('hot.emptyKw') : t('hot.empty'))
            : h(
                'div',
                { className: 'xm-hot-grid' },
                list.map(function (it, i) {
                  const isBoard = it.rank != null || it.hot != null
                  if (isBoard) {
                    const trend = (it.trends || []).map(function (x) {
                      return x.hot_score
                    })
                    return h(
                      'div',
                      { key: 'h' + (it.rank || i), className: 'xm-hot-card' },
                      h(
                        'div',
                        { className: 'xm-hot-top' },
                        h('div', { className: 'xm-hot-rank' }, '#' + (it.rank != null ? it.rank : i + 1)),
                        h(
                          'div',
                          { className: 'xm-hot-main' },
                          h('div', { className: 'xm-hot-title' }, it.title || ''),
                          h(
                            'div',
                            { className: 'xm-hot-meta' },
                            h('span', null, '热度 ' + fmtHot(it.hot)),
                            it.videos ? h('span', null, '· ' + fmtHot(it.videos) + ' 视频') : null,
                            it.tag ? h('span', { className: 'xm-tag' }, it.tag) : null,
                          ),
                        ),
                      ),
                      h(
                        'div',
                        { className: 'xm-hot-side' },
                        h(Spark, { values: trend, width: 120, height: 18 }),
                        h('span', { style: { flex: 1 } }),
                        it.url
                          ? h('a', { className: 'xm-mini', href: it.url, target: '_blank', rel: 'noreferrer' }, '打开')
                          : null,
                        h(
                          'button',
                          {
                            className: 'xm-mini',
                            onClick: function () {
                              setKeyword(it.title || '')
                              setKind('keyword')
                            },
                          },
                          '找视频',
                        ),
                      ),
                    )
                  }
                  const st = it.stats || {}
                  return h(
                    'div',
                    { key: it.id || 'k' + i, className: 'xm-hot-kcard' },
                    it.coverUrl ? h('img', { className: 'xm-hot-cover', src: it.coverUrl, referrerPolicy: 'no-referrer' }) : h('div', { className: 'xm-hot-cover xm-ph' }),
                    h('div', { className: 'xm-hot-kbody' },
                      h('div', { className: 'xm-hot-title' }, it.title || it.desc || '(无标题)'),
                      h('div', { className: 'xm-hot-meta' },
                        h('span', null, it.author && it.author.name ? '@' + it.author.name : ''),
                        h('span', null, '赞 ' + fmtHot(st.likes)),
                        h('span', null, '藏 ' + fmtHot(st.collects)),
                        h('span', null, '评 ' + fmtHot(st.comments)),
                        it.publishTime ? h('span', null, agoOf(it.publishTime)) : null,
                      ),
                      h('div', { className: 'xm-hot-act' },
                        h('button', { className: 'xm-btn xs', onClick: function () { props.onUse(it, 'deconstruct') } }, '拆解'),
                        h('button', { className: 'xm-btn xs', onClick: function () { save(it) } }, '入库'),
                        it.url ? h('a', { className: 'xm-mini', href: it.url, target: '_blank', rel: 'noreferrer' }, '原帖') : null,
                      ),
                    ),
                  )
                }),
              ),
    )
  }

  function Accounts() {
    const [list, setList] = useState([])
    const [platform, setPlatform] = useState('xhs')
    const [input, setInput] = useState('')
    const [busy, setBusy] = useState(false)
    const [note, setNote] = useState('')
    const [err, setErr] = useState('')

    const load = useCallback(function () {
      fetch(BRIDGE_BASE + '/api/accounts', { cache: 'no-store' })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '读取失败')
          setList(j.items || [])
          setErr('')
        })
        .catch(function (e) {
          setErr(String((e && e.message) || e))
        })
    }, [])

    useEffect(function () { load() }, [load])

    const add = function () {
      if (!input.trim()) return
      setBusy(true)
      setNote('正在拉取主页…')
      fetch(BRIDGE_BASE + '/api/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform: platform, input: input.trim() }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '添加失败')
          setNote('已添加：' + (j.account && j.account.name))
          setInput('')
          load()
        })
        .catch(function (e) {
          setNote('失败：' + String((e && e.message) || e))
        })
        .then(function () {
          setBusy(false)
        })
    }

    const sync = function () {
      setBusy(true)
      setNote('正在同步…')
      fetch(BRIDGE_BASE + '/api/accounts/sync', { method: 'POST' })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          setNote(j && j.ok ? '同步完成：成功 ' + j.synced + ' 个，失败 ' + j.failed + ' 个' : '同步失败')
          load()
        })
        .catch(function (e) {
          setNote('同步失败：' + String((e && e.message) || e))
        })
        .then(function () {
          setBusy(false)
        })
    }

    const patch = function (acc, body) {
      fetch(BRIDGE_BASE + '/api/accounts', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.assign({ id: acc.id }, body)),
      }).then(function () { load() }).catch(function () {})
    }

    const remove = function (acc) {
      fetch(BRIDGE_BASE + '/api/accounts?id=' + encodeURIComponent(acc.id), { method: 'DELETE' }).then(function () { load() }).catch(function () {})
    }

    return h(
      'div',
      { className: 'xm-accpage' },
      h('div', { className: 'xm-hot-h' },
        h('b', null, t('acc.title')),
        h('span', { className: 'xm-dim' }, t('acc.sub')),
        h('span', { style: { flex: 1 } }),
        h('button', { className: 'xm-btn xs', onClick: sync, disabled: busy }, busy ? '同步中…' : t('acc.sync')),
      ),
      h('div', { className: 'xm-hot-bar' },
        h('div', { className: 'xm-hot-row' },
          h('select', { className: 'xm-sel', value: platform, onChange: function (e) { setPlatform(e.target.value) } },
            h('option', { value: 'xhs' }, '小红书'),
            h('option', { value: 'douyin' }, '抖音'),
          ),
          h('input', {
            className: 'xm-cap-search',
            placeholder: t('acc.ph'),
            value: input,
            onChange: function (e) { setInput(e.target.value) },
            onKeyDown: function (e) { if (e.key === 'Enter') add() },
          }),
          h('button', { className: 'xm-btn', onClick: add, disabled: busy || !input.trim() }, t('acc.add')),
        ),
        note ? h('div', { className: 'xm-cap-note' }, note) : null,
        err ? h('div', { className: 'xm-err' }, err) : null,
      ),
      !list.length
        ? h('div', { className: 'xm-cap-empty' }, t('acc.empty'))
        : h('div', { className: 'xm-hot-grid' },
            list.map(function (a) {
              const snaps = a.snaps || []
              const prev = snaps.length > 1 ? snaps[snaps.length - 2] : null
              const d = prev ? (a.followers || 0) - (prev.followers || 0) : 0
              return h('div', { key: a.id, className: 'xm-acc-card' + (a.star ? ' star' : '') },
                h('img', { className: 'xm-acc-av', src: a.avatar || '', referrerPolicy: 'no-referrer' }),
                h('div', { className: 'xm-acc-body' },
                  h('div', { className: 'xm-acc-name' },
                    h('b', null, a.name || '(未命名)'),
                    h('span', { className: 'xm-badge' }, a.platform === 'xhs' ? '小红书' : '抖音'),
                    h('span', { className: 'xm-badge ok' }, '我的账号'),
                  ),
                  h('div', { className: 'xm-hot-meta' },
                    h('span', null, '粉丝 ' + fmtHot(a.followers)),
                    d ? h('span', { className: d > 0 ? 'xm-up' : 'xm-down' }, (d > 0 ? '↑' : '↓') + fmtHot(Math.abs(d))) : null,
                    h('span', null, '获赞 ' + fmtHot(a.likes)),
                    h('span', null, '作品 ' + fmtHot(a.notes)),
                    snaps.length > 1 ? h(Spark, { values: snaps.map(function (s) { return s.followers }) }) : null,
                  ),
                  h('div', { className: 'xm-hot-act' },
                    h('button', { className: 'xm-mini' + (a.star ? ' on' : ''), onClick: function () { patch(a, { star: !a.star }) }, title: '星标监控' }, a.star ? '★ 监控中' : '☆ 加星'),
                    a.url ? h('a', { className: 'xm-mini', href: a.url, target: '_blank', rel: 'noreferrer' }, '主页') : null,
                    h('button', { className: 'xm-mini', onClick: function () { remove(a) } }, '移除'),
                  ),
                ),
              )
            }),
          ),
    )
  }

  function Bloggers() {
    const [platform, setPlatform] = useState('xhs')
    const [keyword, setKeyword] = useState('')
    const [users, setUsers] = useState([])
    const [profile, setProfile] = useState(null)
    const [busy, setBusy] = useState(false)
    const [note, setNote] = useState('')

    const search = function () {
      if (!keyword.trim()) return
      setBusy(true)
      setNote('搜索中…')
      fetch(BRIDGE_BASE + '/api/bloggers/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform: platform, keyword: keyword.trim(), limit: 20 }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '搜索失败')
          setUsers(j.items || [])
          setNote('找到 ' + (j.items || []).length + ' 个博主')
        })
        .catch(function (e) {
          setUsers([])
          setNote('失败：' + String((e && e.message) || e))
        })
        .then(function () { setBusy(false) })
    }

    const grab = function (u) {
      setBusy(true)
      setNote('抓取 ' + (u.name || '') + ' 的数据…')
      fetch(BRIDGE_BASE + '/api/blogger/fetch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform: platform, input: u.url || u.id, pages: 2, save: true }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '抓取失败')
          setProfile(j.profile || null)
          setNote('已抓取：作品 ' + j.count + ' 条，入库 ' + j.saved + ' 条')
        })
        .catch(function (e) {
          setNote('失败：' + String((e && e.message) || e))
        })
        .then(function () { setBusy(false) })
    }

    return h(
      'div',
      { className: 'xm-blogpage' },
      h('div', { className: 'xm-hot-h' },
        h('b', null, t('blog.title')),
        h('span', { className: 'xm-dim' }, t('blog.sub')),
      ),
      h('div', { className: 'xm-hot-bar' },
        h('div', { className: 'xm-hot-row' },
          h('select', { className: 'xm-sel', value: platform, onChange: function (e) { setPlatform(e.target.value) } },
            h('option', { value: 'xhs' }, '小红书'),
            h('option', { value: 'douyin' }, '抖音'),
          ),
          h('input', {
            className: 'xm-cap-search',
            placeholder: t('blog.ph'),
            value: keyword,
            onChange: function (e) { setKeyword(e.target.value) },
            onKeyDown: function (e) { if (e.key === 'Enter') search() },
          }),
          h('button', { className: 'xm-btn', onClick: search, disabled: busy || !keyword.trim() }, t('blog.search')),
        ),
        note ? h('div', { className: 'xm-cap-note' }, note) : null,
      ),
      profile
        ? h('div', { className: 'xm-blog-profile' },
            h('img', { className: 'xm-acc-av', src: profile.avatar || '', referrerPolicy: 'no-referrer' }),
            h('div', null,
              h('div', { className: 'xm-acc-name' }, h('b', null, profile.name || ''), h('span', { className: 'xm-badge' }, platform === 'xhs' ? '小红书' : '抖音')),
              h('div', { className: 'xm-hot-meta' },
                h('span', null, '粉丝 ' + fmtHot(profile.followers)),
                h('span', null, '获赞 ' + fmtHot(profile.likes)),
                h('span', null, '作品 ' + fmtHot(profile.notes)),
                h('span', { className: 'xm-dim' }, (profile.desc || '').slice(0, 80)),
              ),
            ),
          )
        : null,
      !users.length
        ? h('div', { className: 'xm-cap-empty' }, t('blog.empty'))
        : h('div', { className: 'xm-hot-grid' },
            users.map(function (u, i) {
              return h('div', { key: u.id || 'u' + i, className: 'xm-blog-card' },
                h('img', { className: 'xm-acc-av', src: u.avatar || '', referrerPolicy: 'no-referrer' }),
                h('div', { className: 'xm-acc-body' },
                  h('div', { className: 'xm-acc-name' }, h('b', null, u.name || ''), u.verified ? h('span', { className: 'xm-badge ok' }, '认证') : null),
                  h('div', { className: 'xm-hot-meta' },
                    h('span', null, '粉丝 ' + fmtHot(u.followers)),
                    u.likes ? h('span', null, '获赞 ' + fmtHot(u.likes)) : null,
                    u.notes ? h('span', null, '作品 ' + fmtHot(u.notes)) : null,
                  ),
                  h('div', { className: 'xm-dim', style: { fontSize: 12 } }, (u.desc || '').slice(0, 70)),
                  h('div', { className: 'xm-hot-act' },
                    h('button', { className: 'xm-btn xs', onClick: function () { grab(u) }, disabled: busy }, '抓取作品'),
                    u.url ? h('a', { className: 'xm-mini', href: u.url, target: '_blank', rel: 'noreferrer' }, '主页') : null,
                  ),
                ),
              )
            }),
          ),
    )
  }

  /* 后台数据的 AI 分析：账号现状 + 采集库里同平台同类对标 + 上传表格，交给知识库/编导方法论判 */
  function buildBackendAnalyze(acct, queue, upload) {
    const d = (acct && acct.data) || {}
    const st = d.stats || {}
    const plat = acct && acct.platform === 'douyin' ? '抖音' : '小红书'
    const works = (d.works || []).filter(function (w) {
      return w.src !== 'feed'
    })
    const day = function (ts) {
      const t = Number(ts) || 0
      if (!t) return '—'
      const s = t > 1e12 ? t : t * 1000
      const x = new Date(s)
      const p = function (n) {
        return n < 10 ? '0' + n : '' + n
      }
      return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate())
    }
    const n = function (v) {
      return fmtNum(v || 0)
    }
    const lines = []
    lines.push('请分析我的「' + plat + '」账号后台数据，并给出能直接执行的下一步。')
    lines.push('')
    lines.push('## 一、账号现状（' + (acct ? acct.nickname || '未命名' : '') + '，' + plat + '，同步于 ' + day(d.at) + '）')
    lines.push('- 我的作品 ' + (st.works || 0) + ' 条；总播放 ' + n(st.play) + '；总点赞 ' + n(st.digg) + '；总收藏 ' + n(st.collect) + '；总评论 ' + n(st.comment) + '；总分享 ' + n(st.share))
    if (st.play) lines.push('- 点赞率 ' + ((st.digg / st.play) * 100).toFixed(1) + '%，收藏率 ' + (st.digg ? ((st.collect / st.digg) * 100).toFixed(1) : '0') + '%')
    const mx0 = d.metrics || null
    if (mx0) {
      const pct = function (v) { return v == null ? '—' : (v <= 1 ? (v * 100).toFixed(1) : Number(v).toFixed(1)) + '%' }
      lines.push('- 后台数据总览：' + [
        mx0.play != null ? '播放 ' + n(mx0.play) : '',
        mx0.show != null ? '曝光 ' + n(mx0.show) : '',
        mx0.digg != null ? '点赞 ' + n(mx0.digg) : '',
        mx0.comment != null ? '评论 ' + n(mx0.comment) : '',
        mx0.share != null ? '分享 ' + n(mx0.share) : '',
        mx0.completion5s != null ? '5 秒完播率 ' + pct(mx0.completion5s) : '',
        mx0.bounce2s != null ? '2 秒跳出率 ' + pct(mx0.bounce2s) : '',
        mx0.coverCtr != null ? '封面点击率 ' + pct(mx0.coverCtr) : '',
        mx0.avgView != null ? '平均播放 ' + Number(mx0.avgView).toFixed(1) + 's' : '',
      ].filter(Boolean).join('；'))
    }
    const pt0 = d.portrait || null
    if (pt0) {
      const nm = { gender: '性别', age: '年龄', device: '设备', os: '系统', province: '地域', city: '城市', interest: '兴趣' }
      const segs = Object.keys(pt0).filter(function (k) { return pt0[k] && pt0[k].length }).map(function (k) {
        const top = pt0[k].slice(0, 5).map(function (x) { return x.name + ' ' + ((x.value <= 1 ? x.value * 100 : x.value).toFixed(1)) + '%' })
        return (nm[k] || k) + '：' + top.join(' / ')
      })
      if (segs.length) lines.push('- 粉丝画像：' + segs.join('；'))
    }
    lines.push('')
    lines.push('### 作品明细（按发布倒序，最多 30 条）')
    lines.push('| 标题 | 发布 | 播放 | 点赞 | 收藏 | 评论 |')
    lines.push('| --- | --- | --- | --- | --- | --- |')
    works.slice(0, 30).forEach(function (w) {
      const title = String(w.title || '(无标题)').replace(/\|/g, '/').slice(0, 60)
      lines.push('| ' + title + ' | ' + day(w.createTime) + ' | ' + n(w.play) + ' | ' + n(w.digg) + ' | ' + n(w.collect) + ' | ' + n(w.comment) + ' |')
    })

    const peers = (queue || [])
      .filter(function (q) {
        return (q.platform || '') === (acct && acct.platform)
      })
      .slice()
      .sort(function (a, b) {
        return (b.stats && b.stats.likes ? b.stats.likes : 0) - (a.stats && a.stats.likes ? a.stats.likes : 0)
      })
      .slice(0, 10)
    if (peers.length) {
      lines.push('')
      lines.push('## 二、采集库里同平台的同类标杆（用来做对照，不是我发的）')
      lines.push('| 标题 | 作者 | 赞 | 藏 | 评 | 标签 |')
      lines.push('| --- | --- | --- | --- | --- | --- |')
      peers.forEach(function (q) {
        const s = q.stats || {}
        const title = String(q.title || '').replace(/\|/g, '/').slice(0, 50)
        lines.push('| ' + title + ' | ' + (q.author || '—') + ' | ' + n(s.likes) + ' | ' + n(s.collects) + ' | ' + n(s.comments) + ' | ' + String((q.tags || []).join('/') || '—').slice(0, 40) + ' |')
      })
    }

    if (upload && upload.rows && upload.rows.length) {
      lines.push('')
      lines.push('## 三、本地上传的补充数据（已去重，重复 ' + (upload.dropped || 0) + ' 行已剔除）')
      lines.push('- 文件：' + (upload.name || '') + '；保留 ' + upload.kept + ' 行 / 共 ' + upload.total + ' 行')
      lines.push('| 标题 | 播放 | 点赞 | 收藏 | 评论 |')
      lines.push('| --- | --- | --- | --- | --- |')
      upload.rows.slice(0, 25).forEach(function (r) {
        lines.push('| ' + String(r.title || '').replace(/\|/g, '/').slice(0, 46) + ' | ' + n(r.play) + ' | ' + n(r.digg) + ' | ' + n(r.collect) + ' | ' + n(r.comment) + ' |')
      })
    }

    lines.push('')
    lines.push('## 四、方法论口径（按这套判，不要用通用的「多发多互动」套话）')
    lines.push('- **内容判断框架**：内容是人性问题的解决方案；爆款四必要条件（低理解成本 / 大群体链接 / 满足核心需求 / 产生互动动机）；三条内容路径（情感共鸣 / 稀缺视角 / 反差节奏）；行为链复盘 曝光→进入→观看→互动→主页→关注→转化，每个现象给两个替代解释，下一轮只改一个变量；系列承诺（同一问题 / 同一人物世界 / 同一形式 / 同一能力 / 同一变化）。')
    lines.push('- **Dan Koe（一人公司）**：内容即产品，先把「一个明确的问题 + 一套自己的解法」产品化，再谈流量；注意力 → 信任 → 交易三段漏斗；粉丝数不是资产，能复用的资产是作品与私域名单；每条内容都要能回答「谁看完会主动找你」。')
    lines.push('- **德饱（摄影师 IP 变现）**：先定产品（拍什么、多少钱、交付什么），内容服务于谈单；用客户案例与过程作为素材；私域承接比公域涨粉更重要。')
    lines.push('- **知识库**：生成时会自动检索你自己放进知识库的资料，有引用就说清楚是哪一篇的哪一节；没配知识库就别硬编。')
    lines.push('')
    lines.push('## 五、分析要求（用上面这套判，不要泛泛而谈）')
    lines.push('1. **账号定位判断**：用「用户任务 ∩ 我的真实资源 ∩ 平台消费场景 ∩ 可持续供给」判断我现在到底在做什么，一句话说清我是谁的内容对谁有用；如果定位是散的，指出散在哪几条作品之间。')
    lines.push('2. **爆款四必要条件逐条诊断**：低理解成本 / 大群体链接 / 满足核心需求 / 产生互动动机——每条给「成立 / 偏弱 / 不成立」+ 我数据里的证据（哪条作品、哪个比率）。')
    lines.push('3. **数据异常归因**：挑 3 个最值得说的现象（比如某条突然高播放但点赞率低、收藏率高说明什么、评论率异常），每个现象给 **两个替代解释**，并说明还需要什么数据才能区分。')
    lines.push('4. **做得对的 3 条**：从我播放/点赞率最高的作品里提炼**可复用的机制**（不是「拍得好」，要说清是钩子类型、结构、场景反差还是信息密度），并写成能照抄的模板。')
    lines.push('5. **漏掉的 3 条**：从最差的几条与同类标杆的差距里，指出具体缺什么（前 3 秒没给预期？没有系列承诺？信息密度不够？）。')
    lines.push('6. **和采集库标杆的差距**：把我的最好成绩与上面对标里同类的头部做对比，差在选题、封面标题、还是结构，给具体差距倍数或比率。')
    lines.push('7. **未来 7 天 5 个选题**：每条必须给「任务句（当…发生时，…想从…到…但被…卡住）」+ 内容路径（情感共鸣 / 稀缺视角 / 反差节奏）+ 前 3 秒逐字 + 结构骨架 + 拍摄要点。选题必须在我现有方向里，不要跳到无关赛道。')
    lines.push('8. **21 天实验**：只改一个变量，给出对照组、观察指标（曝光→进入→观看→互动→主页→关注→转化 行为链上的哪一环）、判定标准与止损条件。')
    lines.push('9. **这一周不要做的 3 件事**。')
    lines.push('')
    lines.push('证据纪律：数字必须带口径（哪条作品、哪个时间段）；知识库没有依据的判断标注「分析推论」；不确定的写「未核实」。')
    return lines.join('\n')
  }

  /* ---------------- 后台数据（多账号 · 小红书/抖音分开 · 上传去重 · AI 分析） ---------------- */
  function Backend(props) {
    const [plat, setPlat] = useState('')
    const [list, setList] = useState([])
    const [acctId, setAcctId] = useState('')
    const [d, setD] = useState(null)
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)
    const [up, setUp] = useState(null)
    const [upBusy, setUpBusy] = useState(false)
    const fileRef = useRef(null)
    const [ups, setUps] = useState([])
    const [editId, setEditId] = useState('')
    const [editName, setEditName] = useState('')
    const [delId, setDelId] = useState('')
    const [newName, setNewName] = useState('')
    const [newPlat, setNewPlat] = useState('xhs')
    const [accBusy, setAccBusy] = useState('')

    const loadList = function (p) {
      setBusy(true)
      setMsg('')
      fetch(BRIDGE_BASE + '/api/account/list' + (p ? '?platform=' + encodeURIComponent(p) : ''))
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '读取失败')
          setList(j.items || [])
          if (!j.items || !j.items.length) {
            setD(null)
            setAcctId('')
          }
        })
        .catch(function (e) {
          setMsg('采集桥没响应：' + ((e && e.message) || ''))
        })
        .finally(function () {
          setBusy(false)
        })
    }

    const loadOne = function (id) {
      if (!id) {
        setD(null)
        return
      }
      setBusy(true)
      fetch(BRIDGE_BASE + '/api/account/summary?id=' + encodeURIComponent(id))
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '读取失败')
          setD(j.empty ? null : j)
        })
        .catch(function (e) {
          setMsg('读取失败：' + ((e && e.message) || ''))
        })
        .finally(function () {
          setBusy(false)
        })
    }

    const loadUps = function (id) {
      if (!id) {
        setUps([])
        return
      }
      fetch(BRIDGE_BASE + '/api/backend/uploads?account=' + encodeURIComponent(id))
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (j && j.ok) setUps(j.items || [])
        })
        .catch(function () {})
    }

    const renameAccount = function (id) {
      const name = String(editName || '').trim()
      if (!name) {
        if (props.flash) props.flash('名字不能为空')
        return
      }
      setAccBusy(id)
      fetch(BRIDGE_BASE + '/api/account', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: id, nickname: name }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '改名失败')
          setEditId('')
          setEditName('')
          loadList(plat)
          if (props.flash) props.flash('已改名为「' + j.nickname + '」')
        })
        .catch(function (e) {
          if (props.flash) props.flash('改名失败：' + ((e && e.message) || ''))
        })
        .finally(function () {
          setAccBusy('')
        })
    }

    const removeAccount = function (id) {
      if (delId !== id) {
        setDelId(id)
        if (props.flash) props.flash('再点一次就删掉这个账号（连同它的上传数据）')
        return
      }
      setAccBusy(id)
      fetch(BRIDGE_BASE + '/api/account?id=' + encodeURIComponent(id), { method: 'DELETE' })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '删除失败')
          setDelId('')
          setAcctId('')
          backupNext()
          if (props.flash) props.flash('账号已删除')
        })
        .catch(function (e) {
          if (props.flash) props.flash('删除失败：' + ((e && e.message) || ''))
        })
        .finally(function () {
          setAccBusy('')
        })
    }

    const backupNext = function () {
      loadList(plat)
    }

    const createAccount = function () {
      const name = String(newName || '').trim()
      if (!name) {
        if (props.flash) props.flash('先给账号起个名字')
        return
      }
      setAccBusy('new')
      fetch(BRIDGE_BASE + '/api/account/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform: newPlat, nickname: name }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '新建失败')
          setNewName('')
          setAcctId(j.id)
          loadList(plat)
          loadUps(j.id)
          if (props.flash) props.flash('已新建账号「' + j.nickname + '」，上传的文件会挂在它下面')
        })
        .catch(function (e) {
          if (props.flash) props.flash('新建失败：' + ((e && e.message) || ''))
        })
        .finally(function () {
          setAccBusy('')
        })
    }

    useEffect(function () {
      loadList(plat)
    }, [plat])

    useEffect(function () {
      loadUps(acctId)
    }, [acctId])

    useEffect(
      function () {
        if (list.length && !list.some(function (x) { return x.id === acctId })) {
          setAcctId(list[0].id)
        }
      },
      [list],
    )

    useEffect(
      function () {
        loadOne(acctId)
      },
      [acctId],
    )

    const day = function (ts) {
      const t = Number(ts) || 0
      if (!t) return '—'
      const s = t > 1e12 ? t : t * 1000
      const x = new Date(s)
      const p = function (n) {
        return n < 10 ? '0' + n : '' + n
      }
      return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate())
    }
    const dur = function (sec) {
      const s = Number(sec) || 0
      if (!s) return ''
      return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60)
    }

    const pickFile = function () {
      if (fileRef.current) fileRef.current.click()
    }

    const onFile = function (ev) {
      const f = ev.target.files && ev.target.files[0]
      if (!f) return
      if (!acctId) {
        if (props.flash) props.flash('先选一个账号再上传（没有账号就点下面「＋ 新建账号」）——上传的数据只算这个账号的')
        ev.target.value = ''
        return
      }
      setUpBusy(true)
      setUp(null)
      const run = function () {
        const fd = new FileReader()
        fd.onload = function () {
          fetch(BRIDGE_BASE + '/api/backend/upload?name=' + encodeURIComponent(f.name) + '&platform=' + encodeURIComponent(plat || (d && d.platform) || '') + '&account=' + encodeURIComponent(acctId || ''), {
            method: 'POST',
            headers: { 'content-type': 'application/octet-stream' },
            body: fd.result,
          })
            .then(function (r) {
              return r.json()
            })
            .then(function (j) {
              if (!j || !j.ok) throw new Error((j && j.error) || '上传失败')
              setUp(j)
              loadUps(acctId)
              if (props.flash) props.flash('已解析 ' + j.total + ' 行，去重后保留 ' + j.kept + ' 行')
            })
            .catch(function (e) {
              if (props.flash) props.flash('上传失败：' + ((e && e.message) || ''))
            })
            .finally(function () {
              setUpBusy(false)
            })
        }
        fd.onerror = function () {
          setUpBusy(false)
        }
        fd.readAsArrayBuffer(f)
      }
      run()
      ev.target.value = ''
    }

    const analyze = function () {
      if (!d) {
        if (props.flash) props.flash('先选一个账号')
        return
      }
      setBusy(true)
      const latest = ups && ups.length ? ups[0] : null
      const withUpload = function (queue) {
        if (!latest) {
          const prompt0 = buildBackendAnalyze(d, queue, up)
          if (props.startGen) props.startGen(prompt0, 'backend', '后台分析 · ' + (d.nickname || '我的账号'), 'learn')
          return
        }
        fetch(BRIDGE_BASE + '/api/backend/upload?id=' + encodeURIComponent(latest.id))
          .then(function (r) { return r.json() })
          .then(function (u) {
            const rec = u && u.ok ? Object.assign({}, u, { name: u.name || latest.name, total: u.total || latest.rows, kept: u.kept || latest.kept, dropped: latest.dropped }) : up
            const prompt = buildBackendAnalyze(d, queue, rec)
            if (props.startGen) props.startGen(prompt, 'backend', '后台分析 · ' + (d.nickname || '我的账号'), 'learn')
          })
          .catch(function () {
            const prompt = buildBackendAnalyze(d, queue, up)
            if (props.startGen) props.startGen(prompt, 'backend', '后台分析 · ' + (d.nickname || '我的账号'), 'learn')
          })
      }
      fetch(BRIDGE_BASE + '/api/queue')
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          withUpload((j && j.items) || [])
        })
        .catch(function () {
          const prompt = buildBackendAnalyze(d, [], up)
          if (props.startGen) props.startGen(prompt, 'backend', '后台分析 · ' + (d.nickname || '我的账号'), 'learn')
        })
        .finally(function () {
          setBusy(false)
        })
    }

    const platChips = [
      { k: '', label: '全部' },
      { k: 'xhs', label: '小红书' },
      { k: 'douyin', label: '抖音' },
    ]

    const head = h(
      'div',
      { className: 'xm-bk-head' },
      h(
        'div',
        null,
        h('div', { className: 'xm-h1' }, '后台数据'),
        h('div', { className: 'xm-sub' }, busy ? '读取中…' : d ? '最近同步：' + day(d.updatedAt) + ' · 来源 ' + (d.host || '创作者后台') : '先同步一次后台数据'),
      ),
      h(
        'div',
        { className: 'xm-bk-do' },
        h('input', { ref: fileRef, type: 'file', style: { display: 'none' }, onChange: onFile }),
        h('button', { className: 'xm-btn', onClick: pickFile, disabled: upBusy }, upBusy ? '解析中…' : '上传文件'),
        h('button', { className: 'xm-btn', onClick: function () { loadList(plat); loadOne(acctId) } }, '重新读取'),
        h(
          'button',
          { className: 'xm-btn primary', onClick: analyze, disabled: !d },
          props.gen && props.gen.busy ? '分析中…' : 'AI 分析',
        ),
        h('span', { className: 'xm-bk-tip' }, '上传：Excel(.xlsx) / CSV / JSON 都行，数据按账号分开算'),
      ),
    )

    const filters = h(
      'div',
      { className: 'xm-bk-filters' },
      h(
        'div',
        { className: 'xm-bk-line' },
        h('span', { className: 'xm-bk-lb' }, '平台'),
        platChips.map(function (c) {
          return h(
            'button',
            {
              key: 'p' + c.k,
              className: 'xm-chip' + (plat === c.k ? ' on' : ''),
              onClick: function () {
                setPlat(c.k)
              },
            },
            c.label,
          )
        }),
      ),
      list.length
        ? h(
            'div',
            { className: 'xm-bk-line' },
            h('span', { className: 'xm-bk-lb' }, '账号'),
            list.map(function (a) {
              return h(
                'button',
                {
                  key: a.id,
                  className: 'xm-chip' + (acctId === a.id ? ' on' : ''),
                  title: (a.host || '') + ' · 同步于 ' + day(a.updatedAt),
                  onClick: function () {
                    setAcctId(a.id)
                  },
                },
                (a.platform === 'douyin' ? '抖音 · ' : a.platform === 'xhs' ? '小红书 · ' : '') + (a.nickname && a.nickname !== a.host ? a.nickname : '未命名账号'),
              )
            }),
          )
        : null,

      h(
        'div',
        { className: 'xm-bk-line xm-bk-accops' },
        h('span', { className: 'xm-bk-lb' }, '管理'),
        editId
          ? h(
              'span',
              { className: 'xm-bk-rename' },
              h('input', {
                className: 'xm-bk-namein',
                value: editName,
                placeholder: '给这个账号起个名字',
                onChange: function (e) {
                  setEditName(e.target.value)
                },
                onKeyDown: function (e) {
                  if (e.key === 'Enter') renameAccount(editId)
                },
              }),
              h('button', { className: 'xm-btn xs', disabled: accBusy === editId, onClick: function () { renameAccount(editId) } }, '保存'),
              h('button', { className: 'xm-btn xs', onClick: function () { setEditId('') } }, '取消'),
            )
          : [
              h(
                'button',
                {
                  className: 'xm-btn xs',
                  disabled: !acctId,
                  onClick: function () {
                    const cur = list.find(function (x) { return x.id === acctId })
                    setEditId(acctId)
                    setEditName((cur && cur.nickname) || '')
                    setDelId('')
                  },
                },
                '改个名字',
              ),
              h(
                'button',
                {
                  className: 'xm-btn xs' + (delId === acctId ? ' danger' : ''),
                  disabled: !acctId || accBusy === acctId,
                  onClick: function () {
                    removeAccount(acctId)
                  },
                },
                delId === acctId ? '确认删除' : '删除这个账号',
              ),
            ],

        h('span', { className: 'xm-bk-new' },
          h('select', {
            className: 'xm-bk-platsel',
            value: newPlat,
            onChange: function (e) { setNewPlat(e.target.value) },
          },
            h('option', { value: 'xhs' }, '小红书'),
            h('option', { value: 'douyin' }, '抖音'),
          ),
          h('input', {
            className: 'xm-bk-namein',
            value: newName,
            placeholder: '新账号名字（先建好，再往里传文件）',
            onChange: function (e) { setNewName(e.target.value) },
            onKeyDown: function (e) { if (e.key === 'Enter') createAccount() },
          }),
          h('button', { className: 'xm-btn xs', disabled: accBusy === 'new', onClick: createAccount }, '＋ 新建账号'),
        ),
      ),
    )

    if (msg) return h('div', { className: 'xm-bk' }, head, filters, h('div', { className: 'xm-empty' }, msg))

    if (!list.length) {
      return h(
        'div',
        { className: 'xm-bk' },
        head,
        filters,
        h(
          'div',
          { className: 'xm-bk-empty' },
          h('div', { className: 'xm-bk-emptyt' }, '还没有从后台同步过数据'),
          h(
            'ol',
            { className: 'xm-bk-steps' },
            h('li', null, '用 Chrome / Edge 打开 ', h('b', null, 'creator.douyin.com'), '（小红书是 creator.xiaohongshu.com），登录你的号'),
            h('li', null, '进「作品管理 / 数据中心」这类能看到数据列表的页面'),
            h('li', null, '点右下角红色按钮 ', h('b', null, '「同步后台到库」'), '，等提示「已同步」'),
            h('li', null, '回到这里点「重新读取」；有多少个号同步过，上面就会有几个账号可选'),
          ),
          h('div', { className: 'xm-hint' }, '抓的是你浏览器里已经加载过的接口数据，只存在本机，不上传。'),
        ),
      )
    }

    const a = d && d.data && d.data.account
    const st = (d && d.data && d.data.stats) || {}
    const mx = (d && d.data && d.data.metrics) || null
    const pt = (d && d.data && d.data.portrait) || null
    const works = (d && d.data && d.data.works) || []
    const acts = []

    return h(
      'div',
      { className: 'xm-bk' },
      head,
      filters,

      a
        ? h(
            'div',
            { className: 'xm-bk-acc' },
            a.avatar ? h('img', { className: 'xm-bk-ava', src: a.avatar, referrerPolicy: 'no-referrer' }) : null,
            h('div', { className: 'xm-bk-accinfo' }, h('div', { className: 'xm-bk-nick' }, a.nickname), h('div', { className: 'xm-bk-sig' }, a.signature || '')),
            h(
              'div',
              { className: 'xm-bk-accnums' },
              h('div', null, h('b', { className: 'xm-num' }, fmtNum(a.fans)), h('span', null, '粉丝')),
              h('div', null, h('b', { className: 'xm-num' }, fmtNum(a.digg)), h('span', null, '获赞')),
              h('div', null, h('b', { className: 'xm-num' }, fmtNum(a.works)), h('span', null, '作品')),
            ),
          )
        : null,

      h(
        'div',
        { className: 'xm-stat4' },
        h('div', { className: 'xm-mini-card' }, h('div', { className: 'xm-mini-k' }, '我的作品'), h('div', { className: 'xm-mini-v' }, String(st.works || 0)), h('div', { className: 'xm-mini-s' }, st.mixed ? '未区分来源，含推荐' : '不含灵感 / 活动推荐')),
        h('div', { className: 'xm-mini-card' }, h('div', { className: 'xm-mini-k' }, '总播放'), h('div', { className: 'xm-mini-v' }, fmtNum(st.play)), h('div', { className: 'xm-mini-s' }, '我的作品合计')),
        h('div', { className: 'xm-mini-card' }, h('div', { className: 'xm-mini-k' }, '总点赞'), h('div', { className: 'xm-mini-v' }, fmtNum(st.digg)), h('div', { className: 'xm-mini-s' }, '点赞率 ' + (st.play ? ((st.digg / st.play) * 100).toFixed(1) : '0') + '%')),
        h('div', { className: 'xm-mini-card' }, h('div', { className: 'xm-mini-k' }, '总收藏'), h('div', { className: 'xm-mini-v' }, fmtNum(st.collect)), h('div', { className: 'xm-mini-s' }, '收藏率 ' + (st.digg ? ((st.collect / st.digg) * 100).toFixed(1) : '0') + '%')),
      ),


      mx || pt
        ? h(
            'div',
            { className: 'xm-bk-mx' },
            mx
              ? h(
                  'div',
                  null,
                  h('div', { className: 'xm-bk-mxh' }, '数据总览（创作者后台「数据中心」）'),
                  h(
                    'div',
                    { className: 'xm-mxgrid' },
                    [
                      ['play', '总播放', 'n'],
                      ['show', '曝光', 'n'],
                      ['digg', '点赞', 'n'],
                      ['comment', '评论', 'n'],
                      ['share', '分享', 'n'],
                      ['completion5s', '5 秒完播率', 'pct'],
                      ['bounce2s', '2 秒跳出率', 'pct'],
                      ['coverCtr', '封面点击率', 'pct'],
                      ['avgView', '平均播放', 'sec'],
                      ['newFans', '净增粉丝', 'n'],
                      ['lostFans', '取关', 'n'],
                      ['homeVisit', '主页访问', 'n'],
                    ]
                      .filter(function (it) { return mx[it[0]] != null })
                      .map(function (it) {
                        const v = mx[it[0]]
                        const txt = it[2] === 'pct' ? (v <= 1 ? (v * 100).toFixed(1) : Number(v).toFixed(1)) + '%' : it[2] === 'sec' ? Number(v).toFixed(1) + 's' : fmtNum(v)
                        return h('div', { className: 'xm-mx-card', key: it[0] }, h('div', { className: 'xm-mx-k' }, it[1]), h('div', { className: 'xm-mx-v' }, txt))
                      }),
                  ),
                )
              : null,
            pt
              ? h(
                  'div',
                  null,
                  h('div', { className: 'xm-bk-mxh' }, '粉丝画像'),
                  h(
                    'div',
                    { className: 'xm-ptgrid' },
                    ['gender', 'age', 'device', 'os', 'province', 'city', 'interest']
                      .filter(function (k) { return pt[k] && pt[k].length })
                      .map(function (k) {
                        const label = { gender: '性别', age: '年龄', device: '设备', os: '系统', province: '地域', city: '城市', interest: '兴趣' }[k]
                        const list = pt[k].slice(0, 6)
                        const top = list.reduce(function (m, x) { return Math.max(m, x.value) }, 0) || 1
                        return h(
                          'div',
                          { className: 'xm-pt', key: k },
                          h('div', { className: 'xm-pt-h' }, label),
                          list.map(function (x, i) {
                            const pctv = x.value <= 1 ? x.value * 100 : x.value
                            const w = Math.max(4, Math.round(((x.value <= 1 ? x.value : x.value / top) * 100)))
                            return h(
                              'div',
                              { className: 'xm-pt-row', key: i },
                              h('span', { className: 'xm-pt-n' }, String(x.name).slice(0, 10)),
                              h('span', { className: 'xm-pt-bar' }, h('i', { style: { width: w + '%' } })),
                              h('span', { className: 'xm-pt-v' }, pctv.toFixed(1) + '%'),
                            )
                          }),
                        )
                      }),
                  ),
                )
              : null,
            h('div', { className: 'xm-hint' }, '这两块来自创作者后台的「数据中心 / 粉丝数据」接口；没显示就是这次同步没抓到那几页，先去数据中心把图翻出来再点一次「同步后台到库」。'),
          )
        : null,

      ups.length || up
        ? h(
            'div',
            { className: 'xm-bk-up' },
            h('div', { className: 'xm-bk-up-h' }, '这个账号的上传数据（' + ups.length + ' 份，只参与这个账号的分析）'),
            h('div', { className: 'xm-bk-uphint' }, '支持 Excel(.xlsx) / CSV / JSON，什么文件都能选；同一账号下重复的行会自动去掉，不同账号各算各的。'),
            ups.length
              ? h(
                  'div',
                  { className: 'xm-bk-uplist' },
                  ups.slice(0, 8).map(function (u) {
                    return h(
                      'span',
                      { className: 'xm-bk-upitem', key: u.id, title: day(u.at) },
                      u.name + ' · 保留 ' + u.kept + (u.dropped ? ' / 去重 ' + u.dropped : ''),
                    )
                  }),
                )
              : null,
            up
              ? h('div', { className: 'xm-bk-up-h' }, '最近一次：' + up.name + ' 共 ' + up.total + ' 行，去重后保留 ' + up.kept + ' 行' + (up.dropped ? '（重复 ' + up.dropped + ' 行已剔除）' : ''))
              : null,
            up && Array.isArray(up.sample) && up.sample.length
              ? h(
              'table',
              { className: 'xm-tbl-s' },
              h('thead', null, h('tr', null, ['标题', '播放', '点赞', '收藏', '评论', '发布'].map(function (x) { return h('th', { key: x }, x) }))),
              h(
                'tbody',
                null,
                up.sample.slice(0, 12).map(function (r, i) {
                  return h(
                    'tr',
                    { key: i },
                    h('td', null, String(r.title || '(无标题)').slice(0, 46)),
                    h('td', null, fmtNum(r.play)),
                    h('td', null, fmtNum(r.digg)),
                    h('td', null, fmtNum(r.collect)),
                    h('td', null, fmtNum(r.comment)),
                    h('td', null, day(r.time)),
                  )
                }),
              ),
            )
              : null,
            h('div', { className: 'xm-hint' }, '这份数据会一起交给 AI 分析；同样的行再上传会自动去重。'),
          )
        : null,

      works.length
        ? h(
            'div',
            { className: 'xm-tbl-wrap' },
            h(
              'table',
              { className: 'xm-tbl-s' },
              h('thead', null, h('tr', null, ['作品', '时长', '播放', '点赞', '收藏', '评论', '发布'].map(function (x) { return h('th', { key: x }, x) }))),
              h(
                'tbody',
                null,
                works.filter(function (w) { return w.src !== 'feed' }).slice(0, 100).map(function (w) {
                  return h(
                    'tr',
                    { key: w.id },
                    h(
                      'td',
                      { className: 'xm-bk-cell' },
                      w.cover ? h('img', { className: 'xm-bk-cover', src: w.cover, referrerPolicy: 'no-referrer' }) : h('span', { className: 'xm-bk-cover ph' }),
                      h(
                        'span',
                        { className: 'xm-bk-tt' },
                        h('span', { className: 'xm-bk-title', title: w.title }, w.title || '(无标题)'),
                        h(
                          'span',
                          { className: 'xm-bk-tags' },
                          w.src === 'mine' ? h('i', { className: 'xm-bk-tag mine' }, '我的作品') : null,
                          w.src === 'feed' ? h('i', { className: 'xm-bk-tag feed' }, '灵感 / 活动推荐') : null,
                          w.extra && w.extra.completion5s ? h('i', { className: 'xm-bk-tag q' }, '5s完播 ' + (w.extra.completion5s * 100).toFixed(1) + '%') : null,
                          w.extra && w.extra.coverCtr ? h('i', { className: 'xm-bk-tag q' }, '封面点击 ' + (w.extra.coverCtr * 100).toFixed(1) + '%') : null,
                          w.author ? h('i', { className: 'xm-bk-tag' }, w.author) : null,
                        ),
                      ),
                    ),
                    h('td', null, dur(w.duration)),
                    h('td', null, fmtNum(w.play)),
                    h('td', null, fmtNum(w.digg)),
                    h('td', null, fmtNum(w.collect)),
                    h('td', null, fmtNum(w.comment)),
                    h('td', null, day(w.createTime)),
                  )
                }),
              ),
            ),
          )
        : h('div', { className: 'xm-empty' }, '这次同步里没解析出作品数据——多半是同步时停在首页。去「作品管理」页再点一次「同步后台到库」。'),

      props.gen
        ? h(
            'div',
            { className: 'xm-bk-gen' },
            h('div', { className: 'xm-bk-genh' }, h('span', null, 'AI 分析（DeepSeek · 知识库 · 内容方法 · 采集库对标）'), props.gen.jobId ? h('span', { className: 'xm-bk-gmeta' }, props.gen.busy ? '生成中…' : '完成') : null),
            h(GenResult, { gen: props.gen, empty: false }),
          )
        : null,

    )
  }

  /* ---------------- 设置中心（插件版）：key / 单价 / 用量与费用 ---------------- */
  function Settings(props) {
    const [st, setSt] = useState(null)
    const [us, setUs] = useState(null)
    const [tk, setTk] = useState(null)
    const [host, setHost] = useState(null)
    const [kb, setKb] = useState(null)
    const [kbq, setKbq] = useState('')
    const [kbhits, setKbhits] = useState(null)
    const [kbdoc, setKbdoc] = useState(null)
    const [kblayer, setKblayer] = useState('distilled')
    const [kbsrc, setKbsrc] = useState('auto')
    const [kbdir, setKbdir] = useState('')
    const [kbima, setKbima] = useState({ clientId: '', kbId: '', apiKey: '' })
    const [kbtest, setKbtest] = useState('')
    const [busy, setBusy] = useState('')
    const [msg, setMsg] = useState('')
    const [f, setF] = useState({ arkKey: '', deepseekKey: '', tikhubKey: '', priceIn: '', priceOut: '', usdCny: '' })

    const load = function () {
      fetch(BRIDGE_BASE + '/api/settings')
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error('读取设置失败')
          setSt(j)
          setF(function (o) {
            return Object.assign({}, o, { priceIn: String(j.priceIn), priceOut: String(j.priceOut), usdCny: String(j.usdCny) })
          })
        })
        .catch(function (e) {
          setMsg('采集桥没响应：' + ((e && e.message) || ''))
        })
      fetch(BRIDGE_BASE + '/api/usage')
        .then(function (r) {
          return r.json()
        })
        .then(setUs)
        .catch(function () {})
      fetch(BRIDGE_BASE + '/api/tikhub/status?usage=1')
        .then(function (r) {
          return r.json()
        })
        .then(setTk)
        .catch(function () {})
      fetch(BRIDGE_BASE + '/api/kb/settings')
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) return
          setKbsrc(j.source || 'auto')
          setKbdir(j.dir || '')
          setKbima({ clientId: (j.ima && j.ima.clientId) || '', kbId: (j.ima && j.ima.kbId) || '', apiKey: '' })
        })
        .catch(function () {})
      fetch(BRIDGE_BASE + '/api/kb/catalog')
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (j && j.ok) setKb(j)
        })
        .catch(function () {})
      const origin = (typeof location !== 'undefined' && location.origin) || ''
      fetch(BRIDGE_BASE + '/api/gen/key?hostBase=' + encodeURIComponent(origin))
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (j && j.ok && j.host) setHost(j.host)
        })
        .catch(function () {})
    }
    useEffect(load, [])

    const save = function (patch) {
      setBusy('save')
      fetch(BRIDGE_BASE + '/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch || {}),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          setBusy('')
          if (j && j.ok) {
            setMsg('已保存')
            load()
          } else setMsg('保存失败：' + ((j && j.error) || ''))
        })
        .catch(function (e) {
          setBusy('')
          setMsg('保存失败：' + ((e && e.message) || ''))
        })
    }

    const setField = function (k, v) {
      setF(function (o) {
        const n = Object.assign({}, o)
        n[k] = v
        return n
      })
    }

    const saveKeys = function () {
      const patch = {}
      if (f.arkKey.trim()) patch.arkKey = f.arkKey.trim()
      if (f.deepseekKey.trim()) patch.deepseekKey = f.deepseekKey.trim()
      if (f.tikhubKey.trim()) patch.tikhubKey = f.tikhubKey.trim()
      if (!Object.keys(patch).length) {
        setMsg('没有新的 key 要保存（输入框留空表示不改）')
        return
      }
      save(patch)
    }

    const reloadKb = function () {
      fetch(BRIDGE_BASE + '/api/kb/catalog')
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (j && j.ok) {
            setKb(j)
            if (j.groups && j.groups.length) setKblayer(j.groups[0].key)
          }
        })
        .catch(function () {})
    }

    const saveKb = function (patch) {
      setKbtest('保存中…')
      fetch(BRIDGE_BASE + '/api/kb/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch || {}),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '保存失败')
          if (patch && patch.source) setKbsrc(patch.source)
          if (patch && patch.dir !== undefined) setKbdir(patch.dir)
          setKbtest((j.status && j.status.note) || '已保存')
          reloadKb()
        })
        .catch(function (e) {
          setKbtest('保存失败：' + ((e && e.message) || ''))
        })
    }

    const testKb = function () {
      setKbtest('检测中…')
      fetch(BRIDGE_BASE + '/api/kb/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: kbsrc, dir: kbdir, q: '拍摄' }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '检测失败')
          var t = '来源 ' + j.source + '：' + (j.note || ('共 ' + j.total + ' 篇'))
          if (j.error) t += '（' + j.error + '）'
          setKbtest(t)
          reloadKb()
        })
        .catch(function (e) {
          setKbtest('检测失败：' + ((e && e.message) || ''))
        })
    }

    const searchKbNow = function () {
      if (!kbq.trim()) return
      fetch(BRIDGE_BASE + '/api/kb/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q: kbq.trim(), limit: 8 }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          setKbhits(j && j.ok ? j.hits || [] : [])
          if (j && j.ok && j.note) setKbtest(j.note)
        })
        .catch(function () {
          setKbhits([])
        })
    }
    const srcText = function (from) {
      if (from === 'user-env') return '系统环境变量'
      if (from === 'file') return '本机文件'
      if (from === 'env') return '环境变量'
      if (from === 'reg') return '注册表'
      if (from === 'dsh-env') return '本次 DeepSeek 会话（不用填 key）'
      return from || ''
    }

    const keyRow = function (title, tip, stat, field, ph) {
      const ok = !!(stat && stat.ok)
      return h(
        'div',
        { className: 'xm-keycard' + (ok ? ' ok' : '') },
        h(
          'div',
          { className: 'xm-keyhead' },
          h('span', { className: 'xm-keyt' }, title),
          h('span', { className: 'xm-keybadge' + (ok ? ' on' : '') }, ok ? '已配置' : '未配置'),
          ok ? h('span', { className: 'xm-keyfrom' }, '来源：' + srcText(stat.from)) : null,
        ),
        h('div', { className: 'xm-keytip' }, tip),
        stat && stat.from === 'dsh-env'
          ? h('div', { className: 'xm-keydone' }, '已接入本机的 DeepSeek（deepseek-flash），不用填 key；填了也不会用。')
          : h('input', {
              className: 'xm-input',
              type: 'password',
              placeholder: ok ? '........（已配置，留空不改）' : ph,
              value: f[field],
              onChange: function (e) {
                setField(field, e.target.value)
              },
            }),
      )
    }

    const row = function (label, v) {
      return h('div', { className: 'xm-kv' }, h('span', { className: 'xm-kv-k' }, label), h('span', { className: 'xm-kv-v' }, v))
    }

    if (!st) return h('div', { className: 'xm-empty' }, msg || '读取设置中…')

    const byDay = (us && us.byDay) || {}
    const days = Object.keys(byDay).sort().reverse().slice(0, 14)
    const tkUsed = tk && tk.usage && tk.usage.usage != null ? Number(tk.usage.usage) : null
    const rate = Number(st.usdCny) || 7.2

    return h(
      'div',
      { className: 'xm-set' },
      h('div', { className: 'xm-h1' }, '设置'),
      h('div', { className: 'xm-sub' }, 'Key 只存在本机（' + st.dataDir + '），不上传；改完立刻生效，不用重启。'),
      msg ? h('div', { className: 'xm-note' }, msg) : null,

      h('div', { className: 'xm-h2' }, 'API Key'),
      keyRow('豆包 / 火山方舟（必需）', '文案与视频画面都走它。文生约 ¥0.001/条，视频解析约 ¥0.01-0.02/条。', st.ark, 'arkKey', 'ark-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
      keyRow('文案模型', host ? '直接用当前 DSH 环境里登录的 DeepSeek，不需要另外填 key。' : '没检测到环境内的模型；填一个 DeepSeek key 就会用 DeepSeek 写文案，不填走豆包。', host ? { ok: true, from: 'dsh-env' } : (st.deepseek && st.deepseek.provider === 'deepseek' ? st.deepseek : { ok: false }), 'deepseekKey', 'sk-xxxxxxxxxxxxxxxx'),
      keyRow('TikHub（可选）', '不开浏览器拉热榜 / 博主 / 搜索，约 ¥0.036/次，部分接口要余额。', st.tikhub, 'tikhubKey', 'vstZ... 之类的 key'),
      h(
        'div',
        { className: 'xm-row' },
        h('button', { className: 'xm-btn primary', disabled: !!busy, onClick: saveKeys }, busy === 'save' ? '保存中…' : '保存 Key'),
        h('button', { className: 'xm-btn', onClick: load }, '重新检测'),
        h('span', { className: 'xm-dim' }, '文案模型：' + (host ? (host.model + '（环境内直连，不用 key）') : ((st.models && st.models.text) || '—')) + ' · 视觉模型：' + ((st.models && st.models.vision) || '—')),
      ),

      h('div', { className: 'xm-h2' }, '用量与费用'),
      h(
        'div',
        { className: 'xm-stat4' },
        h(
          'div',
          { className: 'xm-mini-card' },
          h('div', { className: 'xm-mini-k' }, '总计'),
          h('div', { className: 'xm-mini-v' }, '¥' + fmtMoney((us && us.cost) || 0)),
          h('div', { className: 'xm-mini-s' }, ((us && us.calls) || 0) + ' 次调用 · 本机桥统计'),
        ),
        h(
          'div',
          { className: 'xm-mini-card' },
          h('div', { className: 'xm-mini-k' }, '视频解析'),
          h('div', { className: 'xm-mini-v' }, '¥' + fmtMoney((us && us.vision && us.vision.cost) || 0)),
          h(
            'div',
            { className: 'xm-mini-s' },
            ((us && us.vision && us.vision.calls) || 0) + ' 次 · ' + ((us && us.vision && us.vision.frames) || 0) + ' 帧 · ' + fmtNum((us && us.vision && us.vision.totalTokens) || 0) + ' tok',
          ),
        ),
        h(
          'div',
          { className: 'xm-mini-card' },
          h('div', { className: 'xm-mini-k' }, '文案生成'),
          h('div', { className: 'xm-mini-v' }, '¥' + fmtMoney((us && us.text && us.text.cost) || 0)),
          h('div', { className: 'xm-mini-s' }, ((us && us.text && us.text.calls) || 0) + ' 次 · ' + fmtNum((us && us.text && us.text.totalTokens) || 0) + ' tok'),
        ),
        h(
          'div',
          { className: 'xm-mini-card' },
          h('div', { className: 'xm-mini-k' }, 'TikHub'),
          h('div', { className: 'xm-mini-v' }, tkUsed == null ? '—' : '¥' + fmtMoney(tkUsed * rate)),
          h('div', { className: 'xm-mini-s' }, tkUsed == null ? '未配置' : '已用 $' + tkUsed.toFixed(3) + ' · 汇率 ' + rate),
        ),
      ),

      days.length
        ? h(
            'div',
            { className: 'xm-tbl-wrap' },
            h(
              'table',
              { className: 'xm-tbl-s' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  ['日期', '调用', '解析 / 生成', '输入 tok', '输出 tok', 'Token 合计'].map(function (x) {
                    return h('th', { key: x }, x)
                  }),
                ),
              ),
              h(
                'tbody',
                null,
                days.map(function (d) {
                  const v = byDay[d] || {}
                  return h(
                    'tr',
                    { key: d },
                    h('td', null, String(d).slice(5)),
                    h('td', null, String(v.calls || 0)),
                    h('td', null, (v.video || 0) + ' / ' + (v.text || 0)),
                    h('td', null, fmtNum(v.prompt || 0)),
                    h('td', null, fmtNum(v.completion || 0)),
                    h('td', null, fmtNum(v.total || 0)),
                  )
                }),
              ),
            ),
          )
        : h('div', { className: 'xm-empty' }, '还没有调用记录。做一次拆解或解析就能看到。'),

      h('div', { className: 'xm-h2' }, '单价（按你的实际套餐改）'),
      h(
        'div',
        { className: 'xm-row' },
        h(
          'label',
          { className: 'xm-lab' },
          '输入（元 / 百万 tok）',
          h('input', { className: 'xm-input', value: f.priceIn, onChange: function (e) { setField('priceIn', e.target.value) } }),
        ),
        h(
          'label',
          { className: 'xm-lab' },
          '输出（元 / 百万 tok）',
          h('input', { className: 'xm-input', value: f.priceOut, onChange: function (e) { setField('priceOut', e.target.value) } }),
        ),
        h(
          'label',
          { className: 'xm-lab' },
          '美元汇率',
          h('input', { className: 'xm-input', value: f.usdCny, onChange: function (e) { setField('usdCny', e.target.value) } }),
        ),
        h(
          'button',
          {
            className: 'xm-btn',
            onClick: function () {
              save({ priceIn: f.priceIn, priceOut: f.priceOut, usdCny: f.usdCny })
            },
          },
          '保存单价',
        ),
      ),
      h('div', { className: 'xm-hint' }, '默认 0.3 / 0.6 是豆包 lite 的参考价；换模型或套餐后自己改，统计会按新价重算。'),

      h('div', { className: 'xm-h2' }, '知识库（回答依据从哪来）'),
      h(
        'div',
        { className: 'xm-kbcard' },
        h(
          'div',
          { className: 'xm-kbcard-h' },
          h('span', null, '知识库来源'),
          kb && kb.status && kb.status.ready
            ? h('span', { className: 'xm-kbsrc' }, '已就绪 · ' + kb.status.note)
            : h('span', { className: 'xm-kbsrc warn' }, '未就绪 · ' + ((kb && kb.status && kb.status.note) || '还没配置')),
        ),
        h(
          'div',
          { className: 'xm-kbline' },
          [
            { k: 'off', t: '关闭' },
            { k: 'local', t: '本机文件夹' },
            { k: 'bundled', t: '随插件自带' },
            { k: 'ima', t: 'IMA 云端' },
          ].map(function (o) {
            return h(
              'button',
              {
                key: o.k,
                className: 'xm-chip' + (kbsrc === o.k ? ' on' : ''),
                onClick: function () {
                  saveKb({ source: o.k })
                },
              },
              o.t,
            )
          }),
        ),
        kbsrc === 'local' || kbsrc === 'auto'
          ? h(
              'div',
              { className: 'xm-kbsearch' },
              h('input', {
                className: 'xm-input',
                value: kbdir,
                placeholder: '本机知识库文件夹，例如 D:\\我的知识库（里面放 .md / .txt）',
                onChange: function (e) {
                  setKbdir(e.target.value)
                },
              }),
              h(
                'button',
                { className: 'xm-btn', onClick: function () { saveKb({ source: kbsrc === 'auto' ? 'local' : kbsrc, dir: kbdir }) } },
                '保存并检测',
              ),
            )
          : null,
        kbsrc === 'ima'
          ? h(
              'div',
              { className: 'xm-kbsearch' },
              h('input', {
                className: 'xm-input',
                value: kbima.clientId,
                placeholder: 'IMA client_id（本机 ~/.config/ima/client_id 有的话会自动读）',
                onChange: function (e) {
                  setKbima(Object.assign({}, kbima, { clientId: e.target.value }))
                },
              }),
              h('input', {
                className: 'xm-input',
                value: kbima.kbId,
                placeholder: 'IMA 知识库 ID',
                onChange: function (e) {
                  setKbima(Object.assign({}, kbima, { kbId: e.target.value }))
                },
              }),
              h('input', {
                className: 'xm-input',
                type: 'password',
                value: kbima.apiKey,
                placeholder: 'api_key（留空不改）',
                onChange: function (e) {
                  setKbima(Object.assign({}, kbima, { apiKey: e.target.value }))
                },
              }),
              h(
                'button',
                { className: 'xm-btn', onClick: function () { saveKb({ source: 'ima', imaClientId: kbima.clientId, imaKbId: kbima.kbId, imaApiKey: kbima.apiKey }) } },
                '保存',
              ),
              h('button', { className: 'xm-btn xs', onClick: testKb }, '测试连接'),
            )
          : null,
        kbtest ? h('div', { className: 'xm-hint' }, kbtest) : null,
        kb && kb.groups && kb.groups.length
          ? h(
              'div',
              { className: 'xm-kbline' },
              kb.groups.map(function (g) {
                return h(
                  'button',
                  {
                    key: g.key,
                    className: 'xm-chip' + (kblayer === g.key ? ' on' : ''),
                    onClick: function () {
                      setKblayer(g.key)
                    },
                  },
                  g.label + ' ' + g.docs.length,
                )
              }),
            )
          : null,
        h(
          'div',
          { className: 'xm-kbdocs' },
          (kb && kb.groups ? (kb.groups.find(function (x) { return x.key === kblayer }) || kb.groups[0] || { docs: [] }).docs : []).slice(0, 60).map(function (d) {
            return h(
              'button',
              {
                key: d.ref,
                className: 'xm-kbdoc',
                title: (d.headings || []).join(' / '),
                onClick: function () {
                  fetch(BRIDGE_BASE + '/api/kb/doc?ref=' + encodeURIComponent(d.ref) + '&limit=6000')
                    .then(function (r) {
                      return r.json()
                    })
                    .then(function (j) {
                      if (j && j.ok) setKbdoc(j)
                    })
                    .catch(function () {})
                },
              },
              d.name,
            )
          }),
        ),
        h(
          'div',
          { className: 'xm-kbsearch' },
          h('input', {
            className: 'xm-input',
            value: kbq,
            placeholder: '搜一下你的资料：标题怎么写 / 封面点击率 / 报价异议 …',
            onChange: function (e) {
              setKbq(e.target.value)
            },
            onKeyDown: function (e) {
              if (e.key !== 'Enter') return
              searchKbNow()
            },
          }),
          h('button', { className: 'xm-btn', onClick: searchKbNow }, '搜索'),
        ),
        kbhits && kbhits.length
          ? h(
              'div',
              { className: 'xm-kbhits' },
              kbhits.map(function (h2, i) {
                return h(
                  'div',
                  { className: 'xm-kbhit', key: 'hit' + i },
                  h('b', null, h2.doc + (h2.section ? ' › ' + h2.section : '')),
                  h('span', null, h2.snippet),
                )
              }),
            )
          : kbhits
            ? h('div', { className: 'xm-hint' }, '没搜到，换个词试试')
            : null,
        kbdoc
          ? h(
              'div',
              { className: 'xm-kbdocbox' },
              h(
                'div',
                { className: 'xm-kbdocbox-h' },
                h('span', null, kbdoc.name + '（' + Math.round(kbdoc.size / 1000) + 'k 字，只显示前 6000 字）'),
                h('button', { className: 'xm-btn xs', onClick: function () { setKbdoc(null) } }, '收起'),
              ),
              h('pre', { className: 'xm-kbdocpre' }, kbdoc.text),
            )
          : null,
        h(
          'div',
          { className: 'xm-hint' },
          '知识库内容不在安装包 / 仓库里，只在你指定的文件夹：里面放 .md / .txt 就会被读到（可以分子文件夹）。生成时自动挑最相关的几段塞进提示词，成品顶部能看到「依据」；没配就纯靠模型自身。',
        ),
      ),

      h('div', { className: 'xm-h2' }, '运行环境'),
      row('数据目录', st.dataDir),
      row('本地端口', String(st.port)),
      row('桥版本', 'v' + st.version),
    )
  }

  /* ---------- 学习库：拆解 / 仿写 / 视频解析 / 博主 统一成一张多维表格 ---------- */
  function fmtDay(ts) {
    const d = new Date(Number(ts) || 0)
    if (!d.getTime()) return '—'
    const p = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  }

  function fmtStat(s) {
    if (!s) return ''
    const parts = []
    if (s.likes) parts.push('赞 ' + fmtNum(s.likes))
    if (s.collects) parts.push('藏 ' + fmtNum(s.collects))
    if (s.comments) parts.push('评 ' + fmtNum(s.comments))
    return parts.join(' · ')
  }

  const STUDY_KINDS = [
    { k: '', zh: '全部', en: 'All' },
    { k: 'deconstruct', zh: '拆解', en: 'Decode' },
    { k: 'imitate', zh: '仿写', en: 'Rewrite' },
    { k: 'analysis', zh: '视频解析', en: 'Video' },
    { k: 'blogger', zh: '博主', en: 'Creators' },
    { k: 'learn', zh: '账号学习', en: 'Account' },
    { k: 'backend', zh: '后台分析', en: 'Backend' },
    { k: 'original', zh: '原创', en: 'Original' },
    { k: 'topics', zh: '选题', en: 'Topics' },
    { k: 'manual', zh: '手动', en: 'Manual' },
  ]

  const KIND_LABEL = {}
  STUDY_KINDS.forEach(function (o) {
    if (o.k) KIND_LABEL[o.k] = o
  })

  function Study(props) {
    const flash = (props && props.flash) || function () {}
    const [data, setData] = useState({ items: [], counts: { byKind: {}, byPlatform: {}, total: 0 }, matched: 0 })
    const [kind, setKind] = useState('')
    const [plat, setPlat] = useState('')
    const [q, setQ] = useState('')
    const [starred, setStarred] = useState(false)
    const [sel, setSel] = useState([])
    const [detail, setDetail] = useState(null)
    const [editTags, setEditTags] = useState('')
    const [editNote, setEditNote] = useState('')
    const [addOpen, setAddOpen] = useState(false)
    const [busy, setBusy] = useState('')
    const [err, setErr] = useState('')
    const [nf, setNf] = useState({ kind: 'manual', platform: '', title: '', url: '', summary: '', tags: '' })

    const load = useCallback(
      function () {
        const qs = []
        if (kind) qs.push('kind=' + encodeURIComponent(kind))
        if (plat) qs.push('platform=' + encodeURIComponent(plat))
        if (q.trim()) qs.push('q=' + encodeURIComponent(q.trim()))
        if (starred) qs.push('starred=1')
        fetch(BRIDGE_BASE + '/api/study' + (qs.length ? '?' + qs.join('&') : ''), { cache: 'no-store' })
          .then(function (r) {
            return r.json()
          })
          .then(function (j) {
            if (!j || !j.ok) throw new Error((j && j.error) || '读取失败')
            setData({ items: j.items || [], counts: j.counts || {}, matched: j.matched || 0 })
            setErr('')
          })
          .catch(function (e) {
            setErr('采集桥没响应（先双击 bridge\\start-bridge.bat）：' + String((e && e.message) || e))
          })
      },
      [kind, plat, q, starred],
    )

    useEffect(
      function () {
        load()
      },
      [load],
    )

    const openDetail = function (it) {
      setDetail(it)
      setEditTags((it.tags || []).join(', '))
      setEditNote(it.note || '')
      fetch(BRIDGE_BASE + '/api/study/item?id=' + encodeURIComponent(it.id), { cache: 'no-store' })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (j && j.ok && j.item) setDetail(j.item)
        })
        .catch(function () {})
    }

    const patchItem = function (id, body) {
      fetch(BRIDGE_BASE + '/api/study', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.assign({ id: id }, body)),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '保存失败')
          load()
          if (detail && detail.id === id) setDetail(Object.assign({}, detail, j.item))
        })
        .catch(function (e) {
          flash('保存失败：' + String((e && e.message) || e))
        })
    }

    const removeIds = function (ids, done) {
      if (!ids.length) return
      setBusy('remove')
      fetch(BRIDGE_BASE + '/api/study/remove', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: ids }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          flash('已删除 ' + ((j && j.removed) || ids.length) + ' 条')
          setSel([])
          if (detail && ids.indexOf(detail.id) >= 0) setDetail(null)
          load()
          if (done) done()
        })
        .catch(function () {
          flash('删除失败：桥没响应')
        })
        .then(function () {
          setBusy('')
        })
    }

    const addManual = function () {
      if (!nf.title.trim()) return flash('先写个标题（比如「XX 视频的钩子」）')
      setBusy('add')
      const body = {
        items: [
          {
            kind: nf.kind,
            platform: nf.platform,
            title: nf.title.trim(),
            url: nf.url.trim(),
            summary: nf.summary.trim(),
            text: nf.summary.trim(),
            tags: nf.tags
              .split(/[,，\s]+/)
              .filter(Boolean)
              .map(function (x) {
                return x.replace(/^#/, '')
              }),
          },
        ],
      }
      fetch(BRIDGE_BASE + '/api/study', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (j && j.dup) flash('这条已经在库里了，没重复加')
          else flash('已加入学习库')
          setNf({ kind: 'manual', platform: '', title: '', url: '', summary: '', tags: '' })
          setAddOpen(false)
          load()
        })
        .catch(function () {
          flash('加入失败：桥没响应')
        })
        .then(function () {
          setBusy('')
        })
    }

    const doDedupe = function () {
      setBusy('dedupe')
      fetch(BRIDGE_BASE + '/api/study/dedupe', { method: 'POST' })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          flash(j && j.removed ? '去重完成，合并了 ' + j.removed + ' 条' : '没有发现重复的')
          load()
        })
        .catch(function () {
          flash('去重失败：桥没响应')
        })
        .then(function () {
          setBusy('')
        })
    }

    const items = data.items || []
    const counts = data.counts || { byKind: {}, byPlatform: {}, total: 0 }
    const shownIds = items.map(function (x) {
      return x.id
    })
    const allChecked = shownIds.length > 0 && shownIds.every(function (id) {
      return sel.indexOf(id) >= 0
    })

    const toggleSel = function (id) {
      setSel(function (prev) {
        return prev.indexOf(id) >= 0
          ? prev.filter(function (x) {
              return x !== id
            })
          : prev.concat([id])
      })
    }

    const toggleAll = function () {
      setSel(allChecked ? [] : shownIds)
    }

    return h(
      'div',
      { className: 'xm-lib' },
      h(
        'div',
        { className: 'xm-lib-h' },
        h('b', null, '学习库'),
        h('span', { className: 'xm-dim' }, '拆解、仿写、视频解析、博主都在这一张表里；打标签、写备注、重复的能一键清掉'),
        h('span', { className: 'xm-dim', style: { marginLeft: 'auto' } }, '共 ' + (counts.total || 0) + ' 条'),
      ),
      h(
        'div',
        { className: 'xm-lib-bar' },
        STUDY_KINDS.map(function (o) {
          const n = o.k ? counts.byKind[o.k] || 0 : counts.total || 0
          return h(
            'button',
            {
              key: o.k || 'all',
              className: 'xm-mini' + (kind === o.k ? ' on' : ''),
              onClick: function () {
                setKind(o.k)
              },
            },
            o.zh + (n ? ' ' + n : ''),
          )
        }),
        h('span', { className: 'xm-lib-sep' }),
        h(
          'button',
          { className: 'xm-mini' + (plat === '' ? ' on' : ''), onClick: function () { setPlat('') } },
          '全部平台',
        ),
        h(
          'button',
          { className: 'xm-mini' + (plat === 'xhs' ? ' on' : ''), onClick: function () { setPlat('xhs') } },
          '小红书',
        ),
        h(
          'button',
          { className: 'xm-mini' + (plat === 'douyin' ? ' on' : ''), onClick: function () { setPlat('douyin') } },
          '抖音',
        ),
        h('input', {
          className: 'xm-input xm-lib-q',
          placeholder: '搜标题 / 作者 / 标签 / 备注',
          value: q,
          onChange: function (e) {
            setQ(e.target.value)
          },
        }),
        h(
          'button',
          {
            className: 'xm-mini' + (starred ? ' on' : ''),
            onClick: function () {
              setStarred(!starred)
            },
          },
          '★ 星标',
        ),
        h(
          'button',
          { className: 'xm-btn', onClick: load },
          '刷新',
        ),
        h(
          'button',
          { className: 'xm-btn', onClick: function () { setAddOpen(!addOpen) } },
          addOpen ? '收起' : '＋ 添加',
        ),
        h(
          'button',
          { className: 'xm-btn', onClick: doDedupe, disabled: busy === 'dedupe' },
          busy === 'dedupe' ? '去重中…' : '去重',
        ),
        sel.length
          ? h(
              'button',
              {
                className: 'xm-btn danger',
                onClick: function () {
                  removeIds(sel)
                },
                disabled: busy === 'remove',
              },
              '删除选中 ' + sel.length,
            )
          : null,
      ),
      err ? h('div', { className: 'xm-err' }, err) : null,
      addOpen
        ? h(
            'div',
            { className: 'xm-lib-add' },
            h(
              'div',
              { className: 'xm-lib-addrow' },
              h(
                'select',
                {
                  className: 'xm-sel',
                  value: nf.kind,
                  onChange: function (e) {
                    setNf(Object.assign({}, nf, { kind: e.target.value }))
                  },
                },
                ['manual', 'deconstruct', 'imitate', 'analysis', 'blogger', 'learn', 'backend'].map(function (k) {
                  return h('option', { key: k, value: k }, KIND_LABEL[k] ? KIND_LABEL[k].zh : k)
                }),
              ),
              h(
                'select',
                {
                  className: 'xm-sel',
                  value: nf.platform,
                  onChange: function (e) {
                    setNf(Object.assign({}, nf, { platform: e.target.value }))
                  },
                },
                h('option', { value: '' }, '不限平台'),
                h('option', { value: 'xhs' }, '小红书'),
                h('option', { value: 'douyin' }, '抖音'),
              ),
            ),
            h('input', {
              className: 'xm-input',
              placeholder: '标题（必填）',
              value: nf.title,
              onChange: function (e) {
                setNf(Object.assign({}, nf, { title: e.target.value }))
              },
            }),
            h('input', {
              className: 'xm-input',
              placeholder: '链接（可选）',
              value: nf.url,
              onChange: function (e) {
                setNf(Object.assign({}, nf, { url: e.target.value }))
              },
            }),
            h('textarea', {
              className: 'xm-input xm-lib-ta',
              placeholder: '记下要点：钩子怎么写的、结构、你打算怎么用',
              value: nf.summary,
              onChange: function (e) {
                setNf(Object.assign({}, nf, { summary: e.target.value }))
              },
            }),
            h('input', {
              className: 'xm-input',
              placeholder: '标签，逗号分隔（如：钩子, 口播, 摄影）',
              value: nf.tags,
              onChange: function (e) {
                setNf(Object.assign({}, nf, { tags: e.target.value }))
              },
            }),
            h(
              'div',
              { className: 'xm-lib-addact' },
              h('button', { className: 'xm-btn primary', onClick: addManual, disabled: busy === 'add' }, busy === 'add' ? '加入中…' : '加入学习库'),
              h('span', { className: 'xm-dim' }, '同类型 + 同标题会自动判重，不会加第二条'),
            ),
          )
        : null,
      h(
        'div',
        { className: 'xm-tbl-wrap xm-lib-tbl' },
        h(
          'div',
          { className: 'xm-tbl' },
          h(
            'div',
            { className: 'xm-tr xm-tr-head' },
            h('div', { className: 'xm-tcell xm-lc-check' }, h('input', { type: 'checkbox', checked: allChecked, onChange: toggleAll })),
            h('div', { className: 'xm-tcell xm-lc-kind' }, '类型'),
            h('div', { className: 'xm-tcell xm-lc-main' }, '标题 / 要点'),
            h('div', { className: 'xm-tcell xm-lc-src' }, '来源'),
            h('div', { className: 'xm-tcell xm-lc-data' }, '数据'),
            h('div', { className: 'xm-tcell xm-lc-tags' }, '标签'),
            h('div', { className: 'xm-tcell xm-lc-time' }, '时间'),
            h('div', { className: 'xm-tcell xm-lc-act' }, '操作'),
          ),
          items.length
            ? items.map(function (it) {
                const lab = KIND_LABEL[it.kind]
                return h(
                  'div',
                  {
                    key: it.id,
                    className: 'xm-tr xm-lc-row' + (sel.indexOf(it.id) >= 0 ? ' picked' : '') + (it.starred ? ' starred' : ''),
                  },
                  h(
                    'div',
                    { className: 'xm-tcell xm-lc-check' },
                    h('input', {
                      type: 'checkbox',
                      checked: sel.indexOf(it.id) >= 0,
                      onChange: function () {
                        toggleSel(it.id)
                      },
                    }),
                  ),
                  h(
                    'div',
                    { className: 'xm-tcell xm-lc-kind' },
                    h('span', { className: 'xm-lib-kind k-' + it.kind }, lab ? lab.zh : it.kind),
                  ),
                  h(
                    'div',
                    { className: 'xm-tcell xm-lc-main', onClick: function () { openDetail(it) }, title: '点开看全文' },
                    h('div', { className: 'xm-lib-t' }, (it.starred ? '★ ' : '') + it.title),
                    h('div', { className: 'xm-lib-s' }, it.summary || '（还没有摘要，点开自己写）'),
                  ),
                  h(
                    'div',
                    { className: 'xm-tcell xm-lc-src' },
                    it.platform ? h('span', { className: 'xm-badge plat-' + it.platform }, it.platform === 'xhs' ? '小红书' : '抖音') : null,
                    h('span', { className: 'xm-dim xm-lib-author' }, it.author || '—'),
                  ),
                  h('div', { className: 'xm-tcell xm-lc-data' }, fmtStat(it.stats) || '—'),
                  h(
                    'div',
                    { className: 'xm-tcell xm-lc-tags' },
                    (it.tags || []).slice(0, 3).map(function (tg) {
                      return h('span', { key: tg, className: 'xm-tag' }, tg)
                    }),
                    (it.tags || []).length === 0 ? h('span', { className: 'xm-dim' }, '—') : null,
                  ),
                  h('div', { className: 'xm-tcell xm-lc-time' }, fmtDay(it.at)),
                  h(
                    'div',
                    { className: 'xm-tcell xm-lc-act' },
                    h(
                      'button',
                      { className: 'xm-btn xs', onClick: function () { openDetail(it) } },
                      '打开',
                    ),
                    h(
                      'button',
                      {
                        className: 'xm-btn xs' + (it.starred ? ' primary' : ''),
                        onClick: function () {
                          patchItem(it.id, { starred: !it.starred })
                        },
                      },
                      it.starred ? '★' : '☆',
                    ),
                    it.url
                      ? h(
                          'a',
                          { className: 'xm-btn xs', href: it.url, target: '_blank', rel: 'noreferrer', title: '打开原帖' },
                          '↗',
                        )
                      : null,
                    h(
                      'button',
                      { className: 'xm-btn xs danger', onClick: function () { removeIds([it.id]) } },
                      '删',
                    ),
                  ),
                )
              })
            : h(
                'div',
                { className: 'xm-lib-empty' },
                '学习库还是空的：去「拆解」「仿写」「找博主」跑一条，或者点上面「＋ 添加」自己记一条。',
              ),
        ),
      ),
      detail
        ? h(
            'div',
            { className: 'xm-lib-mask', onClick: function () { setDetail(null) } },
            h(
              'div',
              {
                className: 'xm-lib-drawer',
                onClick: function (e) {
                  e.stopPropagation()
                },
              },
              h(
                'div',
                { className: 'xm-lib-dhead' },
                h('b', null, detail.title),
                h(
                  'button',
                  { className: 'xm-btn xs', onClick: function () { setDetail(null) } },
                  '关闭',
                ),
              ),
              h(
                'div',
                { className: 'xm-lib-dmeta' },
                h('span', { className: 'xm-lib-kind k-' + detail.kind }, KIND_LABEL[detail.kind] ? KIND_LABEL[detail.kind].zh : detail.kind),
                detail.platform ? h('span', { className: 'xm-badge plat-' + detail.platform }, detail.platform === 'xhs' ? '小红书' : '抖音') : null,
                detail.author ? h('span', { className: 'xm-dim' }, detail.author) : null,
                h('span', { className: 'xm-dim' }, fmtDay(detail.at)),
                fmtStat(detail.stats) ? h('span', { className: 'xm-dim' }, fmtStat(detail.stats)) : null,
              ),
              h('div', { className: 'xm-lab' }, '标签（逗号分隔）'),
              h('input', {
                className: 'xm-input',
                value: editTags,
                onChange: function (e) {
                  setEditTags(e.target.value)
                },
              }),
              h('div', { className: 'xm-lab' }, '我的备注：下次怎么用上它'),
              h('textarea', {
                className: 'xm-input xm-lib-ta',
                value: editNote,
                onChange: function (e) {
                  setEditNote(e.target.value)
                },
              }),
              h(
                'div',
                { className: 'xm-lib-dact' },
                h(
                  'button',
                  {
                    className: 'xm-btn primary',
                    onClick: function () {
                      patchItem(detail.id, { tags: editTags, note: editNote })
                      flash('已保存')
                    },
                  },
                  '保存标签与备注',
                ),
                h(
                  'button',
                  {
                    className: 'xm-btn',
                    onClick: function () {
                      copyText(detail.text || detail.summary || detail.title).then(function (ok) {
                        flash(ok ? '已复制全文' : '复制失败')
                      })
                    },
                  },
                  '复制全文',
                ),
                h(
                  'button',
                  { className: 'xm-btn danger', onClick: function () { removeIds([detail.id]) } },
                  '删除这条',
                ),
              ),
              h('div', { className: 'xm-lab' }, '原文 / 拆解全文'),
              h('pre', { className: 'xm-lib-pre' }, detail.text || detail.summary || '（这条没有存正文）'),
            ),
          )
        : null,
    )
  }

  function Works(props) {
      const library = (props && props.library) || ''
      const [list, setList] = useState([])
      const [loading, setLoading] = useState(true)
      const [kind, setKind] = useState('')
      const [open, setOpen] = useState('')
      const [err, setErr] = useState('')

      const load = useCallback(
        function () {
          setLoading(true)
          const qs = []
          if (library) qs.push('library=' + library)
          if (kind) qs.push('kind=' + encodeURIComponent(kind))
          fetch(BRIDGE_BASE + '/api/generations' + (qs.length ? '?' + qs.join('&') : ''), { cache: 'no-store' })
            .then(function (r) {
              return r.json()
            })
            .then(function (j) {
              if (!j || !j.ok) throw new Error((j && j.error) || '读取失败')
              setList(j.items || [])
              setErr('')
            })
            .catch(function (e) {
              setErr('采集桥没响应（先双击 bridge\\start-bridge.bat）：' + String((e && e.message) || e))
            })
            .then(function () {
              setLoading(false)
            })
        },
        [kind, library],
      )

      useEffect(
        function () {
          load()
        },
        [load],
      )

      const act = function (id, body, del) {
        const opt = del
          ? { method: 'DELETE' }
          : { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ id: id }, body)) }
        fetch(BRIDGE_BASE + '/api/generation' + (del ? '?id=' + encodeURIComponent(id) : ''), opt)
          .then(function (r) {
            return r.json()
          })
          .then(function () {
            load()
          })
          .catch(function () {})
      }

      const kinds =
        library === 'orig'
          ? ['', 'original', 'topics', 'idea']
          : library === 'learn'
            ? ['', 'deconstruct', 'imitate', 'learn', 'backend']
            : ['', 'deconstruct', 'imitate', 'original', 'topics', 'learn', 'idea', 'backend']

      return h(
        'div',
        { className: 'xm-works' },
        h(
          'div',
          { className: 'xm-works-h' },
          h('b', null, library === 'orig' ? t('works.origTitle') : library === 'learn' ? t('works.learnTitle') : t('works.title')),
          h('span', { className: 'xm-dim' }, library === 'orig' ? t('works.origSub') : t('works.learnSub')),
        ),
        h(
          'div',
          { className: 'xm-cap-filters' },
          kinds.map(function (k) {
            return h(
              'button',
              {
                key: k || 'all',
                className: 'xm-mini' + (kind === k ? ' on' : ''),
                onClick: function () {
                  setKind(k)
                },
              },
              k ? t('tab.' + k) : t('works.all'),
            )
          }),
          h('span', { className: 'xm-dim', style: { marginLeft: 'auto' } }, loading ? t('works.loading') : list.length + ' 份'),
          h(
            'button',
            {
              className: 'xm-mini',
              onClick: load,
            },
            '刷新',
          ),
        ),
        err ? h('div', { className: 'xm-err' }, err) : null,
        !loading && !list.length && !err ? h('div', { className: 'xm-cap-empty' }, t('works.empty')) : null,
        list.map(function (it) {
          const isOpen = open === it.id
          const txt = String(it.text || '')
          const u = it.usage || {}
          return h(
            'div',
            { key: it.id, className: 'xm-work' + (it.adopted ? ' adopted' : '') },
            h(
              'div',
              { className: 'xm-work-h' },
              h('span', { className: 'xm-badge plat-' + (it.platform || 'xhs') }, it.platform === 'douyin' ? '抖音' : '小红书'),
              h('span', { className: 'xm-badge' }, t('tab.' + (it.kind || 'deconstruct'))),
              it.adopted ? h('span', { className: 'xm-badge ok' }, t('works.adopted')) : null,
              h('span', { className: 'xm-work-t' }, it.title || '(无标题)'),
              h('span', { className: 'xm-dim xm-work-time' }, new Date(it.at || Date.now()).toLocaleString()),
            ),
            h('div', { className: 'xm-work-body' }, isOpen ? txt : txt.slice(0, 180) + (txt.length > 180 ? '…' : '')),
            h(
              'div',
              { className: 'xm-work-act' },
              h(
                'button',
                {
                  className: 'xm-btn xs',
                  onClick: function () {
                    setOpen(isOpen ? '' : it.id)
                  },
                },
                isOpen ? '收起' : '展开',
              ),
              h(
                'button',
                {
                  className: 'xm-btn xs',
                  onClick: function () {
                    copyText(txt)
                  },
                },
                t('works.copy'),
              ),
              h(
                'button',
                {
                  className: 'xm-btn xs',
                  onClick: function () {
                    act(it.id, { adopted: !it.adopted })
                  },
                },
                it.adopted ? t('works.adopted') : t('works.adopt'),
              ),
              h('span', { className: 'xm-dim' }, [(u.total_tokens || 0) + ' tok', it.ms ? fmtMs(it.ms) : ''].filter(Boolean).join(' · ')),
              h(
                'button',
                {
                  className: 'xm-btn xs danger',
                  onClick: function () {
                    act(it.id, {}, true)
                  },
                },
                t('works.remove'),
              ),
            ),
          )
        }),
        h('div', { className: 'xm-dim', style: { marginTop: 10 } }, t('works.note')),
      )
    }

  
  /* 灵感库：碎片记录 → 一键变成选题 / 创意的输入。数据在 bridge/data/inspirations.json */
  function Insp(props) {
    const [list, setList] = useState([])
    const [text, setText] = useState('')
    const [tags, setTags] = useState('')
    const [q, setQ] = useState('')
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    const [note, setNote] = useState('')

    const load = useCallback(function () {
      fetch(BRIDGE_BASE + '/api/inspirations' + (q ? '?q=' + encodeURIComponent(q) : ''), { cache: 'no-store' })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '读取失败')
          setList(j.items || [])
          setErr('')
        })
        .catch(function (e) {
          setErr('采集桥没响应（先双击 bridge\\start-bridge.bat）：' + String((e && e.message) || e))
        })
    }, [q])

    useEffect(
      function () {
        load()
      },
      [load],
    )

    const add = function () {
      const v = text.trim()
      if (!v) {
        setNote('先写一句')
        return
      }
      setBusy(true)
      fetch(BRIDGE_BASE + '/api/inspirations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: v, tags: tags }),
      })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || '保存失败')
          setText('')
          setTags('')
          setNote('记下了')
          load()
        })
        .catch(function (e) {
          setNote('保存失败：' + String((e && e.message) || e))
        })
        .then(function () {
          setBusy(false)
        })
    }

    const act = function (path, body, del) {
      const opt = del
        ? { method: 'DELETE' }
        : { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
      fetch(BRIDGE_BASE + path + (del ? '?id=' + encodeURIComponent(body.id) : ''), opt)
        .then(function (r) {
          return r.json()
        })
        .then(function () {
          load()
        })
        .catch(function () {})
    }

    return h(
      'div',
      { className: 'xm-insp' },
      h(
        'div',
        { className: 'xm-works-h' },
        h('b', null, t('insp.title')),
        h('span', { className: 'xm-dim' }, t('insp.sub')),
        h('span', { className: 'xm-dim', style: { marginLeft: 'auto' } }, list.length + ' 条'),
      ),
      h(
        'div',
        { className: 'xm-insp-add' },
        h('textarea', {
          className: 'xm-insp-ta',
          value: text,
          placeholder: t('insp.ph'),
          onChange: function (e) {
            setText(e.target.value)
          },
        }),
        h(
          'div',
          { className: 'xm-hot-row' },
          h('input', {
            className: 'xm-input',
            value: tags,
            placeholder: t('insp.tags'),
            onChange: function (e) {
              setTags(e.target.value)
            },
            style: { flex: '1 1 240px' },
          }),
          h(
            'button',
            { className: 'xm-btn primary', onClick: add, disabled: busy },
            busy ? '保存中…' : t('insp.add'),
          ),
          note ? h('span', { className: 'xm-dim' }, note) : null,
        ),
      ),
      h(
        'div',
        { className: 'xm-hot-row' },
        h('input', {
          className: 'xm-input xm-cap-search',
          value: q,
          placeholder: '搜灵感 / 标签',
          onChange: function (e) {
            setQ(e.target.value)
          },
        }),
        h(
          'button',
          { className: 'xm-mini', onClick: load },
          '刷新',
        ),
      ),
      err ? h('div', { className: 'xm-err' }, err) : null,
      !list.length && !err ? h('div', { className: 'xm-cap-empty' }, t('insp.empty')) : null,
      h(
        'div',
        { className: 'xm-insp-list' },
        list.map(function (it) {
          return h(
            'div',
            { key: it.id, className: 'xm-insp-item' + (it.done ? ' done' : '') },
            h('div', { className: 'xm-insp-txt' }, it.text),
            h(
              'div',
              { className: 'xm-insp-meta' },
              String(it.tags || '')
                .split(/[,，\s]+/)
                .filter(Boolean)
                .map(function (x, i) {
                  return h('span', { key: 'g' + i, className: 'xm-tag' }, '#' + x)
                }),
              h('span', { className: 'xm-dim' }, new Date(it.at || Date.now()).toLocaleString()),
              h('span', { style: { flex: 1 } }),
              it.done ? h('span', { className: 'xm-badge ok' }, t('insp.done')) : null,
              h(
                'button',
                {
                  className: 'xm-btn xs',
                  onClick: function () {
                    props && props.onGo && props.onGo(it.text, 'topics')
                  },
                },
                t('insp.toTopics'),
              ),
              h(
                'button',
                {
                  className: 'xm-btn xs',
                  onClick: function () {
                    props && props.onGo && props.onGo(it.text, 'idea')
                  },
                },
                t('insp.toIdea'),
              ),
              h(
                'button',
                {
                  className: 'xm-btn xs',
                  onClick: function () {
                    act('/api/inspiration', { id: it.id, done: !it.done })
                  },
                },
                it.done ? '撤销' : '标记用完',
              ),
              h(
                'button',
                {
                  className: 'xm-btn xs danger',
                  onClick: function () {
                    act('/api/inspiration', { id: it.id }, true)
                  },
                },
                t('insp.del'),
              ),
            ),
          )
        }),
      ),
    )
  }


  /* 拆解 / 仿写的「素材来源」：默认从采集库取，不再让用户手抄一遍。
     没有素材时给一句明确指引 + 一键跳到采集库。 */
  function PickPane(props) {
    const tab = props.tab
    const [items, setItems] = useState([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [q, setQ] = useState('')

    const load = useCallback(function () {
      setLoading(true)
      fetch(BRIDGE_BASE + '/api/queue', { cache: 'no-store' })
        .then(function (r) {
          return r.json()
        })
        .then(function (j) {
          setItems((j && j.items) || [])
        })
        .catch(function () {})
        .then(function () {
          setLoading(false)
        })
    }, [])

    useEffect(
      function () {
        if (open && !items.length) load()
      },
      [open, items.length, load],
    )

    const cur = tab === 'deconstruct' ? props.form.deconstruct : props.form.imitate
    const has = tab === 'deconstruct' ? !!String(cur.title || '').trim() || !!String(cur.body || '').trim() : !!String(cur.source || '').trim()
    const head =
      tab === 'deconstruct'
        ? { title: cur.title, body: cur.body, stats: cur.likes || cur.collects || cur.comments }
        : { title: (String(cur.source || '').split('\n')[0] || '').slice(0, 60), body: cur.source }

    const shown = items.filter(function (it) {
      if (!q.trim()) return true
      return (String(it.title || '') + String(it.desc || '')).toLowerCase().includes(q.trim().toLowerCase())
    })

    return h(
      'div',
      { className: 'xm-pick' },
      h(
        'div',
        { className: 'xm-pick-h' },
        h('b', null, tab === 'deconstruct' ? '素材：要拆的这条' : '素材：照着它写'),
        h(
          'span',
          { className: 'xm-dim' },
          has ? '已从采集库带入，直接点上面的「⚡ 一键生成」' : '还没选素材：点右边「从采集库选」，或先去采集一条',
        ),
        h('span', { style: { flex: 1 } }),
        h(
          'button',
          {
            className: 'xm-btn xs',
            onClick: function () {
              setOpen(!open)
            },
          },
          open ? '收起' : '从采集库选',
        ),
        has
          ? h(
              'button',
              {
                className: 'xm-btn xs',
                onClick: function () {
                  props.onClear && props.onClear()
                },
              },
              '清空',
            )
          : null,
      ),
      has
        ? h(
            'div',
            { className: 'xm-pick-body' },
            h('div', { className: 'xm-pick-t' }, head.title || '(无标题)'),
            h('div', { className: 'xm-pick-p' }, String(head.body || '').slice(0, 160) + (String(head.body || '').length > 160 ? '…' : '')),
          )
        : null,
      open
        ? h(
            'div',
            { className: 'xm-pick-list' },
            h('input', {
              className: 'xm-input',
              value: q,
              placeholder: '搜采集库里的标题 / 正文',
              onChange: function (e) {
                setQ(e.target.value)
              },
            }),
            loading ? h('div', { className: 'xm-dim' }, '读取中…') : null,
            !loading && !shown.length
              ? h(
                  'div',
                  { className: 'xm-dim' },
                  '采集库是空的：去浏览器打开小红书 / 抖音，按播放 2 秒后点「采集到自媒体库」',
                )
              : null,
            shown.slice(0, 40).map(function (it) {
              const s = it.stats || {}
              return h(
                'button',
                {
                  key: it.id,
                  className: 'xm-pick-item',
                  onClick: function () {
                    props.onPick(it, tab)
                    setOpen(false)
                  },
                },
                h('span', { className: 'xm-badge plat-' + platOfItem(it) }, platOfItem(it) === 'douyin' ? '抖音' : '小红书'),
                h('span', { className: 'xm-pick-item-t' }, it.title || '(无标题)'),
                h('span', { className: 'xm-dim' }, '赞 ' + fmtNum(s.likes || 0)),
                it.localFile || it.videoUrl
                  ? h(
                      'span',
                      {
                        className: 'xm-btn xs',
                        onClick: function (e) {
                          e.stopPropagation()
                          props.onPick(it, tab)
                          props.onAnalyze && props.onAnalyze(it)
                        },
                      },
                      '解析视频',
                    )
                  : null,
              )
            }),
          )
        : null,
    )
  }


  /* 轻量 Markdown → 结构：标题 / 列表 / 表格 / 段落 / 引用。
     不引第三方库，够豆包的输出用；表格是真 <table>，方便扫读。 */
  function mdBlocks(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n')
    const out = []
    let i = 0
    while (i < lines.length) {
      const ln = lines[i]
      if (!ln.trim()) {
        i++
        continue
      }
      const hm = ln.match(/^\s{0,3}(#{1,6})\s+(.*)$/)
      if (hm) {
        out.push({ type: 'h', level: Math.min(hm[1].length, 4), text: hm[2].replace(/\*\*/g, '') })
        i++
        continue
      }
      // 表格：以 | 开头，第二行是 |---|
      if (/^\s*\|/.test(ln) && i + 1 < lines.length && /^\s*\|[\s:-]*-[\s:|-]*\|\s*$/.test(lines[i + 1])) {
        const cells = function (s) {
          return s
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map(function (c) {
              return c.trim()
            })
        }
        const head = cells(ln)
        i += 2
        const rows = []
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          rows.push(cells(lines[i]))
          i++
        }
        out.push({ type: 'table', head: head, rows: rows })
        continue
      }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(ln)) {
        const items = []
        let ordered = /^\s*\d+[.)]\s+/.test(ln)
        while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, ''))
          i++
        }
        out.push({ type: 'ul', ordered: ordered, items: items })
        continue
      }
      if (/^\s*>/.test(ln)) {
        const q = []
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          q.push(lines[i].replace(/^\s*>\s?/, ''))
          i++
        }
        out.push({ type: 'q', text: q.join('\n') })
        continue
      }
      const para = []
      while (i < lines.length && lines[i].trim() && !/^\s*(#{1,6}\s|\||[-*+]\s|\d+[.)]\s|>)/.test(lines[i])) {
        para.push(lines[i])
        i++
      }
      // 兜底：上面所有分支都不认的行（比如第二个表格的续表、孤立的分隔线）
      // 必须强制前进，否则 i 不动会死循环
      if (!para.length) {
        para.push(lines[i])
        i++
      }
      out.push({ type: 'p', text: para.join('\n') })
    }
    return out
  }

  function inlineNodes(text) {
    const parts = String(text || '').split(/\*\*([^*]+)\*\*/g)
    return parts.map(function (s, idx) {
      return idx % 2 ? h('b', { key: 'b' + idx }, s) : s
    })
  }

  function MdText(props) {
    const blocks = mdBlocks(props.text)
    return h(
      'div',
      { className: 'xm-md' },
      blocks.map(function (b, idx) {
        if (b.type === 'h') {
          return h('div', { key: idx, className: 'xm-md-h xm-md-h' + b.level }, b.text)
        }
        if (b.type === 'ul') {
          return h(
            b.ordered ? 'ol' : 'ul',
            { key: idx, className: 'xm-md-list' },
            b.items.map(function (it, j) {
              return h('li', { key: j }, inlineNodes(it))
            }),
          )
        }
        if (b.type === 'q') {
          return h('div', { key: idx, className: 'xm-md-q' }, inlineNodes(b.text))
        }
        if (b.type === 'table') {
          return h(
            'div',
            { key: idx, className: 'xm-md-tblwrap' },
            h(
              'table',
              { className: 'xm-md-tbl' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  b.head.map(function (c, j) {
                    return h('th', { key: j }, inlineNodes(c))
                  }),
                ),
              ),
              h(
                'tbody',
                null,
                b.rows.map(function (r, j) {
                  return h(
                    'tr',
                    { key: j },
                    r.map(function (c, k) {
                      return h('td', { key: k }, inlineNodes(c))
                    }),
                  )
                }),
              ),
            ),
          )
        }
        return h('div', { key: idx, className: 'xm-md-p' }, inlineNodes(b.text))
      }),
    )
  }

  function Page() {
      useStyles()

      const [tab, setTab] = useState(loadStartTab)
      const [railW, setRailW] = useState(loadRailW)
      const railDrag = useRef(null)
      const railWRef = useRef(railW)
      railWRef.current = railW
      const [form, setForm] = useState(loadForm)
      const [platform, setPlatform] = useState(loadPlatform)
      const [drafts, setDrafts] = useState(loadDrafts)
      const [toast, setToast] = useState(null)
      const timer = useRef(null)
      const [mx, setMx] = useState(null)
      const mxTimer = useRef(null)
      const mxEs = useRef(null)
      const [autoSeq, setAutoSeq] = useState(0)
      const [gen, setGen] = useState(null)
      const genEs = useRef(null)
      /* 这些页签是「整页表格/看板」，占满宽度、不显示右栏 */
      const FULL_TABS = ['board', 'capture', 'search', 'bloggers', 'accounts', 'insp', 'study', 'worksOrig', 'account', 'settings']
      const isFull = FULL_TABS.indexOf(tab) >= 0

      useEffect(function () {
        writeJSON(FORM_KEY, form)
      }, [form])

      useEffect(function () {
        savePlatform(platform)
      }, [platform])

      useEffect(function () {
        return function () {
          if (timer.current) clearTimeout(timer.current)
          if (mxTimer.current) clearTimeout(mxTimer.current)
        }
      }, [])

      const flash = useCallback(function (msg) {
        setToast(msg)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(function () {
          setToast(null)
        }, 1800)
      }, [])

      const patch = useCallback(function (group, key, value) {
        setForm(function (prev) {
          const g = Object.assign({}, prev[group])
          g[key] = value
          const next = Object.assign({}, prev)
          next[group] = g
          return next
        })
      }, [])

      const resetGroup = useCallback(
        function (group) {
          const base = defaultForm()
          setForm(function (prev) {
            const next = Object.assign({}, prev)
            next[group] = base[group]
            return next
          })
        },
        [],
      )

      const captureTo = useCallback(function (item, target) {
        setForm(function (prev) {
          const next = Object.assign({}, prev)
          const tags = (item.tags || []).map(function (x) {
            return '#' + x
          })
          if (target === 'deconstruct') {
            const d = Object.assign({}, prev.deconstruct)
            const s = item.stats || {}
            d.title = item.title || ''
            d.body = item.desc || ''
            d.tags = tags.join(' ')
            d.likes = s.likes ? String(s.likes) : ''
            d.collects = s.collects ? String(s.collects) : ''
            d.comments = s.comments ? String(s.comments) : ''
            next.deconstruct = d
          } else if (target === 'media') {
            const m = Object.assign({}, prev.media)
            m.mode = 'video'
            m.link = item.videoUrl || ''
            m.desc = [item.title || '', item.desc || '', tags.join(' ')].filter(Boolean).join('\n')
            next.media = m
          } else {
            const im = Object.assign({}, prev.imitate)
            im.source = [item.title || '', item.desc || '', tags.join(' ')].filter(Boolean).join('\n\n')
            next.imitate = im
          }
          return next
        })
        setPlatform(platOfItem(item))
        setTab(target)
        if (target === 'media') {
          if (item.videoUrl) {
            setAutoSeq(function (n) {
              return n + 1
            })
            flash('开始解析这条视频…')
            return
          }
          flash('这条没有视频直链：回浏览器播一下，再点一次「采集到德饱」')
          return
        }
        flash('已填入采集内容')
      }, [])

      const out = useMemo(function () {
        const b = BUILDERS[tab]
        if (!b) return ''
        try {
          return b(form[tab] || {}, { platform: platform })
        } catch (e) {
          return ''
        }
      }, [tab, form, platform])

      const doCopy = function () {
        if (!out) return
        copyText(out).then(function (ok) {
          flash(ok ? t('common.copied') : t('common.copyFail'))
        })
      }

      const doSave = function () {
        if (tab === 'drafts' || !out) return
        const label = labelOf(tab, form)
        const item = {
          id: String(Date.now()),
          tab: tab,
          tabLabel: t('tab.' + tab),
          label: label,
          at: Date.now(),
          form: JSON.parse(JSON.stringify(form)),
        }
        const next = [item].concat(drafts).slice(0, 30)
        setDrafts(next)
        writeJSON(DRAFT_KEY, next)
        flash(t('common.saved'))
      }

      const loadDraft = function (d) {
        if (!d || !d.form) return
        const base = defaultForm()
        const merged = {}
        Object.keys(base).forEach(function (g) {
          merged[g] = Object.assign({}, base[g], d.form[g] || {})
        })
        merged.topics.kinds = Object.assign(defaultKinds(), (d.form.topics && d.form.topics.kinds) || {})
        setForm(merged)
        setTab(d.tab || 'deconstruct')
        flash('已载入：' + (d.label || ''))
      }

      const removeDraft = function (id) {
        const next = drafts.filter(function (x) {
          return x.id !== id
        })
        setDrafts(next)
        writeJSON(DRAFT_KEY, next)
      }

      /* ---------------- 一键生成（桥直连豆包 + SSE 流式） ---------------- */

      const stopGen = function () {
        if (genEs.current) {
          try {
            genEs.current.close()
          } catch (e) {}
          genEs.current = null
        }
      }

      const streamGen = function (id, kind) {
        stopGen()
        const es = new EventSource(BRIDGE_BASE + '/api/gen/stream?id=' + encodeURIComponent(id))
        genEs.current = es
        es.addEventListener('delta', function (ev) {
          let d = {}
          try {
            d = JSON.parse(ev.data)
          } catch (e) {}
          setGen(function (g) {
            return g && g.kind === kind ? Object.assign({}, g, { text: d.text || (g && g.text) || '' }) : g
          })
        })
        es.addEventListener('done', function (ev) {
          let d = {}
          try {
            d = JSON.parse(ev.data)
          } catch (e) {}
          setGen(function (g) {
            return g && g.kind === kind
              ? Object.assign({}, g, {
                  busy: false,
                  text: d.text || (g && g.text) || '',
                  usage: d.usage || null,
                  ms: d.ms || 0,
                  model: d.model || '',
                  kb: Array.isArray(d.kb) ? d.kb : [],
                })
              : g
          })
          stopGen()
          flash('成品已存进作品库')
        })
        es.addEventListener('error', function (ev) {
          if (ev && ev.data) {
            let d = {}
            try {
              d = JSON.parse(ev.data)
            } catch (e) {}
            setGen(function (g) {
              return g && g.kind === kind ? Object.assign({}, g, { busy: false, error: d.error || '生成失败' }) : g
            })
          }
          stopGen()
        })
      }

      /* 通用：拿一段拼好的 prompt 直接开跑（生成器页签和后台分析共用） */
      const startGen = function (prompt, kind, title, library) {
        stopGen()
        setGen({ kind: kind, jobId: '', busy: true, text: '', error: '', usage: null, ms: 0, model: '' })
        fetch(BRIDGE_BASE + '/api/gen', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt,
            kind: kind,
            platform: platform,
            title: title || '分析',
            library: library || 'learn',
            kb: prefKb(),
            hostBase: (typeof location !== 'undefined' && location.origin) || ''
          }),
        })
          .then(function (r) {
            return r.json()
          })
          .then(function (j) {
            if (!j || !j.ok) throw new Error((j && j.error) || '提交失败')
            setGen(function (g) {
              return g && g.kind === kind ? Object.assign({}, g, { jobId: j.id, model: j.model || '' }) : g
            })
            streamGen(j.id, kind)
          })
          .catch(function (e) {
            setGen({
              kind: kind,
              jobId: '',
              busy: false,
              text: '',
              error: '采集桥没响应（先双击 bridge\\start-bridge.bat）：' + String((e && e.message) || e),
              usage: null,
              ms: 0,
              model: ''
            })
          })
      }

      const runGen = function () {
        const kind = tab
        if (!out) {
          flash('左边还差点信息：先填一下再生成')
          return
        }
        if (labelOf(kind, form) === '(未命名)') {
          flash('先把左边的关键信息填上（标题 / 参考笔记 / 主题），再点生成')
          return
        }
        startGen(out, kind, labelOf(tab, form), kind === 'original' || kind === 'topics' || kind === 'idea' ? 'orig' : 'learn')
        setGen({ kind: kind, jobId: '', busy: true, text: '', error: '', usage: null, ms: 0, model: '' })
        fetch(BRIDGE_BASE + '/api/gen', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            prompt: out,
            kind: kind,
            platform: platform,
            title: labelOf(tab, form),
            library: kind === 'original' || kind === 'topics' || kind === 'idea' ? 'orig' : 'learn',
            kb: prefKb(),
            hostBase: (typeof location !== 'undefined' && location.origin) || ''
          }),
        })
          .then(function (r) {
            return r.json()
          })
          .then(function (j) {
            if (!j || !j.ok) throw new Error((j && j.error) || '提交失败')
            setGen(function (g) {
              return g && g.kind === kind ? Object.assign({}, g, { jobId: j.id, model: j.model || '' }) : g
            })
            streamGen(j.id, kind)
          })
          .catch(function (e) {
            setGen({
              kind: kind,
              jobId: '',
              busy: false,
              text: '',
              error: '采集桥没响应（先双击 bridge\\start-bridge.bat）：' + String((e && e.message) || e),
              usage: null,
              ms: 0,
              model: '',
            })
          })
      }

      const genCopy = function () {
        if (!gen || !gen.text) return
        copyText(gen.text).then(function (ok) {
          flash(ok ? t('common.copied') : t('common.copyFail'))
        })
      }

      const genSaveDraft = function () {
        if (!gen || !gen.text) return
        const item = {
          id: String(Date.now()),
          tab: tab,
          tabLabel: t('tab.' + tab),
          label: labelOf(tab, form),
          at: Date.now(),
          form: JSON.parse(JSON.stringify(form)),
          out: gen.text,
          genId: gen.jobId || '',
        }
        const next = [item].concat(drafts).slice(0, 30)
        setDrafts(next)
        writeJSON(DRAFT_KEY, next)
        flash(t('common.saved'))
      }

      const genAdopt = function () {
        if (!gen || !gen.jobId) return
        fetch(BRIDGE_BASE + '/api/generation', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: gen.jobId, adopted: true }),
        })
          .then(function () {
            flash('已标记采用（作品库可见）')
          })
          .catch(function () {})
      }

      /* 进度走 SSE：任务在本机桥里跑，页面切走 / 切到别的对话都不会掐掉；
         回来时用 /api/analyze/active 把正在跑的任务接回来 */
      const attachAnalyze = function (id) {
        if (mxEs.current) {
          try {
            mxEs.current.close()
          } catch (e) {}
          mxEs.current = null
        }
        let es = null
        try {
          es = new EventSource(BRIDGE_BASE + '/api/analyze/stream?id=' + encodeURIComponent(id))
        } catch (e) {
          es = null
        }
        if (!es) return
        mxEs.current = es
        es.addEventListener('stage', function (ev) {
          let d = {}
          try {
            d = JSON.parse(ev.data)
          } catch (e) {}
          setMx(function (prev) {
            return Object.assign({}, prev || {}, { busy: true, stage: d.stage || '', pct: d.pct || 0 })
          })
        })
        es.addEventListener('done', function (ev) {
          let d = {}
          try {
            d = JSON.parse(ev.data)
          } catch (e) {}
          try {
            es.close()
          } catch (e) {}
          mxEs.current = null
          setMx({ busy: false, stage: '完成', pct: 100, error: '', result: (d && d.result) || null })
          flash('解析完成')
        })
        es.addEventListener('error', function (ev) {
          if (!ev || !ev.data) return
          let d = {}
          try {
            d = JSON.parse(ev.data)
          } catch (e) {}
          try {
            es.close()
          } catch (e) {}
          mxEs.current = null
          setMx({ busy: false, stage: '', pct: 0, error: (d && d.error) || '解析失败', result: null })
        })
        es.onerror = function () {
          /* 连接断了（桥重启/网络抖动）就退回轮询，别让界面卡在 busy */
          try {
            es.close()
          } catch (e) {}
          mxEs.current = null
          pollAnalyze(id)
        }
      }

      const pollAnalyze = function (id) {
        fetch(BRIDGE_BASE + '/api/analyze/status?id=' + encodeURIComponent(id), { cache: 'no-store' })
          .then(function (r) {
            return r.json()
          })
          .then(function (st) {
            if (!st || st.ok === false) throw new Error((st && st.error) || '任务丢了')
            setMx({
              busy: !st.done,
              stage: st.stage || '',
              pct: st.pct || 0,
              error: st.error || '',
              result: st.result || null,
            })
            if (!st.done) {
              mxTimer.current = setTimeout(function () {
                pollAnalyze(id)
              }, 1500)
            } else if (st.result) {
              flash('解析完成')
            }
          })
          .catch(function (e) {
            setMx({ busy: false, stage: '', pct: 0, error: String((e && e.message) || e), result: null })
          })
      }

      const runAnalyze = function (item) {
        const m = form.media || {}
        // 从拆解页直接解析采集到的那条视频：优先用它的直链 / 本机文件
        const link = item ? item.localFile || item.videoUrl || '' : m.link || (form.media && form.media.link) || ''
        const desc = item ? String(item.title || '') + '\n' + String(item.desc || '') : m.desc || ''
        const plat = item ? platOfItem(item) : platform
        setMx({ busy: true, video: !!item, stage: '提交给本机解析…', pct: 3, error: '', result: null })
        fetch(BRIDGE_BASE + '/api/analyze', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            link: link,
            desc: desc,
            mode: m.how === 'frames' ? 'frames' : m.how === 'video' ? 'video' : 'auto',
            how: m.how || 'auto',
            frames: Number(m.frames) || 0,
            platform: plat,
            id: item ? item.id : '',
          }),
        })
          .then(function (r) {
            return r.json()
          })
          .then(function (j) {
            if (!j || !j.ok) throw new Error((j && j.error) || '提交失败')
            attachAnalyze(j.id)
          })
          .catch(function (e) {
            setMx({
              busy: false,
              stage: '',
              pct: 0,
              error: '采集桥没响应（先双击 bridge\\start-bridge.bat）：' + String((e && e.message) || e),
              result: null,
            })
          })
      }

      useEffect(
        function () {
          if (autoSeq > 0) runAnalyze()
        },
        [autoSeq],
      )

      /* 切走再回来：正在跑的那条自动接上，不用重新点 */
      useEffect(function () {
        let gone = false
        fetch(BRIDGE_BASE + '/api/analyze/active', { cache: 'no-store' })
          .then(function (r) {
            return r.json()
          })
          .then(function (j) {
            if (gone) return
            const it = j && j.items && j.items[0]
            if (!it) return
            setMx({ busy: true, stage: it.stage || '解析中', pct: it.pct || 5, error: '', result: null })
            attachAnalyze(it.id)
          })
          .catch(function () {})
        return function () {
          gone = true
        }
      }, [])

      const closeAnalyze = function () {
        if (mxTimer.current) clearTimeout(mxTimer.current)
        if (mxEs.current) {
          try {
            mxEs.current.close()
          } catch (e) {}
          mxEs.current = null
        }
        setMx(null)
      }

      /* 采集页解析完直接把结果送进「视频/音乐」页，不用再点来点去 */
      const showAnalysis = function (r) {
        if (!r) return
        if (mxTimer.current) clearTimeout(mxTimer.current)
        if (mxEs.current) {
          try {
            mxEs.current.close()
          } catch (e) {}
          mxEs.current = null
        }
        setMx({ busy: false, stage: '完成', pct: 100, error: '', result: r })
        setTab('deconstruct')
      }

      const toImitate = function () {
        const rep = buildMediaReport(mx && mx.result)
        setForm(function (prev) {
          const next = Object.assign({}, prev)
          const im = Object.assign({}, prev.imitate)
          im.source = rep
          next.imitate = im
          return next
        })
        setTab('imitate')
        flash('已把解析结论填进「仿写」')
      }

      const f = form[tab] || {}

      return h(
        'div',
        { className: 'xm-page' },
        h(
          'div',
          { className: 'xm-head' },
          h('div', { className: 'xm-title' }, h('span', { className: 'xm-dot' }), t('app.title')),
          h('div', { className: 'xm-sub' }, t('app.sub')),
          h(
            'div',
            { className: 'xm-plat' },
            ['xhs', 'douyin'].map(function (p) {
              return h(
                'button',
                {
                  key: p,
                  className: 'xm-plat-btn' + (platform === p ? ' on' : ''),
                  onClick: function () {
                    setPlatform(p)
                  },
                },
                t('plat.' + p),
              )
            }),
          ),
        ),
        h(
          'div',
          { className: 'xm-shell' },
          h(
            'div',
            { className: 'xm-rail', style: { flex: '0 0 ' + railW + 'px', width: railW + 'px' } },
            TAB_GROUPS.map(function (g) {
              return h(
                'div',
                { key: g.key, className: 'xm-rail-group' },
                h('div', { className: 'xm-rail-label' }, t(g.key)),
                g.keys.map(function (k) {
                  return h(
                    'button',
                    {
                      key: k,
                      className: 'xm-rail-item' + (tab === k ? ' on' : ''),
                      onClick: function () {
                        setTab(k)
                        const box = document.querySelector('.xm-left')
                        if (box) box.scrollTop = 0
                      },
                      title: t('tab.' + k),
                    },
                    h('span', { className: 'xm-rail-ico' }, TAB_ICONS[k] || '·'),
                    h('span', { className: 'xm-rail-txt' }, t('tab.' + k)),
                  )
                }),
              )
            }),
            h(
              'div',
              {
                className: 'xm-rail-grip',
                title: t('rail.drag'),
                onDoubleClick: function () {
                  setRailW(126)
                  try {
                    window.localStorage.setItem(RAILW_KEY, '126')
                  } catch (e) {
                    /* ignore */
                  }
                },
                onMouseDown: function (ev) {
                  ev.preventDefault()
                  const startX = ev.clientX
                  const startW = railWRef.current
                  const move = function (e) {
                    const w = Math.max(92, Math.min(300, startW + (e.clientX - startX)))
                    setRailW(w)
                  }
                  const up = function () {
                    document.removeEventListener('mousemove', move)
                    document.removeEventListener('mouseup', up)
                    try {
                      window.localStorage.setItem(RAILW_KEY, String(railWRef.current))
                    } catch (e) {
                      /* ignore */
                    }
                  }
                  document.addEventListener('mousemove', move)
                  document.addEventListener('mouseup', up)
                },
              },
              h('span', { className: 'xm-rail-grip-dot' }),
            ),
          ),
          h(
            'div',
            { className: 'xm-shell-main' },
            h(
              'div',
              { className: 'xm-body' },
              h(
                'div',
                { className: 'xm-col xm-left' + (isFull ? ' xm-full' : '') },
                tab === 'board'
                  ? h(Board, { onUse: captureTo, onShowResult: showAnalysis })
                  : tab === 'search'
                    ? h(Hot, { onUse: captureTo })
                    : tab === 'accounts'
                      ? h(Accounts, null)
                      : tab === 'bloggers'
                        ? h(Bloggers, null)
                  : tab === 'capture'
                    ? h(Capture, { onUse: captureTo, onShowResult: showAnalysis })
                    : tab === 'insp'
                      ? h(Insp, {
                          onGo: function (text, target) {
                            if (target === 'topics') patch('topics', 'direction', text)
                            else patch('strategy', 'direction', text)
                            setTab(target)
                            flash('已带过去：' + text.slice(0, 18))
                          },
                        })
                      : tab === 'drafts'
                      ? h(Drafts, { items: drafts, onLoad: loadDraft, onDelete: removeDraft })
                      : tab === 'study'
                        ? h(Study, { flash: flash })
                        : tab === 'worksOrig'
                        ? h(Works, { library: 'orig' })
                        : tab === 'account'
                        ? h(Backend, { flash: flash, gen: gen && gen.kind === 'backend' ? gen : null, startGen: startGen })
                        : tab === 'settings'
                        ? h(Settings, { flash: flash })
                        : tab === 'deconstruct' || tab === 'imitate'
                          ? h(
                              'div',
                              null,
                              h(
                                'div',
                                { className: 'xm-genbar' },
                                h(
                                  'button',
                                  {
                                    className: 'xm-btn primary xm-genbtn',
                                    onClick: runGen,
                                    disabled: !!(gen && gen.busy && gen.kind === tab),
                                  },
                                  gen && gen.busy && gen.kind === tab ? '生成中…' : '⚡ 一键生成',
                                ),
                                h('span', { className: 'xm-genhint' }, '素材从采集库来，点一下就出结果'),
                                h(
                                  'button',
                                  {
                                    className: 'xm-btn xs',
                                    onClick: function () {
                                      setTab('capture')
                                    },
                                  },
                                  '去采集库',
                                ),
                              ),
                              h(
                                'div',
                                { className: 'xm-linkbox' },
                                h('input', {
                                  className: 'xm-input',
                                  value: (form.media && form.media.link) || '',
                                  placeholder: '也可以直接粘视频链接 / 本地路径，贴完点右边',
                                  onChange: function (e) {
                                    const v = e.target.value
                                    setForm(function (prev) {
                                      const next = Object.assign({}, prev)
                                      next.media = Object.assign({}, prev.media, { link: v })
                                      return next
                                    })
                                  },
                                }),
                                h(
                                  'button',
                                  {
                                    className: 'xm-btn primary',
                                    onClick: function () {
                                      runAnalyze()
                                    },
                                  },
                                  '解析这条',
                                ),
                              ),
                              h(
                                'div',
                                { className: 'xm-chips', style: { margin: '0 0 8px' } },
                                [
                                  { k: 'auto', label: '整段看（推荐）' },
                                  { k: 'frames', label: '抽帧快跑（省 token）' },
                                ].map(function (o) {
                                  const cur = (form.media && form.media.how) || 'auto'
                                  return h(
                                    'div',
                                    {
                                      key: o.k,
                                      className: 'xm-chip' + (cur === o.k ? ' on' : ''),
                                      onClick: function () {
                                        setForm(function (prev) {
                                          const next = Object.assign({}, prev)
                                          next.media = Object.assign({}, prev.media, { how: o.k })
                                          return next
                                        })
                                      },
                                    },
                                    o.label,
                                  )
                                }),
                              ),
                              h(
                                'div',
                                { className: 'xm-dim', style: { margin: '0 0 10px' } },
                                '默认把整段视频交给豆包看（短视频节奏快，逐帧反而会漏掉剪辑点）；超过 45MB 会先压一份小样再送。想省 token 就切「抽帧快跑」。',
                              ),
                              h(PickPane, {
                                tab: tab,
                                form: form,
                                onPick: captureTo,
                                onAnalyze: runAnalyze,
                                onClear: function () {
                                  resetGroup(tab)
                                },
                              }),
                              mx
                                ? h('div', { className: 'xm-dim' }, '解析在右栏，完成后可「照这个结构仿写」')
                                : null,
                            )
                          : h(
                            'div',
                            null,
                            h(
                              'div',
                              { className: 'xm-genbar' },
                              h(
                                'button',
                                {
                                  className: 'xm-btn primary xm-genbtn',
                                  onClick: runGen,
                                  disabled: !!(gen && gen.busy && gen.kind === tab),
                                },
                                gen && gen.busy && gen.kind === tab ? '生成中…' : '⚡ 一键生成',
                              ),
                              h('span', { className: 'xm-genhint' }, t('gen.hint')),
                              h(
                                'button',
                                {
                                  className: 'xm-btn xs',
                                  onClick: doCopy,
                                },
                                '复制指令',
                              ),
                            ),
                            renderForm(tab, f, patch, resetGroup, {
                              onAnalyze: runAnalyze,
                              mx: mx,
                              platform: platform,
                              flash: flash,
                            }),
                          ),
              ),
              h(
                'div',
                { className: 'xm-col xm-right', style: isFull ? { display: 'none' } : null },
            tab === 'deconstruct' && mx
              ? h(
                  'div',
                  { className: 'xm-out' },
                  h(
                    'div',
                    { className: 'xm-outbar' },
                    h('span', null, mx.busy ? '本机解析中…' : mx.result ? '解析结果 · ' + (mx.result.model || '') : '解析'),
                    h('div', { style: { display: 'flex', gap: 8 } }, h('button', { className: 'xm-btn', onClick: closeAnalyze }, '关闭结果')),
                  ),
                  h(
                    'div',
                    { className: 'xm-outbody' },
                    h(MediaResult, {
                      job: mx,
                      onCopyReport: function () {
                        copyText(buildMediaReport(mx.result)).then(function (ok) {
                          flash(ok ? '已复制结论' : '复制失败')
                        })
                      },
                      onAgain: runAnalyze,
                      onToImitate: toImitate,
                      empty: null,
                    }),
                  ),
                )
              : gen && gen.kind === tab
                ? h(
                    'div',
                    { className: 'xm-out' },
                    h(
                      'div',
                      { className: 'xm-outbar' },
                      h(
                        'span',
                        null,
                        (gen.busy ? '生成中 · ' : '成品 · ') +
                          (gen.text ? String(gen.text).length + ' 字' : '') +
                          (gen.usage && gen.usage.total_tokens ? ' · ' + gen.usage.total_tokens + ' tok' : ''),
                      ),
                      h(
                        'div',
                        { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                        h('button', { className: 'xm-btn xs', onClick: genAdopt, disabled: gen.busy || !gen.text }, '采用'),
                        h('button', { className: 'xm-btn xs', onClick: genSaveDraft, disabled: gen.busy || !gen.text }, '存草稿'),
                        h('button', { className: 'xm-btn xs', onClick: runGen, disabled: gen.busy }, '重写'),
                        h('button', { className: 'xm-btn xs', onClick: genCopy, disabled: !gen.text }, '复制'),
                        h(
                          'button',
                          {
                            className: 'xm-btn xs',
                            onClick: function () {
                              stopGen()
                              setGen(null)
                            },
                          },
                          '关闭',
                        ),
                      ),
                    ),
                    h(
                      'div',
                      { className: 'xm-outbody' },
                      h(GenResult, { gen: gen, empty: '点左上「⚡ 一键生成」：豆包会就地把成品写好' }),
                    ),
                  )
                : h(
                    'div',
                    { className: 'xm-out' },
                    h(
                      'div',
                      { className: 'xm-outbar' },
                      h('span', null, out ? out.length + ' 字 · 直接复制' : '等你填完左边'),
                      h(
                        'div',
                        { style: { display: 'flex', gap: 8 } },
                        h(
                          'button',
                          { className: 'xm-btn', onClick: doSave, disabled: !out || tab === 'drafts' },
                          t('common.save'),
                        ),
                        h('button', { className: 'xm-btn primary', onClick: doCopy, disabled: !out }, t('common.copy')),
                      ),
                    ),
                    h('div', { className: 'xm-outbody' }, h('pre', { className: 'xm-pre' }, out || '—')),
                  ),
              ),
            ),
          ),
        ),
        h('div', { className: 'xm-foot' }, t('app.foot')),
        toast ? h('div', { className: 'xm-toast' }, toast) : null,
      )
    }

    function labelOf(tab, form) {
      const f = form[tab] || {}
      const pick =
        tab === 'deconstruct'
          ? f.title
          : tab === 'imitate'
            ? (f.source || '').slice(0, 24)
            : tab === 'original'
              ? f.topic
              : tab === 'topics'
                ? f.industry
                : tab === 'media'
                  ? f.link
                  : tab === 'learn'
                    ? f.stage
                    : tab === 'idea'
                      ? f.direction
                      : f.main
      return String(pick || '').trim() || '(未命名)'
    }

    function renderForm(tab, f, patch, reset, extra) {
      const set = function (key) {
        return function (v) {
          patch(tab, key, v)
        }
      }
      const tools = h(
        'div',
        { className: 'xm-tools' },
        h(
          'button',
          {
            className: 'xm-btn',
            onClick: function () {
              reset(tab)
            },
          },
          t('common.clear'),
        ),
      )

      if (tab === 'deconstruct') {
        return h(
          'div',
          null,
          h(Label, { text: '标题', hint: '原封不动地粘' }),
          h(Input, { value: f.title, onChange: set('title'), placeholder: '当我把出租屋改成这样，房东都不想收租了' }),
          h(Label, { text: '正文' }),
          h(Area, {
            value: f.body,
            onChange: set('body'),
            placeholder: '整段粘进来，包括 emoji 和分段',
            style: { minHeight: 170 },
          }),
          h(Label, { text: '话题标签', hint: '逗号分隔' }),
          h(Input, { value: f.tags, onChange: set('tags'), placeholder: '#出租屋改造 #租房  #省钱' }),
          h(
            'div',
            { className: 'xm-row' },
            h(
              'div',
              { className: 'xm-cell' },
              h(Label, { text: '点赞' }),
              h(Input, { value: f.likes, onChange: set('likes'), placeholder: '1200' }),
            ),
            h(
              'div',
              { className: 'xm-cell' },
              h(Label, { text: '收藏' }),
              h(Input, { value: f.collects, onChange: set('collects'), placeholder: '860' }),
            ),
            h(
              'div',
              { className: 'xm-cell' },
              h(Label, { text: '评论' }),
              h(Input, { value: f.comments, onChange: set('comments'), placeholder: '95' }),
            ),
          ),
          tools,
        )
      }

      if (tab === 'imitate') {
        return h(
          'div',
          null,
          h(Label, { text: '参考笔记', hint: '整篇粘，含标题' }),
          h(Area, {
            value: f.source,
            onChange: set('source'),
            placeholder: '标题 + 正文 + 标签，一起粘进来',
            style: { minHeight: 170 },
          }),
          h(Label, { text: '要换进去的信息', hint: '产品 / 场景 / 人群 / 卖点，随便写' }),
          h(Area, {
            value: f.replace,
            onChange: set('replace'),
            placeholder: '换成我自己的：24 岁，做辅食机，客单价 199，主打一键清洗',
            style: { minHeight: 90 },
          }),
          h(
            'div',
            { className: 'xm-row' },
            h(
              'div',
              { className: 'xm-cell' },
              h(Label, { text: '主产出' }),
              h(Input, { value: f.aspect, onChange: set('aspect'), placeholder: '正文 / 标题 / 视频脚本' }),
            ),
            h(
              'div',
              { className: 'xm-cell' },
              h(Label, { text: '相似度上限' }),
              h(Input, {
                value: String(f.similarity),
                onChange: function (v) {
                  const n = parseInt(String(v).replace(/[^\d]/g, ''), 10)
                  patch(tab, 'similarity', isNaN(n) ? 50 : Math.max(10, Math.min(90, n)))
                },
                placeholder: '50',
              }),
            ),
          ),
          tools,
        )
      }

      if (tab === 'original') {
        return h(
          'div',
          null,
          h(Label, { text: '做哪一种', hint: '文案 = 图文笔记正文；脚本 = 能直接开拍的分镜' }),
          h(
            'div',
            { className: 'xm-chips' },
            [{ k: 'note', t: '文案原创（图文笔记）' }, { k: 'script', t: '脚本原创（含分镜表）' }].map(function (o) {
              const on = (f.mode || 'note') === o.k
              return h(
                'button',
                {
                  key: o.k,
                  className: 'xm-chip' + (on ? ' on' : ''),
                  onClick: function () {
                    patch(tab, 'mode', o.k)
                  },
                },
                o.t,
              )
            }),
          ),
          (f.mode || 'note') === 'script'
            ? h(
                'div',
                { className: 'xm-row' },
                h(
                  'div',
                  { className: 'xm-cell' },
                  h(Label, { text: '成片时长' }),
                  h(Input, { value: f.duration || '', onChange: set('duration'), placeholder: '45-60 秒' }),
                ),
                h('div', { className: 'xm-cell' }, null),
              )
            : null,
          h(Label, { text: (f.mode || 'note') === 'script' ? '想拍什么' : '主题' }),
          h(Input, { value: f.topic, onChange: set('topic'), placeholder: '租房党的厨房收纳' }),
          h(
            'div',
            { className: 'xm-row' },
            h(
              'div',
              { className: 'xm-cell' },
              h(Label, { text: '写给谁' }),
              h(Input, { value: f.audience, onChange: set('audience'), placeholder: '刚毕业、合租、预算有限' }),
            ),
            h(
              'div',
              { className: 'xm-cell' },
              h(Label, { text: '口吻' }),
              h(Input, { value: f.tone, onChange: set('tone'), placeholder: '像朋友说话 / 像行业前辈' }),
            ),
          ),
          h(Label, { text: '他的痛点' }),
          h(Area, { value: f.pain, onChange: set('pain'), placeholder: '台面永远堆满，锅碗没地方放，房东不让打孔', style: { minHeight: 70 } }),
          h(Label, { text: '你的独特证据 / 卖点', hint: '没有就写"无"' }),
          h(Area, { value: f.selling, onChange: set('selling'), placeholder: '我用了两年，亲测 89 元的置物架能多放 3 层', style: { minHeight: 70 } }),
          h(Label, { text: '想埋的关键词', hint: '逗号分隔' }),
          h(Input, { value: f.keywords, onChange: set('keywords'), placeholder: '租房收纳, 厨房置物架, 免打孔' }),
          h(Label, { text: '正文目标字数' }),
          h(Input, {
            value: String(f.words),
            onChange: function (v) {
              const n = parseInt(String(v).replace(/[^\d]/g, ''), 10)
              patch(tab, 'words', isNaN(n) ? 600 : Math.max(150, Math.min(2000, n)))
            },
            placeholder: '600',
          }),
          tools,
        )
      }

      if (tab === 'topics') {
        return h(
          'div',
          null,
          h(Label, { text: '行业 / 领域' }),
          h(Input, { value: f.industry, onChange: set('industry'), placeholder: '母婴辅食 / 服装穿搭 / 装修 / 健身' }),
          h(Label, { text: '用哪些爆款元素', hint: '点一下开关' }),
          h(Chips, {
            items: TOPIC_KINDS,
            value: f.kinds || {},
            onToggle: function (key, on) {
              const next = Object.assign({}, f.kinds || {})
              next[key] = on
              patch(tab, 'kinds', next)
            },
          }),
          h('div', { className: 'xm-hint', style: { marginTop: 10, lineHeight: 1.7 } }, '七个元素对应七种流量来源：反常识、共同记忆、极端词、借势、异性视角、对撞、利他。全开会一次给 21 条，挑着开更聚焦。'),
          tools,
        )
      }

      if (tab === 'cover') {
        return h(
          'div',
          null,
          h(Label, { text: '封面类型' }),
          h(
            'div',
            { className: 'xm-chips' },
            ['大字报', '场景底图+文字'].map(function (k) {
              return h(
                'div',
                {
                  key: k,
                  className: 'xm-chip' + (f.type === k ? ' on' : ''),
                  onClick: function () {
                    patch(tab, 'type', k)
                  },
                },
                k,
              )
            }),
          ),
          h(Label, { text: '主文案', hint: '≤12 字最稳' }),
          h(Input, { value: f.main, onChange: set('main'), placeholder: '别再乱买收纳盒了' }),
          h(Label, { text: '副文案' }),
          h(Input, { value: f.sub, onChange: set('sub'), placeholder: '这 5 个位置我白扔了两年钱' }),
          h(Label, { text: '主体 / 画面元素' }),
          h(Input, { value: f.subject, onChange: set('subject'), placeholder: '厨房台面 / 一个女生在收纳 / 一堆收纳盒' }),
          h(Label, { text: '气质' }),
          h(Input, { value: f.vibe, onChange: set('vibe'), placeholder: '干净、有冲击力 / 日系暖调 / 高饱和' }),
          tools,
        )
      }

      if (tab === 'media') {
        const modes = [
          { k: 'video', label: '视频画面 + 口播' },
          { k: 'music', label: '音乐 / 声音' },
        ]
        const goals = [
          { k: 'decode', label: '拆解（看懂它为什么火）' },
          { k: 'copy', label: '仿写（照结构做一条我的）' },
        ]
        return h(
          'div',
          null,
          h(Label, { text: '解析什么' }),
          h(
            'div',
            { className: 'xm-chips' },
            modes.map(function (m) {
              return h(
                'div',
                {
                  key: m.k,
                  className: 'xm-chip' + (f.mode === m.k ? ' on' : ''),
                  onClick: function () {
                    patch(tab, 'mode', m.k)
                  },
                },
                m.label,
              )
            }),
          ),
          h(Label, { text: '文件或链接', hint: '可以留空，用采集队列里那条' }),
          h(Input, { value: f.link, onChange: set('link'), placeholder: 'D:\\videos\\xxx.mp4 或贴链接' }),
          h(Label, { text: '已知信息', hint: '画面里大概有什么、讲什么' }),
          h(Area, {
            value: f.desc,
            onChange: set('desc'),
            placeholder: '女生出镜讲租房收纳，前 3 秒展示一堆堆到天花板的盒子',
            style: { minHeight: 90 },
          }),
          h(Label, { text: '目标' }),
          h(
            'div',
            { className: 'xm-chips' },
            goals.map(function (g) {
              return h(
                'div',
                {
                  key: g.k,
                  className: 'xm-chip' + (f.goal === g.k ? ' on' : ''),
                  onClick: function () {
                    patch(tab, 'goal', g.k)
                  },
                },
                g.label,
              )
            }),
          ),
          h(
            'div',
            { className: 'xm-hint', style: { marginTop: 10, lineHeight: 1.7 } },
            '点「开始解析」就地把视频跑完：本机 ffmpeg 抽帧 → 豆包（doubao-seed-2-1-lite）看画面 → 出时间线/结构/可复用模板，结论自动存进本地库。左边不用填也能跑（默认拿采集队列里最新一条视频）。',
          ),
          h(Label, { text: '怎么解析', hint: '长视频建议整段交给模型，抽帧容易看不到全局' }),
          h(
            'div',
            { className: 'xm-chips' },
            [
              { k: 'auto', label: '自动（推荐）' },
              { k: 'video', label: '整段视频理解' },
              { k: 'frames', label: '抽帧快跑' },
            ].map(function (o) {
              return h(
                'div',
                {
                  key: o.k,
                  className: 'xm-chip' + ((f.how || 'auto') === o.k ? ' on' : ''),
                  onClick: function () {
                    patch(tab, 'how', o.k)
                  },
                },
                o.label,
              )
            }),
          ),
          h(
            'div',
            { className: 'xm-hint', style: { marginTop: 6, lineHeight: 1.7 } },
            '自动 = 整段交给豆包看（短视频节奏快，逐帧会漏剪辑点）；整段上限 45MB，超了先压一份小样；只有明确选「抽帧快跑」才抽帧。',
          ),
          h(Label, { text: '抽帧密度', hint: '仅抽帧模式生效；自动档会按片长加帧' }),
          h(
            'div',
            { className: 'xm-chips' },
            [
              { n: 0, label: '自适应' },
              { n: 8, label: '8 帧' },
              { n: 24, label: '24 帧（长视频）' },
            ].map(function (o) {
              return h(
                'div',
                {
                  key: o.n,
                  className: 'xm-chip' + (Number(f.frames || 0) === o.n ? ' on' : ''),
                  onClick: function () {
                    patch(tab, 'frames', o.n)
                  },
                },
                o.label,
              )
            }),
          ),
          h(
            'div',
            { className: 'xm-tools', style: { marginTop: 10 } },
            h(
              'button',
              { className: 'xm-btn primary', onClick: extra && extra.onAnalyze, disabled: !!(extra && extra.mx && extra.mx.busy) },
              extra && extra.mx && extra.mx.busy ? '解析中…' : '开始解析（本机）',
            ),
            h(
              'button',
              {
                className: 'xm-btn',
                onClick: function () {
                  copyText(BUILDERS.media(f, { platform: (extra && extra.platform) || 'xhs' })).then(function (ok) {
                    if (extra && extra.flash) extra.flash(ok ? '已复制给助手的指令' : '复制失败')
                  })
                },
              },
              '复制给助手的指令',
            ),
          ),
          tools,
        )
      }

      if (tab === 'learn') {
        return h(
          'div',
          null,
          h(Label, { text: '现在处于什么阶段' }),
          h(Input, { value: f.stage, onChange: set('stage'), placeholder: '起步（0-1 万粉） / 稳定更新 / 要变现' }),
          h(Label, { text: '当前目标' }),
          h(Input, { value: f.goal, onChange: set('goal'), placeholder: '两个月涨到 5000 粉 / 把收藏率做上去' }),
          h(Label, { text: '本地统计', hint: '点按钮自动读，也可以自己改' }),
          h(Area, {
            value: f.stats,
            onChange: set('stats'),
            placeholder: '点下面的「读本地统计」',
            style: { minHeight: 150 },
          }),
          h(
            'div',
            { className: 'xm-tools', style: { marginTop: 8 } },
            h(
              'button',
              {
                className: 'xm-btn primary',
                onClick: function () {
                  patch(tab, 'stats', '正在读本地统计…')
                  fetch(BRIDGE_BASE + '/api/stats')
                    .then(function (r) {
                      return r.json()
                    })
                    .then(function (d) {
                      patch(tab, 'stats', (d && d.text) || '（统计为空，先采集一些内容）')
                    })
                    .catch(function () {
                      patch(tab, 'stats', '读不到本地统计：采集桥没开？先在插件目录里跑一次 start-bridge.bat')
                    })
                },
              },
              '读本地统计',
            ),
          ),
          h(Label, { text: '补充说明', hint: '最近发生了什么、想避开什么' }),
          h(Area, {
            value: f.extra,
            onChange: set('extra'),
            placeholder: '上周改过一次封面风格，播放掉了三成；不想做口播念稿类',
            style: { minHeight: 70 },
          }),
          tools,
        )
      }

      if (tab === 'idea') {
        return h(
          'div',
          null,
          h(Label, { text: '想做的方向', hint: '不填就用画像里的定位' }),
          h(Input, { value: f.direction, onChange: set('direction'), placeholder: '租房改造 + 省钱好物' }),
          h(
            'div',
            { className: 'xm-row' },
            h(
              'div',
              { className: 'xm-cell' },
              h(Label, { text: '形式偏好' }),
              h(Input, { value: f.format, onChange: set('format'), placeholder: '口播 / 对比 / vlog / 图文' }),
            ),
            h(
              'div',
              { className: 'xm-cell' },
              h(Label, { text: '条数' }),
              h(Input, {
                value: String(f.count),
                onChange: function (v) {
                  const n = parseInt(String(v).replace(/[^\d]/g, ''), 10)
                  patch(tab, 'count', isNaN(n) ? 10 : Math.max(3, Math.min(30, n)))
                },
                placeholder: '10',
              }),
            ),
          ),
          h(Label, { text: '限制条件' }),
          h(Area, {
            value: f.constraint,
            onChange: set('constraint'),
            placeholder: '不露脸 / 只能室内拍 / 一周最多拍两条',
            style: { minHeight: 70 },
          }),
          h(
            'div',
            { className: 'xm-hint', style: { marginTop: 10, lineHeight: 1.7 } },
            '这一页会先读本地画像，再按你的方向出创意；没有画像就先跑「账号学习」。',
          ),
          tools,
        )
      }

      return null
    }

    /* 侧栏图标 */
    function SidebarIcon(props) {
      const size = props && typeof props.size === 'number' && props.size > 0 ? props.size : 20
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          style: { display: 'block' },
        },
        h('path', { d: 'M12 3.2l2.1 4.6 5 .6-3.7 3.4 1 4.9-4.4-2.5-4.4 2.5 1-4.9L4.9 8.4l5-.6z' }),
      )
    }

    /* ------------------------------------------------------------------ *
     * 装配
     * ------------------------------------------------------------------ */
    return {
      inject: ['slots'],
      apply(ctx) {
        try {
          if (ctx && ctx.locale && typeof ctx.locale.register === 'function') {
            const offZh = ctx.locale.register(NS, 'zh', STRINGS.zh)
            const offEn = ctx.locale.register(NS, 'en', STRINGS.en)
            let bound = null
            try {
              bound = ctx.locale.bind(NS)
            } catch (e) {
              bound = null
            }
            if (typeof bound === 'function') translate = bound
            if (ctx.effect) {
              ctx.effect(function () {
                return function () {
                  try {
                    if (typeof offZh === 'function') offZh()
                  } catch (e) {
                    /* ignore */
                  }
                  try {
                    if (typeof offEn === 'function') offEn()
                  } catch (e) {
                    /* ignore */
                  }
                }
              }, 'debao-media:locale')
            }
          }
        } catch (e) {
          try {
            console.warn('[debao-media] locale unavailable, falling back to zh', e)
          } catch (e2) {
            /* ignore */
          }
        }

        ctx.slots.inject('sidebar.panellist', function () {
          return ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'debao-media',
              order: 31,
              label: function () {
                return t('app.title')
              },
            },
            SidebarIcon,
          )
        })

        ctx.slots.inject('main', function () {
          return ctx.slots.register({ name: 'main', key: 'debao-media' }, Page)
        })
      },
    }
  },
})
