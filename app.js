// wisdom-app/app.js  (SINGLE source of imports — keep ONLY these)
import * as PIXI from "https://esm.sh/pixi.js@7.4.2";
import { Live2DModel } from "https://esm.sh/pixi-live2d-display@0.4.0";

const els = {
  stage: document.getElementById("stage"),
  log: document.getElementById("log"),
  modelUrl: document.getElementById("modelUrl"),
  btnReload: document.getElementById("btnReload"),
  btnDump: document.getElementById("btnDump"),
  mouthSlider: document.getElementById("mouthSlider"),
  mouthVal: document.getElementById("mouthVal"),
  audioFile: document.getElementById("audioFile"),
  btnPlay: document.getElementById("btnPlay"),
  btnStop: document.getElementById("btnStop"),
};

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  if (els.log) {
    els.log.textContent = (els.log.textContent ? els.log.textContent + "\n" : "") + line;
    els.log.scrollTop = els.log.scrollHeight;
  }
  console.log(line);
}

async function headOk(url) {
  try {
    const r = await fetch(url, { method: "HEAD", cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

let app = null;
let model = null;

async function initPixi() {
  console.log("initPixi start");
  if (!els.stage) {
    log("ERROR: Missing #stage in index.html");
    return;
  }

  if (app) {
    try { app.destroy(true, { children: true }); } catch {}
    app = null;
  }

  app = new PIXI.Application({
    console.log("PIXI app created", app);
    resizeTo: els.stage,
    backgroundAlpha: 0,
    antialias: true,
  });

  els.stage.innerHTML = "";
  els.stage.appendChild(app.view);
  log("PIXI initialized.");
  
}

async function loadModel() {
  console.log("loadModel start");
console.log("stage exists?", !!els.stage);
console.log("preferred path =", preferred);
  if (!app) await initPixi();
  if (!app) return;
  
  console.log("initPixi start");

  if (model) {
    try { app.stage.removeChild(model); } catch {}
    try { model.destroy?.(); } catch {}
    model = null;
  }

  // IMPORTANT: your model3.json is here:
  const preferred = "model/Haru/Haru.model3.json";

  // Show in UI
  if (els.modelUrl) els.modelUrl.textContent = preferred;

  // Preflight checks (these reveal missing files fast)
  const base = new URL(preferred, window.location.href).toString();
  const mocUrl = new URL("Haru.moc3", base).toString();

  log(`Model JSON: ${base}`);
  log(`Expect Moc3: ${mocUrl}`);

  console.log("about to HEAD model", base);

  const jsonOk = await headOk(base);
  const mocOk = await headOk(mocUrl);

  log(`HEAD model3.json: ${jsonOk ? "OK" : "FAIL"}`);
  log(`HEAD Haru.moc3:   ${mocOk ? "OK" : "FAIL"}`);

  if (!jsonOk) {
    log("STOP: model3.json not reachable. Check path/case.");
    return;
  }
  if (!mocOk) {
    log("STOP: Haru.moc3 not found. Upload it to /model/Haru/ (same folder as Haru.model3.json) OR fix the Moc path inside Haru.model3.json.");
    return;
  }

  try {
   model = await Live2DModel.from(preferred);

    // Position & scale
    model.anchor.set(0.5, 0.5);
    model.x = app.renderer.width * 0.5;
    model.y = app.renderer.height * 0.70;
    model.scale.set(0.35);

    app.stage.addChild(model);
    log("Model loaded ✅");
  } catch (e) {
    log(`LOAD FAILED: ${e?.message || e}`);
  }
}

// Optional: dump params (helps find mouth param IDs)
function dumpParams() {
  if (!model) return log("No model loaded.");
  try {
    const core = model.internalModel.coreModel;
    const count = core.getParameterCount();
    log(`Parameter count: ${count}`);
    for (let i = 0; i < count; i++) log(`- ${core.getParameterId(i)}`);
  } catch (e) {
    log(`Dump failed: ${e?.message || e}`);
  }
}

// Wire UI
els.btnReload?.addEventListener("click", () => loadModel());
els.btnDump?.addEventListener("click", () => dumpParams());

// Auto-start
loadModel().catch((e) => console.error(e));
