# /// script
# requires-python = "==3.13.*"
# dependencies = ["mlx-audio==0.5.8"]
# ///
# Voices lines in the owner's cloned voice with Qwen3-TTS, on device. Used by sim:short.
# usage: uv run --script clone.py <lines.json> <reference.wav> <transcript>
#   lines.json: [{"text": "...", "out": "/abs/path/line-xxxx.wav"}]; a line whose file exists is kept.
# Prints one JSON object on its last line: {out: seconds} for every line.
import json
import sys
import wave
from pathlib import Path
from tempfile import TemporaryDirectory

lines_file, reference, transcript = sys.argv[1:]
lines = {Path(line["out"]): line["text"] for line in json.loads(Path(lines_file).read_text())}
todo = [out for out in lines if not out.exists()]

if todo:
    import mlx.core as mx
    from mlx_audio.audio_io import write
    from mlx_audio.tts.utils import load_model
    from mlx_audio.utils import load_audio

    model = load_model(
        "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16",
        revision="a6eb4f68e4b056f1215157bb696209bc82a6db48",
    )
    ref_audio = load_audio(reference, sample_rate=model.sample_rate)
    for i, out in enumerate(todo, 1):
        mx.random.seed(7)
        chunks = model.generate(
            lines[out],
            lang_code="english",
            ref_audio=ref_audio,
            ref_text=transcript or None,
            temperature=0.7,
            top_k=50,
            top_p=0.9,
        )
        audio = mx.concatenate([chunk.audio for chunk in chunks])
        with TemporaryDirectory(dir=out.parent) as staging:
            wav = Path(staging) / out.name
            write(wav, audio, model.sample_rate)
            wav.replace(out)
        print(f"  voiced {i}/{len(todo)}", file=sys.stderr, flush=True)

seconds = {}
for out in lines:
    with wave.open(str(out), "rb") as wav:
        seconds[str(out)] = wav.getnframes() / wav.getframerate()
print(json.dumps(seconds))
