/*!
 * presets.v1.js - static data: design templates, variant kinds, decorations, effects
 *
 * Lengths are virtual pixels (canvas treated as 1080 tall). Palettes are
 * [frame1, frame2, accent, text]; time palettes add [tint, tintAlpha].
 */
(function () {
  "use strict";

  const margins = n => ({ t: n, r: n, b: n, l: n });
  const corners = (type, size) => [0, 1, 2, 3].map(() => ({ type, size }));
  const line = (on, width, gap, extra) => Object.assign({ on, width, gap, double: false, color: "accent" }, extra);
  const shadow = (size, opacity, color) => ({ on: true, size, opacity, color: color || "#000000" });
  const ornament = (type, size, gap, width) => ({ type, size, gap, width, color: "accent" });
  const opening = (m, cornerType, cornerSize, extra) => Object.assign({
    shape: "rect", margin: typeof m === "number" ? margins(m) : m, linkMargin: typeof m === "number",
    corners: corners(cornerType, cornerSize), linkCorners: true, outerRadius: 0,
  }, extra);
  const frame = (fill, extra) => Object.assign({
    fill, angle: 180, opacity: 1, grain: 0, innerLine: line(true, 3, 10), outerLine: line(false, 3, 12),
    shadow: shadow(28, 0.35), ornament: ornament("none", 44, 12, 3),
  }, extra);

  const BASE_TIMES = {
    morning: ["#fbf1e3", "#efcdb0", "#d9825a", "#5b4032", "#ffc98a", 0.06],
    day: ["#f2f8fc", "#c3dff1", "#3a8fcb", "#274760", "#ffffff", 0],
    evening: ["#f3bf98", "#9c5277", "#e8733f", "#fff3e6", "#ff7a33", 0.12],
    night: ["#262d4f", "#0d1126", "#d6bf72", "#e8eaf6", "#10205a", 0.28],
  };

  // A design replaces shape, colors and decorations. Layers (images / text) are kept.
  const DESIGNS = {
    simple: {
      label: "シンプル", desc: "丸い角と細い線。どんな卓にも合わせやすい基本形。",
      opening: opening(36, "round", 28), frame: frame("linear"),
      palette: ["#f2f8fc", "#c3dff1", "#3a8fcb", "#274760"], times: BASE_TIMES,
      indicator: { style: "badge", pos: "tl", font: "gothic" }, decorations: [],
    },
    mansion: {
      label: "洋館・クラシック", desc: "えぐれた角に二重線と唐草風の飾り。探索もの・ゴシック向け。",
      opening: opening(58, "scoop", 46),
      frame: frame("radial", { grain: 0.3, innerLine: line(true, 2, 12, { double: true }), outerLine: line(true, 3, 14),
        shadow: shadow(40, 0.5), ornament: ornament("flourish", 64, 16, 3) }),
      palette: ["#efe6d2", "#c4ab80", "#8a6a35", "#3a2a15"],
      times: {
        morning: ["#e9dcc3", "#b39468", "#7a5a2e", "#3e2c17", "#ffd59a", 0.06],
        day: ["#efe6d2", "#c4ab80", "#8a6a35", "#3a2a15", "#ffffff", 0],
        evening: ["#8a4332", "#3a1c1a", "#e3a35a", "#fbe7cf", "#ff7a33", 0.14],
        night: ["#2e2436", "#120d17", "#c9a85a", "#efe3c8", "#1a1030", 0.3],
      },
      indicator: { style: "label", pos: "tc", font: "mincho" }, decorations: [],
    },
    forest: {
      label: "森・遺跡", desc: "苔むした石の枠に蔦と小花が絡む。ファンタジーや廃墟探索に。",
      opening: opening(56, "round", 34),
      frame: frame("radial", { grain: 0.45, innerLine: line(true, 2, 8), shadow: shadow(44, 0.55) }),
      palette: ["#7c8270", "#3f4538", "#d8c98f", "#f3eedc"],
      indicator: { style: "label", pos: "tc", font: "mincho" },
      decorations: [
        { type: "ivy", placement: "all", coverage: 0.8, density: 0.65 },
        { type: "flowers", placement: "all", density: 0.35 },
      ],
    },
    horror: {
      label: "ホラー", desc: "黒ずんだ枠にしたたりと蜘蛛の巣。クトゥルフや怪談に。",
      opening: opening(46, "notch", 18),
      frame: frame("linear", { grain: 0.5, innerLine: line(true, 2, 6, { color: "#5e1216" }), shadow: shadow(60, 0.75) }),
      palette: ["#2b1719", "#0b0607", "#9b1c1c", "#e9dcd2"],
      indicator: { style: "label", pos: "tc", font: "mincho", bgAlpha: 0 },
      decorations: [
        { type: "drips", placement: "top", density: 0.55 },
        { type: "cobweb", placement: "corners", size: 1.2 },
      ],
    },
    steampunk: {
      label: "スチームパンク", desc: "真鍮色の枠に歯車と鎖。機械仕掛けの街や冒険活劇に。",
      opening: opening(54, "round", 18),
      frame: frame("radial", { grain: 0.25, innerLine: line(true, 3, 10, { double: true }), outerLine: line(true, 3, 12),
        shadow: shadow(36, 0.55), ornament: ornament("dots", 36, 12, 2) }),
      palette: ["#a07a45", "#3e2c1a", "#e2b45a", "#f7e8c9"],
      indicator: { style: "badge", pos: "tr", font: "serif" },
      decorations: [
        { type: "gears", placement: "corners", size: 1.1 },
        { type: "chain", placement: "top", density: 0.6 },
      ],
    },
    winter: {
      label: "雪国", desc: "白い枠に雪が積もり、つららが下がる。冬のシナリオや雪山に。",
      opening: opening(48, "round", 36),
      frame: frame("linear", { innerLine: line(true, 2, 10), shadow: shadow(30, 0.3, "#34506a") }),
      palette: ["#eef4f9", "#a9c1d4", "#4f7fa6", "#23384a"],
      indicator: { style: "badge", pos: "tl", font: "gothic" },
      decorations: [{ type: "snowcap", placement: "top", density: 0.7 }],
    },
    sakura: {
      label: "桜", desc: "淡い桃色の枠に桜の枝。学園ものや春の日常回に。",
      opening: opening(40, "round", 26),
      frame: frame("linear", { innerLine: line(true, 2, 8), shadow: shadow(26, 0.25, "#6b3446") }),
      palette: ["#fbeef1", "#e7bfca", "#c25b7c", "#4a2b35"],
      indicator: { style: "label", pos: "tc", font: "mincho" },
      decorations: [{ type: "sakura", placement: "topcorners", size: 1.1, density: 0.6 }],
    },
    cinema: {
      label: "シネマ", desc: "上下に黒い帯だけ。演出重視の場面や導入に。",
      opening: opening({ t: 120, r: 0, b: 120, l: 0 }, "square", 0),
      frame: frame("solid", { innerLine: line(false, 2, 0), shadow: shadow(48, 0.55) }),
      palette: ["#060606", "#060606", "#9fd3ff", "#f4f7fa"],
      times: {
        morning: ["#060606", "#060606", "#f3b37a", "#f4efe8", "#ffc98a", 0.06],
        day: ["#060606", "#060606", "#9fd3ff", "#f4f7fa", "#ffffff", 0],
        evening: ["#060606", "#060606", "#ff8e5a", "#fbe9dc", "#ff7a33", 0.14],
        night: ["#060606", "#060606", "#9aa8ff", "#e3e6ff", "#0a1440", 0.32],
      },
      indicator: { style: "label", pos: "br", font: "mincho", bgAlpha: 0 }, decorations: [],
    },
    novel: {
      label: "ノベル（下に文字枠）", desc: "下を広く取ったノベルゲーム風。下の枠に立ち絵や文字を置けます。",
      opening: opening({ t: 28, r: 28, b: 250, l: 28 }, "round", 20),
      frame: frame("linear", { innerLine: line(true, 2, 8), shadow: shadow(24, 0.3), ornament: ornament("diamond", 18, 8, 2) }),
      palette: ["#f2f8fc", "#c3dff1", "#3a8fcb", "#274760"], times: BASE_TIMES,
      indicator: { style: "tabs", pos: "br", font: "gothic" }, decorations: [],
    },
    cyber: {
      label: "サイバー", desc: "斜めに切った角とネオン色の線と回路。SF・現代異能向け。",
      opening: opening(42, "chamfer", 44),
      frame: frame("linear", { angle: 135, innerLine: line(true, 2, 8), outerLine: line(true, 2, 12),
        shadow: shadow(30, 0.6, "accent"), ornament: ornament("bracket", 64, 4, 4) }),
      palette: ["#122236", "#081221", "#5ef2ff", "#d8fbff"],
      times: {
        morning: ["#10202e", "#06101a", "#5ef2ff", "#d8fbff", "#5ef2ff", 0.05],
        day: ["#122236", "#081221", "#7cf8a8", "#e4ffee", "#ffffff", 0],
        evening: ["#261532", "#12091c", "#ff7ad9", "#ffe6f7", "#ff5ab4", 0.1],
        night: ["#0b0d1e", "#03040c", "#8f7bff", "#e5e0ff", "#1a1260", 0.3],
      },
      indicator: { style: "dial", pos: "tr", font: "sans" },
      decorations: [{ type: "circuit", placement: "sides", density: 0.5 }],
    },
    wa: {
      label: "和風", desc: "切り欠きの角と和紙の質感。和風伝奇・時代もの向け。",
      opening: opening(48, "notch", 22),
      frame: frame("solid", { grain: 0.35, innerLine: line(true, 2, 10, { double: true }), shadow: shadow(26, 0.35),
        ornament: ornament("dots", 40, 12, 2) }),
      palette: ["#f1ead8", "#d8ccb0", "#2f5d50", "#2b2620"],
      times: {
        morning: ["#efe4cf", "#d9c7a4", "#b5493b", "#3b2e25", "#ffd59a", 0.06],
        day: ["#f1ead8", "#d8ccb0", "#2f5d50", "#2b2620", "#ffffff", 0],
        evening: ["#b8563d", "#6e2c22", "#f2c46b", "#fbeee0", "#ff7a33", 0.14],
        night: ["#1f2733", "#11161e", "#c9a24f", "#e9e1cf", "#0d1a3a", 0.3],
      },
      indicator: { style: "label", pos: "tr", font: "mincho" }, decorations: [],
    },
  };

  // item: [id, name, sub, icon, on, { colors, tint, effect, amount }]
  const VARIANT_KINDS = {
    time: {
      label: "時間帯", desc: "朝・昼・夕・夜。枠の色と窓の色かぶりで時間の移り変わりを表します。", ownColors: true,
      items: [
        ["morning", "朝", "MORNING", "sunrise", true], ["day", "昼", "DAYTIME", "sun", true],
        ["evening", "夕", "EVENING", "sunset", false], ["night", "夜", "NIGHT", "moon", true],
      ],
    },
    weather: {
      label: "天気", desc: "晴れ・くもり・雨・雪など。窓に雨や雪、霧の演出が重なります。", ownColors: false,
      items: [
        ["sunny", "晴れ", "SUNNY", "sun", true, {}],
        ["cloudy", "くもり", "CLOUDY", "cloud", true, { tint: ["#8a929c", 0.12], effect: "fog", amount: 0.25 }],
        ["rain", "雨", "RAIN", "rain", true, { tint: ["#5c6f86", 0.18], effect: "rain", amount: 0.6 }],
        ["snow", "雪", "SNOW", "snow", true, { tint: ["#dfe8f2", 0.1], effect: "snow", amount: 0.6 }],
        ["fog", "霧", "FOG", "fog", false, { tint: ["#c9ced4", 0.12], effect: "fog", amount: 0.75 }],
        ["storm", "雷雨", "STORM", "bolt", false, { tint: ["#1f2533", 0.3], effect: "storm", amount: 0.7 }],
      ],
    },
    season: {
      label: "季節", desc: "春夏秋冬。季節ごとの色と、花びら・落ち葉・雪の演出。", ownColors: true,
      items: [
        ["spring", "春", "SPRING", "flower", true, { colors: ["#fbeef1", "#e7bfca", "#c25b7c", "#4a2b35"], effect: "petals", amount: 0.45 }],
        ["summer", "夏", "SUMMER", "sun", true, { colors: ["#eaf7fb", "#9fd6e6", "#1f8fb8", "#123c4d"], effect: "sparkle", amount: 0.25 }],
        ["autumn", "秋", "AUTUMN", "leaf", true, { colors: ["#f4e0c4", "#c07a3c", "#b2452a", "#3d2414"], tint: ["#ff9a3c", 0.06], effect: "leaves", amount: 0.45 }],
        ["winter", "冬", "WINTER", "snow", true, { colors: ["#eef4f9", "#a9c1d4", "#4f7fa6", "#23384a"], tint: ["#dfe8f2", 0.08], effect: "snow", amount: 0.4 }],
      ],
    },
    scene: {
      label: "場面の空気", desc: "日常・探索・戦闘・危機・回想。空気感を窓の演出で切り替えます。", ownColors: false,
      items: [
        ["daily", "日常", "DAILY", "heart", true, {}],
        ["explore", "探索", "EXPLORE", "search", true, { effect: "dust", amount: 0.3 }],
        ["battle", "戦闘", "BATTLE", "swords", true, { tint: ["#a01818", 0.06], effect: "vignette", amount: 0.55 }],
        ["crisis", "危機", "ALERT", "alert", false, { effect: "alert", amount: 0.7 }],
        ["memory", "回想", "MEMORY", "clock", true, { effect: "sepia", amount: 0.6 }],
      ],
    },
    sanity: {
      label: "正気度", desc: "正気・動揺・狂気。探索者の心の状態を、暗がりやノイズで表します。", ownColors: false,
      items: [
        ["sane", "正気", "SANE", "eye", true, {}],
        ["shaken", "動揺", "SHAKEN", "eye", true, { tint: ["#2a0f24", 0.1], effect: "vignette", amount: 0.7 }],
        ["madness", "狂気", "MADNESS", "skull", true, { tint: ["#5a0010", 0.14], effect: "glitch", amount: 0.7 }],
      ],
    },
    chapter: {
      label: "章", desc: "序章・第一章…。色は共通のまま、表示だけ切り替えます。", ownColors: false,
      items: [
        ["prologue", "序章", "PROLOGUE", "book", true], ["ch1", "第一章", "CHAPTER 1", "book", true],
        ["ch2", "第二章", "CHAPTER 2", "book", true], ["ch3", "第三章", "CHAPTER 3", "book", false],
        ["epilogue", "終章", "EPILOGUE", "book", true],
      ],
    },
    custom: {
      label: "自由に作る", desc: "名前も数も自由。好きな条件で差分を作れます。", ownColors: false,
      items: [["p1", "パターン1", "PATTERN 1", "none", true], ["p2", "パターン2", "PATTERN 2", "none", true]],
    },
  };

  const EFFECTS = [
    ["none", "なし"], ["rain", "雨"], ["storm", "雷雨"], ["snow", "雪"], ["fog", "霧"],
    ["petals", "花びら"], ["leaves", "落ち葉"], ["sparkle", "きらめき"], ["dust", "舞う粒子（灰・胞子）"],
    ["vignette", "暗がり（ふちを暗く）"], ["alert", "警告（赤い明滅）"], ["glitch", "ノイズ（狂気）"],
    ["scanlines", "走査線（モニター越し）"], ["sepia", "セピア（回想）"],
  ];

  const ICONS = [
    ["none", "なし"], ["sunrise", "日の出"], ["sun", "太陽"], ["sunset", "夕日"], ["moon", "月"], ["star", "星"],
    ["cloud", "雲"], ["rain", "雨"], ["snow", "雪の結晶"], ["fog", "霧"], ["bolt", "雷"], ["flower", "花"],
    ["leaf", "葉"], ["heart", "ハート"], ["search", "虫めがね"], ["swords", "剣"], ["alert", "警告"],
    ["eye", "目"], ["skull", "ドクロ"], ["clock", "時計"], ["book", "本"], ["custom", "自分の画像"],
  ];

  const PLACEMENTS = [
    ["all", "窓のまわり全部"], ["top", "上"], ["bottom", "下"], ["topbottom", "上下"], ["sides", "左右"],
    ["corners", "四隅"], ["topcorners", "上の二隅"], ["bottomcorners", "下の二隅"],
  ];

  // uses: which sliders apply to the type. colorNames: what color / color2 paint.
  const deco = (label, desc, uses, colorNames, defaults) => ({ label, desc, uses, colorNames, defaults: Object.assign({
    placement: "all", size: 1, density: 0.5, coverage: 1, offset: 0, color: "#3f6b3a", color2: "#79a85a",
  }, defaults) });
  const ALONG = "placement size density coverage offset";
  const AT_CORNERS = "placement size density offset";

  const DECO_TYPES = {
    ivy: deco("蔦（つた）", "窓のふちに沿って蔦が這います。「伸び具合」を下げると角から少しだけ伸びます。", ALONG, ["茎", "葉"],
      { coverage: 0.75, density: 0.6, color: "#3b5f33", color2: "#6f9f4e" }),
    flowers: deco("小花", "小さな花を散らします。蔦と重ねると花の咲いた蔦に。", ALONG, ["花びら", "花の中心"],
      { density: 0.4, color: "#f6c9d6", color2: "#ffd66b" }),
    thorns: deco("茨（いばら）", "トゲのある枝が絡み合います。", ALONG, ["枝", "つぼみ"],
      { coverage: 0.8, color: "#2f2622", color2: "#8a2c3a" }),
    sakura: deco("桜の枝", "角から桜の枝が伸びます。「伸び具合」で枝の長さが変わります。", ALONG, ["枝", "花"],
      { placement: "topcorners", density: 0.6, coverage: 0.7, color: "#4a3328", color2: "#f7c6d4" }),
    grass: deco("草むら", "ふちに草が茂ります。", ALONG, ["草1", "草2"],
      { placement: "bottom", density: 0.6, color: "#3f6a33", color2: "#86b35d" }),
    stars: deco("星くず", "枠の上に小さな星を散らします。", ALONG, ["星1", "星2"],
      { density: 0.5, color: "accent", color2: "#ffffff" }),
    cobweb: deco("蜘蛛の巣", "隅に蜘蛛の巣が張ります。「密度」を上げると糸が細かくなり、蜘蛛がぶら下がります。", AT_CORNERS, ["糸", "蜘蛛"],
      { placement: "corners", density: 0.5, color: "#e6e6e6", color2: "#161616" }),
    chain: deco("鎖", "鎖が枠に沿って垂れ下がります。「密度」でたるみの数が変わります。", ALONG, ["明るい色", "暗い色"],
      { placement: "top", density: 0.6, color: "#b9bec3", color2: "#3d4146" }),
    gears: deco("歯車", "隅に歯車が噛み合います。「密度」で歯車の数が増えます。", AT_CORNERS, ["歯車", "軸"],
      { placement: "corners", density: 0.6, color: "accent", color2: "frame2" }),
    circuit: deco("回路", "電子回路のような線と端子が枠を走ります。", ALONG, ["線", "端子"],
      { placement: "sides", color: "accent", color2: "text" }),
    snowcap: deco("雪の積もり・つらら", "ふちに雪が積もり、上のふちからはつららが下がります。", ALONG, ["雪", "影"],
      { placement: "topbottom", density: 0.6, color: "#f7fbfe", color2: "#b9d3e6" }),
    drips: deco("したたり", "液体が垂れ落ちます。赤なら血、緑なら毒や粘液に。", ALONG, ["液体", "つや"],
      { placement: "top", density: 0.5, color: "#6e0b10", color2: "#e0525a" }),
  };

  const LAYOUTS = {
    thin: { label: "細め", margin: margins(20) },
    normal: { label: "標準", margin: margins(40) },
    thick: { label: "太め", margin: margins(80) },
    cinema: { label: "上下の帯", margin: { t: 120, r: 0, b: 120, l: 0 } },
    novel: { label: "下を広く", margin: { t: 28, r: 28, b: 250, l: 28 } },
    side: { label: "左右を広く", margin: { t: 28, r: 260, b: 28, l: 260 } },
  };

  const SIZES = [
    { key: "1920x1080", label: "1920 × 1080（16:9）" },
    { key: "1280x720", label: "1280 × 720（16:9・軽め）" },
    { key: "1152x648", label: "1152 × 648（16:9・48×27マスと等倍）" },
    { key: "1440x1080", label: "1440 × 1080（4:3）" },
    { key: "960x720", label: "960 × 720（4:3・40×30マスと等倍）" },
    { key: "1080x1080", label: "1080 × 1080（正方形）" },
    { key: "custom", label: "自由に指定" },
  ];

  const FONTS = {
    gothic: { label: "ゴシック", stack: '"Yu Gothic UI","Yu Gothic","Hiragino Kaku Gothic ProN","Meiryo",sans-serif' },
    mincho: { label: "明朝", stack: '"Yu Mincho","YuMincho","Hiragino Mincho ProN","BIZ UDPMincho","MS PMincho",serif' },
    kyokasho: { label: "教科書体", stack: '"UD Digi Kyokasho NK-R","UD デジタル 教科書体 NK-R","Yu Mincho",serif' },
    serif: { label: "英字セリフ", stack: 'Georgia,"Times New Roman",serif' },
    sans: { label: "英字サンセリフ", stack: '"Segoe UI","Helvetica Neue",Arial,sans-serif' },
  };

  const COLOR_REFS = [["accent", "アクセント色"], ["text", "文字の色"], ["frame1", "枠の色1"], ["frame2", "枠の色2"]];

  window.FramePresets = {
    DESIGNS, VARIANT_KINDS, EFFECTS, ICONS, PLACEMENTS, DECO_TYPES, LAYOUTS, SIZES, FONTS, COLOR_REFS, BASE_TIMES,
  };
})();
