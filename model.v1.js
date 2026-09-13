/*!
 * model.v1.js - project data: defaults, time slots, design presets
 *
 * Every length is in "virtual pixels": the canvas is always treated as 1080
 * units tall, so a design keeps its proportions when the output size changes.
 * At 1920x1080 a virtual pixel is exactly one real pixel.
 */
(function () {
  "use strict";

  const SLOT_IDS = ["morning", "day", "evening", "night"];

  const DEFAULT_SLOTS = [
    { id: "morning", on: true, name: "朝", sub: "MORNING", icon: "sunrise", iconAsset: null },
    { id: "day", on: true, name: "昼", sub: "DAYTIME", icon: "sun", iconAsset: null },
    { id: "evening", on: false, name: "夕", sub: "EVENING", icon: "sunset", iconAsset: null },
    { id: "night", on: true, name: "夜", sub: "NIGHT", icon: "moon", iconAsset: null },
  ];

  // [frame1, frame2, accent, text, tint, tintAlpha]
  const BASE_PALETTES = {
    morning: ["#fbf1e3", "#efcdb0", "#d9825a", "#5b4032", "#ffc98a", 0.06],
    day: ["#f2f8fc", "#c3dff1", "#3a8fcb", "#274760", "#ffffff", 0],
    evening: ["#f3bf98", "#9c5277", "#e8733f", "#fff3e6", "#ff7a33", 0.12],
    night: ["#262d4f", "#0d1126", "#d6bf72", "#e8eaf6", "#10205a", 0.28],
  };

  const margins = n => ({ t: n, r: n, b: n, l: n });
  const corners = (type, size) => [0, 1, 2, 3].map(() => ({ type, size }));
  const line = (on, width, gap, extra) => Object.assign({ on, width, gap, double: false, color: "accent" }, extra);
  const clone = value => JSON.parse(JSON.stringify(value));

  const DESIGNS = {
    simple: {
      label: "シンプル", desc: "丸い角と細い線。どんな卓にも合わせやすい基本形。",
      opening: { shape: "rect", margin: margins(36), linkMargin: true, corners: corners("round", 28), linkCorners: true, outerRadius: 0 },
      frame: { fill: "linear", angle: 180, opacity: 1, grain: 0,
        innerLine: line(true, 3, 10), outerLine: line(false, 3, 12),
        shadow: { on: true, size: 28, opacity: 0.35, color: "#000000" },
        ornament: { type: "none", size: 44, gap: 12, width: 3, color: "accent" } },
      indicator: { style: "badge", pos: "tl", font: "gothic" },
      palettes: BASE_PALETTES,
    },
    mansion: {
      label: "洋館・クラシック", desc: "えぐれた角に二重線と唐草風の飾り。探索もの・ゴシック向け。",
      opening: { shape: "rect", margin: margins(58), linkMargin: true, corners: corners("scoop", 46), linkCorners: true, outerRadius: 0 },
      frame: { fill: "radial", angle: 180, opacity: 1, grain: 0.3,
        innerLine: line(true, 2, 12, { double: true }), outerLine: line(true, 3, 14),
        shadow: { on: true, size: 40, opacity: 0.5, color: "#000000" },
        ornament: { type: "flourish", size: 64, gap: 16, width: 3, color: "accent" } },
      indicator: { style: "label", pos: "tc", font: "mincho" },
      palettes: {
        morning: ["#e9dcc3", "#b39468", "#7a5a2e", "#3e2c17", "#ffd59a", 0.06],
        day: ["#efe6d2", "#c4ab80", "#8a6a35", "#3a2a15", "#ffffff", 0],
        evening: ["#8a4332", "#3a1c1a", "#e3a35a", "#fbe7cf", "#ff7a33", 0.14],
        night: ["#2e2436", "#120d17", "#c9a85a", "#efe3c8", "#1a1030", 0.3],
      },
    },
    cinema: {
      label: "シネマ", desc: "上下に黒い帯だけ。演出重視の場面や導入に。",
      opening: { shape: "rect", margin: { t: 120, r: 0, b: 120, l: 0 }, linkMargin: false, corners: corners("square", 0), linkCorners: true, outerRadius: 0 },
      frame: { fill: "solid", angle: 180, opacity: 1, grain: 0,
        innerLine: line(false, 2, 0), outerLine: line(false, 3, 12),
        shadow: { on: true, size: 48, opacity: 0.55, color: "#000000" },
        ornament: { type: "none", size: 44, gap: 12, width: 3, color: "accent" } },
      indicator: { style: "label", pos: "br", font: "mincho", bgAlpha: 0 },
      palettes: {
        morning: ["#060606", "#060606", "#f3b37a", "#f4efe8", "#ffc98a", 0.06],
        day: ["#060606", "#060606", "#9fd3ff", "#f4f7fa", "#ffffff", 0],
        evening: ["#060606", "#060606", "#ff8e5a", "#fbe9dc", "#ff7a33", 0.14],
        night: ["#060606", "#060606", "#9aa8ff", "#e3e6ff", "#0a1440", 0.32],
      },
    },
    novel: {
      label: "ノベル（下に文字枠）", desc: "下を広く取ったノベルゲーム風。下の枠に立ち絵や文字を置けます。",
      opening: { shape: "rect", margin: { t: 28, r: 28, b: 250, l: 28 }, linkMargin: false, corners: corners("round", 20), linkCorners: true, outerRadius: 0 },
      frame: { fill: "linear", angle: 180, opacity: 1, grain: 0,
        innerLine: line(true, 2, 8), outerLine: line(false, 3, 12),
        shadow: { on: true, size: 24, opacity: 0.3, color: "#000000" },
        ornament: { type: "diamond", size: 18, gap: 8, width: 2, color: "accent" } },
      indicator: { style: "tabs", pos: "br", font: "gothic" },
      palettes: BASE_PALETTES,
    },
    cyber: {
      label: "サイバー", desc: "斜めに切った角とネオン色の線。SF・現代異能向け。",
      opening: { shape: "rect", margin: margins(42), linkMargin: true, corners: corners("chamfer", 44), linkCorners: true, outerRadius: 0 },
      frame: { fill: "linear", angle: 135, opacity: 1, grain: 0,
        innerLine: line(true, 2, 8), outerLine: line(true, 2, 12),
        shadow: { on: true, size: 30, opacity: 0.6, color: "accent" },
        ornament: { type: "bracket", size: 64, gap: 4, width: 4, color: "accent" } },
      indicator: { style: "dial", pos: "tr", font: "sans" },
      palettes: {
        morning: ["#10202e", "#06101a", "#5ef2ff", "#d8fbff", "#5ef2ff", 0.05],
        day: ["#122236", "#081221", "#7cf8a8", "#e4ffee", "#ffffff", 0],
        evening: ["#261532", "#12091c", "#ff7ad9", "#ffe6f7", "#ff5ab4", 0.1],
        night: ["#0b0d1e", "#03040c", "#8f7bff", "#e5e0ff", "#1a1260", 0.3],
      },
    },
    wa: {
      label: "和風", desc: "切り欠きの角と和紙の質感。和風伝奇・時代もの向け。",
      opening: { shape: "rect", margin: margins(48), linkMargin: true, corners: corners("notch", 22), linkCorners: true, outerRadius: 0 },
      frame: { fill: "solid", angle: 180, opacity: 1, grain: 0.35,
        innerLine: line(true, 2, 10, { double: true }), outerLine: line(false, 3, 12),
        shadow: { on: true, size: 26, opacity: 0.35, color: "#000000" },
        ornament: { type: "dots", size: 40, gap: 12, width: 2, color: "accent" } },
      indicator: { style: "label", pos: "tr", font: "mincho" },
      palettes: {
        morning: ["#efe4cf", "#d9c7a4", "#b5493b", "#3b2e25", "#ffd59a", 0.06],
        day: ["#f1ead8", "#d8ccb0", "#2f5d50", "#2b2620", "#ffffff", 0],
        evening: ["#b8563d", "#6e2c22", "#f2c46b", "#fbeee0", "#ff7a33", 0.14],
        night: ["#1f2733", "#11161e", "#c9a24f", "#e9e1cf", "#0d1a3a", 0.3],
      },
    },
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
    { key: "custom", label: "自由に指定" },
  ];

  const FONTS = {
    gothic: { label: "ゴシック", stack: '"Yu Gothic UI","Yu Gothic","Hiragino Kaku Gothic ProN","Meiryo",sans-serif' },
    mincho: { label: "明朝", stack: '"Yu Mincho","YuMincho","Hiragino Mincho ProN","BIZ UDPMincho","MS PMincho",serif' },
    kyokasho: { label: "教科書体", stack: '"UD Digi Kyokasho NK-R","UD デジタル 教科書体 NK-R","Yu Mincho",serif' },
    serif: { label: "英字セリフ", stack: 'Georgia,"Times New Roman",serif' },
    sans: { label: "英字サンセリフ", stack: '"Segoe UI","Helvetica Neue",Arial,sans-serif' },
  };

  const COLOR_REFS = [
    ["accent", "アクセント色"], ["text", "文字の色"], ["frame1", "枠の色1"], ["frame2", "枠の色2"],
  ];

  function applyDesign(state, key) {
    const design = DESIGNS[key];
    if (!design) return;
    state.opening = clone(design.opening);
    state.frame = clone(design.frame);
    Object.assign(state.time.indicator, { bgAlpha: 0.92 }, design.indicator);
    for (const slot of state.time.slots) {
      const p = design.palettes[slot.id];
      if (!p) continue;
      Object.assign(slot, { frame1: p[0], frame2: p[1], accent: p[2], text: p[3], tint: p[4], tintAlpha: p[5] });
    }
  }

  function defaultState() {
    const state = {
      version: 1,
      size: { w: 1920, h: 1080 },
      opening: null,
      frame: null,
      time: {
        current: "morning",
        slots: clone(DEFAULT_SLOTS),
        indicator: { style: "badge", pos: "tl", x: 0.1, y: 0.1, scale: 1, bgAlpha: 0.92, showSub: true, font: "gothic", fontName: "" },
      },
      layers: [],
      preview: { bg: "sky", grid: false, bgAsset: null },
      fileBase: "frame",
    };
    applyDesign(state, "simple");
    return state;
  }

  let counter = 0;
  function newId(prefix) {
    return prefix + Date.now().toString(36) + (counter++).toString(36);
  }

  function allTimes() {
    return Object.fromEntries(SLOT_IDS.map(id => [id, true]));
  }

  function baseLayer(kind, name) {
    return { id: newId("L"), kind, name, visible: true, x: 0.5, y: 0.5, scale: 1, rotation: 0,
      opacity: 1, blend: "source-over", flip: false, order: "front", clip: "none", times: allTimes() };
  }

  function imageLayer(assetId, name) {
    return Object.assign(baseLayer("image", name || "画像"), { asset: assetId, fit: "free", recolor: "none" });
  }

  function textLayer() {
    return Object.assign(baseLayer("text", "文字"), {
      y: 0.88, text: "シナリオタイトル", font: "mincho", fontName: "", size: 44, bold: true, vertical: false,
      spacing: 0.1, align: "center", color: "text", strokeWidth: 0, strokeColor: "#000000", shadow: 0,
    });
  }

  // Fill in keys missing from older or hand-edited project files.
  function mergeDefaults(base, loaded) {
    if (base === null) return loaded === undefined ? null : loaded;
    if (Array.isArray(base) || typeof base !== "object") {
      return loaded === undefined || typeof loaded !== typeof base ? base : loaded;
    }
    if (!loaded || typeof loaded !== "object") return base;
    const out = {};
    for (const key of Object.keys(base)) out[key] = mergeDefaults(base[key], loaded[key]);
    for (const key of Object.keys(loaded)) if (!(key in out)) out[key] = loaded[key];
    return out;
  }

  function normalize(loaded) {
    const base = defaultState();
    const state = mergeDefaults(base, loaded);
    const corner = base.opening.corners[0];
    const cornerList = Array.isArray(loaded?.opening?.corners) ? loaded.opening.corners : base.opening.corners;
    state.opening.corners = [0, 1, 2, 3].map(i => mergeDefaults(corner, cornerList[i]));
    const slotList = Array.isArray(loaded?.time?.slots) ? loaded.time.slots : [];
    state.time.slots = base.time.slots.map(slot => mergeDefaults(slot, slotList.find(s => s && s.id === slot.id)));
    if (!state.time.slots.some(s => s.on)) state.time.slots[0].on = true;
    const layerList = Array.isArray(loaded?.layers) ? loaded.layers : [];
    state.layers = layerList
      .filter(l => l && (l.kind === "image" || l.kind === "text"))
      .map(l => mergeDefaults(l.kind === "image" ? imageLayer(l.asset) : textLayer(), l));
    return state;
  }

  window.FrameModel = {
    SLOT_IDS, DESIGNS, LAYOUTS, SIZES, FONTS, COLOR_REFS,
    defaultState, applyDesign, normalize, imageLayer, textLayer, newId, clone,
  };
})();
