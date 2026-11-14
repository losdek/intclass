# studio — как делаются видеоуроки

Видео для уроков собираются из сценария: голос — нейросеть **Silero** (женский голос `baya`), картинка — **Remotion** (React-сцены в цветах и шрифтах сайта). Готовый ролик и постер сразу попадают в `videos/`, а урок с мини-тестом — в `js/lessons.js`.

## Один урок = один файл

`lessons/<id>.json`:

```json
{
  "id": "math-5-13", "grade": "5", "topic": "Простые числа", "slug": "prostye-chisla-5",
  "pause": 1,
  "scenes": [ { "say": "что говорит голос", "show": { "type": "question", "text": "что на экране" } } ],
  "site": { "title": "…", "description": "…", "takeaway": "…", "pauseQuestion": "…", "quiz": [ … ] }
}
```

- `scenes` — по одной реплике на картинку; картинка держится, пока звучит её реплика.
- `pause` — номер сцены с задачкой: видео остановится сразу после неё, и ученик решит задачку руками (первое задание `quiz`).
- В `say` числа с дробями и падежами пишите словами («две третьих», «тридцать сомов»): целые числа и знаки (° % · = √) голос прочитает сам. Ударение: `+` перед гласной (`за+мок`). Латинские буквы голос не читает — пишите «икс», «а», «бэ».
- В `show` можно `**акцент**`, `==маркер==`, `~~ошибка~~`.

Типы картинок (`remotion/src/scenes.tsx`): `title`, `question`, `text`, `steps`, `math`, `rule`, `trap`, `numberline` (точки, прыжки, промежуток), `shape` (многоугольники, окружности, отрезки, дуги углов, подписи в поле 100 × 60), `bars`, `table`, `fraction` (пицца или полоска), `objects` (предметы рядами).

## Команды

```bash
# всё сразу: голос → видео → videos/ → js/lessons.js
node studio/build.mjs math-5-13 math-5-14

# по шагам
studio/.venv/Scripts/python.exe studio/voice/tts.py math-5-13          # out/<id>/voice.wav + timings.json
studio/.venv/Scripts/python.exe studio/voice/tts.py --samples "текст"  # сравнить голоса на слух
node studio/remotion/preview.mjs math-5-13                              # по кадру на сцену — быстро проверить картинки
node studio/remotion/render.mjs math-5-13                               # out/<id>/video.mp4 + poster.jpg
```

`build.mjs` пропускает голос и рендер, если сценарий не менялся; `--force` — заново.

## Установка (один раз, Windows)

- Node.js 18+ → `cd studio/remotion && npm install` (при первом рендере Remotion скачает Chrome Headless Shell).
- Python 3.12 → `python -m venv studio/.venv` и `studio/.venv/Scripts/pip install torch --index-url https://download.pytorch.org/whl/cpu num2words numpy omegaconf`. Модель Silero скачается в `studio/cache/` при первом запуске.

## Установка на Linux (рядом с Windows в той же папке)

`build.mjs` на Linux/macOS берёт Python из `studio/.venv-posix/`, так что Windows-окружение `studio/.venv/` не мешает.

- `python3 -m venv studio/.venv-posix` и `studio/.venv-posix/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu`, потом `num2words numpy omegaconf`.
- Если `node_modules` установлен с Windows, не переустанавливайте его, а доложите Linux-бинарники той же версии:
  `npm pack @remotion/compositor-linux-x64-gnu@<версия @remotion/renderer>` и `npm pack @esbuild/linux-x64@<версия esbuild>`; каждый архив распакуйте с `--strip-components=1` в `node_modules/@remotion/compositor-linux-x64-gnu/` и в `node_modules/@esbuild/linux-x64/`.

`out/`, `cache/`, `.venv/`, `.venv-posix/`, `node_modules/` и звук в git не попадают.
