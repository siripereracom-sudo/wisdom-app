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

const preferred = "model/Haru/Haru.model3.json";

let app = null;
let model = null;
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let rafId = null;
let audioEl = null;

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  if (els.log) {
    els.log.textContent = (els.log.textContent ? `${els.log.textContent}\n` : "") + line;
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

async function initPixi() {
  if (!els.stage) {
    log("ERROR: Missing #stage in index.html");
    return;
  }

  if (app) {
    try {
      app.destroy(true, { children: true });
    } catch {}
    app = null;
  }

  app = new PIXI.Application({
    resizeTo: els.stage,
    backgroundAlpha: 0,
    antialias: true,
  });

  els.stage.innerHTML = "";
  els.stage.appendChild(app.view);
  log("PIXI initialized.");
}

function setMouth(value) {
  if (!model) return;

  try {
    const core = model.internalModel.coreModel;
    const mouthParamIds = ["ParamMouthOpenY", "PARAM_MOUTH_OPEN_Y"];

    for (const id of mouthParamIds) {
      try {
        core.setParameterValueById(id, value);
      } catch {}
    }

    if (els.mouthVal) {
      els.mouthVal.textContent = value.toFixed(2);
    }
  } catch (e) {
    log(`Mouth set failed: ${e?.message || e}`);
  }
}

async function loadModel() {
  if (!app) await initPixi();
  if (!app) return;

  if (model) {
    try {
      app.stage.removeChild(model);
    } catch {}
    try {
      model.destroy?.();
    } catch {}
    model = null;
  }

  if (els.modelUrl) els.modelUrl.textContent = preferred;

  const base = new URL(preferred, window.location.href).toString();
  const mocUrl = new URL("Haru.moc3", base).toString();

  log(`Model JSON: ${base}`);
  log(`Expect Moc3: ${mocUrl}`);

  const jsonOk = await headOk(base);
  const mocOk = await headOk(mocUrl);

  log(`HEAD model3.json: ${jsonOk ? "OK" : "FAIL"}`);
  log(`HEAD Haru.moc3: ${mocOk ? "OK" : "FAIL"}`);

  if (!jsonOk) {
    log("STOP: model3.json not reachable. Check path/case.");
    return;
  }

  if (!mocOk) {
    log("STOP: Haru.moc3 not found.");
    return;
  }

  try {
    model = await Live2DModel.from(preferred);

    model.anchor.set(0.5, 0.5);
    model.x = app.renderer.width * 0.5;
    model.y = app.renderer.height * 0.72;
    model.scale.set(0.35);

    app.stage.addChild(model);
    log("Model loaded ✅");
  } catch (e) {
    log(`LOAD FAILED: ${e?.message || e}`);
  }
}

function dumpParams() {
  if (!model) {
    log("No model loaded.");
    return;
  }

  try {
    const core = model.internalModel.coreModel;
    const count = core.getParameterCount();
    log(`Parameter count: ${count}`);
    for (let i = 0; i < count; i++) {
      log(`- ${core.getParameterId(i)}`);
    }
  } catch (e) {
    log(`Dump failed: ${e?.message || e}`);
  }
}

function stopLipSync() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (audioEl) {
    try {
      audioEl.pause();
    } catch {}
    audioEl = null;
  }

  if (sourceNode) {
    try {
      sourceNode.disconnect();
    } catch {}
    sourceNode = null;
  }

  if (analyser) {
    try {
      analyser.disconnect();
    } catch {}
    analyser = null;
  }

  setMouth(0);
}

async function playLipSync() {
  if (!els.audioFile?.files?.length) {
    log("Choose an audio file first.");
    return;
  }

  if (!model) {
    log("Load the model first.");
    return;
  }

  stopLipSync();

  const file = els.audioFile.files[0];
  const url = URL.createObjectURL(file);

  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  audioEl = new Audio(url);
  audioEl.crossOrigin = "anonymous";

  sourceNode = audioCtx.createMediaElementSource(audioEl);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  const data = new Uint8Array(analyser.frequencyBinCount);

  const tick = () => {
    if (!analyser) return;
    analyser.getByteFrequencyData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const avg = sum / data.length;
    const mouth = Math.min(1, avg / 90);

    setMouth(mouth);
    rafId = requestAnimationFrame(tick);
  };

  audioEl.onended = () => stopLipSync();

  await audioCtx.resume();
  await audioEl.play();
  tick();

  log(`Playing "${file.name}"`);
}

els.btnReload?.addEventListener("click", () => {
  loadModel().catch((e) => console.error(e));
});

els.btnDump?.addEventListener("click", () => {
  dumpParams();
});

els.btnPlay?.addEventListener("click", () => {
  playLipSync().catch((e) => log(`Play failed: ${e?.message || e}`));
});

els.btnStop?.addEventListener("click", () => {
  stopLipSync();
});

els.mouthSlider?.addEventListener("input", (e) => {
  const v = Number(e.target.value) / 100;
  setMouth(v);
});

loadModel().catch((e) => console.error(e));
