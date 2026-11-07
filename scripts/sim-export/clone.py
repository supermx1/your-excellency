# Voices lines in the owner's cloned voice with Chatterbox Multilingual, on device. Used by sim:short.
# usage: python clone.py <lines.json> <reference.wav>
#   lines.json: [{"text": "...", "out": "/abs/path/line-xxxx.wav"}]; a line whose file exists is kept.
# Prints one JSON object on its last line: {out: seconds} for every line.
import json, os, sys

import torch
import torchaudio

lines, ref = json.load(open(sys.argv[1])), sys.argv[2]
todo = [l for l in lines if not os.path.exists(l["out"])]
if todo:
    _load = torch.load
    # The weights were saved on an Nvidia GPU; load them on the CPU, then move them to this Mac's GPU.
    torch.load = lambda *a, **k: _load(*a, **{**k, "map_location": torch.device("cpu")})
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    model = ChatterboxMultilingualTTS.from_pretrained(device=torch.device("mps" if torch.backends.mps.is_available() else "cpu"))
    for i, l in enumerate(todo, 1):
        torch.manual_seed(7)
        wav = model.generate(l["text"], language_id="en", audio_prompt_path=ref, exaggeration=0.5, cfg_weight=0.5).cpu()
        torchaudio.save(l["out"], wav, model.sr)
        print(f"  voiced {i}/{len(todo)}", file=sys.stderr, flush=True)
print(json.dumps({l["out"]: torchaudio.info(l["out"]).num_frames / torchaudio.info(l["out"]).sample_rate for l in lines}))
