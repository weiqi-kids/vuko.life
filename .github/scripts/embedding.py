#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from sentence_transformers import SentenceTransformer


def main() -> None:
    parser = argparse.ArgumentParser(description="Update embeddings for a music JSON file")
    parser.add_argument("json_file", nargs="?", help="Path to music JSON file")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    json_path = Path(args.json_file) if args.json_file else repo_root / "music" / "base.json"
    if not json_path.is_absolute():
        json_path = repo_root / json_path

    with json_path.open("r", encoding="utf-8") as f:
        items = json.load(f)

    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

    texts = []
    for item in items:
        title = item.get('title', '')
        desc = item.get('desc', '')
        tags = item.get('tag', [])
        if isinstance(tags, list):
            tags_text = ' '.join(tags)
        else:
            tags_text = str(tags)
        text = ' '.join([title, desc, tags_text]).strip()
        texts.append(text)

    embeddings = model.encode(texts, batch_size=8, show_progress_bar=True)

    for item, emb in zip(items, embeddings):
        item['embedding'] = [float(x) for x in emb]

    with json_path.open('w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"Updated embeddings written to {json_path}")


if __name__ == '__main__':
    main()
