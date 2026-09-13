/*!
 * app.v1.js - 前景フレームメーカー (UI)
 *
 * The whole project is one plain JSON object (`state`), so undo, autosave and
 * project files are all just snapshots of it. Images and fonts live apart in
 * `assets` (id -> data URL) to keep snapshots small.
 *
 * Controls are wired declaratively from the HTML:
 *   data-bind="frame.opacity"   read/write that path ("slot." = current slot, "layer." = selected layer)
 *   data-out="..."              shows the value next to a slider
 *   data-show="a=x|y&b!=z"      visible only while the condition holds
 *   data-colorref="..."         palette color picker ("accent", "text", ... or "#rrggbb")
 */
(function () {
  "use strict";

  const M = window.FrameModel, R = window.FrameRender;
  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];

  const TAB_KEY = "ccf-frame-maker.tab";
  const DB_NAME = "ccf-frame-maker", DB_STORE = "kv";
  const POSITIONS = [["tl", "左上"], ["tc", "上"], ["tr", "右上"], ["bl", "左下"], ["bc", "下"], ["br", "右下"]];
  const CORNER_LABELS = ["左上", "右上", "右下", "左下"];
  const CORNER_TYPES = [["square", "直角"], ["round", "丸"], ["chamfer", "面取り"], ["scoop", "えぐり"], ["notch", "切り欠き"]];

  let state = M.defaultState();
  let assets = {};                 // id -> { kind: "image" | "font", name, data, family? }
  const env = { images: new Map(), recolorCache: new Map(), fontFamilies: {} };
  let selectedId = null;           // layer id or "indicator"
  let hits = [];
  let customSizeOpen = false;
  const history = { undo: [], redo: [], last: null };

  const stage = $("#stage"), canvas = $("#preview"), pctx = canvas.getContext("2d");

  // ---------------------------------------------------------------- paths

  function currentSlot() {
    return state.time.slots.find(s => s.id === state.time.current) || state.time.slots[0];
  }

  function selectedLayer() {
    return state.layers.find(l => l.id === selectedId) || null;
  }

  function resolveTarget(path) {
    const parts = path.split(".");
    let obj = state;
    if (parts[0] === "slot") { obj = currentSlot(); parts.shift(); }
    else if (parts[0] === "layer") { obj = selectedLayer(); parts.shift(); }
    for (let i = 0; i < parts.length - 1 && obj != null; i++) obj = obj[parts[i]];
    return obj == null ? null : { obj, key: parts[parts.length - 1] };
  }

  function getPath(path) {
    if (path === "opening.margin.all") return state.opening.margin.t;
    const t = resolveTarget(path);
    return t ? t.obj[t.key] : undefined;
  }

  function setPath(path, value) {
    if (path === "opening.margin.all") {
      Object.assign(state.opening.margin, { t: value, r: value, b: value, l: value });
      return;
    }
    const t = resolveTarget(path);
    if (t) t.obj[t.key] = value;
  }

  // ---------------------------------------------------------------- status

  function status(message, isError) {
    const el = $("#status");
    el.textContent = message;
    el.classList.toggle("error", !!isError);
  }

  // ---------------------------------------------------------------- controls

  function readInput(el) {
    if (el.type === "checkbox") return el.checked;
    if (el.type === "range" || el.type === "number") return Number(el.value);
    return el.value;
  }

  function labelFor(el) {
    if (el.getAttribute("aria-label")) return;
    const label = el.closest(".row")?.querySelector(":scope > label");
    if (label && label.textContent.trim()) el.setAttribute("aria-label", label.textContent.trim());
  }

  // Side effects of a single control change that go beyond writing the value.
  function afterChange(path) {
    if (path === "opening.linkMargin" && state.opening.linkMargin) {
      setPath("opening.margin.all", state.opening.margin.t);
    } else if (path === "opening.linkCorners" && !state.opening.linkCorners) {
      const first = state.opening.corners[0];
      state.opening.corners = [0, 1, 2, 3].map(() => M.clone(first));
    } else if (path === "size.w" || path === "size.h") {
      state.size.w = Math.round(Math.min(4096, Math.max(64, state.size.w || 64)));
      state.size.h = Math.round(Math.min(4096, Math.max(64, state.size.h || 64)));
      layoutStage();
    } else if (path === "layer.name" || path === "layer.text") {
      renderLayerList();
    } else if (path.startsWith("slot.")) {
      renderSlotUI();
    }
    updateVisibility();
    updateOutputs();
    updateInfo();
  }

  function bindControls(root) {
    for (const el of root.querySelectorAll("[data-bind]")) {
      labelFor(el);
      const apply = commitAfter => () => {
        const value = readInput(el);
        if (typeof value === "number" && !Number.isFinite(value)) return;
        setPath(el.dataset.bind, value);
        afterChange(el.dataset.bind);
        if (commitAfter) commit();
        requestRender();
      };
      // Number fields apply on change only, so typing "1" on the way to "1080" doesn't reshape the canvas.
      if (el.type !== "number") el.addEventListener("input", apply(false));
      el.addEventListener("change", apply(true));
    }
  }

  function buildColorRefs(root) {
    for (const host of root.querySelectorAll("[data-colorref]")) {
      const path = host.dataset.colorref;
      const select = document.createElement("select");
      const color = document.createElement("input");
      color.type = "color";
      const options = host.dataset.none ? [["none", host.dataset.none]] : [];
      options.push(...M.COLOR_REFS, ["custom", "色を指定"]);
      for (const [value, text] of options) select.add(new Option(text, value));
      const label = host.closest(".row")?.querySelector(":scope > label")?.textContent.trim() || "色";
      select.setAttribute("aria-label", label);
      color.setAttribute("aria-label", label + "（指定色）");
      host.append(select, color);
      const apply = commitAfter => () => {
        setPath(path, select.value === "custom" ? color.value : select.value);
        color.hidden = select.value !== "custom";
        if (commitAfter) commit();
        requestRender();
      };
      select.addEventListener("change", apply(true));
      color.addEventListener("input", apply(false));
      color.addEventListener("change", apply(true));
      host.syncValue = () => {
        const value = getPath(path);
        if (value == null) return;
        const custom = String(value)[0] === "#";
        select.value = custom ? "custom" : value;
        if (custom) color.value = value;
        color.hidden = !custom;
      };
    }
  }

  function fillFontSelects() {
    const options = Object.entries(M.FONTS).map(([key, font]) => [key, font.label]);
    for (const [id, asset] of Object.entries(assets)) {
      if (asset.kind === "font") options.push(["font:" + id, "読込: " + asset.family]);
    }
    options.push(["name", "名前で指定（PCのフォント）"]);
    for (const select of $$("select[data-fonts]")) {
      select.innerHTML = "";
      for (const [value, text] of options) select.add(new Option(text, value));
      const value = getPath(select.dataset.bind);
      if (value !== undefined) select.value = value;
      if (select.selectedIndex < 0) select.value = "gothic";
    }
  }

  function formatValue(value, fmt) {
    if (fmt === "pct") return Math.round(value * 100) + "%";
    if (fmt === "deg") return Math.round(value) + "°";
    if (fmt === "x") return Number(value).toFixed(2);
    return String(Math.round(value * 10) / 10);
  }

  function updateOutputs() {
    for (const out of $$("output[data-out]")) {
      const value = getPath(out.dataset.out);
      if (typeof value === "number") out.textContent = formatValue(value, out.dataset.fmt);
    }
  }

  // "a=x|y" : a is x or y.  "a!=x" : a is not x.  Joined with "&".
  // A "|" right after a value may also start a new alternative clause: "layer.kind=text|layer.fit=free|tile".
  function evalCondition(cond) {
    return cond.split("&").every(part => {
      const clauses = [];
      for (const piece of part.split("|")) {
        if (/^[\w.]+!?=/.test(piece)) clauses.push({ raw: piece, values: [] });
        else if (clauses.length) clauses[clauses.length - 1].values.push(piece);
      }
      return clauses.some(clause => {
        const m = clause.raw.match(/^([\w.]+)(!?=)(.*)$/);
        const values = [m[3], ...clause.values];
        const hit = values.includes(String(getPath(m[1])));
        return m[2] === "=" ? hit : !hit;
      });
    });
  }

  function updateVisibility() {
    for (const el of $$("[data-show]")) el.hidden = !evalCondition(el.dataset.show);
  }

  function syncControls() {
    for (const el of $$("[data-bind]")) {
      const typing = el === document.activeElement && (el.type === "text" || el.tagName === "TEXTAREA");
      if (typing) continue;
      const value = getPath(el.dataset.bind);
      if (value === undefined) continue;
      if (el.type === "checkbox") el.checked = !!value;
      else el.value = value;
    }
    for (const host of $$("[data-colorref]")) host.syncValue();
    for (const btn of $$("#posButtons button")) btn.setAttribute("aria-pressed", String(btn.dataset.pos === state.time.indicator.pos));
    for (const btn of $$("#bgSeg button")) btn.setAttribute("aria-pressed", String(btn.dataset.bg === state.preview.bg));
    syncSizePreset();
    renderCornerRows();
    renderSlotUI();
    renderLayerList();
    updateVisibility();
    updateOutputs();
    updateInfo();
    applyPreviewBg();
    layoutStage();
    updateHistoryButtons();
  }

  function syncSizePreset() {
    const select = $("#sizePreset"), key = `${state.size.w}x${state.size.h}`;
    const known = M.SIZES.some(s => s.key === key);
    select.value = !customSizeOpen && known ? key : "custom";
    $("#customSize").hidden = select.value !== "custom";
  }

  function updateInfo() {
    const u = R.gridUnits(state.size.w, state.size.h);
    $("#sizeInfo").innerHTML = `ココフォリアの前景は <b>横幅 ${u.w} ・ 縦幅 ${u.h}</b> にすると比率がぴったりです（幅 1 = 24px）。`
      + (u.exact ? "" : "比率が割り切れないため、近い値です。");
    const r = R.openingRect(state), VW = R.virtualWidth(state.size), k = state.size.h / R.BASE_H;
    const cells = (v, total, units) => (v / total * units).toFixed(1);
    $("#openingInfo").textContent = `窓の大きさ ${Math.round(r.w * k)} × ${Math.round(r.h * k)} px。`
      + `盤面では 横 ${cells(r.w, VW, u.w)} × 縦 ${cells(r.h, R.BASE_H, u.h)} マス分`
      + `（左上から ${cells(r.x0, VW, u.w)}, ${cells(r.y0, R.BASE_H, u.h)} マスの位置）です。`;
  }

  // ---------------------------------------------------------------- history

  function updateHistoryButtons() {
    $("#undo").disabled = !history.undo.length;
    $("#redo").disabled = !history.redo.length;
  }

  function commit() {
    const snap = JSON.stringify(state);
    if (snap === history.last) return;
    if (history.last !== null) {
      history.undo.push(history.last);
      if (history.undo.length > 150) history.undo.shift();
    }
    history.redo.length = 0;
    history.last = snap;
    updateHistoryButtons();
    scheduleSave();
    scheduleThumbs();
  }

  function restore(snap) {
    state = JSON.parse(snap);
    history.last = snap;
    if (selectedId && selectedId !== "indicator" && !selectedLayer()) selectedId = null;
    cornerMode = null;
    fillFontSelects();
    syncControls();
    requestRender();
    scheduleSave();
    scheduleThumbs();
  }

  function undo() {
    if (!history.undo.length) return;
    history.redo.push(history.last);
    restore(history.undo.pop());
  }

  function redo() {
    if (!history.redo.length) return;
    history.undo.push(history.last);
    restore(history.redo.pop());
  }

  function resetHistory() {
    history.undo.length = 0;
    history.redo.length = 0;
    history.last = JSON.stringify(state);
    updateHistoryButtons();
  }

  // ---------------------------------------------------------------- preview

  function layoutStage() {
    stage.style.aspectRatio = `${state.size.w} / ${state.size.h}`;
    stage.style.maxWidth = `calc(70vh * ${state.size.w / state.size.h})`;
  }

  function applyPreviewBg() {
    const bg = state.preview.bg, asset = assets[state.preview.bgAsset];
    const useImage = bg === "image" && asset;
    stage.className = "stage bg-" + (bg === "image" && !asset ? "checker" : bg);
    stage.style.backgroundImage = useImage ? `url("${asset.data}")` : "";
  }

  let renderQueued = false;

  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderPreview();
    });
  }

  function renderPreview() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(rect.width * dpr), H = Math.max(1, Math.round(W * state.size.h / state.size.w));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    hits = R.render(pctx, state, env, state.time.current, W, H);
    if (state.preview.grid) R.drawGrid(pctx, state, W, H);
    const hit = hits.find(h => h.id === selectedId);
    if (hit) R.drawSelection(pctx, hit, H / R.BASE_H);
  }

  let thumbTimer = null;

  function scheduleThumbs() {
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(renderThumbs, 200);
  }

  function renderThumbs() {
    const box = $("#thumbs");
    box.innerHTML = "";
    const w = 320, h = Math.max(1, Math.round(w * state.size.h / state.size.w));
    for (const slot of state.time.slots) {
      if (!slot.on) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(slot.id === state.time.current));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      R.render(c.getContext("2d"), state, env, slot.id, w, h);
      const label = document.createElement("span");
      label.textContent = slot.name;
      btn.append(c, label);
      btn.addEventListener("click", () => setCurrentSlot(slot.id));
      box.append(btn);
    }
  }

  // ---------------------------------------------------------------- time slots

  function setCurrentSlot(id) {
    state.time.current = id;
    syncControls();
    requestRender();
    scheduleThumbs();
    scheduleSave();
  }

  function renderSlotUI() {
    if (!currentSlot().on) state.time.current = state.time.slots.find(s => s.on).id;
    const seg = $("#slotSeg");
    seg.innerHTML = "";
    for (const slot of state.time.slots) {
      if (!slot.on) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = slot.name || "（名前なし）";
      btn.setAttribute("aria-pressed", String(slot.id === state.time.current));
      btn.addEventListener("click", () => setCurrentSlot(slot.id));
      seg.append(btn);
    }

    const toggles = $("#slotToggles");
    toggles.innerHTML = "";
    for (const slot of state.time.slots) {
      const label = document.createElement("label");
      label.className = "chip";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = slot.on;
      input.addEventListener("change", () => {
        if (!input.checked && state.time.slots.filter(s => s.on).length === 1) {
          input.checked = true;
          status("時間帯は 1 つ以上オンにしてください。", true);
          return;
        }
        slot.on = input.checked;
        if (slot.on) state.time.current = slot.id;
        commit();
        syncControls();
        requestRender();
      });
      label.append(input, document.createTextNode(slot.name || slot.id));
      toggles.append(label);
    }
    $("#slotTitle").textContent = currentSlot().name;
    stage.dataset.slot = state.time.current;
  }

  // ---------------------------------------------------------------- corners

  let cornerMode = null;

  function renderCornerRows() {
    const mode = state.opening.linkCorners ? "linked" : "each";
    if (mode === cornerMode) return;
    cornerMode = mode;
    const box = $("#cornerRows");
    box.innerHTML = "";
    const typeOptions = CORNER_TYPES.map(([value, text]) => `<option value="${value}">${text}</option>`).join("");
    for (const i of mode === "linked" ? [0] : [0, 1, 2, 3]) {
      const name = mode === "linked" ? "角" : CORNER_LABELS[i];
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<label>${mode === "linked" ? "形と大きさ" : name}</label>
        <span class="pair" style="grid-template-columns: 92px minmax(0, 1fr);">
          <select data-bind="opening.corners.${i}.type" aria-label="${name}の形">${typeOptions}</select>
          <span class="with-value"><input type="range" data-bind="opening.corners.${i}.size" min="0" max="300" aria-label="${name}の大きさ"><output data-out="opening.corners.${i}.size"></output></span>
        </span>`;
      box.append(row);
    }
    bindControls(box);
    for (const el of box.querySelectorAll("[data-bind]")) el.value = getPath(el.dataset.bind);
  }

  // ---------------------------------------------------------------- layer list

  function selectItem(id) {
    selectedId = id;
    syncControls();
    requestRender();
  }

  function moveLayer(index, delta) {
    const to = index + delta;
    if (to < 0 || to >= state.layers.length) return;
    [state.layers[index], state.layers[to]] = [state.layers[to], state.layers[index]];
    commit();
    syncControls();
    requestRender();
  }

  function renderLayerList() {
    const list = $("#layerList");
    list.innerHTML = "";
    $("#layerEmpty").hidden = state.layers.length > 0;
    for (let i = state.layers.length - 1; i >= 0; i--) {
      const layer = state.layers[i];
      const li = document.createElement("li");
      li.className = "layer-item";
      li.setAttribute("aria-selected", String(layer.id === selectedId));

      const visible = document.createElement("input");
      visible.type = "checkbox";
      visible.checked = layer.visible;
      visible.setAttribute("aria-label", "表示する");
      visible.addEventListener("click", ev => ev.stopPropagation());
      visible.addEventListener("change", () => {
        layer.visible = visible.checked;
        commit();
        requestRender();
      });

      let thumb;
      if (layer.kind === "image" && assets[layer.asset]) {
        thumb = document.createElement("img");
        thumb.src = assets[layer.asset].data;
        thumb.alt = "";
      } else {
        thumb = document.createElement("span");
        thumb.textContent = layer.kind === "text" ? "文" : "?";
      }
      thumb.className = "thumb-mini";

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = layer.name || (layer.kind === "text" ? layer.text : "画像");
      if (layer.order === "back") {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = "奥";
        name.append(tag);
      }

      const btns = document.createElement("span");
      btns.className = "btns";
      for (const [text, title, delta] of [["↑", "手前へ", 1], ["↓", "奥へ", -1]]) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "small";
        btn.textContent = text;
        btn.title = title;
        btn.setAttribute("aria-label", title);
        btn.disabled = i + delta < 0 || i + delta >= state.layers.length;
        btn.addEventListener("click", ev => { ev.stopPropagation(); moveLayer(i, delta); });
        btns.append(btn);
      }

      li.addEventListener("click", () => selectItem(layer.id));
      li.append(visible, thumb, name, btns);
      list.append(li);
    }

    const layer = selectedLayer();
    $("#layerProps").hidden = !layer;
    if (layer) renderLayerTimes(layer);
  }

  function renderLayerTimes(layer) {
    const box = $("#layerTimes");
    box.innerHTML = "";
    for (const slot of state.time.slots) {
      if (!slot.on) continue;
      const label = document.createElement("label");
      label.className = "chip";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = layer.times[slot.id] !== false;
      input.addEventListener("change", () => {
        layer.times[slot.id] = input.checked;
        commit();
        requestRender();
      });
      label.append(input, document.createTextNode(slot.name));
      box.append(label);
    }
  }

  function deleteSelectedLayer() {
    const index = state.layers.findIndex(l => l.id === selectedId);
    if (index < 0) return;
    state.layers.splice(index, 1);
    selectedId = null;
    commit();
    syncControls();
    requestRender();
    status("削除しました（Ctrl+Z で戻せます）。");
  }

  function duplicateSelectedLayer() {
    const layer = selectedLayer();
    if (!layer) return;
    const copy = Object.assign(M.clone(layer), {
      id: M.newId("L"), name: layer.name + " のコピー", x: layer.x + 0.02, y: layer.y + 0.02,
    });
    state.layers.splice(state.layers.indexOf(layer) + 1, 0, copy);
    selectedId = copy.id;
    commit();
    syncControls();
    requestRender();
  }

  // ---------------------------------------------------------------- autosave (IndexedDB)

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbRequest(mode, makeRequest) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const req = makeRequest(db.transaction(DB_STORE, mode).objectStore(DB_STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  }

  // Images still referenced by the project, plus every loaded font.
  function usedAssets() {
    const ids = new Set();
    for (const layer of state.layers) if (layer.kind === "image") ids.add(layer.asset);
    for (const slot of state.time.slots) if (slot.iconAsset) ids.add(slot.iconAsset);
    if (state.preview.bgAsset) ids.add(state.preview.bgAsset);
    const out = {};
    for (const [id, asset] of Object.entries(assets)) if (ids.has(id) || asset.kind === "font") out[id] = asset;
    return out;
  }

  let saveTimer = null;
  let autosaveEnabled = false;   // turned on once the saved project has been read successfully

  function scheduleSave() {
    if (!autosaveEnabled) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      dbRequest("readwrite", store => store.put({ state, assets: usedAssets() }, "project"))
        .catch(err => console.warn("autosave failed", err));
    }, 600);
  }

  // ---------------------------------------------------------------- assets

  function readFile(file, as) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      if (as === "text") reader.readAsText(file);
      else reader.readAsDataURL(file);
    });
  }

  function sanitizeAssets(input) {
    const out = {};
    for (const [id, a] of Object.entries(input || {})) {
      if (!a || (a.kind !== "image" && a.kind !== "font")) continue;
      if (typeof a.data !== "string" || !a.data.startsWith("data:")) continue;
      out[id] = { kind: a.kind, name: String(a.name || ""), data: a.data };
      if (a.kind === "font") out[id].family = String(a.family || a.name || id).replace(/["\\]/g, "");
    }
    return out;
  }

  function loadImage(id) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = img.onerror = () => {
        for (const key of [...env.recolorCache.keys()]) if (key.startsWith(id + "|")) env.recolorCache.delete(key);
        requestRender();
        scheduleThumbs();
        resolve(img);
      };
      env.images.set(id, img);
      img.src = assets[id].data;
    });
  }

  async function registerFont(id) {
    const asset = assets[id];
    try {
      const face = new FontFace(asset.family, `url("${asset.data}")`);
      await face.load();
      document.fonts.add(face);
      env.fontFamilies[id] = asset.family;
    } catch (err) {
      status(`フォント「${asset.name}」を読み込めませんでした。`, true);
    }
    requestRender();
    scheduleThumbs();
  }

  function loadAllAssets() {
    env.images.clear();
    env.recolorCache.clear();
    env.fontFamilies = {};
    return Promise.all(Object.entries(assets).map(([id, asset]) =>
      asset.kind === "font" ? registerFont(id) : loadImage(id)));
  }

  async function addImageAsset(file) {
    const id = M.newId("A");
    assets[id] = { kind: "image", name: file.name || "pasted.png", data: await readFile(file) };
    const img = await loadImage(id);
    if (!img.naturalWidth) {
      delete assets[id];
      env.images.delete(id);
      return null;
    }
    return { id, img };
  }

  async function addImageFiles(fileList) {
    const files = [...fileList].filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const VW = R.virtualWidth(state.size);
    let added = 0;
    for (const file of files) {
      const result = await addImageAsset(file);
      if (!result) {
        status(`「${file.name}」は読み込めませんでした（サイズ情報のない SVG など）。`, true);
        continue;
      }
      const { id, img } = result, iw = img.naturalWidth, ih = img.naturalHeight;
      const layer = M.imageLayer(id, (file.name || "画像").replace(/\.[^.]+$/, ""));
      if (Math.abs(iw / ih - VW / R.BASE_H) < 0.02 && iw >= state.size.w * 0.5) {
        layer.fit = "stretch";   // same shape as the canvas: most likely a whole frame material
      } else {
        layer.scale = Math.max(0.02, Math.round(Math.min(1, R.BASE_H * 0.4 / ih, VW * 0.4 / iw) * 100) / 100);
      }
      state.layers.push(layer);
      selectedId = layer.id;
      added++;
    }
    if (!added) return;
    commit();
    switchTab("layers");
    syncControls();
    requestRender();
    status(`${added} 件の画像を追加しました。`);
  }

  async function addFontFiles(fileList) {
    const files = [...fileList].filter(f => /\.(ttf|otf|woff2?)$/i.test(f.name));
    for (const file of files) {
      const id = M.newId("F");
      const family = file.name.replace(/\.[^.]+$/, "").replace(/["\\]/g, "");
      assets[id] = { kind: "font", name: file.name, family, data: await readFile(file) };
      await registerFont(id);
    }
    if (!files.length) return;
    fillFontSelects();
    renderFontList();
    scheduleSave();
    status(`${files.length} 件のフォントを読み込みました。フォント欄の「読込:」から選べます。`);
  }

  function renderFontList() {
    const list = $("#fontList");
    list.innerHTML = "";
    for (const [id, asset] of Object.entries(assets)) {
      if (asset.kind !== "font") continue;
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = asset.family;
      name.style.fontFamily = `"${asset.family}", sans-serif`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "small danger";
      btn.textContent = "外す";
      btn.addEventListener("click", () => {
        delete assets[id];
        delete env.fontFamilies[id];
        fillFontSelects();
        renderFontList();
        scheduleSave();
        requestRender();
        scheduleThumbs();
      });
      li.append(name, btn);
      list.append(li);
    }
  }

  let singleImageTarget = null;

  function pickSingleImage(target) {
    singleImageTarget = target;
    $("#singleImageFile").value = "";
    $("#singleImageFile").click();
  }

  async function onSingleImage(file) {
    const result = file && await addImageAsset(file);
    if (!result) return;
    if (singleImageTarget === "icon") {
      Object.assign(currentSlot(), { iconAsset: result.id, icon: "custom" });
    } else {
      Object.assign(state.preview, { bgAsset: result.id, bg: "image" });
    }
    commit();
    syncControls();
    requestRender();
  }

  function handleFiles(fileList) {
    const files = [...fileList];
    const project = files.find(f => /\.json$/i.test(f.name));
    if (project) { openProjectFile(project); return; }
    addFontFiles(files);
    addImageFiles(files);
  }

  // ---------------------------------------------------------------- dragging on the preview

  let drag = null;

  function toVirtual(ev) {
    const rect = canvas.getBoundingClientRect(), k = R.BASE_H / rect.height;
    return { x: (ev.clientX - rect.left) * k, y: (ev.clientY - rect.top) * k };
  }

  function itemPosition(id) {
    if (id === "indicator") {
      const ind = state.time.indicator;
      if (ind.pos === "free") return { x: ind.x, y: ind.y };
      const hit = hits.find(h => h.id === id);
      return hit ? { x: hit.cx / R.virtualWidth(state.size), y: hit.cy / R.BASE_H } : null;
    }
    const layer = state.layers.find(l => l.id === id);
    return layer ? { x: layer.x, y: layer.y } : null;
  }

  function moveItem(id, x, y) {
    const round = v => Math.round(v * 10000) / 10000;
    if (id === "indicator") {
      Object.assign(state.time.indicator, { pos: "free", x: round(x), y: round(y) });
      return;
    }
    const layer = state.layers.find(l => l.id === id);
    if (layer) Object.assign(layer, { x: round(x), y: round(y) });
  }

  function wireStage() {
    canvas.addEventListener("pointerdown", ev => {
      if (ev.button !== 0) return;
      canvas.focus();
      const p = toVirtual(ev), hit = R.hitTest(hits, p.x, p.y);
      if (!hit) {
        if (selectedId) selectItem(null);
        return;
      }
      drag = { id: hit.id, p0: p, start: itemPosition(hit.id), moved: false };
      canvas.setPointerCapture(ev.pointerId);
      if (selectedId !== hit.id) {
        selectedId = hit.id;
        switchTab(hit.id === "indicator" ? "time" : "layers");
        syncControls();
      }
      requestRender();
    });

    canvas.addEventListener("pointermove", ev => {
      const p = toVirtual(ev);
      if (!drag) {
        canvas.style.cursor = R.hitTest(hits, p.x, p.y) ? "move" : "default";
        return;
      }
      const VW = R.virtualWidth(state.size);
      let dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
      if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (!drag.moved && Math.hypot(dx, dy) < 2) return;
      drag.moved = true;
      moveItem(drag.id, drag.start.x + dx / VW, drag.start.y + dy / R.BASE_H);
      updateOutputs();
      requestRender();
    });

    const endDrag = () => {
      if (!drag) return;
      if (drag.moved) { commit(); syncControls(); }
      drag = null;
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    canvas.addEventListener("keydown", ev => {
      if (!selectedId) return;
      const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (steps[ev.key]) {
        ev.preventDefault();
        const pos = itemPosition(selectedId);
        if (!pos) return;
        const n = ev.shiftKey ? 10 : 1;
        moveItem(selectedId, pos.x + steps[ev.key][0] * n / R.virtualWidth(state.size), pos.y + steps[ev.key][1] * n / R.BASE_H);
        commit();
        syncControls();
        requestRender();
      } else if ((ev.key === "Delete" || ev.key === "Backspace") && selectedId !== "indicator") {
        ev.preventDefault();
        deleteSelectedLayer();
      }
    });
  }

  // ---------------------------------------------------------------- export

  function renderFull(slotId) {
    const c = document.createElement("canvas");
    c.width = state.size.w;
    c.height = state.size.h;
    R.render(c.getContext("2d"), state, env, slotId, c.width, c.height);
    return c;
  }

  function toBlob(c) {
    return new Promise((resolve, reject) =>
      c.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG の作成に失敗しました。")), "image/png"));
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function formatBytes(n) {
    return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  }

  function baseName() {
    return String(state.fileBase || "").replace(/[\\/:*?"<>|]/g, "_").trim() || "frame";
  }

  function slotFileName(slot) {
    return `${baseName()}_${state.time.slots.indexOf(slot) + 1}_${slot.id}.png`;
  }

  async function downloadPng() {
    try {
      status("書き出し中...");
      const slot = currentSlot(), blob = await toBlob(renderFull(slot.id));
      download(blob, slotFileName(slot));
      status(`${slotFileName(slot)}（${formatBytes(blob.size)}）を保存しました。`);
    } catch (err) {
      status(err.message, true);
    }
  }

  async function buildZip() {
    const files = [];
    for (const slot of state.time.slots) {
      if (!slot.on) continue;
      const blob = await toBlob(renderFull(slot.id));
      files.push({ name: slotFileName(slot), data: new Uint8Array(await blob.arrayBuffer()) });
    }
    return { zip: window.StoreZip.build(files), count: files.length };
  }

  async function downloadZip() {
    try {
      status("書き出し中...");
      const { zip, count } = await buildZip();
      download(zip, baseName() + ".zip");
      status(`${count} 枚を ${baseName()}.zip（${formatBytes(zip.size)}）にまとめて保存しました。`);
    } catch (err) {
      status(err.message, true);
    }
  }

  // ---------------------------------------------------------------- project files

  async function loadProject(loadedState, loadedAssets) {
    state = M.normalize(loadedState);
    assets = sanitizeAssets(loadedAssets);
    selectedId = null;
    cornerMode = null;
    customSizeOpen = false;
    const jobs = loadAllAssets();
    fillFontSelects();
    renderFontList();
    resetHistory();
    syncControls();
    requestRender();
    scheduleThumbs();
    scheduleSave();
    await jobs;
    fillFontSelects();
  }

  function saveProject() {
    const data = { app: "ccf-frame-maker", version: 1, state, assets: usedAssets() };
    download(new Blob([JSON.stringify(data)], { type: "application/json" }), baseName() + ".frame.json");
    status("プロジェクトを保存しました。");
  }

  async function openProjectFile(file) {
    try {
      const data = JSON.parse(await readFile(file, "text"));
      if (!data || data.app !== "ccf-frame-maker" || !data.state) throw new Error("このツールのプロジェクトファイルではありません。");
      await loadProject(data.state, data.assets);
      status(`「${file.name}」を開きました。`);
    } catch (err) {
      status(err instanceof SyntaxError ? "ファイルを読み取れませんでした。" : err.message, true);
    }
  }

  async function resetAll() {
    if (!confirm("いまの作業内容を消して、最初の状態に戻します。よろしいですか？")) return;
    await loadProject(M.defaultState(), {});
    status("最初の状態に戻しました。");
  }

  // ---------------------------------------------------------------- setup

  function switchTab(name) {
    for (const btn of $$("[data-tab]")) btn.setAttribute("aria-selected", String(btn.dataset.tab === name));
    for (const panel of $$("[data-tab-panel]")) panel.hidden = panel.dataset.tabPanel !== name;
    try { localStorage.setItem(TAB_KEY, name); } catch (err) { /* storage may be blocked */ }
  }

  function smallButton(text, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "small";
    btn.textContent = text;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function buildStaticUI() {
    const design = $("#design");
    for (const [key, d] of Object.entries(M.DESIGNS)) design.add(new Option(d.label, key));
    const showDesc = () => {
      $("#designDesc").textContent = M.DESIGNS[design.value].desc + "（形と色が置き換わります。素材と文字はそのまま）";
    };
    design.addEventListener("change", showDesc);
    showDesc();
    $("#applyDesign").addEventListener("click", () => {
      M.applyDesign(state, design.value);
      cornerMode = null;
      commit();
      syncControls();
      requestRender();
      status(`「${M.DESIGNS[design.value].label}」を適用しました。`);
    });

    const sizeSelect = $("#sizePreset");
    for (const s of M.SIZES) sizeSelect.add(new Option(s.label, s.key));
    sizeSelect.addEventListener("change", () => {
      customSizeOpen = sizeSelect.value === "custom";
      if (!customSizeOpen) {
        const [w, h] = sizeSelect.value.split("x").map(Number);
        state.size = { w, h };
        commit();
      }
      syncControls();
      requestRender();
    });

    for (const layout of Object.values(M.LAYOUTS)) {
      $("#layoutButtons").append(smallButton(layout.label, () => {
        const m = layout.margin;
        state.opening.margin = M.clone(m);
        state.opening.linkMargin = m.t === m.r && m.r === m.b && m.b === m.l;
        commit();
        syncControls();
        requestRender();
      }));
    }

    for (const [key, label] of POSITIONS) {
      const btn = smallButton(label, () => {
        state.time.indicator.pos = key;
        commit();
        syncControls();
        requestRender();
      });
      btn.dataset.pos = key;
      $("#posButtons").append(btn);
    }

    buildColorRefs(document);
    bindControls(document);
    fillFontSelects();
  }

  function wireEvents() {
    for (const btn of $$("[data-tab]")) btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    $("#undo").addEventListener("click", undo);
    $("#redo").addEventListener("click", redo);
    $('[data-bind="opening.linkCorners"]').addEventListener("change", renderCornerRows);

    for (const btn of $$("#bgSeg button")) {
      btn.addEventListener("click", () => {
        if (btn.dataset.bg === "image" && !assets[state.preview.bgAsset]) { pickSingleImage("bg"); return; }
        state.preview.bg = btn.dataset.bg;
        commit();
        syncControls();
      });
    }

    $("#downloadPng").addEventListener("click", downloadPng);
    $("#downloadZip").addEventListener("click", downloadZip);

    $("#copyColors").addEventListener("click", () => {
      const cur = currentSlot();
      for (const slot of state.time.slots) {
        for (const key of ["frame1", "frame2", "accent", "text", "tint", "tintAlpha"]) slot[key] = cur[key];
      }
      commit();
      requestRender();
      status(`「${cur.name}」の色を、すべての時間帯にコピーしました。`);
    });
    $("#slotIconPick").addEventListener("click", () => pickSingleImage("icon"));
    $("#singleImageFile").addEventListener("change", ev => onSingleImage(ev.target.files[0]));

    $("#addImage").addEventListener("click", () => { $("#imageFile").value = ""; $("#imageFile").click(); });
    $("#imageFile").addEventListener("change", ev => addImageFiles(ev.target.files));
    $("#addText").addEventListener("click", () => {
      const layer = M.textLayer();
      state.layers.push(layer);
      selectedId = layer.id;
      commit();
      syncControls();
      requestRender();
    });
    $("#dupLayer").addEventListener("click", duplicateSelectedLayer);
    $("#deleteLayer").addEventListener("click", deleteSelectedLayer);

    $("#saveProject").addEventListener("click", saveProject);
    $("#openProject").addEventListener("click", () => { $("#projectFile").value = ""; $("#projectFile").click(); });
    $("#projectFile").addEventListener("change", ev => { if (ev.target.files[0]) openProjectFile(ev.target.files[0]); });
    $("#resetAll").addEventListener("click", resetAll);
    $("#addFont").addEventListener("click", () => { $("#fontFile").value = ""; $("#fontFile").click(); });
    $("#fontFile").addEventListener("change", ev => addFontFiles(ev.target.files));
    $("#bgImagePick").addEventListener("click", () => pickSingleImage("bg"));
    $("#bgImageClear").addEventListener("click", () => {
      state.preview.bgAsset = null;
      if (state.preview.bg === "image") state.preview.bg = "sky";
      commit();
      syncControls();
    });

    document.addEventListener("keydown", ev => {
      const t = ev.target;
      const typing = t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && (t.type === "text" || t.type === "number"));
      if (typing || !(ev.ctrlKey || ev.metaKey)) return;
      const key = ev.key.toLowerCase();
      if (key === "z" && !ev.shiftKey) { ev.preventDefault(); undo(); }
      else if (key === "y" || (key === "z" && ev.shiftKey)) { ev.preventDefault(); redo(); }
    });

    let dragDepth = 0;
    const hasFiles = ev => [...(ev.dataTransfer?.types || [])].includes("Files");
    document.addEventListener("dragenter", ev => {
      if (!hasFiles(ev)) return;
      dragDepth++;
      $("#dropHint").hidden = false;
    });
    document.addEventListener("dragleave", ev => {
      if (!hasFiles(ev)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) $("#dropHint").hidden = true;
    });
    document.addEventListener("dragover", ev => { if (hasFiles(ev)) ev.preventDefault(); });
    document.addEventListener("drop", ev => {
      if (!hasFiles(ev)) return;
      ev.preventDefault();
      dragDepth = 0;
      $("#dropHint").hidden = true;
      handleFiles(ev.dataTransfer.files);
    });
    document.addEventListener("paste", ev => {
      const t = ev.target;
      if (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && t.type === "text")) return;
      const files = [...(ev.clipboardData?.files || [])];
      if (!files.length) return;
      ev.preventDefault();
      handleFiles(files);
    });

    window.addEventListener("resize", requestRender);
    wireStage();
  }

  async function init() {
    buildStaticUI();
    wireEvents();
    let tab = "frame";
    try { tab = localStorage.getItem(TAB_KEY) || tab; } catch (err) { /* storage may be blocked */ }
    switchTab($$("[data-tab]").some(b => b.dataset.tab === tab) ? tab : "frame");

    let saved = null;
    try {
      // Some file:// setups never answer IndexedDB; startup must not wait on it forever.
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("IndexedDB timeout")), 1500));
      saved = await Promise.race([dbRequest("readonly", store => store.get("project")), timeout]);
      autosaveEnabled = true;
    } catch (err) {
      // Leave autosave off: writing now could overwrite a project we failed to read.
      console.warn("autosave unavailable", err);
    }
    if (saved && saved.state) {
      await loadProject(saved.state, saved.assets);
      status("前回の作業内容を読み込みました。");
    } else {
      await loadProject(M.defaultState(), {});
      status(autosaveEnabled
        ? "準備できました。「枠」タブで形を、「時間帯」タブで朝・昼・夜の見た目を決めていきます。"
        : "準備できました。このブラウザでは自動保存が使えないため、作業内容は「保存など」タブのプロジェクト保存で残してください。");
    }
  }

  init();
})();
