#!/usr/bin/env python3
"""Scrape a public Telegram channel via the t.me/s/<channel> preview path.

No auth / no API key. Captures text, link previews (title/site/description),
photo CDN URLs, video CDN URLs, author, datetime, views, forwarded-from and
reply-to. Does NOT capture native video/audio bytes, comments, reactions or
edit history (preview-path limitation — see docs/research/README.md).

APPEND-ONLY refresh: the existing archive (index.md / posts.md / posts.json) is
never rewritten. New messages are fetched and *appended* in the existing format,
so a refresh produces a diff that contains only the genuinely new posts. Run
again any time — already-archived posts are skipped.

Outputs per channel in <out_dir>:
  <channel>-index.md  — chronological "## Posts" bullet list
  <channel>-posts.md  — full bodies + metadata + Photos/Videos/Link-preview blocks
  <channel>-posts.json — structured dump (11 fields/post) for re-processing

Usage:
  scrape-tg-channel.py <channel> <out_dir> [--full]
  scrape-tg-channel.py --all [--full]        # all kit-tracked channels

--full re-scrapes from scratch (only meaningful for a brand-new out_dir; it will
NOT rewrite an existing archive — it appends anything missing).

Stdlib only (urllib + re). Python 3.10+.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from html import unescape

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
MAX_PAGES = 400
PAGE_PAUSE_S = 0.8

RESEARCH_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "research")
# (channel, out_dir relative to research/, language)
CHANNELS: list[tuple[str, str, str]] = [
    ("anatolii_makosov", "anatolii_makosov", "ru"),
    ("toncore", "toncore", "en"),
    ("durov", "durov", "en"),
    ("tonblockchain", "tonblockchain", "en"),  # silent since 2024-06
    ("tonstatus", "tonstatus", "en"),
    ("tondev_news", "tondev_news", "en"),
    ("resistancetools", "resistancetools", "en"),
]

# JSON field order must match the existing archive exactly (clean append diffs).
POST_FIELDS = [
    "msg_id", "datetime_iso", "author", "text_html", "text_md",
    "photos", "videos", "links_preview", "views", "forwarded_from", "reply_to",
]


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "replace")


def strip_tags_to_md(html: str) -> str:
    s = html
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"</p>", "\n\n", s, flags=re.I)
    s = re.sub(r"</?(?:b|strong)>", "**", s, flags=re.I)
    s = re.sub(r"</?(?:i|em)>", "*", s, flags=re.I)
    s = re.sub(
        r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>',
        lambda m: f"[{re.sub(r'<[^>]+>', '', m.group(2))}]({m.group(1)})",
        s, flags=re.I | re.S,
    )
    s = re.sub(r"<[^>]+>", "", s)
    s = unescape(s)
    s = re.sub(r"\n{3,}", "\n\n", s).strip()
    return s


def _inner_text(html: str) -> str:
    return strip_tags_to_md(html)


def slice_messages(page_html: str) -> list[str]:
    idxs = [m.start() for m in re.finditer(r'data-post="[^"/]+/\d+"', page_html)]
    return [page_html[idxs[i]:(idxs[i + 1] if i + 1 < len(idxs) else len(page_html))]
            for i in range(len(idxs))]


def parse_message(chunk: str) -> dict | None:
    m = re.search(r'data-post="[^"/]+/(\d+)"', chunk)
    if not m:
        return None
    msg_id = int(m.group(1))

    dt = re.search(r'<time[^>]*datetime="([^"]+)"', chunk)
    datetime_iso = dt.group(1) if dt else ""

    auth = re.search(r'tgme_widget_message_(?:owner_name|author_name)[^>]*>(?:<[^>]+>)*([^<]+)', chunk)
    author = unescape(auth.group(1).strip()) if auth else ""

    views_m = re.search(r'tgme_widget_message_views"[^>]*>([^<]+)', chunk)
    views = views_m.group(1).strip() if views_m else ""

    text_m = re.search(
        r'tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>\s*(?=<div class="tgme_widget_message_(?:footer|meta|reply|link_preview)|$)',
        chunk, flags=re.S,
    ) or re.search(r'tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', chunk, flags=re.S)
    text_html = text_m.group(1).strip() if text_m else ""
    text_md = strip_tags_to_md(text_html) if text_html else ""

    photos = [u for u in re.findall(r"background-image:url\('([^']+)'\)", chunk)
              if "telesco.pe" in u or "/file/" in u]
    videos = re.findall(r'<video[^>]*\bsrc="([^"]+)"', chunk)

    lp = []
    for url, inner in re.findall(
        r'tgme_widget_message_link_preview"[^>]*href="([^"]*)"(.*?)</a>', chunk, flags=re.S):
        site_m = re.search(r'link_preview_site_name[^>]*>(.*?)</div>', inner, flags=re.S)
        title_m = re.search(r'link_preview_title[^>]*>(.*?)</div>', inner, flags=re.S)
        desc_m = re.search(r'link_preview_description[^>]*>(.*?)</div>', inner, flags=re.S)
        lp.append({
            "url": url,
            "title": _inner_text(title_m.group(1)) if title_m else "",
            "site": _inner_text(site_m.group(1)) if site_m else "",
            "desc": _inner_text(desc_m.group(1)) if desc_m else "",
        })

    fwd_m = re.search(r'tgme_widget_message_forwarded_from_name"[^>]*>(?:<[^>]+>)*([^<]+)', chunk)
    forwarded_from = unescape(fwd_m.group(1).strip()) if fwd_m else ""

    reply_m = re.search(r'tgme_widget_message_reply"[^>]*href="https://t\.me/([^/]+/\d+)"', chunk)
    reply_to = reply_m.group(1) if reply_m else ""

    return {
        "msg_id": msg_id, "datetime_iso": datetime_iso, "author": author,
        "text_html": text_html, "text_md": text_md, "photos": photos,
        "videos": videos, "links_preview": lp, "views": views,
        "forwarded_from": forwarded_from, "reply_to": reply_to,
    }


def scrape(channel: str, since_id: int) -> dict[int, dict]:
    """Walk backward from newest until reaching since_id (exclusive) or the start."""
    posts: dict[int, dict] = {}
    before: int | None = None
    pages = 0
    while pages < MAX_PAGES:
        url = f"https://t.me/s/{channel}" + (f"?before={before}" if before else "")
        try:
            html = fetch(url)
        except urllib.error.HTTPError as e:
            print(f"  ! HTTP {e.code} on {url}", file=sys.stderr)
            break
        ids = []
        for ch in slice_messages(html):
            p = parse_message(ch)
            if not p:
                continue
            ids.append(p["msg_id"])
            if p["msg_id"] > since_id:
                posts[p["msg_id"]] = p
        pages += 1
        if not ids:
            break
        min_id = min(ids)
        if min_id <= since_id or (before is not None and min_id >= before):
            break
        before = min_id
        time.sleep(PAGE_PAUSE_S)
    return posts


def load_existing_json(path: str) -> dict[int, dict]:
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        return {int(p["msg_id"]): p for p in json.load(f)}


def archived_max_from_md(md_path: str) -> int:
    if not os.path.exists(md_path):
        return 0
    with open(md_path, encoding="utf-8") as f:
        ids = [int(x) for x in re.findall(r'^## \[(\d+)\]', f.read(), flags=re.M)]
    return max(ids) if ids else 0


def first_line(text_md: str) -> str:
    for line in text_md.splitlines():
        if line.strip():
            return line.strip()
    return "(no text)"


def render_post_md(channel: str, p: dict) -> str:
    out = [f"## [{p['msg_id']}] {p['datetime_iso']}", ""]
    out.append(f"- Permalink: https://t.me/{channel}/{p['msg_id']}")
    if p.get("author"):
        out.append(f"- Author: {p['author']}")
    if p.get("views"):
        out.append(f"- Views: {p['views']}")
    if p.get("forwarded_from"):
        out.append(f"- Forwarded from: {p['forwarded_from']}")
    if p.get("reply_to"):
        out.append(f"- Reply to: https://t.me/{p['reply_to']}")
    out.append("")
    if p.get("text_md"):
        out.append(p["text_md"])
        out.append("")
    if p.get("photos"):
        out.append("**Photos:**")
        out += [f"- {u}" for u in p["photos"]]
        out.append("")
    if p.get("videos"):
        out.append("**Videos:**")
        out += [f"- {u}" for u in p["videos"]]
        out.append("")
    if p.get("links_preview"):
        out.append("**Link preview:**")
        for lp in p["links_preview"]:
            out.append(f"- [{lp.get('title') or lp.get('url')}]({lp.get('url')})")
            if lp.get("desc"):
                out.append(f"  - {lp['desc']}")
        out.append("")
    out.append("---")
    return "\n".join(out)


def append_posts_md(md_path: str, channel: str, new_posts: list[dict]) -> None:
    blocks = "\n\n".join(render_post_md(channel, p) for p in new_posts)
    if os.path.exists(md_path):
        with open(md_path, encoding="utf-8") as f:
            body = f.read().rstrip()
        body = body + "\n\n" + blocks + "\n"
    else:
        header = (f"# @{channel} — Telegram Channel Archive\n\n"
                  "Format per post: `## [<msg_id>] <datetime>` then author / metadata / body.\n\n---\n\n")
        body = header + blocks + "\n"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(body)


def append_index_md(index_path: str, channel: str, new_posts: list[dict],
                    total: int, latest: dict, refreshed: str) -> None:
    bullets = "\n".join(
        f"- [`{p['msg_id']}`](https://t.me/{channel}/{p['msg_id']}) · {p['datetime_iso']} · {first_line(p['text_md'])}"
        for p in new_posts
    )
    if os.path.exists(index_path):
        with open(index_path, encoding="utf-8") as f:
            text = f.read()
        text = re.sub(r'(?m)^- Total posts captured:.*$', f"- Total posts captured: {total}", text)
        text = re.sub(r'(?m)^- Latest:.*$',
                       f"- Latest:   {latest['datetime_iso']} (msg {latest['msg_id']})", text)
        if "- Refreshed at:" in text:
            text = re.sub(r'(?m)^- Refreshed at:.*$', f"- Refreshed at: {refreshed}", text)
        else:
            text = re.sub(r'(?m)^(- Captured at:.*)$', r"\1\n- Refreshed at: " + refreshed, text, count=1)
        text = text.rstrip() + "\n" + bullets + "\n"
    else:
        text = (f"# @{channel} — Telegram Channel Archive\n\n"
                f"- Source: https://t.me/{channel}\n- Refreshed at: {refreshed}\n"
                f"- Total posts captured: {total}\n\n## Posts\n\n" + bullets + "\n")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(text)


def write_json(json_path: str, posts: dict[int, dict]) -> None:
    ordered = [posts[k] for k in sorted(posts)]
    data = [{k: p.get(k, "" if k not in ("photos", "videos", "links_preview") else [])
             for k in POST_FIELDS} for p in ordered]
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def run_one(channel: str, out_dir: str, full: bool) -> int:
    os.makedirs(out_dir, exist_ok=True)
    json_path = os.path.join(out_dir, f"{channel}-posts.json")
    md_path = os.path.join(out_dir, f"{channel}-posts.md")
    index_path = os.path.join(out_dir, f"{channel}-index.md")

    existing_json = {} if full else load_existing_json(json_path)
    archived_max = archived_max_from_md(md_path)
    if existing_json:
        archived_max = max(archived_max, max(existing_json))
    # If json is missing we must scrape from scratch to backfill it.
    floor = 0 if (full or not existing_json) else max(existing_json)
    print(f"→ @{channel}: " + ("full scrape" if floor == 0 else f"incremental (since msg {floor})"))

    fetched = scrape(channel, floor)
    new_for_md = sorted([fetched[i] for i in fetched if i > archived_max], key=lambda p: p["msg_id"])
    merged = {**existing_json, **fetched}

    refreshed = time.strftime("%Y-%m-%d")
    latest = merged[max(merged)] if merged else None

    # Append new posts to the human-readable archive (verbatim-preserving).
    if new_for_md:
        append_posts_md(md_path, channel, new_for_md)
        append_index_md(index_path, channel, new_for_md, len(merged), latest, refreshed)

    # Structured dump: backfill if missing, else append-merge when there's anything new.
    if not os.path.exists(json_path) or any(i not in existing_json for i in fetched):
        write_json(json_path, merged)

    if new_for_md:
        print(f"  ✓ {len(new_for_md)} new post(s) appended, {len(merged)} total")
    elif not existing_json and merged:
        print(f"  ✓ json backfilled ({len(merged)} posts), md/index untouched")
    else:
        print(f"  · no new posts ({len(merged)} total) — files untouched")
    return len(new_for_md)


def main() -> int:
    ap = argparse.ArgumentParser(description="Scrape a public Telegram channel via t.me/s/ preview (append-only).")
    ap.add_argument("channel", nargs="?")
    ap.add_argument("out_dir", nargs="?")
    ap.add_argument("--all", action="store_true", help="scrape all kit-tracked channels")
    ap.add_argument("--full", action="store_true", help="scrape from scratch (still append-only against existing md)")
    args = ap.parse_args()

    if args.all:
        total = 0
        for ch, sub, _lang in CHANNELS:
            total += run_one(ch, os.path.normpath(os.path.join(RESEARCH_DIR, sub)), args.full)
        print(f"\n=== {total} new post(s) across {len(CHANNELS)} channels ===")
        non_en = [c for c, _, lang in CHANNELS if lang != "en"]
        if non_en and total:
            print(f"Note: non-English channels {non_en} — regenerate <channel>-posts-en.md "
                  "translation separately if they gained new posts.")
        return 0

    if not args.channel or not args.out_dir:
        ap.error("provide <channel> <out_dir>, or use --all")
    run_one(args.channel, args.out_dir, args.full)
    return 0


if __name__ == "__main__":
    sys.exit(main())
