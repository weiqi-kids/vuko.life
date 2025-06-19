#!/usr/bin/env python3
import argparse
import json
import os
import re
import time
from pathlib import Path
from typing import Any, List, Tuple

import openai
try:
    # openai>=1.0 exposes errors at the top level
    from openai import OpenAIError, AuthenticationError, RateLimitError

    class openai_error:  # type: ignore
        OpenAIError = OpenAIError
        AuthenticationError = AuthenticationError
        RateLimitError = RateLimitError

    client: Any = openai
except ImportError:  # pragma: no cover - fallback for openai<1.0
    from openai import error as openai_error
    client: Any = openai
from babel import Locale
from tqdm import tqdm


def call_chat_completion(messages: List[dict]) -> Any:
    params = {
        "model": "gpt-4o",
        "messages": messages,
        "temperature": 0,
    }
    # request JSON output if supported
    try:
        params["response_format"] = {"type": "json_object"}
        if hasattr(client, "chat"):
            return client.chat.completions.create(**params)
        return client.ChatCompletion.create(**params)
    except TypeError:
        params.pop("response_format", None)
        if hasattr(client, "chat"):
            return client.chat.completions.create(**params)
        return client.ChatCompletion.create(**params)

PLACEHOLDER_RE = re.compile(r"{[^{}]+}")


def lang_from_path(path: Path) -> str:
    name = path.stem.lower()
    if re.fullmatch(r"[a-z]{2}(?:-[a-z]{2})?", name):
        return name
    return "zh-tw"


def lang_name(code: str) -> str:
    try:
        loc = Locale.parse(code)
        return loc.get_display_name(code)
    except Exception:
        return code


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def collect_strings(data: Any, path: Tuple = ()) -> List[Tuple[Tuple, str]]:
    entries: List[Tuple[Tuple, str]] = []
    if isinstance(data, dict):
        for k, v in data.items():
            entries.extend(collect_strings(v, path + (k,)))
    elif isinstance(data, list):
        for i, v in enumerate(data):
            entries.extend(collect_strings(v, path + (i,)))
    elif isinstance(data, str):
        entries.append((path, data))
    return entries


def set_value(data: Any, path: Tuple, value: str) -> None:
    key = path[0]
    if len(path) == 1:
        if isinstance(data, list):
            data[key] = value
        else:
            data[key] = value
        return
    next_data = data[key]
    set_value(next_data, path[1:], value)


def translate_batch(texts: List[str], src_name: str, tgt_name: str, tgt_code: str) -> List[str]:
    mapping = {str(i): t for i, t in enumerate(texts)}
    prompt = (
        f"Translate the following texts from {src_name} to {tgt_name}. "
        "Preserve placeholders like {example}. "
        "Respond ONLY with a JSON object mapping the same numeric keys to the translated texts."
    )
    messages = [
        {"role": "system", "content": "You are a helpful translator."},
        {"role": "user", "content": prompt + "\n" + json.dumps(mapping, ensure_ascii=False)}
    ]

    for attempt in range(3):
        try:
            resp = call_chat_completion(messages)
            content = resp.choices[0].message.content
            data = json.loads(content)
            return [data.get(str(i), texts[i]) for i in range(len(texts))]
        except (openai_error.AuthenticationError, openai_error.RateLimitError) as e:
            raise RuntimeError(f"OpenAI API error ({tgt_code}): {e}") from e
        except openai_error.OpenAIError as e:
            if attempt == 2:
                raise RuntimeError(f"OpenAI API error ({tgt_code}): {e}") from e
            print(f"OpenAI API error ({tgt_code}): {e}; retry {attempt + 1}")
            time.sleep(2 ** attempt)
        except Exception as e:
            if attempt == 2:
                raise RuntimeError(f"Unexpected error ({tgt_code}): {e}") from e
            print(f"Unexpected error ({tgt_code}): {e}; retry {attempt + 1}")
            time.sleep(2 ** attempt)

    raise RuntimeError(f"Failed to translate batch for {tgt_code}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Translate JSON file")
    parser.add_argument("src", help="source json path")
    parser.add_argument("dst", help="target json path")
    args = parser.parse_args()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY not set; skipping translation")
        data = load_json(Path(args.src))
        save_json(Path(args.dst), data)
        return

    if hasattr(openai, "OpenAI"):
        global client
        client = openai.OpenAI(api_key=api_key)
    else:
        client.api_key = api_key

    src_path = Path(args.src)
    dst_path = Path(args.dst)

    src_lang = lang_from_path(src_path)
    dst_lang = lang_from_path(dst_path)

    if src_lang == dst_lang:
        data = load_json(src_path)
        save_json(dst_path, data)
        print(f"Source and target languages are the same ({src_lang}); file copied.")
        return

    src_name = lang_name(src_lang)
    tgt_name = lang_name(dst_lang)

    data = load_json(src_path)
    entries = collect_strings(data)

    batch_size = 20
    for i in tqdm(range(0, len(entries), batch_size), desc=f"{dst_lang}"):
        batch = entries[i:i + batch_size]
        texts = [t for _, t in batch]
        try:
            translated = translate_batch(texts, src_name, tgt_name, dst_lang)
        except RuntimeError as e:
            print(e)
            raise SystemExit(1)
        for (path, _), trans in zip(batch, translated):
            set_value(data, path, trans)

    dst_path.parent.mkdir(parents=True, exist_ok=True)
    save_json(dst_path, data)
    print(f"Translated {len(entries)} entries to {dst_lang} -> {dst_path}")


if __name__ == "__main__":
    main()
