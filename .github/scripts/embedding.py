import json
from pathlib import Path
from sentence_transformers import SentenceTransformer


def main():
    repo_root = Path(__file__).resolve().parents[2]
    base_file = repo_root / 'music' / 'base.json'

    with base_file.open('r', encoding='utf-8') as f:
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

    with base_file.open('w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"Updated embeddings written to {base_file}")


if __name__ == '__main__':
    main()
