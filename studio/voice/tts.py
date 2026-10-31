"""
Voice for the lesson videos: Silero TTS (Russian, offline).

  python voice/tts.py <lesson-id> [--speaker xenia] [--rate medium] [--pitch medium]
      reads studio/lessons/<id>.json and writes studio/out/<id>/voice.wav + timings.json
      (one narration line per scene; timings say where each scene's line starts and ends)

  python voice/tts.py --samples "текст" [--out out/samples]
      the same text in every female voice, at two paces, to choose a voice by ear

Narration may use + before a stressed vowel (за+мок) and «ё»; Silero also places stress and ё
by itself. Digits and symbols are spelled out here, because the model reads only words.
"""
import argparse
import json
import os
import re
import sys
import wave
from pathlib import Path

import numpy as np

STUDIO = Path(__file__).resolve().parent.parent
os.environ.setdefault("TORCH_HOME", str(STUDIO / "cache" / "torch"))
import torch  # noqa: E402  (after TORCH_HOME)
from num2words import num2words  # noqa: E402

RATE = 48000
FEMALE = ["xenia", "baya", "kseniya"]
GAP = 0.35  # seconds of silence between scenes
LEAD = 0.4  # before the first word


# ------------------------------------------------------------------ text
SYMBOLS = [
    (r"(\d)\s*°", r"\1 градусов"), (r"(\d)\s*%", r"\1 процентов"),
    (r"\s*·\s*|\s*×\s*", " умножить на "), (r"\s*:\s*(?=\d)", " разделить на "),
    (r"\s*=\s*", " равно "), (r"\s*≈\s*", " примерно равно "), (r"\s*≠\s*", " не равно "),
    (r"\s*\+\s*(?=\d)", " плюс "), (r"(?<=\d)\s*[−-]\s*(?=\d)", " минус "), (r"[−-](?=\d)", "минус "),
    (r"\s*<\s*", " меньше "), (r"\s*>\s*", " больше "), (r"\s*≤\s*", " меньше или равно "), (r"\s*≥\s*", " больше или равно "),
    (r"√", " корень из "), (r"²", " в квадрате"), (r"³", " в кубе"), (r"π", " пи"),
    (r"\bкм/ч\b", "километров в час"), (r"\bсм²", "квадратных сантиметров"), (r"\bм²", "квадратных метров"),
]


def say_numbers(text: str) -> str:
    """Spell out integers (with thousands written as «47 862»), leaving words untouched."""
    text = re.sub(r"(?<=\d)[  ](?=\d{3}\b)", "", text)

    def word(m):
        return num2words(int(m.group(0)), lang="ru")

    return re.sub(r"\d+", word, text)


def normalize(text: str) -> str:
    text = re.sub(r"\*\*|==|~~", "", text)  # screen markup is not read out
    for pat, rep in SYMBOLS:
        text = re.sub(pat, rep, text)
    text = say_numbers(text)
    return re.sub(r"\s+", " ", text).strip()


def ssml(text: str, rate: str, pitch: str) -> str:
    esc = text.replace("&", "и").replace("<", " ").replace(">", " ")
    # a beat after each sentence: lessons for kids should not rush
    esc = re.sub(r"([.!?…])\s+", r"\1 <break time='320ms'/> ", esc)
    esc = re.sub(r"([,;:—])\s+", r"\1 <break time='120ms'/> ", esc)
    return f'<speak><prosody rate="{rate}" pitch="{pitch}">{esc}</prosody></speak>'


# ------------------------------------------------------------------ audio
_model = None


def model():
    global _model
    if _model is None:
        _model, _ = torch.hub.load("snakers4/silero-models", "silero_tts", language="ru", speaker="v4_ru", trust_repo=True)
    return _model


def speak(text: str, speaker: str, rate: str, pitch: str) -> np.ndarray:
    audio = model().apply_tts(ssml_text=ssml(normalize(text), rate, pitch), speaker=speaker, sample_rate=RATE,
                              put_accent=True, put_yo=True)
    return audio.numpy().astype(np.float32)


def silence(seconds: float) -> np.ndarray:
    return np.zeros(int(RATE * seconds), dtype=np.float32)


def write_wav(path: Path, audio: np.ndarray):
    path.parent.mkdir(parents=True, exist_ok=True)
    peak = float(np.max(np.abs(audio))) or 1.0
    pcm = (audio / peak * 0.89 * 32767).astype(np.int16)  # even loudness from lesson to lesson
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


# ------------------------------------------------------------------ commands
def lesson(lesson_id: str, speaker: str, rate: str, pitch: str):
    spec = json.loads((STUDIO / "lessons" / f"{lesson_id}.json").read_text(encoding="utf-8"))
    parts, scenes, t = [silence(LEAD)], [], LEAD
    for i, sc in enumerate(spec["scenes"]):
        clip = speak(sc["say"], speaker, rate, pitch)
        start = t
        t += len(clip) / RATE
        scenes.append({"start": round(start, 3), "end": round(t, 3)})
        parts += [clip, silence(GAP)]
        t += GAP
        print(f"  {i + 1}/{len(spec['scenes'])} {len(clip) / RATE:.1f} s", flush=True)
    out = STUDIO / "out" / lesson_id
    write_wav(out / "voice.wav", np.concatenate(parts))
    (out / "timings.json").write_text(json.dumps({"speaker": speaker, "rate": rate, "pitch": pitch, "scenes": scenes, "total": round(t, 3)}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{lesson_id}: {t:.1f} s of voice")


def samples(text: str, out: Path):
    for sp in FEMALE:
        for rate, pitch in (("medium", "medium"), ("slow", "high")):
            path = out / f"{sp}-{rate}-{pitch}.wav"
            write_wav(path, np.concatenate([silence(0.3), speak(text, sp, rate, pitch), silence(0.3)]))
            print(path)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("lesson", nargs="?")
    ap.add_argument("--speaker", default="baya", choices=FEMALE + ["aidar", "eugene"])
    ap.add_argument("--rate", default="medium")
    ap.add_argument("--pitch", default="medium")
    ap.add_argument("--samples")
    ap.add_argument("--out", default=str(STUDIO / "out" / "samples"))
    a = ap.parse_args()
    if a.samples:
        samples(a.samples, Path(a.out))
    elif a.lesson:
        lesson(a.lesson, a.speaker, a.rate, a.pitch)
    else:
        sys.exit(__doc__)
