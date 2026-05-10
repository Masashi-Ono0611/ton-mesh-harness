# @anatolii_makosov — Telegram Channel Archive (English Translation)

- Source: https://t.me/anatolii_makosov
- Channel description: "Programmer. Co-founder of The Open Network @toncoin and TON Core @toncore. English: https://x.com/anatoly_makosov"
- Captured: 2026-05-10
- Total posts: 109
- Period: 2024-03-12 → 2026-05-06
- Original language: Russian (translated to English; original text in `anatolii_makosov-posts.md`)

> **Translation notes:** Technical terms (TON, jetton, shardchain, masterchain, validator, smart-contract, Catchain, TVM, TON DNS, TON Storage, etc.) preserved as-is. Names of Telegram channels left as `@handle`. Inline links preserved. Emoji-only posts kept as emoji-only.

---

## [1] 2024-03-12T10:58:36+00:00
- Permalink: https://t.me/anatolii_makosov/1

Channel created.

---

## [4] 2024-03-12T11:01:45+00:00
- Permalink: https://t.me/anatolii_makosov/4
- Views: 33.9K

Hi!

My name is Anatolii, I work on [TON](https://ton.org/).

If we don't know each other, you may find the following interview useful: https://t.me/ruton/160

**Link preview** — Русский TON: *"Exclusive interview with the technical lead of TON. Anatolii Makosov is one of the developers thanks to whom TON exists in its current form. We talked about the core team, the Binance listing, AI, insider info, and plans for the future."*

---

## [5] 2024-03-12T11:01:45+00:00
- Permalink: https://t.me/anatolii_makosov/5
- Views: 62.2K

This interview was made about a year ago. I'll note that absolutely everything that was said has come true. Including even the prediction about leadership change in the crypto industry in the answer about Binance.

We confirmed the [technical superiority of TON](https://t.me/tonblockchain/217) and are actively moving toward [mass adoption](https://t.me/tonblockchain/213).

[@wallet](https://t.me/wallet) received many updates, including launching the non-custodial wallet [TON Space](https://t.me/wallet_news_cis/168) with a built-in [crypto-swap](https://t.me/wallet_news_cis/209) on decentralized exchanges. Developers got the ability to create [web-applications](https://ton.org/en/mini-apps) inside Telegram and link them to [@wallet](https://t.me/wallet).

Every product in the ecosystem has evolved, and [TON Connect](https://blog.ton.org/ton-connect-the-future-without-passwords) became the connecting link between them.

A [deflation mechanism](https://t.me/tonblockchain/199) (burning part of network fees) was introduced, and in December we reached, for the first time, a validation round in which more coins were burned than created. Liquid staking was launched ([tonstakers.com](http://tonstakers.com/), [@stakee](https://t.me/stakee)), the [TON Storage torrent client](https://github.com/xssnick/TON-Torrent?tab=readme-ov-file#getting-started) was completed, and Tonkeeper started opening [.ton sites](https://t.me/tonkeeper_ru/59).

The Core team was joined by new developers, exactly along the principles that were declared: Andrey won all FunC contests, Maksim created excellent TON tools for Python.

We also took steps toward publicity: the first step was this interview itself, then Kirill Alder ran a live broadcast of the [world record](https://www.youtube.com/watch?v=jWWl1sLGY7s), and Kirill Emelyanenko and Alex Melman spoke at [Gateway](https://www.youtube.com/watch?v=vsAyfdmt374).

---

## [6] 2024-03-25T16:11:50+00:00
- Permalink: https://t.me/anatolii_makosov/6
- Views: 93.1K

We wrote another bulletproof contract. **$100,000** if you manage to find a potential vulnerability.

https://t.me/toncontests/158

**Link preview** — TON Contests: *"Smart Contract Cracking Competition - Jetton With Governance. Prize fund: Up to 20,000 TON (more than $100,000 at the moment). Deadline: 18:00 on April 1st (UTC). Who can participate: Everyone."*

---

## [7] 2024-04-01T15:59:01+00:00
- Permalink: https://t.me/anatolii_makosov/7
- Views: 37.2K

Right now in TON we have a great host and interesting contests — a series of events called The Open League has begun, with a prize fund of $115 million 🤑.

You can earn a reward if you are an active user or an active developer.

I think everyone will be able to find something interesting for themselves.

Details will be in [@toncoin_rus](https://t.me/toncoin_rus).

---

## [8] 2024-04-01T16:39:47+00:00
- Permalink: https://t.me/anatolii_makosov/8
- 1 photo
- Views: 82.7K

On [tonstat.com](http://tonstat.com/) you can see how the graphs are taking on an exponential shape.

A reminder: the goal is 500 million monthly active users of TON in 5 years. This is a goal we are genuinely striving for. A very ambitious idea — a number several times larger than the entire current crypto audience.

Of course, many complex challenges, including technical ones, remain to be solved.

Nonetheless, The Open Network has good technology, a strong team, talented developers and an energetic community. Plus integration with Telegram. It looks quite achievable.

---

## [9] 2024-04-06T09:26:24+00:00
- Permalink: https://t.me/anatolii_makosov/9
- Views: 40K

A new smart-contract.

Same conditions: find a vulnerability — get **~$100,000**.

https://t.me/toncontests/163

**Link preview** — TON Contests: *"Smart Contract Cracking Competition - Multisig 2.0. Prize fund: Up to 20,000 TON. Deadline: 12:00 on April 10 (UTC)."*

---

## [11] 2024-04-11T08:19:17+00:00
- Permalink: https://t.me/anatolii_makosov/11
- Views: 206K

*(no text — media-only post)*

---

## [12] 2024-04-16T11:09:21+00:00
- Permalink: https://t.me/anatolii_makosov/12
- Views: 49.1K

TON has always been known for its low and affordable network fees.

Fees in TON are fixed (in Toncoin) and do not depend on network load in any way. However, given the rise in Toncoin's price, they are no longer that low when converted to dollars.

We did some preparatory work in advance for this case:

1) The cost of fees is a parameter in the blockchain configuration. With a network-wide validator vote, this parameter can be lowered. This will reduce the cost of all transactions both in Toncoin and in dollars. This functionality has been tested on testnet.

Fee income is not the major part of validator income, plus 50% of fees are burned.

2) We formulated a simple [guideline](https://t.me/tondev_news/102) for smart-contract developers about how to act in conditions of fee reductions, and added the necessary [opcodes to TVM](https://t.me/tondev_news/101) in advance.

3) In addition, we developed a new [precompiled](https://t.me/tondev_news/99) technology that will further reduce network fees for the most popular smart-contracts.

4) Finally, developers can use [libraries](https://t.me/tondev_news/97) for smart-contracts to optimize their decentralized products.

---

## [13] 2024-04-22T11:49:57+00:00
- Permalink: https://t.me/anatolii_makosov/13
- Views: 21K

I started programming at age 10. CS classes started at school, which captivated me. I didn't have my own computer at the time, so I often started coming after lessons to the school class consisting of a dozen i386s with BASIC and Turbo Pascal installed.

The first project was a "Battleship" game, which took about a year to implement. What I was doing during that whole year — it's not really clear.

That same year I went to a programming olympiad for the first time, held at the local university. Some problems I solved myself, others — completely legally — I copied from a book I brought with me. (Note for ultra-young readers: at that time the internet was not yet widespread and programming books were a more popular source of information.) Then I got on the bus and immediately forgot about the event.

A month later, in the school cafeteria, a teacher caught me, said I had taken first place, and gave me a cardboard medal. There was talk that some problems had been solved in unexpected ways. I think this was about that piece of code I copied from the book.

As far as I remember, from that moment until I finished school, I would invariably visit the university once a year and win something. The fact that this should have continued in the form of regional and international olympiads — somehow it didn't occur to me, and the teachers, apparently, didn't have time for it. Whether I would have reached a good level, or failed at the next stage — history is silent.

[#memories](?q=%23memories)

---

## [14] 2024-05-08T10:53:22+00:00
- Permalink: https://t.me/anatolii_makosov/14
- Views: 20.9K

🔉 Took part in the technical podcast of Oleg Andreev and Denis Subbotin.

We talked about TON's successes in the first quarter of this year and plans for the near future.

https://t.me/tonpizdev/43

**Link preview** — TON PIZ: *"Guest: Anatolii Makosov @opensource, tech lead of TON Core. 1:19 TON growth, 9:38 fee reduction, 15:54 Tolya's real name, 18:00 about spam, 21:25 encrypted question, 24:19 call and agitation, 28:50 blockchain acceleration, 30:08 fines, 33:50 peskar vision pro, 34:48 mass adoption..."*

---

## [15] 2024-05-19T19:58:55+00:00
- Permalink: https://t.me/anatolii_makosov/15
- Views: 16.1K

I'd really like to ||set fewer records||, but right now there's no choice.

**USDt**

In less than a month, the amount of USDt issued on TON has exceeded 200M. It's already 330M.

The launch of USDt on TON became the most successful in Tether's history, setting a [record](https://x.com/ton_blockchain/status/1786359084653973835) for stablecoin distribution speed.

**Pantera Capital**

The American venture fund Pantera Capital [announced](https://panteracapital.com/blockchain-letter/ton-our-largest-investment-ever/) that it has made a record investment in TON.

The size of the investment is not disclosed, but earlier Pantera Capital invested more than $250M in Solana.

[Anyway](https://blog.ton.org/100000-transactions-per-second-ton-sets-the-world-record-on-its-first-performance-test), Solana is used to being in second place 😏

**Notcoin**

Despite popular belief that no blockchain could withstand the minting of Notcoin with its 35-million audience — we did the work on the bugs after the [inscriptions](https://t.me/opensource/s/45) in December and accepted the challenge. On May 16, the minting of Notcoin took place on the TON blockchain with simultaneous listing on the largest exchanges, including Binance.

A number of exchanges and wallets had problems, but the blockchain operated stably.

In the first 30 hours alone the blockchain gained [a million Notcoin holders](https://www.tonstat.com/) and 8 million transactions. At the same time, other activity was happening on the blockchain: an increased number of swaps on DEXes, on-chain swaps of Notcoin NFT vouchers for tokens, etc. On that day, even the [start](https://t.me/toncoin_rus/1222) of a new Open League season was not delayed.

---

## [16] 2024-05-25T18:59:27+00:00
- Permalink: https://t.me/anatolii_makosov/16
- Views: 9.85K

I recommend paying attention to the following signs of approaching mass adoption:

---

## [17] 2024-05-25T18:59:27+00:00
- Permalink: https://t.me/anatolii_makosov/17
- 2 photos
- Views: 27.7K

**Crypto card from TonWhales (in development)**

You can top up Toncoin and USDT on TON, add to Apple Pay and pay in stores. Integrated into the Tonhub wallet.

Notably, your account is built as a smart-contract, so you can set on-chain withdrawal limits — the banking system does not have direct access to all of your funds.

I hope the TonWhales team will overcome all legal and regulatory hurdles and we'll see this product released in the foreseeable future.

---

## [19] 2024-05-25T18:59:27+00:00
- Permalink: https://t.me/anatolii_makosov/19
- 2 photos
- Views: 16.4K

**Battery in the Tonkeeper wallet**

Lets you perform blockchain operations (e.g., sending USDT) without having Toncoin for network fees.

The battery is recharged with an ordinary in-app purchase on AppStore and GooglePay.

In my view, this is the freshest UI/UX solution in the entire crypto industry. The previous UX breakthrough was [@wallet](https://t.me/wallet) appearing in Telegram. By the way — has anyone seen any fresh UX solutions in other blockchains over the past few years? 😈

---

## [21] 2024-07-04T12:03:14+00:00
- Permalink: https://t.me/anatolii_makosov/21
- Views: 13.7K

**June TON 2024.06 update**

As you know, this year the TON blockchain is rapidly growing on all metrics, and we started to feel some turbulence in this trip to the moon. Under certain types of load, new block production time wasn't always meeting expectations, which made some user operations take indecently long. Of course, not as long as on outdated blockchains — but still not meeting our criteria.

Through collective effort, we managed to release update [TON 2024.06](https://github.com/ton-blockchain/ton/releases/tag/v2024.06) containing important fixes both for block production and for delivery of new messages to the blockchain. After three weeks, we can objectively say that the network's behavior under growing load has become substantially more stable.

In the next July release we will continue work on network stability and security.

---

## [22] 2024-07-04T12:03:15+00:00
- Permalink: https://t.me/anatolii_makosov/22
- Views: 18.2K

**New wallet smart-contract 5.0**

The TON Core team has finished the code of the new wallet smart-contract version 5.0, or "w5" for short. The concept and initial code of this wallet were proposed and implemented by the Tonkeeper team.

New functionality:

— **"Gasless" operations.** The ability to perform an action by paying network fees with USDt or NOT.

— Up to **255 operations at once**. For example, the ability to renew all your TON domains in a single batch.

— Optimized network fees.

The ability to extend wallet functionality with plugins of a new format:

— Decentralized subscriptions, including USDt subscriptions.
— Two-factor authentication.
— Wallet freeze in case its key is compromised.
— Recovery of a forgotten key.
— Other features.

It's also worth noting the increased security — the smart-contract tries to protect your funds even if wallet-app developers made a technical mistake.

After thorough testing, we invite everyone to participate in a [contest](https://t.me/toncontests/171) to find bugs in this smart-contract, with a prize fund of up to $100,000.

We invite TON wallet developers to support this smart-contract in your products — we can't wait to use the new capabilities in practice.

https://github.com/ton-blockchain/wallet-contract-v5/

---

## [23] 2024-07-05T15:48:47+00:00
- Permalink: https://t.me/anatolii_makosov/23
- Views: 8.01K

**Ledger**

I find the story of how TON support appeared in the [Ledger](https://www.ledger.com/) hardware wallet entertaining.

The first version of the TON app for Ledger was written in record time back in [2021](https://t.me/tonblockchain/16).

For the app to make it into the Ledger catalog and become available to users, it has to pass review on Ledger's side. For unexplained reasons, this review stopped before it had even started. Numerous attempts to resume the process were unsuccessful.

In 2022 the [TON Whales](https://tonwhales.com/) team made their own variant of the TON app for Ledger and got slightly further in the review process — but also couldn't make it to release.

Finally, in 2023, the [TonTech](https://ton.tech/) team developed a third variant of the app and got the job done — release happened in December.

This story of collective persistence is somehow reminiscent of the timeline of the entire TON project.

---

## [24] 2024-07-05T15:48:47+00:00
- Permalink: https://t.me/anatolii_makosov/24
- Views: 10.7K

**Ledger 2.1.0**

This week the [TonTech](https://ton.tech/) team released a major update of TON for Ledger: many improvements, including support for NFTs and staking. There also appeared a controversial — but, it seems, currently necessary — Blind Sign feature, allowing almost any action to be performed.

An impressive list of new functionality is [here](https://github.com/LedgerHQ/app-ton-new/pull/8).

Hurry to open [MyTonWallet](https://mytonwallet.io/) — you can finally interact with the NFTs that you, despite all warnings, sent to your hardware wallet.

||At least they were perfectly safe all this time.||

---

## [25] 2024-07-05T15:48:48+00:00
- Permalink: https://t.me/anatolii_makosov/25
- Views: 11.1K

If we talk about the future, I won't be surprised if popular Apple and Android mobile phones acquire a built-in hardware crypto wallet.

In essence, the encrypted keychain on a mobile device is already similar to a hardware wallet.

What remains is to physically isolate this segment and give it priority access to the screen.

---

## [26] 2024-07-05T15:48:48+00:00
- Permalink: https://t.me/anatolii_makosov/26
- Views: 29.6K

If we talk about a slightly more distant future, then obviously your private key will be located right in your brain. This is the most suitable place where the key is hardest to steal or lose.

---

## [27] 2024-07-06T14:59:43+00:00
- Permalink: https://t.me/anatolii_makosov/27
- Views: 16.9K

The number of validators reached 389; the amount of coins participating in validation has exceeded 610M TON ($4.5 billion, more than 10% of total Toncoin emission). A reminder that this sum guarantees the correct operation of the network.

A [vote](https://t.me/tonstatus/115) was held to raise gas consumption limits on the Elector, so that there's enough room for more validators.

---

## [28] 2024-07-08T17:52:18+00:00
- Permalink: https://t.me/anatolii_makosov/28
- 1 photo
- Views: 13.4K

❗️ **Messari: number of daily active addresses on TON exceeded the number of active addresses on ETH**

Solana next 😏

⚡️ [Cryptogram](https://t.me/+iwY8ardPSGozNzdk) 👾
Exchanges: [ByBit](https://partner.bybit.com/b/Cryptogo_pro), [BingX](https://bingx.com/invite/EVI8JC), [OKX](https://www.okx.com/join/16675258)

---

## [29] 2024-07-08T17:52:20+00:00
- Permalink: https://t.me/anatolii_makosov/29
- Views: 13K

https://t.me/tondev/102378

**Link preview** — Tolya in TON Dev Chat (RU): *"Isn't it obvious to anyone that TON will inevitably surpass Ethereum in active users? I won't be surprised if it happens already next year 😏"*

---

## [30] 2024-07-15T17:31:33+00:00
- Permalink: https://t.me/anatolii_makosov/30
- Views: 48.4K

**TON Core ≠ TON Foundation**

I want to emphasize: the TON Core team is not TON Foundation.

In the early days of the TON community, the name "TON Foundation" came to refer to the circle of enthusiasts making a significant contribution to the project's development. There was no legal entity, nor even a formal list of participants. If such a list had existed, it would have been changing constantly: some lost interest in TON, others, on the contrary, joined the work. The TON Core team was, obviously, among the active developers of the network.

Now, [TON Foundation](https://ton.foundation/) is a non-profit organization registered in Switzerland with quite specific members. The Swiss TON Foundation handles the popularization of TON, but not its development.

TON Core is still an independent group of top programmers. At the moment we are not members of any organization, and we live in different parts of the world. Sometimes we [meet up](https://t.me/opensource/s/39) on the top floor of Palm Tower. Together with the open-source community, we continue to work on the technical part of TON as before 🫡

---

## [31] 2024-07-20T12:31:58+00:00
- Permalink: https://t.me/anatolii_makosov/31
- Views: 11.1K

*(no text — media-only post)*

---

## [32] 2024-07-20T13:14:54+00:00
- Permalink: https://t.me/anatolii_makosov/32
- 2 photos
- Views: 18.1K

I don't want to brag, but here's my [Losyash](https://getgems.io/nft/EQCrRTOUo5NeorGUSTZXKRW3kLMbRGBxrYad9ycVM_2h8epv) and [Kar-Karych](https://getgems.io/nft/EQAz723As-ujiDEAmt6orXid3wUt_tgfHVsM9US9XE0LjYpb).

*(Note: Losyash and Kar-Karych are characters from the popular Russian animated series Smeshariki / Kikoriki.)*

---

## [34] 2024-07-20T15:09:21+00:00
- Permalink: https://t.me/anatolii_makosov/34
- 1 photo
- Views: 14K

Continuing to explore the [new arrivals](https://t.me/tondating) in the ecosystem.

---

## [35] 2024-07-20T17:51:44+00:00
- Permalink: https://t.me/anatolii_makosov/35
- 1 photo
- Views: 25K

*(Original posted in English):* So many girls don't like Solana because it has a monolithic architecture incapable of horizontal scaling 😎😜

---

## [36] 2024-07-25T10:12:35+00:00
- Permalink: https://t.me/anatolii_makosov/36
- Views: 59.5K

**TON-sites**

You should prepare in case Telegram, in an upcoming update, becomes a full-fledged TON browser and learns to open TON-sites.

Useful links:

**Introduction**

A refresher on what this technology is and what it's for:
https://telegra.ph/TON-sajty-TON-WWW-i-TON-proksi-09-22

**Run your own TON-site**

To run your own TON-site, you need to spin up a web-server and a reverse-proxy.

There are two reverse-proxy implementations: in C++ and in [Golang](https://github.com/tonutils/reverse-proxy) by Oleg Baranov. The Golang one is even more stable.

[Documentation »](https://docs.ton.org/develop/dapps/tutorials/how-to-run-ton-site)

**Visit a TON-site**

Popular TON wallets support opening TON-sites — for example, mobile [Tonkeeper](https://tonkeeper.com/) or the browser extension [MyTonWallet](https://mytonwallet.org/).

You can also install the standalone [TON Proxy app](https://github.com/xssnick/Tonutils-Proxy) by Oleg Baranov.

There's a service [ton.website](http://ton.website/) that lets you open TON-sites in a browser.

**Add TON-site support to your product**

For this, you need to embed a local entry-proxy in your product.

There's a ready-made library and examples of its use for [Android](https://github.com/andreypfau/tonutils-proxy-android-example) and [iOS](https://github.com/ton-blockchain/ton-proxy-swift).

Public entry-proxies were launched purely for familiarization — please don't use them.

**TON DNS**

TON-sites use TON DNS. You can purchase a domain at [dns.ton.org](http://dns.ton.org/), at NFT marketplaces like [getgems.io](http://getgems.io/), or at [ton.diamonds](http://ton.diamonds/).

**TON Connect**

You can log in and interact with the site via [TON Connect](https://docs.ton.org/develop/dapps/ton-connect/overview), which has improved significantly recently.

**TON Storage**

TON-sites can be hosted via [TON Storage](https://telegra.ph/TON-Storage-12-28), but more on that next time...

---

## [37] 2024-08-01T09:44:43+00:00
- Permalink: https://t.me/anatolii_makosov/37
- Views: 52.1K

Punycode in TON DNS is **not** planned for support, because it's a playground for phishing and fraud:

Try to tell [notcoin.ton](http://notcoin.ton/) apart from nоtcoin.ton (in the latter, the "о" is a Russian letter).

Not to mention 😗 and 😙.

There's no point in buying punycode domains.

---

## [38] 2024-08-02T20:58:27+00:00
- Permalink: https://t.me/anatolii_makosov/38
- Views: 25.9K

Suggest a name for a programming language on TON.

— in English;
— easy and unambiguous to read;
— not widely used anywhere else;

For the best three options on Monday I'll give 100 TON each. If there are no good options, I won't give anything.

https://t.me/suggest_lang_name

---

## [39] 2024-08-08T10:28:57+00:00
- Permalink: https://t.me/anatolii_makosov/39
- Views: 23.2K

🍌

---

## [40] 2024-08-12T09:49:55+00:00
- Permalink: https://t.me/anatolii_makosov/40
- Views: 15.4K

**TON 2024.08 update**

Regular [core update](https://t.me/tondev_news/141). As promised, we improved security — protection of the network against certain types of attacks. Performance was also improved — in particular, Mikhail SpyCheese managed to speed up state serialization from 18 hours down to 50 minutes (!).

All validator and lightserver owners should definitely update.

[A reminder](https://t.me/tonstatus/102) that validators should have at least 128GB of RAM.

**MyTonCtrl 2.0**

It seemed that this Python code, written in a single file by Igroman in 2020, was perfect from the start and didn't need any improvement.

However, the unbelievable happened — the major version [MyTonCtrl 2.0](https://t.me/tondev_news/139), a complete refactoring of the code with many improvements, fixes and new functionality.

In addition, the [documentation](https://docs.ton.org/participate/run-nodes/mytonctrl) about MyTonCtrl and about running TON nodes in general was substantially updated.

**Retracer**

Made an open-source [tool](https://retracer.ton.org/) for developers, showing the stacktrace of a failed transaction in a web interface. Developers can use it in everyday life until explorers integrate this directly into their UI.

---

## [41] 2024-08-25T10:13:20+00:00
- Permalink: https://t.me/anatolii_makosov/41
- 1 photo
- Views: 71.6K

The Telegram and TON projects aren't about technology — they're about people fighting for freedom. Telegram gives people freedom of communication; TON gives them freedom of value exchange. Both teams are committed to this mission, despite how hard it is in today's world.

In 2019 the SEC blocked Telegram from launching its own cryptocurrency, but the TON technology was carried forward by the community. Ultimately this made TON more autonomous, decentralized, and resilient.

It's clear to everyone that Pavel Durov has been detained on completely fabricated grounds. The Telegram team has a ready-made protocol of action for cases like these.

The history of the Telegram and TON projects, the obstacles already overcome, indicates that all challenges will be overcome.

✉️

---

## [42] 2024-08-28T08:51:38+00:00
- Permalink: https://t.me/anatolii_makosov/42
- Views: 55.5K

These days the initial minting and listing of coins from the gaming project DOGS https://t.me/dogshouse_bot is taking place — with **50 million (!) monthly active users**.

Such scales have never been seen, not only by TON, but by the entire crypto industry. The world's largest exchanges — Binance, OKX, Bybit — went down on the first day.

The scales are growing rapidly: in May Notcoin's airdrop and listing happened with ~25M MAU; today DOGS with 50M MAU; and still ahead of us are gaming giants TapSwap (56M users), Hamster Kombat (239M (!) users) and other projects.

These are impressive numbers even by Web2 standards. The TON community are true pioneers.

Only those who do nothing have no problems. Tonight there was network downtime; the network is restored. We see places that should be improved and we're working on them. There will be updates this week.

**Link preview** — *DOGS bot: "The most Telegram-native memecoin. Join our @dogs_community"*

---

## [43] 2024-08-30T14:35:17+00:00
- Permalink: https://t.me/anatolii_makosov/43
- Views: 50K

Specific actions:

**1. COIN MINTING METHOD**

**Problem**

Notcoin used mass distribution of coins to its users. In DOGS, a mechanism where the user themselves claims their coins was tested. The technical setup of this process turned out to be not the most optimal. Many extra transactions are created that wouldn't otherwise be there. The number of users is already record-breaking, and this multiplied the load several times over.

**Solution**

Yesterday DOGS switched to mass distribution.

**Further improvement**

For the next projects we have invented a new technology — [TON Mintless Jetton](https://github.com/ton-blockchain/TEPs/pull/177/files). Besides reducing network load, it allows distributing coins to hundreds of millions of users and radically reduces projects' network spending on the initial mint. Detailed information about Mintless in subsequent posts.

**2. VALIDATORS**

**Problem**

Some validators still work poorly. It also took many hours to wait until the majority of validators applied an emergency update.

**Solution**

A request to validators to update their contacts: https://t.me/toncoin/1498

Obviously, the decentralized fines system for weak validators needs to be improved.

We've improved how complaints are submitted in the existing fines system. On Monday we'll publish the necessary documentation and announce the date when fines will start working in full force.

Validators, please review https://t.me/tonstatus/133 for the requirements and guidelines to avoid fines.

If you don't want to deal with this, you can use staking https://ton.org/en/stake.

**Further improvement**

The decentralized fines system will receive further development: the method for identifying weak validators will be improved, the size of fines will be increased.

**3. DEXes**

**Problem**

Some decentralized exchanges in TON have a central smart-contract that participates in all operations. This creates a bottleneck.

**Solution**

Earlier such smart-contracts could negatively affect the entire network — after the latest TON 2024.08 update, this only slows down the specific service.

**Further improvement**

A recommendation for blockchain developers: try to avoid single central points in your smart-contract systems, distribute smart-contracts and their interactions with each other as much as possible. Use the design of jetton-wallet and nft-item as a reference.

[Dedust.io](http://Dedust.io/) DEX looks the best in terms of contract architecture.

**4. VALIDATOR MISCONFIGURATION**

**Problem**

The validator parameters state-ttl 3600 and --catchain-max-block-delay 0.4 don't work optimally under such load. The new recommended values are state-ttl 86400, --catchain-max-block-delay 0.5.

**Solution**

The parameters have already been corrected in the updates of the past few days.

**CONCLUSION**

The TON community has the honor of being pioneers and being on the front line of the blockchain industry.

[SHIBA INU](https://etherscan.io/token/0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce) on Ethereum, one of the most popular memecoins, has 1.4M holders and 13.4M operations. These are the numbers over 4 years, since its appearance in 2020.

Projects like DOGS reach comparable numbers in the first few days of their launch on the TON blockchain.

---

## [44] 2024-09-01T14:59:52+00:00
- Permalink: https://t.me/anatolii_makosov/44
- 1 video
- Views: 13.8K

According to [token terminal](https://tokenterminal.com/terminal/projects/the-open-network) data, on Thursday we reached **1.1 million** daily active on-chain users (DAU).

A reminder that since the start of the year:

The number of smart-contracts has grown **13×**.

MAU (monthly active users) — by **24×**.

https://www.tonstat.com/

---

## [45] 2024-09-01T14:59:59+00:00
- Permalink: https://t.me/anatolii_makosov/45
- 1 photo
- Views: 16.3K

**1 billion transactions on TON 🚀**

Half of them happened in the last 100 days.

https://tonscan.org/blocks

---

## [46] 2024-09-01T15:31:03+00:00
- Permalink: https://t.me/anatolii_makosov/46
- Views: 13.8K

And according to TON API data — already 1.3 billion transactions; we missed the anniversary, it seems 😁

---

## [47] 2024-09-02T17:41:33+00:00
- Permalink: https://t.me/anatolii_makosov/47
- 2 videos
- Views: 16.5K

The fines system for poorly performing validators will start working at full strength next Monday, September 9.

In the coming days we'll provide additional tools to make it easier for you to assess whether your validator is working well.

If you meet the [hardware requirements](https://t.me/tonstatus/102) and [guidelines](https://t.me/tonstatus/133), then you're OK.

https://t.me/tonstatus/134

---

## [48] 2024-09-16T11:37:59+00:00
- Permalink: https://t.me/anatolii_makosov/48
- Views: 105K

**TON Mintless Jettons**

Introducing the new TON Mintless Jetton technology. This is a jetton that can be instantly distributed to hundreds of millions of users on the TON blockchain, with network fee costs being less than a dollar. The user's right to ownership of their coins is guaranteed by cryptography and a smart-contract.

As an example, we created a test jetton — [Mintless Points](https://tonviewer.com/EQD6Z9DHc5Mx-8PI8I4BjGX0d2NhapaRAK12CgstweNoMint) (purely for testing, has no other value) — and distributed it to 18 million wallets on the TON mainnet.

This jetton is compatible with regular jettons on TON. The only difference is that the smart-contract is created not in advance, but during the user's first action.

Popular TON ecosystem products such as Tonkeeper, MyTonWallet, Tonviewer, [Tonscan.org](http://Tonscan.org/), TON API, and Toncenter have announced that they will support Mintless Jetton technology in the near future.

We urge all ecosystem products and services to also consider integration.

On September 26, the well-known gaming project Hamster Kombat will apply this technology during their coin distribution. Given Hamster Kombat's gigantic audience, this event has every chance of becoming the largest airdrop in cryptocurrency history.

[Description »](https://gist.github.com/EmelyanenkoK/bfe633bdf8e22ca92a5138e59134988f)

[Standard »](https://github.com/ton-blockchain/TEPs/pull/177/files)

[Smart-contract »](https://github.com/ton-community/mintless-jetton)

---

## [49] 2024-09-16T16:55:50+00:00
- Permalink: https://t.me/anatolii_makosov/49
- Views: 12.1K

✅ Update [TON 2024.09](https://github.com/ton-blockchain/ton/releases/tag/v2024.09) with fixes and optimizations.

✅ Restart of [fines](https://t.me/tonstatus/134) for poorly performing validators.

✅ [Mintless Jettons](https://t.me/anatolii_makosov/48) technology.

---

## [50] 2024-09-16T16:55:59+00:00
- Permalink: https://t.me/anatolii_makosov/50
- Views: 16.1K

**Next challenge**

✅ May 2024 — Notcoin — 20 million MAU

✅ August 2024 — DOGS — 50 million MAU

😱 September 2024 — Hamster Kombat — 100 million MAU

A grand event will soon take place — the initial coin distribution of the gaming project Hamster Kombat on the TON blockchain. Users will be able to receive coins to their blockchain wallets. On the same day, Hamster will be listed on the world's largest exchanges, such as Binance, OKX and Bybit.

Hamster Kombat has already attracted an incredible audience even by Web2 standards — over 239 million players, of whom roughly 100 million play actively each month.

These figures are comparable in scale to the entire crypto industry, and no blockchain event has previously gathered such a number of users.

Each such event is a step forward in the development of blockchain technologies. Earlier in TON, successful mintings of Notcoin (~20M MAU) and DOGS (~50M MAU) were already conducted. Of course, things don't always go perfectly, but we learn from our mistakes and move on. The TON Core team closely watches the situation and is ready to react to any changes.

The team, validators, and product/service developers are now finishing the final preparations before this landmark moment. The TON community, remaining pioneers, continues to pave the way for mass adoption of cryptocurrencies.

---

## [51] 2024-09-16T17:07:24+00:00
- Permalink: https://t.me/anatolii_makosov/51
- Views: 20.6K

A question to the new The Open League season and to gaming projects who are planning their minting 3 days before Hamster Kombat — do you really think that 239 million users isn't enough, and another ten million should be added on top? 😅

---

## [52] 2024-09-19T20:56:24+00:00
- Permalink: https://t.me/anatolii_makosov/52
- 1 video
- Views: 22.1K

**TGE schedule for the week** (so as not to forget)

**September 20** — Catizen [@CatizenAnn](https://t.me/CatizenAnn) (19M MAU).

**September 23** — Rocky Rabbit [@rockyrabbitio](https://t.me/rockyrabbitio) (18M MAU) + WatBirds [@gameechannel](https://t.me/gameechannel) (12M MAU).

**September 26** — Hamster Kombat [@hamster_kombat](https://t.me/hamster_kombat) (100M MAU).

---

## [53] 2024-09-22T19:14:36+00:00
- Permalink: https://t.me/anatolii_makosov/53
- 1 photo
- Views: 28K

Crossed **10 million** monthly active wallets 🤘

https://tonstat.com

---

## [54] 2024-09-27T13:40:22+00:00
- Permalink: https://t.me/anatolii_makosov/54
- Views: 41.8K

Gaming projects Catizen, Rocky Rabbit, WatBirds, and Hamster Kombat have minted coins on the TON blockchain and conducted listings on exchanges.

It's too early to draw technical conclusions: the user influx is so large that the hype is not only persisting, but will likely continue to grow in the coming days.

In Hamster Kombat, the Mintless Jetton technology was applied for the first time. Everything went successfully. Notably, the majority of users had not specified their TON wallet address in advance, so only about 10 million of them received coins via this new method. The rest receive their coins by claiming them themselves from a special smart-contract.

Despite the heavy load, the TON blockchain continued to stably produce blocks and process transactions. At the moment of the Hamster Kombat launch, there were initially failures in the backends of some wallets, services, and exchanges (including Binance) — evidence of unprecedented infrastructure load. However, all services were quickly restored.

A reminder that these gaming projects have multi-million-strong audiences, and 131 million users are participating in the Hamster Kombat airdrop.

TON is the only blockchain that can, in principle, handle events of this scale.

We are watching the situation. Next week there will be more interesting numbers and statistics.

---

## [55] 2024-09-30T11:10:57+00:00
- Permalink: https://t.me/anatolii_makosov/55
- Views: 21.1K

https://decrypt.co/283507/hamster-kombat-billion-trading-ton-airdrop

**Link preview** — Decrypt: *"'Hamster Kombat' Token Tops $1 Billion in Trading as TON Survives Massive Airdrop. The biggest crypto game on Telegram didn't crash The Open Network, despite concerns that Hamster Kombat airdrop demand would cause issues."*

---

## [56] 2025-01-08T16:44:46+00:00
- Permalink: https://t.me/anatolii_makosov/56
- 6 photos, 1 video
- Views: 15.6K

**Happy New Year!**

In December and January I spent time in several unusual places located in the middle of the desert.

The static and minimalistic landscape, plus the relative remoteness from civilization, helped me unplug a bit and refresh my head.

In 2024, there were many events: both grand successes and new problems we sought solutions to. In subsequent posts I'll publish a TON Core report on what was done in the past year and our plans for 2025.

---

## [63] 2025-01-18T13:42:18+00:00
- Permalink: https://t.me/anatolii_makosov/63
- Views: 14.5K

**"Should Have Bought": where TON is heading, AI-tokens, and 16 years since the first Bitcoin transaction**

🎙 A new episode of our news podcast "Should Have Bought" is now available on all platforms! Special guest: TON's technical lead Anatolii Makosov.

0:07 — Guest of the episode: Anatolii Makosov
01:35 — Main TON ecosystem events of 2024
02:43 — Plans for 2025
03:32 — How Durov's arrest affected development
04:20 — 130 million smart-contracts on TON
05:20 — The trend toward AI tokens
08:57 — Can AI be used in development?
09:19 — Announced ecosystem updates
14:31 — USDT on TON
17:40 — Technical interaction between Tether and TON teams
20:30 — How many validators are on the network? How to become a validator
22:35 — About network outages
26:40 — What hardware does a validator need?
29:25 — Layer 2 on TON
35:22 — How the team's work process is organized
39:55 — Are Satoshi's principles still alive?

[Materials on the website](https://forklog.com/news/nado-bylo-pokupat-kuda-idet-ton-ii-tokeny-i-16-let-pervoj-bitkoin-tranzaktsii)

Subscribe to the podcast:

🍏 [Apple Podcasts](https://podcasts.apple.com/us/podcast/...)
🎧 [Spotify](https://open.spotify.com/show/5RvP1iutmrT4D0LyWiOkAG)
👂 [Yandex.Music](https://music.yandex.ru/album/29567644)
🎥 [YouTube](https://www.youtube.com/@forklog/podcasts)

---

## [64] 2025-01-22T14:17:39+00:00
- Permalink: https://t.me/anatolii_makosov/64
- Views: 12.3K

We've created a separate channel [@toncore](https://t.me/toncore) where the TON Core team will share all updates.

You can read the 2024 review, as well as our plans for the first half of 2025.

---

## [65] 2025-01-23T14:11:17+00:00
- Permalink: https://t.me/anatolii_makosov/65
- Views: 21.8K

**NOT Pixels**

The TON blockchain is like a multi-core processor.

Imagine running a single-threaded program on a multi-core processor. It will work, of course, but less efficiently — only one core is utilized instead of all of them.

For token distributions and smart-contract creations on TON, the situation is analogous.

Yesterday, at the NOT Pixels minting, the TokenTable service initially used a "single-threaded" method to distribute tokens to 500 thousand users. Although this **practically didn't affect the operation of the blockchain itself** and had only minor impact on the shardchain, some NOT Pixels users were dissatisfied — some of them got their tokens after an hour of waiting. Messages on TokenTable contracts were executed sequentially, not in parallel.

TokenTable is a good tool for distributing tokens on TON, and earlier it had successfully conducted mintings for games with much larger audiences using the "multi-threaded" sharded approach.

We recommend that developers working with a large audience take sharding into account to ensure better UX of their services.

But we also ask users to be understanding: developers of services on TON are pioneers in using asynchronous technologies in blockchain. Many new approaches and paradigms, first appearing in TON, are only starting to be widely applied.

In TON Core we [continue](https://t.me/toncore/6) work on improving our "processor" so that even sub-optimally written smart-contracts can run at maximum speed.

---

## [66] 2025-01-25T16:17:04+00:00
- Permalink: https://t.me/anatolii_makosov/66
- Views: 17.6K

[Toncenter NFT API](https://toncenter.com/api/v3/index.html#/nfts) and our friends [MyTonWallet](https://t.me/MyTonWalletRu/209), [tonscan.org](https://tonscan.org/collection/EQD9ikZq6xPgKjzmdBG0G0S80RvUJjbwgHrPZXDKc_wsE84w), and [ton.diamonds](https://ton.diamonds/) have implemented full support for [Telegram gifts](https://telegram.org/blog/wear-gifts-blockchain-and-more/ru).

---

## [72] 2025-02-14T13:01:04+00:00
- Permalink: https://t.me/anatolii_makosov/72
- Views: 17.1K

A win-win option 😁😅

https://t.me/CryptoBotRU/431

**Link preview** — Crypto Bot News: *"💖 Afraid to text her? Just write @send 1000 USDT. If you didn't manage to give your beloved a limited Telegram gift, you can still please her with a crypto Valentine!"*

---

## [73] 2025-02-16T19:02:40+00:00
- Permalink: https://t.me/anatolii_makosov/73
- Views: 13.8K

*(no text — media-only post)*

---

## [74] 2025-02-16T19:06:56+00:00
- Permalink: https://t.me/anatolii_makosov/74
- Views: 17.6K

*(no text — media-only post)*

---

## [75] 2025-02-16T19:08:00+00:00
- Permalink: https://t.me/anatolii_makosov/75
- Views: 18.3K

I held a [giveaway](https://fragment.com/stars) to get boosts and unlock the ability to post stories from the channel — and instead got 180,000 subscribers 🤷‍♂️

---

## [76] 2025-02-16T19:08:41+00:00
- Permalink: https://t.me/anatolii_makosov/76
- Views: 23K

https://t.me/boost/anatolii_makosov

Just **403** more votes and we'll release new useful tools for validators 😅

---

## [77] 2025-03-16T09:46:29+00:00
- Permalink: https://t.me/anatolii_makosov/77
- Views: 13.4K

https://telegram.org/blog/star-messages-gateway-2-0-and-more/ru

I was thinking about paid likes and messages [back in 2023](https://t.me/anatolii_makosov/4).

I think the other social platforms will inevitably introduce the same functionality, while Telegram, as usual, is at the forefront.

**Link preview** — Telegram blog: *"Today's update gives content creators and public figures more control over privacy — and at the same time a new way to monetize their popularity. You can now filter incoming messages, maintain inner harmony, and earn..."*

---

## [78] 2025-04-02T14:46:11+00:00
- Permalink: https://t.me/anatolii_makosov/78
- Views: 24.5K

[**wallet.ton.org**](http://wallet.ton.org/)

Together with the MyTonWallet team, we've updated [wallet.ton.org](http://wallet.ton.org/) — a non-commercial, fully open-source web wallet for TON.

[wallet.ton.org](http://wallet.ton.org/) is the first web wallet in the TON ecosystem, which Kirill Emelyanenko and I created back in 2020. Its code became the starting point for many subsequent solutions in the TON community.

There are more functional wallets with multi-network support, built-in swaps and staking — while [wallet.ton.org](http://wallet.ton.org/) is a simple, fallback, reliable, and open tool that always remains available and free.

The new version doesn't deviate from these principles, but includes support for all modern TON technologies (Jettons, Mintless Jettons, NFTs, including Telegram Gifts, TON DNS, TON Connect, Ledger, etc.) and is significantly improved in terms of usability.

The MyTonWallet team will continue supporting this non-commercial version. The Chrome Extension update is already in review and will appear very soon.

Thanks to the MyTonWallet team for the help!

---

## [79] 2025-06-02T14:51:01+00:00
- Permalink: https://t.me/anatolii_makosov/79
- Views: 19.7K

Yesterday two events happened:

🎂 I turned 35.

⛏ We fixed a bug due to which block production in the TON masterchain was suspended for about an hour. We published an [incident report](https://telegra.ph/Report-on-June-1-2025-Operation-Incident-06-02).

---

## [80] 2025-06-03T15:18:49+00:00
- Permalink: https://t.me/anatolii_makosov/80
- 1 photo
- Views: 12.7K

Bought a bit of gold. 🥇

---

## [81] 2025-07-05T17:13:09+00:00
- Permalink: https://t.me/anatolii_makosov/81
- Views: 32.9K

**TON blockchain operations now finalize 10× faster under low and moderate load — in 3-5 seconds**

Today we completed the series of TON kernel optimizations planned for the first half of 2025.

In total during this period, [5 updates](https://github.com/ton-blockchain/ton/releases) were released, affecting practically all key kernel components: the validation process, cryptographic operations, network interaction, database operations, as well as serialization and deserialization of blockchain state.

As a result, the performance of a single shardchain has grown significantly — now the current load on the mainnet is processed by just one shardchain (instead of four previously).

This means that under low and moderate network load, all operations — for example, sending tokens or trades on decentralized exchanges — are performed without inter-shard interactions in a single block, that is, in **3–5 seconds**. Earlier, finalization of such operations could take up to **30–50 seconds**.

Under high load, the blockchain will continue to scale via sharding, which will increase processing time, but we have also implemented a number of major improvements that increase network stability at peak moments. More on this and on further plans — in one of the next posts.

---

## [82] 2025-08-02T21:00:40+00:00
- Permalink: https://t.me/anatolii_makosov/82
- 4 photos, 4 videos
- Views: 21.5K

The user experience of TON is reaching a new level, thanks to consistent updates to the blockchain and the Toncenter API, as well as close cooperation with leading product teams in the ecosystem.

https://telegra.ph/New-Approaches-to-Blockchain-User-Experience-08-02

---

## [90] 2025-08-03T19:33:46+00:00
- Permalink: https://t.me/anatolii_makosov/90
- Views: 21.5K

H1 2025: everything planned — completed.

Report: https://telegra.ph/TON-Core---Report-for-2025-H1-08-03

**Link preview** — Telegraph: *"TON Core - Report for 2025 H1. Report on the implementation of the roadmap for the first half of 2025. Improvement of Layer 1 of the TON Blockchain. Series of TON kernel optimizations: during this period, we released 5 updates that affected all key kernel components: the validation process..."*

---

## [91] 2025-09-08T20:02:38+00:00
- Permalink: https://t.me/anatolii_makosov/91
- Views: 20.3K

**⚠️ [Attack](https://t.me/DeCenter/21835) on popular NPM packages — technical details**

**Brief**

A few hours ago, attackers gained access to several NPM accounts and published infected versions of popular libraries.

Many web products use these packages.

Although TON products do not appear to be at risk, multichain product developers should check their code, especially if you released anything today.

**List of compromised versions:**

 • ansi-styles@6.2.2
 • debug@4.4.2
 • chalk@5.6.1
 • supports-color@10.2.1
 • strip-ansi@7.1.1
 • ansi-regex@6.2.1
 • wrap-ansi@9.0.1
 • color-convert@3.1.1
 • color-name@2.0.1
 • is-arrayish@0.3.3
 • slice-ansi@7.1.1
 • color@5.0.1
 • color-string@2.1.1
 • simple-swizzle@0.2.3
 • supports-hyperlinks@4.1.1
 • has-ansi@6.0.1
 • chalk-template@1.1.1
 • backslash@0.2.1

Important: only these specific versions are infected. All earlier and all newer versions are considered safe.

**What the infected packages do**

 • Substitute crypto wallet addresses.
 • Intercept and redirect crypto-transactions in products that use these packages.

Affected blockchains: Ethereum, Bitcoin, Bitcoin Cash, TRON, Litecoin, Solana.

The TON blockchain is not on the list.

**Your web product is at risk if:**

 • It works with Ethereum, Bitcoin, Bitcoin Cash, TRON, Litecoin, Solana

AND

 • You built it a couple of hours ago

OR

 • Your dependencies are loaded dynamically without a fixed version (you should never do this).

**How to check**

In package-lock.json, look for the versions and packages from the list above.

If at least one of the listed packages' version matches the compromised one — the project is infected.

**How to fix**

Fixes have already been published for all packages, or rollback to the previous version.

Run npm install and rebuild the project.

**Sources**

- https://jdstaerk.substack.com/p/we-just-found-malicious-code-in-the
- https://github.com/chalk/chalk/issues/656#issuecomment-3266900029
- https://github.com/debug-js/debug/issues/1005#issuecomment-3266868187
- https://github.com/advisories/GHSA-8mgj-vmr8-frr6
- https://www.aikido.dev/blog/npm-debug-and-chalk-packages-compromised

---

## [92] 2025-09-24T22:19:05+00:00
- Permalink: https://t.me/anatolii_makosov/92
- 1 photo
- Views: 8.86K

**⚡️ Shopping on WB for TON**

Belarusians are ahead of the whole planet — they can now actually pay for Wildberries orders with TON, USDT, BTC, and other crypto.

How it works in Belarus, find out at the link:

↖️ https://kod.ru/wb-belarus-ton-usdt-btc

---

## [93] 2025-10-29T17:45:19+00:00
- Permalink: https://t.me/anatolii_makosov/93
- Views: 18.5K

**This year we expanded the TON Core C++ kernel team:**

🥷 **Evgeny**

More than 10 years of experience in blockchain development, including work on consensus and cryptography.

— First place in the ICPC World Finals 2009 and 2012.
— Excellent results in other competitions, including Google Code Jam, Meta Hacker Cup, and TopCoder Open.

🥷 **Oleg**

Engineer and researcher in the field of distributed databases.

— Winner of [TON x CodeForces Contest](https://t.me/toncore/12).
— Bronze medal in the ICPC World Finals 2020.
— Highest Grandmaster rating on Codeforces.
— Results in other competitions, including IEEExtreme, Google Hash Code, Microsoft BubbleCup Finals.

🥷 **Vadim**

Specializes in multithreading, working with databases and clusters.

— Winner of the [TON Validation Contest](https://t.me/toncore/13) and TON Smart Challenges.
— Second place in Yandex Cup 2024 Backend.

🥷 **Danil** (20 years old!)

MIT

— Winner of [TON Validation Contest](https://t.me/toncore/13).
— Gold medal at the International Olympiad in Informatics 2022.
— Gold medal at the Asia-Pacific Informatics Olympiad 2022.
— Gold medal at Romanian Master of Informatics 2021.
— Gold medal at the International Autumn Tournament in Informatics 2021.

---

## [94] 2025-10-29T17:45:19+00:00
- Permalink: https://t.me/anatolii_makosov/94
- Views: 16.6K

The TON Core team is working on making operations on the TON blockchain execute faster than 1 second — without reducing decentralization or scalability.

We expanded the kernel team and continue to implement the [optimization roadmap](https://t.me/toncore/33) published and [partially fulfilled](https://t.me/toncore/76) earlier this year. Ahead — major L1 and API updates.

We plan to demonstrate the results on the TON mainnet in the first half of next year.

---

## [95] 2025-11-01T08:08:50+00:00
- Permalink: https://t.me/anatolii_makosov/95
- Views: 20.8K

The TON Core team was glad to help Chainlink with the technical [integration](https://x.com/chainlink/status/1984230609619677490) of their product into TON.

Chainlink's smart-contracts are written in our new language [Tolk](https://t.me/toncore/68).

In parallel, we contributed to preparing three more big and anticipated releases — all with the letter "C" at the end or the beginning.

**Link preview** — Chainlink (X): *"@ton_blockchain, the L1 bringing Web3 to Telegram's 900M+ users, is adopting Chainlink CCIP as the canonical cross-chain infrastructure for its native token TON, making it a Cross-Chain Token (CCT) to be transferable across leading blockchains."*

---

## [96] 2025-11-18T12:00:07+00:00
- Permalink: https://t.me/anatolii_makosov/96
- Views: 13.3K

**TON on Coinbase**

https://x.com/CoinbaseMarkets/status/1990503887820787844

**Link preview** — Coinbase Markets (X): *"Coinbase will add support for Toncoin (TON) on The Open Network. Do not send this asset over other networks or your funds may be lost. Spot trading for Toncoin (TON) will go live on 18 November 2025."*

---

## [97] 2025-12-08T10:30:49+00:00
- Permalink: https://t.me/anatolii_makosov/97
- Views: 11K

**Big update of the Tolk language documentation**

https://docs.ton.org/languages/tolk

---

## [98] 2025-12-08T10:30:50+00:00
- Permalink: https://t.me/anatolii_makosov/98
- Views: 13.6K

Newcomers to Tolk may enjoy this talk.

Aleksandr Kirsanov — author of the language — shares Tolk's key ideas, tells how the language evolved, and shows how Tolk differs from FunC.

Recorded this summer.

https://www.youtube.com/watch?v=QunzOeV2kT0

**Link preview** — YouTube: *"NEW DEVELOPMENT LANGUAGE FOR TON | WHAT IS TOLK? | WHY IT'S SIMPLER AND MORE EFFICIENT THAN FUNC | THE FUTURE OF THE LANGUAGE. In this video — a talk by Aleksandr Kirsanov, developer and creator of the Tolk language, at the TON CIS Dev 1-Day Bootcamp, held on August 30 in St. Petersburg."*

---

## [99] 2025-12-08T10:31:42+00:00
- Permalink: https://t.me/anatolii_makosov/99

[Anatolii Makosov](https://t.me/anatolii_makosov) pinned «The TON Core team is working on making operations on the TON blockchain execute faster than 1 second — without reducing decentralization or scalability. We expanded the kernel team and continue to implement the optimization roadmap, published and partially completed...»

---

## [101] 2025-12-12T20:05:28+00:00
- Permalink: https://t.me/anatolii_makosov/101
- 1 photo
- Views: 21.9K

Many may have missed an important announcement by Pavel Durov during the [Cocoon presentation](https://youtu.be/G56XD67Wrrs?t=596).

Talking about TON:

"Of course, all of this [Cocoon] is built on TON. It's our favorite blockchain. We've made a lot of things on the TON blockchain. All our digital collectibles are on TON: usernames, numbers, gifts. All payouts to developers and creators use TON. **And there's a big roadmap. I think Telegram will play a more active role in the development of TON's core technology. I'll be making some loud announcements next year**."

(English text from the original presentation):

"… of course, all of it [Cocoon] is built on TON. It's our favorite blockchain. We built a lot of things on top of it. All our digital collectibles are built on top of TON: the usernames, the numbers, the gifts — everything. All the payouts to developers and digital creators are also done using TON. **And there is a big roadmap. I think Telegram will be taking a more active role in developing the core technology of TON. There'll be some exciting announcements I'll be making next year**."

---

## [102] 2025-12-19T12:06:39+00:00
- Permalink: https://t.me/anatolii_makosov/102
- Views: 11K

I see that various information is appearing around [BTC Teleport](https://teleport.tg/), so I want to clarify a few things.

The project is not related to me personally, nor to TON Core — it is an initiative of the developer team **RSquad** and **TON Foundation**.

For our part, we [supported the project technically and consultatively](https://t.me/toncore/73) and will be glad to see its successful launch.

**Link preview** — *"TON Teleport BTC — Secure Bitcoin Transfers to TON. Seamlessly transfer BTC between Bitcoin and TON with TON Teleport BTC. Enjoy secure, fast, and effortless cross-chain transactions—your Bitcoin, as free as you are."*

---

## [103] 2025-12-19T13:44:01+00:00
- Permalink: https://t.me/anatolii_makosov/103
- Views: 13.6K

Right now I and the team are mostly focused on updating the foundational TON technology — with the goal of achieving operations on the blockchain [faster than one second](https://t.me/anatolii_makosov/94) while preserving scalability, decentralization, and security.

Technical details — in the next publications.

In parallel we are releasing regular service updates of the kernel ([TON 2025.10](https://t.me/toncore/90), [2025.11](https://t.me/toncore/90), [2025.12](https://t.me/toncore/97)), aimed at maintaining the stability and security of the blockchain. Within these releases, optimizations are being introduced step by step — traffic compression, parallel block validation, and other improvements.

We are also developing tooling for developers: Tolk received versions [1.1](https://t.me/toncore/85) and [1.2](https://t.me/toncore/93), the [Tolk documentation](https://t.me/toncore/95) was updated, and [TVM 12](https://t.me/toncore/92) was released. In progress — a new toolset for Tolk, including good support for AI agents writing smart-contracts for TON.

We provided technical support for the majority of this year's key integrations, including [Gemini](https://t.me/toncoin/2052), [Coinbase](https://t.me/toncoin/2114), and [Chainlink](https://t.me/toncore/89), as well as a number of unannounced projects, including in the stablecoin space.

The team is at full capacity, and during the year both the [kernel team](https://t.me/anatolii_makosov/93) and the team responsible for developer tools have been reinforced.

---

## [104] 2026-01-07T16:26:39+00:00
- Permalink: https://t.me/anatolii_makosov/104
- Views: 15.4K

**2026**

The blockchain industry lives by cycles and trends.

This is normal for a young technology. As it embeds more deeply in people's everyday lives, this dependency will weaken.

Right now we're in another downturn. During my time working on TON, this is already the third "crypto winter". That's counting the first year of work when Toncoin didn't yet exist and was worth nothing.

Each time it seems that good releases pass unnoticed. But the fundamental technology doesn't work in the moment. All the releases that have been made will start to matter during the next upswing.

---

## [105] 2026-01-09T14:09:22+00:00
- Permalink: https://t.me/anatolii_makosov/105
- Views: 21.9K

We've finished the research and development phase on the [task of accelerating operations](https://t.me/anatolii_makosov/94) in the TON blockchain.

The goal — to make operations take less than one second, without sacrificing scalability, security, or decentralization.

As a result, we found three directions which together produce the desired effect.

**1. Base layer (L1)**

The main change — a new consensus, **Catchain 2.0**.

It replaces the current pairing of [Catchain + BCP](https://docs.ton.org/resources/pdfs/catchain.pdf) and is based on the modern protocols [Simplex](https://simplex.blog/) and Alpenglow, adapted for TON.

To put it simply: this is how validators agree among themselves and accept new blocks.

With the new consensus, block finalization takes **200–400 milliseconds** instead of **~2.5 seconds** previously — at the same level of security.

Speaking of security — an additional plus of these protocols is that they are well-known, which means they're easier to audit.

The second important change — a new network protocol for block broadcast (**two-step broadcast**).

We reduced the time of delivering a block between nodes across the network from approximately **700 milliseconds** to **~100 milliseconds**.

Additional optimizations were also made in the C++ implementation of the TON node:

— compression of blocks during transmission,
— parallel validation,
— data exchange between validators not only via RLDP2, but also over TCP or [QUIC](https://en.wikipedia.org/wiki/QUIC). Test results indicate a possible transition to one of these protocols.

In parallel, we improved internal tools for blockchain and API statistics, benchmarks, and measurements.

**2. API**

We optimized [Toncenter API](https://toncenter.com/). Now the operation status via Streaming API V2 arrives with a delay of **30–100 milliseconds**.

In addition, more operation statuses appeared:

*confirmed* — the block has appeared in the shardchain,
*finalized* — the block has been accepted into the masterchain.

Earlier there was only one status — *finalized*.

**3. UX**

An operation with the *confirmed* status has less than a 1% probability of rollback, so applications can show it to the user immediately, without making them wait.

The user can immediately continue making subsequent operations, and later the application will simply mark that the operation has been finally finalized.

In essence, this is an analog of block confirmations in other blockchains: the operation is visible after the first block, and full finalization comes later.

This is a good complement to the instant pending operations that we made in last year's [UX update](https://t.me/toncore/76).

All parts individually are already ready. Now we are bringing them together and then we'll start testing in the TON testnet.

---

## [106] 2026-01-23T15:40:54+00:00
- Permalink: https://t.me/anatolii_makosov/106
- Views: 51.4K

We've updated the TON testnet. Pay attention to the speed of operations.

Next — testing and preparation for the TON mainnet update.

Special thanks to the [mytonwallet.app](http://mytonwallet.app/) and [tonscan.org](http://tonscan.org/) teams for their quick integration of the new technologies.

---

## [107] 2026-01-23T15:42:47+00:00
- Permalink: https://t.me/anatolii_makosov/107
- Views: 11K

At the same time, the previous architectural advantages of TON are preserved: including [superiority in scalability and throughput](https://youtu.be/jWWl1sLGY7s?t=209) and fixed network fees independent of network load.

---

## [108] 2026-02-22T16:21:48+00:00
- Permalink: https://t.me/anatolii_makosov/108
- Views: 7.24K

https://t.me/nft/DeskCalendar-276718

**Link preview** — *"Desk Calendar #276718. Model: TON Core. Backdrop: Pacific Green. Symbol: Wreath."*

---

## [109] 2026-03-06T13:01:19+00:00
- Permalink: https://t.me/anatolii_makosov/109
- Views: 12.7K

**Sub-Second update rollout progress on the TON mainnet**

TON is gradually transitioning to an architecture where operation times are no longer measured in seconds, but in milliseconds.

The Sub-Second update is one of the largest technological improvements to the network in recent years.

**New API and UX already on mainnet**

— Toncenter API has published the new accelerated [Streaming API V2](https://t.me/toncenter_news/56) for all users on mainnet and testnet.

— The first products — [MyTonWallet](https://mytonwallet.io/) and [tonscan.org](http://tonscan.org/) — have already switched to Streaming API V2 on mainnet and testnet.

This already nearly halved the operation time in these products, despite the fact that the blockchain itself is currently still operating in the previous mode.

— Other ecosystem products and services can already connect to the new [API](https://t.me/toncenter_news/56) and adopt the updated [UX approaches](https://t.me/toncore/98).

**Blockchain update**

— On February 12, mainnet validators [updated](https://github.com/ton-blockchain/ton/releases/tag/v2026.02) to the new code of the accelerated network layer and Catchain 2.0 consensus.

— The new functionality is not yet enabled and will be activated after testing is complete.

**Sub-Second update testing progress on testnet**

The TON testnet has been operating stably for more than a month after the [update](https://t.me/anatolii_makosov/106) on January 23 with Sub-Second mode activation:

— on average, 2-3 blocks per second are produced;
— the network operates under real organic load;
— various validators are participating.

**Load testing**

During testing, tests under relatively high load were conducted. Results showed that at **1000 transactions per second** in a single shardchain, the operation time stays **less than a second**.

For comparison, even during periods of high load on mainnet during the mintings of Notcoin, DOGS, and Hamster Kombat, average TPS did not exceed ~500.

**Improvements and fixes**

During testing the TON Core team made a number of improvements. Worth noting separately:

— Disk I/O has been optimized so that nodes with slower disks can stably synchronize at the new block production speed.

— Stability and performance of the new consensus have been improved; handling of scenarios where some validators temporarily fail has been improved.

In addition to work on Sub-Second, two service updates with fixes and stability improvements for mainnet have been released: [TON 2026.02](https://github.com/ton-blockchain/ton/releases/tag/v2026.02) (February 12) and [TON 2026.02-1](https://github.com/ton-blockchain/ton/releases/tag/v2026.02-1) (February 24).

---

## [110] 2026-03-06T13:01:19+00:00
- Permalink: https://t.me/anatolii_makosov/110
- 1 video
- Views: 6.37K

*(no text — video-only post)*

---

## [111] 2026-03-06T14:44:23+00:00
- Permalink: https://t.me/anatolii_makosov/111
- Views: 7.61K

**Web3 game: looking for a game designer and 3D modeler**

Before blockchain technologies, I was developing multiplayer online games. As a personal project, I'm interested in trying to make something new in this area — combining a multiplayer game, TON, and Telegram Mini Apps.

Back in 2022 I wrote on this topic: https://t.me/tonblockchain/107. As I see it, the potential of this direction is still huge.

In connection with this, the following positions are open:

— Game designer with experience developing social/economic games.
— 3D modeler with experience working in low-poly for web games.

I will be able to start this initiative no earlier than the completion of the major network updates, but you can send your résumé now to [@another_web3_game_bot](https://t.me/another_web3_game_bot).

---

## [112] 2026-03-11T14:45:46+00:00
- Permalink: https://t.me/anatolii_makosov/112
- Views: 7.47K

A few technical clarifications about the alternative implementation of a TON node in Rust, [announced](https://t.me/toncoin/2308) in the [@toncoin](https://t.me/toncoin) channel.

The RSquad team (also known for the BTC Teleport project) made modifications based on the Everscale blockchain node, so that it became compatible with the current TON.

As stated on [GitHub](https://github.com/RSquad/ton-rust-node), the project is in Early Beta status, and the source code has not yet been published.

---

## [113] 2026-03-13T19:13:45+00:00
- Permalink: https://t.me/anatolii_makosov/113
- Views: 4.89K

As the final stage of testing the **Sub-Second** TON update, a public contest is launched with a prize fund of up to **$100,000** to find bugs and vulnerabilities.

Anyone can participate: https://t.me/contest/447

**Link preview** — Telegram Contests: *"💎 Blockchain Contest, Round 2. Telegram and TON Core announce a new bug bounty contest! Prize Fund: Up to $100,000. Deadline: 23:59, March 27 (Dubai time). Task: Analyze TON's new consensus algorithm for potential vulnerabilities."*

---

## [114] 2026-03-16T06:43:03+00:00
- Permalink: https://t.me/anatolii_makosov/114
- Views: 11K

In passing, we [added](https://t.me/toncenter_news/57) support for [**Cocoon AI**](https://cocoon.org/) smart-contracts in **Toncenter API**.

Attentive readers may have noticed that, in its architecture, Cocoon AI resembles **TON Storage** from the original TON whitepaper.

The model is the same: participants decentrally provide resources, get paid in Toncoin, and settlements happen via TON blockchain smart-contracts.

The only difference is the type of resource the participants provide:
TON Storage — disk space.
Cocoon AI — GPU compute.

---

## [115] 2026-03-21T07:37:14+00:00
- Permalink: https://t.me/anatolii_makosov/115
- Views: 4.65K

One of the key conditions of the Sub-Second update is the preservation of decentralization and security of the blockchain. I will discuss each of these aspects in subsequent posts.

In practice, the main trade-off of high performance is incompatibility with EVM blockchains. If you've been paying attention, all blockchains that today are considered fast have their own architecture, different from Ethereum.

In the long term, this is not a big problem. But in the short term, a barrier arises: it is harder for developers of products from other blockchains to migrate to TON.

That's exactly why we are now actively investing in development tooling. At TON Core, this direction is led by Aleksandr Kirsanov and his team.

We started with a fundamental update to the programming language — released [Tolk](https://t.me/toncore/68).

Then we expanded scope: as part of the [Tolk 1.2](https://t.me/toncore/93) update, the changes affected not only the compiler, but also the [TVM virtual machine](https://t.me/toncore/92).

Now we are creating a new generation of tools for development, testing, and deployment of smart-contracts. They are tightly integrated with the compiler and TVM. A significant part of the "under-the-hood" code has been reworked.

There will also be the ability to use AI for writing high-quality smart-contracts for TON.

Aleksandr will share more on this in early May.

[Aleksandr's notes »](https://t.me/tolk_lang/27)

---

## [116] 2026-03-21T07:37:14+00:00
- Permalink: https://t.me/anatolii_makosov/116
- Views: 4.53K

https://www.youtube.com/watch?v=UKfbKEWtg2s

**Link preview** — YouTube: *"Tech Updates is a series where we sit down with the people building TON's developer infrastructure. In episode three, we're joined by Aleksandr Kirsanov from the TON Core Team. Aleksandr is the creator of Tolk, the language that is the primary language..."*

---

## [117] 2026-03-24T09:58:14+00:00
- Permalink: https://t.me/anatolii_makosov/117
- 1 video
- Views: 5.03K

*(Original posted in English):*

**🐶 TONNET BROWSER (1.0.0 BETA)**

Tonnet Browser is the first browser with a built-in TON proxy, providing peer-to-peer access to TON Network. Your device connects to **TON sites** (`.ton`, `.t.me.`) either directly or through multi-hop garlic routing when anonymous mode is enabled. Uncensored & unstoppable.

Tonnet Browser combines the anonymity model of Tor with tonnet-proxy multi-hop garlic routing, the peer-to-peer architecture of BitTorrent for decentralized content delivery with TON storage, and a blockchain layer for cryptographic DNS resolution and TON payments.

⬇️ Now Available on [Linux](https://tonnet.resistance.dog/download/) | [Win](https://tonnet.resistance.dog/download/) | [MacOS](https://tonnet.resistance.dog/download/)
🤖 Mobile version available on [Android](https://tonnet.resistance.dog/download/)
*(One-line command install on GitHub)*

**Website**: [tonnet.resistance.dog](https://tonnet.resistance.dog/)
**GitHub**: [tonnet-browser](https://github.com/TONresistor/tonnet-browser) (open-source)
**Docs**: [docs.resistance.dog](http://docs.resistance.dog/)
**Suggestions & bugs**: [@ResistanceForum](https://t.me/ResistanceForum)

Everything is open-source & free.

👋 If you need help with installation or anything else, feel free to join the group or contact me directly.

---

**Note regarding garlic routing:**

[tonnet-proxy](https://github.com/TONresistor/tonnet-proxy) is implemented in the browser and connects to the community relays listed in tonnet-directory with the anonymous mode.

I bootstrapped the network with 4 relay servers (see [tonnet-directory](https://github.com/TONresistor/tonnet-directory/blob/main/relays.json)). For garlic routing to really make sense, the network requires more active relays.

If you wish to contribute by becoming a relayer, consider installing [tonnet-relay](https://github.com/TONresistor/tonnet-relayer) on your server.

The next step is to incentivize relayers with TON or Jettons via garlic-routed nano-transactions for each relayed request, using gasless and instant payments through virtual channels (TON payment tech).

However, you can also safely connect directly to any Tonsite via P2P without going through an intermediate relay (non-anonymous mode).

---

**Bonus:**

I scanned ~140K TON DNS and found 499 TON sites up. Have fun exploring the TON Network.

Here is the list: https://t.me/ADNLchecker

---

## [118] 2026-03-24T09:58:14+00:00
- Permalink: https://t.me/anatolii_makosov/118
- Views: 8.74K

**Digital Resistance Tools**

A reminder that the TON Core team has previously completed all of TON's Web3 protocols:

— [TON DNS](https://dns.ton.org/)
— [TON Proxy](https://t.me/toncore/34) (including anonymous Garlic Routing and traffic payment in Toncoin)
— [TON Storage / Torrents](https://github.com/xssnick/TON-Torrent)
— [TON Payment Network](https://t.me/toncore/72) (Layer 2)

It's nice to see services emerging in the ecosystem that are built on top of them.

One example is the [products](https://t.me/resistancetools/7) of **Resistance Tools** by a developer from the **Resistor** community.

What impressed me most was the [TON Browser Desktop](http://tonnet.resistance.dog/) with its ability to open .ton sites, download files from TON Torrents in a download manager, and other interesting solutions. Surveillance protection, encryption, and anonymization via TON Proxy.

Earlier, Telegram itself became a TON browser and allowed opening TON sites (e.g., [manifesto.ton](tonsite://manifesto.ton/)) right inside the messenger. The Desktop version from Resistance Tools, as expected, has broader functionality.

In support, I'm [sending](https://tonscan.org/tx/3d25e988e945ace802d2e6f79d00f2c6a0161a80723f9637a5c1b0a8c1bdf636) the author a grant of **10,000 TON** from personal funds.

---

## [119] 2026-03-28T07:23:12+00:00
- Permalink: https://t.me/anatolii_makosov/119
- Views: 5.68K

Released **Tolk 1.3**

This is the first part of the development tooling improvements we discussed [earlier](https://t.me/anatolii_makosov/115).

https://t.me/toncore/101

**Link preview** — TON Core: *"Tolk Programming Language 1.3. — Type array<T> — dynamically sized arrays backed by TVM tuples. — Type unknown — a TVM primitive with unknown contents. — Type lisp_list<T> — nested two-element tuples (FunC-style). — Type string — text chunks backed by..."*

---

## [120] 2026-03-31T09:32:54+00:00
- Permalink: https://t.me/anatolii_makosov/120
- Views: 7.35K

**Sub-Second activation on mainnet**

The [public contest to find vulnerabilities and bugs](https://t.me/contest/447) in the Sub-Second update has finished.

Thanks to all participants! The team [made](https://github.com/ton-blockchain/ton/releases/tag/v2026.03) the necessary changes to the code. No significant changes to the consensus mechanics were required as a result of the contest.

The contest results and winners' rewards will be announced later in the [@contest](https://t.me/contest) channel.

The contest was the final stage of testing. Before that, testing was conducted within the TON Core team and on the TON testnet.

We're starting Sub-Second activation on mainnet.

The activation will happen in three stages:

**March 31 (today):** [updating validator nodes](https://t.me/tonstatus/195) to the latest version.

**April 2:** vote to activate **the new consensus on basechain** and a **moderate increase in block speed**.

**April 7:** vote to **fully activate the fast consensus on basechain and masterchain**, followed by an update of validator nodes.

Sub-Second is the largest protocol update, including a significant volume of changes.

Despite comprehensive testing, we ask validators to remain in touch and stay on heightened alert for action over the next two weeks — from **March 31** to **April 12**.

The TON Core team is ready to react quickly to any situation.

---

## [121] 2026-03-31T09:38:35+00:00
- Permalink: https://t.me/anatolii_makosov/121
- Views: 6.69K

The guide for developers/exchanges/products [is published](https://t.me/toncore/103) in [@toncore](https://t.me/toncore).

---

## [122] 2026-04-09T08:44:51+00:00
- Permalink: https://t.me/anatolii_makosov/122
- Views: 9.01K

**Sub-Second update activated**

The TON blockchain has [transitioned](https://t.me/tonstatus/205) to the new fast consensus protocol and updated network protocol. At the moment the network is operating stably.

We're awaiting updates from the remaining 7% of validators in order to finalize the metrics. Already now, however, in [MyTonWallet](https://mytonwallet.io/) operations are performed instantly.

In addition to accelerating operations, the update has two important consequences:

• Since block production speed has grown 5–6×, and validators receive a reward for each block, the yield of validation in TON has also increased. With the current configuration, the TON staking yield will reach 20–25% per year.

• The optimizations made create the foundation for the next step — reducing network fees on the blockchain.

---

## [123] 2026-04-09T12:14:23+00:00
- Permalink: https://t.me/anatolii_makosov/123
- Views: 9.49K

I ask readers not to confuse the current staking yield with inflation.

Toncoin inflation after the update is on the order of **4%** per year.

For comparison, according to recent ChatGPT data:

Solana: **3.9%**
Aptos: **2.6–5.19%**
SUI: **3.2–3.6%**

---

## [124] 2026-04-09T14:14:12+00:00
- Permalink: https://t.me/anatolii_makosov/124
- Views: 3.57K

*(Original posted in English):*

🚀 The TON blockchain just got upgraded and is now **10× faster**.

⚡️ Block rate **increased 6×**.

⏱ Transactions are now **instant**, **subsecond**.

🪙 This was step **1** of **7** to **Make TON Great Again** (MTONGA).

**Next step:** cut the already low transaction fees by **6×**. ✂️

---

## [125] 2026-04-09T14:14:25+00:00
- Permalink: https://t.me/anatolii_makosov/125
- Views: 10.3K

MTONGA

---

## [126] 2026-04-24T19:09:08+00:00
- Permalink: https://t.me/anatolii_makosov/126
- Views: 10.6K

**Network fee reduction**

The TON Core team has prepared a blockchain update to reduce fees by 6×, in line with Pavel Durov's [MTONGA](https://t.me/durov/499) plan.

This update includes:

**1) Performance improvements**

The previous [Sub-Second](https://t.me/anatolii_makosov/122) update increased not only operation speed but the overall performance of the blockchain, which made the fee reduction possible. Furthermore, additional optimizations and performance improvements have been made. These include a new mempool based on a persistent treap (Cartesian tree).

**2) Fixes and improvements**

Beyond performance improvements, this update will include fixes for issues identified on mainnet after the Sub-Second release. In particular, it eliminates the loss of [synchronization](https://t.me/tonstatus/208) on some liteservers and rare cases of blockrate instability.

**Schedule:**

April 28, 2026 12:00 UTC — validator update.
April 30, 2026 13:00 UTC — validator vote on reducing gas prices in the blockchain configuration.

The fee reduction is important for the next stages of the MTONGA plan. Since fees do not constitute a significant part of validator rewards, validator rewards will decrease by less than 0.4%.

We ask TON mainnet validator operators to be ready for the update on April 28 and to participate in the vote on April 30.

---

## [127] 2026-04-28T10:39:56+00:00
- Permalink: https://t.me/anatolii_makosov/127
- Views: 6.59K

Correct.

https://t.me/TheOpenDevBlog/136

**Link preview** — The Open Dev Blog: *"🔥 Why is TON several times faster than Solana? Everyone has already seen the posts about finalization speed after the sub-second update, and how much cooler TON is than Solana on this metric (10×+ faster). But in practice, when using wallets or DeFi, this isn't felt. We'll explain..."*

---

## [128] 2026-04-28T11:19:10+00:00
- Permalink: https://t.me/anatolii_makosov/128
- Views: 7.91K

**Clarification for developers: the *confirmed* operation status on TON**

The *confirmed* status is assigned to an operation at the moment when the shardchain block containing the corresponding transaction(s) is accepted by the validators.

From this moment on, it is known that the block is valid: validators have reached consensus, and the transactions contained in it are considered confirmed.

There is a rare edge case: if at this exact moment a change of the shardchain validator group occurs, the new group may issue a new block instead of this one. In practice, that new block — or one of the subsequent blocks — still includes the relevant transactions.

After this, the shardchain block is included in a masterchain block, and full finalization of the operation occurs.

Thus, client applications — wallets, dApps, and other products — can rely on the *confirmed* status to display the operation as completed. The probability of operation cancellation after this status approaches zero.

What can change between *confirmed* and *finalized* are the block hash and the transaction hash — approximately with a probability of about 1%. Therefore exchanges, payment services, and other systems for which the hash is important rely on the *finalized* status.

---

## [129] 2026-04-28T13:45:18+00:00
- Permalink: https://t.me/anatolii_makosov/129
- Views: 5.46K

The amount of funds participating in TON validation has exceeded **1 billion TON**.

The more stake participates in validation, the higher the economic security of the blockchain: a ⅔ attack becomes more expensive, and validators and stakers have a direct financial incentive to support the correct operation of the blockchain.

---

## [130] 2026-04-30T13:16:38+00:00
- Permalink: https://t.me/anatolii_makosov/130
- Views: 7.39K

Validator vote on network fee reduction has begun: https://t.me/tonstatus/211

---

## [131] 2026-05-04T09:10:36+00:00
- Permalink: https://t.me/anatolii_makosov/131
- Views: 3.42K

💎

---

## [132] 2026-05-04T13:42:45+00:00
- Permalink: https://t.me/anatolii_makosov/132
- Views: 2.68K

**Clarification for TON node operators**

The Rust implementation of the TON node has experimental status and is not intended for use on mainnet — neither as a validator nor as a full node/liteserver.

At the moment, alternative TON node implementations do not yet provide the necessary quality of operation and sufficient compatibility with current protocols. For validators this means a risk of fines for inadequate operation once the fines system is resumed.

The TON network currently runs on the reference [C++ implementation](https://github.com/ton-blockchain/ton). Putting alternative implementations into production is not on the agenda — the priority is the further fast development of protocols and technologies in support of the MTONGA plan.

For mainnet, the C++ version of the TON node should be used.

---

## [133] 2026-05-06T16:03:25+00:00
- Permalink: https://t.me/anatolii_makosov/133
- 1 video
- Views: 817

*(Original posted in English):*

🏁 TON leads Layer-1 blockchains in finality time.

🔗 Sources: https://telegra.ph/Comparison-of-Layer-1-blockchains-by-finalization-time-05-01

---

## [134] 2026-05-06T16:04:59+00:00
- Permalink: https://t.me/anatolii_makosov/134
- Views: 2.27K

I'd like to be able to take such a philosophical attitude toward life as the Cardano developers do.

"Transaction finality can be achieved in approximately one day, and cannot happen in less than a day, according to Ouroboros consensus design."

---
