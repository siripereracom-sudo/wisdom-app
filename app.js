import * as PIXI from "https://esm.sh/pixi.js@7.4.2";
import { Live2DModel } from "https://esm.sh/pixi-live2d-display/cubism4";

window.PIXI = PIXI;

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

// ⭐ Correct model path
const preferred = "/Haru/Haru.model3.json";

let app = null;
let model = null;
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let rafId = null;
let audioEl = null;

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  els.log.textContent += line + "\n";
  els.log.scrollTop = els.log.scrollHeight;
  console.log(line);
}

async function fileExists(url) {
  try {
    const r = await fetch(url, { method: "GET", cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

async function initPixi() {
  // Destroy previous PIXI instance if exists
  if (app) {
    try { app.destroy(true, { children: true }); } catch {}
    app = null;
  }

  // Create PIXI app WITHOUT resizeTo
  app = new PIXI.Application({
    backgroundAlpha: 0,
    antialias: true,
  });

  // Clear stage and attach canvas BEFORE resizing
  els.stage.innerHTML = "";
  els.stage.appendChild(app.view);

  // ⭐ SINGLE resize function (clean)
  function resizePixi() {
    const w = els.stage.clientWidth;
    const h = els.stage.clientHeight;

    if (w > 0 && h > 0) {
      app.renderer.resize(w, h);
    }
  }

  // ⭐ Wait TWO frames so layout is fully ready
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resizePixi();
    });
  });

  // Resize on window resize
  window.addEventListener("resize", resizePixi);

  log("PIXI initialized.");
}

function setMouth(value) {
  if (!model) return;
  const core = model.internalModel.coreModel;
  const ids = ["ParamMouthOpenY", "PARAM_MOUTH_OPEN_Y"];
  ids.forEach(id => {
    try { core.setParameterValueById(id, value); } catch {}
  });
  els.mouthVal.textContent = value.toFixed(2);
}

async function loadModel() {
  await initPixi();

  if (model) {
    try { app.stage.removeChild(model); } catch {}
    try { model.destroy?.(); } catch {}
    model = null;
  }

  els.modelUrl.textContent = preferred;

  const base = preferred;
  const mocUrl = preferred.replace("Haru.model3.json", "Haru.moc3");

  log(`Model JSON: ${base}`);
  log(`Expect Moc3: ${mocUrl}`);

  const jsonOk = await fileExists(base);
  const mocOk = await fileExists(mocUrl);

  log(`model3.json: ${jsonOk ? "OK" : "FAIL"}`);
  log(`Haru.moc3: ${mocOk ? "OK" : "FAIL"}`);

  if (!jsonOk || !mocOk) {
    log("STOP: Model files missing or path incorrect.");
    return;
  }

  try {
    model = await Live2DModel.from(preferred);
    app.stage.addChild(model);

    // ⭐ SAME SCALE (your choice)
    model.scale.set(0.08);

    model.anchor.set(0.5, 0.5);
   // ⭐ Reposition AFTER resize + layout
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    model.position.set(app.renderer.width / 2, app.renderer.height / 2);
  });
});

    log("Model loaded and positioned.");
  } catch (e) {
    log(`LOAD FAILED: ${e.message}`);
  }
}

function dumpParams() {
  if (!model) return log("No model loaded.");
  const core = model.internalModel.coreModel;
  const count = core.getParameterCount();
  log(`Parameter count: ${count}`);
  const ids = core.getParameterIds();
  ids.forEach(id => log(`- ${id}`));
}

function stopLipSync() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;

  if (audioEl) audioEl.pause();
  audioEl = null;

  if (sourceNode) sourceNode.disconnect();
  sourceNode = null;

  if (analyser) analyser.disconnect();
  analyser = null;

  setMouth(0);
}

async function playLipSync() {
  if (!els.audioFile.files.length) return log("Choose an audio file first.");
  if (!model) return log("Load the model first.");

  stopLipSync();

  const file = els.audioFile.files[0];
  const url = URL.createObjectURL(file);

  audioCtx = audioCtx || new AudioContext();
  audioEl = new Audio(url);

  sourceNode = audioCtx.createMediaElementSource(audioEl);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  const data = new Uint8Array(analyser.frequencyBinCount);

  const tick = () => {
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const mouth = Math.min(1, avg / 90);
    setMouth(mouth);
    rafId = requestAnimationFrame(tick);
  };

  audioEl.onended = stopLipSync;

  await audioCtx.resume();
  await audioEl.play();

  tick();

  log(`Playing "${file.name}"`);
}

els.btnReload.addEventListener("click", loadModel);
els.btnDump.addEventListener("click", dumpParams);
els.btnPlay.addEventListener("click", playLipSync);
els.btnStop.addEventListener("click", stopLipSync);

els.mouthSlider.addEventListener("input", e => {
  const v = Number(e.target.value) / 100;
  setMouth(v);
});

// ⭐ Load model on startup
loadModel();
