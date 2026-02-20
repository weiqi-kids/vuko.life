#!/usr/bin/env python3
"""
Fetch GitHub Traffic data and save to JSON file.
Uses GitHub API to get views, clones, and popular paths.
"""

import os
import json
import requests
from datetime import datetime

def fetch_traffic_data():
    """Fetch traffic data from GitHub API."""
    token = os.environ.get('GITHUB_TOKEN')
    owner = os.environ.get('REPO_OWNER', 'weiqi-kids')
    repo = os.environ.get('REPO_NAME', 'vuko.life')

    if not token:
        print("Warning: GITHUB_TOKEN not set, using limited API access")

    headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    }
    if token:
        headers['Authorization'] = f'Bearer {token}'

    base_url = f'https://api.github.com/repos/{owner}/{repo}'

    data = {
        'fetched_at': datetime.utcnow().isoformat() + 'Z',
        'repository': f'{owner}/{repo}',
        'views': None,
        'clones': None,
        'popular_paths': None,
        'popular_referrers': None
    }

    # Fetch views
    try:
        resp = requests.get(f'{base_url}/traffic/views', headers=headers)
        if resp.status_code == 200:
            data['views'] = resp.json()
            print(f"✓ Views: {data['views'].get('count', 0)} total, {data['views'].get('uniques', 0)} unique")
        else:
            print(f"✗ Views: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"✗ Views error: {e}")

    # Fetch clones
    try:
        resp = requests.get(f'{base_url}/traffic/clones', headers=headers)
        if resp.status_code == 200:
            data['clones'] = resp.json()
            print(f"✓ Clones: {data['clones'].get('count', 0)} total, {data['clones'].get('uniques', 0)} unique")
        else:
            print(f"✗ Clones: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"✗ Clones error: {e}")

    # Fetch popular paths
    try:
        resp = requests.get(f'{base_url}/traffic/popular/paths', headers=headers)
        if resp.status_code == 200:
            data['popular_paths'] = resp.json()
            print(f"✓ Popular paths: {len(data['popular_paths'])} entries")
        else:
            print(f"✗ Popular paths: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"✗ Popular paths error: {e}")

    # Fetch popular referrers
    try:
        resp = requests.get(f'{base_url}/traffic/popular/referrers', headers=headers)
        if resp.status_code == 200:
            data['popular_referrers'] = resp.json()
            print(f"✓ Popular referrers: {len(data['popular_referrers'])} entries")
        else:
            print(f"✗ Popular referrers: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"✗ Popular referrers error: {e}")

    return data

def main():
    print("Fetching GitHub Traffic data...")
    data = fetch_traffic_data()

    output_path = '/tmp/traffic.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Traffic data saved to {output_path}")

if __name__ == '__main__':
    main()
