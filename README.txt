WISDOM-APP STARTER (siriperera.com)

UPLOAD
Upload this whole folder to:
  /public_html/wisdom-app/

Then open:
  https://siriperera.com/wisdom-app/

WORDPRESS EMBED
In your WordPress page (Custom HTML block), use:

<iframe src="https://siriperera.com/wisdom-app/" width="100%" height="700" style="border:none;"></iframe>

LIVE2D MODEL
Put your exported Live2D model files in:
  /public_html/wisdom-app/model/

Rename your main JSON to one of:
  model3.json  (Cubism 4 export)
  model.json   (older export)

Keep all related files (textures, moc, etc.) in the same folder.

TEST
- Mouth slider tests ParamMouthOpenY
- “Dump params” lists all parameter IDs (find mouth params if names differ)
- Pick an audio file on your PC and “Play & lip-sync” to drive the mouth from audio amplitude.

SECURITY NOTE (IMPORTANT)
Do NOT place ElevenLabs or OpenAI keys in front-end JS.
Instead, create a small backend endpoint (WordPress REST route or server script) that:
  - receives text from the browser
  - calls OpenAI (your GPT) + ElevenLabs
  - returns audio (or a temporary audio URL)
