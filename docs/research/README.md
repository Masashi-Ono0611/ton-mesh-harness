# Research: Telegram Channel Archives (TON / digital-resistance)

Reference material for sovereign-deploy-kit. All archives are captured from the public
`t.me/s/<channel>` preview path (no auth, no API key needed). Each directory contains:

- `<channel>-index.md` — chronological list with msg_id, timestamp, first line
- `<channel>-posts.md` — full post bodies, photos URLs, link previews, permalinks
- `<channel>-posts.json` — structured dump for re-processing
- `<channel>-posts-en.md` (only when original language is not English) — translated body

## Archived channels

| Channel | Posts | Period | Lang | Why this kit cares |
|---------|-------|--------|------|---------------------|
| [@anatolii_makosov](anatolii_makosov/) | 109 | 2024-03 → 2026-05 | RU (+EN translation) | Anatolii Makosov, TON Core co-founder; personal commentary on Sub-Second / MTONGA / Tolk |
| [@toncore](toncore/) | 95 | 2024-11 → 2026-04 | EN | TON Core team's official channel — release notes, Catchain 2.0, TVM 12, Tolk 1.x |
| [@durov](durov/) | 389 | 2015-10 → 2026-05 | EN | Pavel Durov — Telegram→TON convergence, MTONGA announcement, policy/regulation stance |
| [@tonblockchain](tonblockchain/) | 218 | 2020-05 → 2024-06 | EN | TON Foundation official (early years, until June 2024 — channel went silent after that) |
| [@tonstatus](tonstatus/) | 209 | 2021-11 → 2026-05 | EN | Validator/operator-facing operational announcements — slashing, hardware reqs, governance votes |
| [@tondev_news](tondev_news/) | 250 | 2022-12 → 2026-05 | EN | Developer news — TVM opcodes, MyTonCtrl, Retracer, gasless ops, Bot API changelogs |
| [@resistancetools](resistancetools/) | 22 | 2025-10 → 2026-04 | EN | Digital-resistance tooling (TONNET Browser, ZK Resistor, garlic routing) — direct alignment with kit's positioning |

**Total**: 7 channels, 1,292 posts.

## Captured at

2026-05-10. One-shot archive. Re-run `scripts/scrape-tg-channel.py <channel> <out_dir>`
(currently in `/tmp/scrape_tg_channel.py`) to refresh.

## Limitations

`t.me/s/` preview path captures:
- Text body, formatting, links, link previews
- Photo CDN URLs (image is publicly hostable from telesco.pe)
- Author / datetime / view count / forwarded-from / reply-to

It does **not** capture:
- Native videos / audio files / documents (only references)
- Comments (linked discussion groups need separate capture)
- Reactions
- Edits history

For full fidelity, use MTProto (telethon / gramjs / pyrogram) — but that requires a
user-level Telegram account credential pair from my.telegram.org.

## Why these 7 channels

The set covers the layers a sovereign-deploy-kit reader would need to track:

1. **Strategy / policy** — `@durov` (Telegram CEO's view of the TG-TON stack)
2. **Foundation announcements** — `@tonblockchain` (legacy) → likely successor `@toncoin` (not archived)
3. **Core team output** — `@toncore` + `@anatolii_makosov` (team channel + personal commentary)
4. **Operational / validator** — `@tonstatus`
5. **Developer ecosystem** — `@tondev_news`
6. **Digital-resistance application layer** — `@resistancetools`

## Next channels to consider (not yet archived)

- `@toncoin` — likely successor to `@tonblockchain`, the consumer-facing official feed
- `@tolk_lang` — Tolk language deep-dive (Aleksandr Kirsanov)
- `@toncenter_news` — Toncenter API changes (Streaming API V2 etc.)
- `@telegram` — Official Telegram product blog channel
- `@ResistanceForum` — community side of @resistancetools
