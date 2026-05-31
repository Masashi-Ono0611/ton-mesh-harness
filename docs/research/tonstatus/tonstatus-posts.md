# Resistance Tools — All Posts (chronological)

Format per post: `## [<msg_id>] <datetime>` followed by author / metadata / body.

---

## [1] 2021-11-25T23:38:35+00:00

- Permalink: https://t.me/tonstatus/1
- Author: TON Status

Channel created

---

## [3] 2021-12-02T16:05:11+00:00

- Permalink: https://t.me/tonstatus/3
- Author: TON Status
- Views: 32.5K

**TON-ETH bridge update to increase the bandwidth.**

Validators please vote for config `71` update.

To vote via mytonctrl you need to use the command:
`vo 2213811010730965138587720063197889446473744456893624591807402473808988383537`

The source code can be found on the [GitHub](https://github.com/ton-blockchain/bridge-func/).

This update follows [previous one](https://t.me/tonblockchain/71) related to TON-BSC bridge.

---

## [4] 2021-12-06T11:41:57+00:00

- Permalink: https://t.me/tonstatus/4
- Author: TON Status
- Views: 40.9K

**We urge validators to vote for config 71!**
It will decrease bridge swap delays and enhance user experience.

To vote for config please use
`
vo 2213811010730965138587720063197889446473744456893624591807402473808988383537
`
if you are using MyTonCtrl.
For validators which do not use MTC, please follow [https://ton.org/docs/#/howto/config-params?id=_4-voting-for-configuration-proposals](https://ton.org/docs/#/howto/config-params?id=_4-voting-for-configuration-proposals) doc
  
  TON Docs
  *
  TON documentation - TON Docs

**Link preview:**
- [TON documentation - TON Docs](https://ton.org/docs)
  - TON is a blockchain platform designed for scalable smart contracts, applications, and payments at consumer scale.

---

## [5] 2021-12-16T14:42:44+00:00

- Permalink: https://t.me/tonstatus/5
- Author: TON Status
- Views: 70.4K

Web wallet [tonwallet.me](http://tonwallet.me/) will be moved to a new domain in the near future.

**Please make sure that you have recorded recovery phrases of your wallet.
**
Click menu in the upper right corner → Backup Wallet → Write down your 24 recovery words in correct order and store them in secret place.

---

## [6] 2021-12-16T16:03:37+00:00

- Permalink: https://t.me/tonstatus/6
- Author: TON Status
- Views: 22.2K

**Web wallet is now available at the new **[**wallet.ton.org**](http://wallet.ton.org/)** domain!
**
If you have any problems, please contact support [@toncoin_help](https://t.me/toncoin_help).

---

## [9] 2022-01-09T15:54:28+00:00

- Permalink: https://t.me/tonstatus/9
- Author: TON Status
- Views: 18.8K

If you are a developer and use [tonweb](https://github.com/toncenter/tonweb), please update to version **0.0.26**+.

Previous versions of the tonweb will soon become incompatible with the public endpoints.

---

## [10] 2022-01-12T22:01:56+00:00

- Permalink: https://t.me/tonstatus/10
- Author: TON Status
- Views: 19.6K

Developers, the `Content-Type: application/json` HTTP request header becomes mandatory when working with the [toncenter.com](http://toncenter.com/).

This has already gone into effect on testnet and will soon go into effect on mainnet.

---

## [11] 2022-02-19T18:50:25+00:00

- Permalink: https://t.me/tonstatus/11
- Author: TON Status
- Views: 22.8K

Developers using [toncenter.com](http://toncenter.com/) and [tonweb](https://github.com/toncenter/tonweb) must obtain an API key (as described on [toncenter.com](http://toncenter.com/) for mainnet and on [testnet.toncenter.com](http://testnet.toncenter.com/) for testnet).

Starting tomorrow, the use of toncenter without API key will be rate limited.

---

## [12] 2022-02-27T18:27:03+00:00

- Permalink: https://t.me/tonstatus/12
- Author: TON Status
- Views: 22.6K

Validator tool **mytonctrl** was transferred from repository [https://github.com/igroman787/mytonctrl](https://github.com/igroman787/mytonctrl) to repository [https://github.com/ton-blockchain/mytonctrl](https://github.com/ton-blockchain/mytonctrl).

GitHub redirects from the old path to the new one.

---

## [13] 2022-03-05T18:57:27+00:00

- Permalink: https://t.me/tonstatus/13
- Author: TON Status
- Views: 18.6K

Users of the [TON extension](https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd) for Google Chrome, **please write down your wallet recovery phrases if you have not already done so**.

Click menu in the top right corner → Backup Wallet → Write down your 24 recovery words in correct order and store them in secret place.

Google Chrome has released a new extension format [V3](https://developer.chrome.com/docs/extensions/mv3/intro/). With it extensions will become more secure and private.

The TON extension will be updated to the V3 format in the coming days.

You may need wallet recovery phrases, make sure you have them written down.

---

## [14] 2022-04-02T22:24:55+00:00

- Permalink: https://t.me/tonstatus/14
- Author: TON Status
- Views: 15K

On April 8, [toncenter.com](http://toncenter.com/) will be limited at **10 requests per second by IP **with API key and 1 request per second without API key.

If you need more, please [run](https://github.com/toncenter/ton-http-api) your own endpoint.

---

## [15] 2022-05-13T14:22:19+00:00

- Permalink: https://t.me/tonstatus/15
- Author: TON Status
- Views: 54.2K

We remind you that the recommended RAM size for the validator is 64 GB, the minimum is 32 GB. 

If you are validating on hardware with less then 32 GB RAM - **immediately** stop sending new election requests (type command `set stake 0` in mytonctrl), you should not participate in subsequent elections until you improve the hardware.

This is a **mandatory** requirement for network stability.

---

## [16] 2022-05-18T09:30:25+00:00

- Permalink: https://t.me/tonstatus/16
- Author: TON Status
- Views: 58.8K

Mainnet validators please update your software to [new version](https://t.me/tonblockchain/127): 

— in **mytonctrl** run `update` then `upgrade https://github.com/ton-blockchain/ton`.

— if you don't use **mytonctrl** please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

---

## [17] 2022-05-22T13:11:12+00:00

- Permalink: https://t.me/tonstatus/17
- Author: TON Status
- Views: 15K

The testnet will be restarted from scratch tomorrow on more powerful hardware to increase its stability.

---

## [18] 2022-05-25T20:54:12+00:00

- Permalink: https://t.me/tonstatus/18
- Author: TON Status
- Views: 15.3K

The TON testnet has been completely restarted. Testnet [config](https://ton-blockchain.github.io/testnet-global.config.json), [testnet.toncenter.com](http://testnet.toncenter.com/), explorers and wallets have been updated.

Please update the [config](https://ton-blockchain.github.io/testnet-global.config.json) in your testnet services if you are using it as a local file.

The long history of blocks and the large size of the blockchain state with a small number of nodes is the cause of lags. Since the testnet does not have as many nodes as the mainnet, we will restart it every 3-6 months so that the testnet always remains fast.

---

## [19] 2022-06-14T14:11:16+00:00

- Permalink: https://t.me/tonstatus/19
- Author: TON Status
- Views: 12K

[Now](https://github.com/ton-blockchain/ton/commit/c00302ced4bc4bf1ee0efd672e7c91e457652430) TON master branch can be compiled on Apple M1 processors without any additional steps.

---

## [20] 2022-07-29T13:13:48+00:00

- Permalink: https://t.me/tonstatus/20
- Author: TON Status
- Views: 10.9K

Network validators, on **Aug. 2**, it is planned to set the root DNS contract in the network config by voting — all validators need to participate.

---

## [21] 2022-08-02T12:31:14+00:00

- Permalink: https://t.me/tonstatus/21
- Author: TON Status
- Views: 23.8K

**Setting the root DNS in the network config**

Validators please vote for setting `Ef-OJd0IF0yc0xkhgaAirq12WawqnUoSuE9RYO3S7McG6lDh` address in config `4` as root DNS.

To vote via mytonctrl you need to use the command:
`vo 28570401098048530419903479567404779787541823236808968536408335541289727996611`

If you don't use mytonctrl use this [instruction](https://ton.org/docs/#/howto/config-params?id=_5-an-automated-way-for-voting-for-configuration-proposals).

The DNS source code can be found on the [GitHub](https://github.com/ton-blockchain/dns-contract).

---

## [22] 2022-08-04T17:18:53+00:00

- Permalink: https://t.me/tonstatus/22
- Author: TON Status
- Views: 17.2K

Security update of the network is scheduled on August 8. We are asking mainnet validators to schedule time for the maintenance.

Note, that update will not be activated immediately after node software upgrade. Instead, to preserve consensus all the time, update will be triggered by acceptance of new network config.

Therefore the whole process will require from you
1) Update your validator node
2) Wait till synchronization restores
3) Voting for new config
The order of actions is primary important.

Besides improving the security, this update contains node stability and memory consumption improvements, speed up of access to database and enhancing stats.

---

## [23] 2022-08-08T12:23:47+00:00

- Permalink: https://t.me/tonstatus/23
- Author: TON Status
- Views: 11.2K

**Mainnet validators: **

1. Please update your software to [new version](https://github.com/ton-blockchain/ton): 

— in mytonctrl commandline run `update` then `upgrade`.

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

2. Wait till synchronization restores.

3. Strongly after software update and sync, please vote for new network [config param #29 ](https://github.com/ton-blockchain/ton/blob/ce65245a69c29d0f5400d240f95dbf9e19788fdb/crypto/block/block.tlb#L706)(to inspect new config param you can use `od` command in mytonctrl):

— To vote via mytonctrl you need to use the command: `vo 29795181976365520175863428275263019662169778992074990458062119590680042465200`

— If you don't use mytonctrl use this [instruction](https://ton.org/docs/#/howto/config-params?id=_5-an-automated-way-for-voting-for-configuration-proposals).

---

## [24] 2022-08-08T13:40:41+00:00

- Permalink: https://t.me/tonstatus/24
- Author: TON Status
- Views: 10.1K

Due to the temporary decrease in the efficiency of validators after the current elections, **we urge you to postpone the update by 4 hours until 17:00 UTC.**

If you have already updated - it's OK, nothing needs to be done.

---

## [25] 2022-08-08T17:08:11+00:00

- Permalink: https://t.me/tonstatus/25
- Author: TON Status
- Views: 9.71K

We found imperfections in recent TON node update. Please **postpone upgrade till special notification**.

---

## [26] 2022-08-11T14:01:11+00:00

- Permalink: https://t.me/tonstatus/26
- Author: TON Status
- Views: 9.63K

Everything is [ready](https://github.com/ton-blockchain/ton) to continue.

**Validators please continue upgrade and follow instructions from recent post**: [upgrade and vote](https://t.me/tonstatus/23).

Validators who have already upgrade on August 8 (and not on `570da56` commit), **please repeat all steps again**.

---

## [27] 2022-08-17T19:01:31+00:00

- Permalink: https://t.me/tonstatus/27
- Author: TON Status
- Views: 11.4K

At least 25 validators have not been updated to the previous [update](https://t.me/tonstatus/23) and therefore do not work:
`
ADNL             Pubkey
9D5807...F0A93D  FD362E...9AA3DD
75B0B7...33FB88  BD9194...1503B8
9E8CF3...C9322A  993C80...D8A0D2
1F4E39...497CC6  0D737A...9F24C2
B2DC94...1F4B0E  8299B1...052ABC
1300AB...DFD989  E2645E...5B52EF
DAE434...E55B25  399722...231BF9
7B92DC...EA4A7F  A2E1C9...08CBCF
A33EBA...7AED9C  B3C81D...204097
3090F8...049726  8987DB...19CAF1
DA00B4...C454EB  2C0874...0C3C52
B02E52...FE308D  BC240A...160313
AF402E...85D80B  9B348D...071CE5
BC0BD7...F45107  7E318A...FEF81E
F3876C...E3B9C9  AB1001...1207E5
A8FA83...23E0FA  6B6654...DC32A3
B1E0E6...29F1B8  4AD0F8...0A3B77
E854AA...039227  0FB3E1...F1186D
EDB4ED...9EF8F9  B82717...A755B1
0C45E8...89B7DC  764390...A96FC6
B065B1...7C2749  47B818...F6EC52
AFCCEE...8C3607  7E9B91...9AA75C
B2C527...8AAFA4  08C5FF...9AE000
860F8D...6EB624  76CF73...A5BA4A
016AE2...77A65E  4BBC1B...966761

`All validators who have not updated **need to update in the coming days**, otherwise there will be a vote to **fine them a significant part of the stake**.

To update:

— in mytonctrl commandline run `update` then `upgrade`.

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

---

## [28] 2022-09-06T19:03:16+00:00

- Permalink: https://t.me/tonstatus/28
- Author: TON Status
- Views: 10.1K

Developers, please note that there have been additions to the standards:

- Added `forward_payload` format to [NFT](https://github.com/ton-blockchain/TEPs/blob/master/text/0062-nft-standard.md#forward_payload-format) and [Jettons](https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md#forward_payload-format) standards.

- Added note about data encoded in TL-B schema in [Token Data](https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md#data-serialization) standard.

---

## [29] 2022-09-16T17:21:48+00:00

- Permalink: https://t.me/tonstatus/29
- Author: TON Status
- Views: 9.92K

**TON-Ethereum** bridge **is under maintenance **due to recent update of Ethereum network and will be resumed as soon as possible. We will notify you about that. **All unprocessed swaps are safe** and will be processed once operations resume.
**TON-BSC bridge works as usual.**

---

## [30] 2022-09-20T09:44:12+00:00

- Permalink: https://t.me/tonstatus/30
- Author: TON Status
- Views: 9.9K

**TON-Ethereum bridge is running again! 
**
All previous transfers have been processed. 

Thanks for waiting.

---

## [31] 2022-10-04T18:13:58+00:00

- Permalink: https://t.me/tonstatus/31
- Author: TON Status
- Views: 22.3K

**Network security update**

Network update is scheduled on **October 6 08:00 GMT.** 

We are asking mainnet validators to schedule time for upgrade your validator software. 

Detailed instructions and information will be published on October 6.

---

## [33] 2022-10-06T07:14:33+00:00

- Permalink: https://t.me/tonstatus/33
- Author: TON Status
- Views: 25.5K

**Mainnet validators: **

Please start update of your node software from **October 6 8:00** **GMT** to [new version](https://github.com/ton-blockchain/ton): 

— in mytonctrl commandline run `update` then `upgrade`.

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

Please avoid update one hour prior and two hours after start of new validation cycle; on October 6 new validation round will start around 16:00 GMT, thus **avoid update** in **15:00-18:00 GMT** span.

---

## [34] 2022-10-12T11:54:37+00:00

- Permalink: https://t.me/tonstatus/34
- Author: TON Status
- Views: 10K

A recent update to FunC introduced a bug related to the optimization of some expressions involving the bitwise NOT `~`.
**Please update **your FunC compiler from [master](https://github.com/ton-blockchain/ton).

---

## [35] 2022-10-27T17:47:56+00:00

- Permalink: https://t.me/tonstatus/35
- Author: TON Status
- Views: 9.72K

**Telegram Usernames and TON DNS
**
Given that Telegram usernames [comply](https://github.com/TelegramMessenger/telemint) with [TON DNS](https://github.com/ton-blockchain/TEPs/blob/master/text/0081-dns-standard.md) standard, we consider it a great idea to add the "[t.me](http://t.me/)" domain zone to the TON DNS root smart contract.

Almost all TON wallets and apps allow you to enter a ".ton" domain instead of a wallet address.

After updating the root TON DNS, it will be possible to enter a Telegram username into TON apps in the same way as ".ton" domains. In other words, you will be able to send Toncoins to "any.[t.me](https://t.me/example)" address. The TON apps themselves will not require modifications.

Since the blockchain configuration can only be changed by validator voting, we’re scheduling a network vote for this proposal on **Oct. 31** **at 12:00 UTC**. Validators, please be ready to send your vote at this time. Detailed instructions will be posted later.

---

## [36] 2022-10-30T17:30:53+00:00

- Permalink: https://t.me/tonstatus/36
- Author: TON Status
- Views: 10.2K

We remind you that **tomorrow** at **12:00 UTC** all validators will need to send their vote for the DNS proposal.

Please stay in touch.

---

## [37] 2022-10-31T12:00:01+00:00

- Permalink: https://t.me/tonstatus/37
- Author: TON Status
- Views: 13.2K

**Vote to change the root DNS smart contract**

The new root DNS smart contract which supports both .ton and .t.me domains has the following address [Ef_lZ1T4NCb2mwkme9h2rJfESCE0W34ma9lWp7-_uY3zXDvq](https://tonscan.org/address/Ef_lZ1T4NCb2mwkme9h2rJfESCE0W34ma9lWp7-_uY3zXDvq).

You can check out its source code on [GitHub](https://github.com/ton-blockchain/dns-contract/blob/d08131031fb659d2826cccc417ddd9b98476f814/func/root-dns.fc).

— Added support for [t.me domain zone](https://tonscan.org/address/EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi) - Telegram usernames.

— Added short alias [www.ton](http://www.ton/) for the [foundation.ton](http://foundation.ton/) site.

— .ton domain zone support without changes.

Network validators, please vote for this proposal.

To vote via mytonctrl, you need to use the command: vo 110945915504048090704740762384722970647335048403405846922858187005120712761626

If you don't use mytonctrl, use this [instruction](https://ton.org/docs/#/howto/config-params?id=_5-an-automated-way-for-voting-for-configuration-proposals).

---

## [38] 2022-11-02T11:23:54+00:00

- Permalink: https://t.me/tonstatus/38
- Author: TON Status
- Views: 13.1K

The voting was successfully completed, the root TON DNS smart contract was updated.

---

## [39] 2022-11-02T11:24:13+00:00

- Permalink: https://t.me/tonstatus/39
- Author: TON Status
- Views: 14.3K

[**t.me**](http://t.me/)** support in your applications:
**
—  if you are using **tonlib** no action is required.

—  if you are using **tonweb** - make sure that tonweb version is 0.0.58 or higher.

—  if you use another solution - make sure you get root DNS smart contract from network config number 4.

---

## [40] 2022-12-01T19:46:48+00:00

- Permalink: https://t.me/tonstatus/40
- Author: TON Status
- Views: 14K

**Testnet** **came back to life**

Developers using testnet: please update the [config](https://ton-blockchain.github.io/testnet-global.config.json) and, if necessary, rebuild the tonlib from last commit of the [testnet](https://github.com/ton-blockchain/ton/commits/testnet) branch.

---

## [41] 2022-12-29T15:17:22+00:00

- Permalink: https://t.me/tonstatus/41
- Author: TON Status
- Views: 12.1K

Update of the network is scheduled on** January 9** 2023. We are asking mainnet validators, full-node and liteserver owners to schedule time for the maintenance.

---

## [42] 2023-01-08T12:47:03+00:00

- Permalink: https://t.me/tonstatus/42
- Author: TON Status
- Views: 16.8K

Validators: we remind you that tomorrow at **13:00 UTC** an [network update](https://t.me/tonblockchain/175) is scheduled - you will need to update your software at that time.

Please be in touch tomorrow at **13:00 UTC**, detailed instructions will be published.

---

## [43] 2023-01-09T13:00:02+00:00

- Permalink: https://t.me/tonstatus/43
- Author: TON Status
- Views: 18.5K

**Mainnet validators and lite server owners: **

Please update your node software to the [new version](https://t.me/tonblockchain/175): 

— in mytonctrl run `update` then `upgrade`.

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

---

## [44] 2023-01-23T16:02:38+00:00

- Permalink: https://t.me/tonstatus/44
- Author: TON Status
- Views: 13.7K

**Scheduled network update on January 31
**
We are asking validators to schedule a time on **January 31** at **12:00 UTC** for validator software update.

The [update](https://github.com/ton-blockchain/ton/commits/testnet) will include the functionality needed for the last community [proposal](https://t.me/tonblockchain/178), as well as some bug fixes.

Please note that no addresses will be suspended with this update - voting for community proposal is scheduled for February 21.

---

## [45] 2023-01-31T12:02:12+00:00

- Permalink: https://t.me/tonstatus/45
- Author: TON Status
- Views: 16.1K

**Mainnet validators**

Please update your node software to the [new version](https://t.me/tonstatus/44) (commit `fc9542f`): 

— install fastcrc packet via `pip install fastcrc` command

— in mytonctrl run `update` then `upgrade`.

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

---

## [46] 2023-02-20T15:42:00+00:00

- Permalink: https://t.me/tonstatus/46
- Author: TON Status
- Views: 13.4K

**Mainnet validators**

Please schedule a time tommorow on **February 21** from **06:00 UTC** to **15:00 UTC** for [community proposal for tokenomics optimization](https://t.me/tonblockchain/178) voting.

You will need to send your vote in that time frame.

Detailed instructions will be published tomorrow at 06:00 UTC.

---

## [47] 2023-02-21T06:34:42+00:00

- Permalink: https://t.me/tonstatus/47
- Author: TON Status
- Views: 14.2K

**Mainnet validators**

Please take part in the voting for [community proposal for tokenomics optimization](https://t.me/tonblockchain/178).

1. Make sure you upgrade your validator software to `fc9542f`. This is a mandatory step to avoid network problems and keep your validators up and running.

Whatever your choice (vote for or against or not vote) you need to upgrade the software. The upgrade itself does not suspend any accounts.

Type `status` in mytonctrl and make sure that "Validator version" is "`fc9542f (master)`".

If not please upgrade your software as described in the [previous post](https://t.me/tonstatus/45).

2. To vote for via mytonctrl, you need to use the command: `vo 19333172216833189062833063765885523261394886618802241765562853343290715157530`

If you don't use mytonctrl, use this [instruction](https://ton.org/docs/develop/howto/config-params#4-voting-for-configuration-proposals).

To vote against just do nothing.

Current validation round ends at 21 February, 17:06:27 UTC.

Next round ends at 22 February, 11:18:43 UTC.

If 75%+ of the positive votes of the validators are collected in two rounds in a row, then the proposal will be accepted.

---

## [48] 2023-03-02T12:49:39+00:00

- Permalink: https://t.me/tonstatus/48
- Author: TON Status
- Views: 40.2K

**Informing: gas limit increased
**
The number of TON validators is growing rapidly. Over the previous two months, the number of validators increased by ~30% and almost reached three hundred.

To better adjust network parameters for increased activity of TON users and validators we [scheduled](https://ton.org/roadmap) Network Config Adjustment in March.

But the growth of the network has exceeded our wildest expectations, and it was necessary to urgently update some parameters in order to continue the smooth operation. In particular, `special_gas_limit` and `block_gas_limit` of `ConfigParam 20` were set to `25m` and `27m`, respectively. Full information can be found [here](https://ton.org/docs/develop/smart-contracts/governance#emergency-update).

These parameters, as well as some others, are planned to be overwritten by validator voting later this month.

This message is for informational purposes only and no action is required. All smart contracts, validators, etc. work without changes.

---

## [49] 2023-03-03T18:19:02+00:00

- Permalink: https://t.me/tonstatus/49
- Author: TON Status
- Views: 20.6K

**Scheduled network update on March 7**

We are asking validators to schedule a time on **March 7** at **10:00 UTC** for validator software update.

This update contains:
— Improvement of ADNL connection stability
— Transaction emulator support and `getAccountStateByTransaction` method
— Fixes of typos, undefined behavior and timer warnings
— Handling incorrect literal values in funC

---

## [50] 2023-03-07T10:00:00+00:00

- Permalink: https://t.me/tonstatus/50
- Author: TON Status
- Views: 19.3K

**Mainnet validators and lite server owners: **

Please update your node software to the [new version](https://t.me/tonstatus/49) (commit `e37583e`): 

— in mytonctrl run `update` then `upgrade`.

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

---

## [51] 2023-03-07T12:15:15+00:00

- Permalink: https://t.me/tonstatus/51
- Author: TON Status
- Views: 20.6K

Some validators with old `cmake` may encounter compilation errors. This issue can be resolved by **update** of `cmake` to version **3.13 or newer**.

---

## [52] 2023-03-26T11:45:55+00:00

- Permalink: https://t.me/tonstatus/52
- Author: TON Status
- Views: 20.8K

**Mainnet validators**

Please schedule a time on **March 28** from **06:00 UTC** to **18:00 UTC** for network config adjustment voting.

You will need to send your vote in that time frame.

We are constantly working on the security and stability of the TON network. Based on our work, as well as the audits made, we propose to adjust some network parameters. Read more [here](https://telegra.ph/Network-Config-Adjustment-03-25).

---

## [53] 2023-03-27T21:02:14+00:00

- Permalink: https://t.me/tonstatus/53
- Author: TON Status
- Views: 18.3K

**Mainnet validators**

Please schedule a time on **March 30** from **09:00 UTC** to **23:59 UTC** for Ethereum-TON token bridge launch voting.

You will need to send your vote in that time frame.

Using this bridge, users can transfer any ERC-20 tokens (for example, USDC or USDT) originally created on Ethereum to the TON Blockchain, with the ability to return them back.

The transferred tokens will be represented on TON as regular Jettons so that TON services, such as DEXs, will be able to work with them without any additional modifications.

You can get acquainted with smart contracts [here](https://github.com/ton-blockchain/token-bridge-solidity) and [here](https://github.com/ton-blockchain/token-bridge-func).

We have thoroughly tested smart contracts, which have also been verified by a public cracking [contest](https://t.me/toncontests/101) and several audit teams.

---

## [54] 2023-03-28T08:48:41+00:00

- Permalink: https://t.me/tonstatus/54
- Author: TON Status
- Views: 19.9K

**Mainnet validators**

Please take part in the voting for [network config adjustment](https://t.me/tonstatus/52).
Details of updates are given [here](https://telegra.ph/Network-Config-Adjustment-03-25).

Config -> Proposal ID:
`ConfigParam 11` - `104251427957130836362131914743430303744050376869767825890248635817780896529865`
`ConfigParam 12` - `68644855851465872030205651571190511122474252244413117504418016147585963562256`
`ConfigParam 16` - `21913192542281065894517833067967760516757865940510587884467266715230471808616`
`ConfigParam 17` - `83229620004207544647600776947354296059212733246260658452438591126244979192990`
`ConfigParam 20` - `66172439292525879991035935034362592142503987754475792945641996893942931771391`
`ConfigParam 22` - `71412715986879689542565522432541314593814320252603393842272705405765569717182`
`ConfigParam 31` - `17801562545506968536218982702406368220064050105405933681104430238993919379262`


If you use mytonctrl:
1. Update mytonctrl via command: `update`
2. Check proposals via command: `od <proposal-id>`
2. Vote for all proposals:

```
vo 104251427957130836362131914743430303744050376869767825890248635817780896529865 68644855851465872030205651571190511122474252244413117504418016147585963562256 21913192542281065894517833067967760516757865940510587884467266715230471808616 83229620004207544647600776947354296059212733246260658452438591126244979192990 66172439292525879991035935034362592142503987754475792945641996893942931771391 71412715986879689542565522432541314593814320252603393842272705405765569717182 17801562545506968536218982702406368220064050105405933681104430238993919379262

```


If you don't use mytonctrl, use this [instruction](https://docs.ton.org/develop/howto/config-params#4-voting-for-configuration-proposals).

To vote against just do nothing.

Current validation round ends at Mar 28 2023 20:33:12 UTC

Next round ends at Mar 29 2023 14:45:28 UTC

If 75%+ of the positive votes of the validators are collected in two rounds in a row, then the proposal will be accepted.
  
  Telegram

**Link preview:**
- [TON Status](https://t.me/tonstatus/52)
  - Mainnet validators

Please schedule a time on March 28 from 06:00 UTC to 18:00 UTC for network config adjustment voting.

You will need to send your vote in that time frame.

We are constantly working on the security and stability of the TON network. Based…

---

## [55] 2023-03-30T10:39:16+00:00

- Permalink: https://t.me/tonstatus/55
- Author: TON Status
- Views: 24.3K

**Mainnet Validators
**
Please vote for [Ethereum-TON token bridge](https://t.me/tonstatus/53) launch.

To vote via mytonctrl you need to use the command:
`vo 28851551939450771219110986936119217141088470550887500894600047259609966544800`

You can get acquainted with verified smart contracts: [TON ](https://tonscan.org/address/Ef-1JetbPF9ubc1ga-57oHoOyDA1IShJt-BVlJnA9rrVTfrB)[Bridge](https://tonscan.org/address/Ef-1JetbPF9ubc1ga-57oHoOyDA1IShJt-BVlJnA9rrVTfrB), [Governance](https://tonscan.org/address/Ef8hHxV0v2I9FHh3CMX91WXjKaJav6SQlemEQm8ZvPBJdLde), [Collector](https://tonscan.org/address/EQDF6fj6ydJJX_ArwxINjP-0H8zx982W4XgbkKzGvceUWvXl), [EVM ](https://etherscan.io/address/0xb323692b6d4DB96af1f52E4499a2bd0Ded9af3C5)[Bridge](https://etherscan.io/address/0xb323692b6d4DB96af1f52E4499a2bd0Ded9af3C5).

---

## [56] 2023-04-07T07:02:36+00:00

- Permalink: https://t.me/tonstatus/56
- Author: TON Status
- Views: 26.1K

**Scheduled network update on April 11**

We are asking validators to schedule a time on **April 11 at 13:00** **UTC** for validator software update.

This update contains:
— CPU load optimization
— Network throughput improvements
— Update for Fift and Fift libraries
— Better handling of incorrect inputs in funC

---

## [57] 2023-04-11T13:02:06+00:00

- Permalink: https://t.me/tonstatus/57
- Author: TON Status
- Views: 29.5K

**Mainnet validators, lite server and DHT node owners: **

Please update your node software to the [new version](https://github.com/ton-blockchain/ton/releases/tag/v2023.04) (commit `e6f2205`): 

— in mytonctrl run `upgrade`.

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

---

## [58] 2023-05-01T14:20:28+00:00

- Permalink: https://t.me/tonstatus/58
- Author: TON Status
- Views: 32.5K

**Mainnet validators**

To increase the protection of TON from DDoS attacks please update your node software to the new version (commit `6b09680`): 

— in mytonctrl run `upgrade`.

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

---

## [59] 2023-05-09T17:57:24+00:00

- Permalink: https://t.me/tonstatus/59
- Author: TON Status
- Views: 27K

**Scheduled network update on May 10**

We are asking validators to schedule a time on **May 10 at 12:00** **UTC** for validator software update.

This **UPDATE IS MANDATORY** and will contain further improvements of DDoS protection.

---

## [60] 2023-05-10T12:01:57+00:00

- Permalink: https://t.me/tonstatus/60
- Author: TON Status
- Views: 28.5K

**Mainnet validators**

To further increase the protection of TON from DDoS attacks please update your node software to the new version (commit `b87caec`): 

— in mytonctrl run `upgrade`.

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

This **UPDATE IS MANDATORY**.

---

## [61] 2023-05-15T15:47:14+00:00

- Permalink: https://t.me/tonstatus/61
- Author: TON Status
- Views: 27K

**Scheduled network update on May 17**

We are asking validators to schedule a time on **May 17 at 10:00** **UTC** for validator software update.

This update contains:
— Archive manager optimization
— Catchain (basic consensus protocol) security improvements
— Update for Fift libraries and FunC

---

## [62] 2023-05-17T10:02:23+00:00

- Permalink: https://t.me/tonstatus/62
- Author: TON Status
- Views: 29K

**Mainnet validator node owners: **

Please **update** your node software to the new version (commit `3bc81b`) and **vote** for token bridge config update: 

— in mytonctrl run `upgrade`

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

---

## [63] 2023-05-17T13:12:55+00:00

- Permalink: https://t.me/tonstatus/63
- Author: TON Status
- Views: 33.6K

**Mainnet validator node owners:**

Jetton bridge deployed in April mints jettons with tunable parameters, in particular network config controls minimal storage fee, computation fee and some other parameters which every request to jetton wallet should ensure. Initial parameters in config were chosen very conservatively and ensures that jetton will work even in the case of much higher gas fees.

Since jetton bridge release it became clear that these parameters can be loosen, moreover this loosening will facilitate a few popular protocols on TON. Config update adjusts bridge token parameters by making min_storage_fee lower from 0.01 TON -> 0.008 TON, which will meet all requirements

Please participate after updating your node software ([https://t.me/tonstatus/62](https://t.me/tonstatus/62)):

— in mytonctrl run `vo 41931971047650217108149196465201598531251916030381229985888531695932854467494`

---

## [64] 2023-05-30T09:29:02+00:00

- Permalink: https://t.me/tonstatus/64
- Author: TON Status
- Views: 37.9K

**Scheduled network update on June 1**

We are asking validators to schedule a time on **June 1 at 9:00** **UTC** for validator software update.

This update introduces (inactive by default) an optional deflation mechanism that will further improve tokenomics if validators so decide.

---

## [65] 2023-06-01T09:22:09+00:00

- Permalink: https://t.me/tonstatus/65
- Author: TON Status
- Views: 42.6K

**Mainnet validator node owners: **

Please update your node software to the new version (commit `30f06f9`): 

— in mytonctrl run `upgrade`

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

This update contains **mandatory** nodes preparation for future deflationary mechanisms. Note that these mechanisms are **disabled by default** and will require **validator voting** to be activated.

---

## [66] 2023-06-15T18:08:13+00:00

- Permalink: https://t.me/tonstatus/66
- Author: TON Status
- Views: 45.6K

**Mainnet Validators
**
Please vote for enable burning of 50% of network fees and create black hole at address `-1:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`

[More info »](https://blog.ton.org/ton-community-proposal-to-implement-toncoin-real-time-burn)

[Public poll results »](https://ton.vote/EQCb8dxevgHhBnsTodJKXaCrafplHzAHf1V2Adj0GVlhA5xI/proposal/EQAx5JjTHpQ_5EeWBAErl4_AWhh_JFBh2UvuTWAeqdbpC0C1)

1) Please check that your node software is updated to the latest version (it should be on `30f06f9` or `cc0eb45` commits, both are fine). If your node is outdated, upgrade immediately via `upgrade` command in MyTonCtrl.

2) To vote via mytonctrl you need to use the command:
`vo 27848878697373229758863607066613445539857911080624014948686208648269380730918`

If 75%+ of the positive votes of the validators are collected in two rounds of next 6 rounds, then the proposal will be accepted.

---

## [67] 2023-06-17T11:12:40+00:00

- Permalink: https://t.me/tonstatus/67
- Author: TON Status
- Views: 47.1K

**Mainnet full node** **and lite server owners **

Please update your node software to commit `cc0eb45` if you haven't done it before: 

— in mytonctrl run `upgrade`

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

---

## [68] 2023-08-08T06:41:29+00:00

- Permalink: https://t.me/tonstatus/68
- Author: TON Status
- Views: 49.8K

**Scheduled network update on August 10**

We are asking validators to schedule a time on **August 10** at **9:00 UTC** for validator software update.

This update is mandatory and contains optimization of block collation.

---

## [69] 2023-08-10T09:01:33+00:00

- Permalink: https://t.me/tonstatus/69
- Author: TON Status
- Views: 60.2K

**Mainnet full node** **and lite server owners **

Please update your node software to commit `e1197b1` if you haven't done it before: 

— in mytonctrl run `upgrade`

— if you don't use mytonctrl please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton)


Update your validators **one by one**, don't update all at the same time.

This update is mandatory.

---

## [70] 2023-08-16T15:08:48+00:00

- Permalink: https://t.me/tonstatus/70
- Author: TON Status
- Views: 63.2K

**TON** **dapps developers
**
The old method of communication between dapp and browser extension (`window.ton`) is completely deprecated. Please replace it with [TON Connect](https://github.com/ton-connect) if you haven't already.

Browser extensions will stop providing the `window.ton` interface in a month at September 15.

Please use the unified [TON Connect UI ](https://github.com/ton-connect/sdk/tree/main/packages/ui)SDK and [guidelines](https://www.figma.com/proto/P1kVD9AFOypkJTgqbfSXpU/Connect?page-id=2818%3A3690&amp;type=design&amp;node-id=2820-3722&amp;viewport=174,286,0.24&amp;t=98hkZEAGYdRE14DG-1&amp;scaling=min-zoom&amp;mode=design) to provide the best possible experience for The Open Network users.

---

## [71] 2023-10-20T13:14:01+00:00

- Permalink: https://t.me/tonstatus/71
- Author: TON Status
- Views: 39.8K

**Scheduled network update on October 25**

We are asking validators to schedule a time on **October 25** at **9:00 UTC** for validator software update.

This update is mandatory and contains a series of additional security checks in node software to improve stability of the network.

---

## [72] 2023-10-25T08:59:14+00:00

- Permalink: https://t.me/tonstatus/72
- Author: TON Status
- Views: 43.5K

**Mainnet full node** **and** **lite server owners **

Please update your node software.

[Instructions for update.](https://telegra.ph/v202310-Upgrade-Notes-10-25)

This update **is mandatory** for validators. It is also recommended for lite servers and full nodes for better stability.


Update includes:

— A series of additional security checks in node:
     • special cells in action list
     • initstate in external messages
     • peers data prior to saving to disk.
— Human-readable timestamps in explorer

---

## [73] 2023-11-26T13:28:04+00:00

- Permalink: https://t.me/tonstatus/73
- Author: TON Status
- Views: 37.9K

**Scheduled network update on November 30**

We are asking validators, full node and lite server owners to schedule a time on **November 30** at **12:00 UTC** for validator software update.

This update is mandatory and contains a series improvements
of node security and stability. It also contains new TVM functionality disabled by default: this functionality will be activated when the network is upgraded and validators vote to enable new TVM.

---

## [74] 2023-11-30T11:59:01+00:00

- Permalink: https://t.me/tonstatus/74
- Author: TON Status
- Views: 28.6K

**Mainnet full node** **and** **lite server owners **

Please update your node software.

[Instructions for update.](https://telegra.ph/v202311-Upgrade-Notes-11-30)

This update **is mandatory** for validators, lite servers and full nodes.


Target versions:
`mytonctrl: 342bad2 (master)
validator: 51baec4 (master)`

Update includes:

— New TVM Functionality. (Disabled by default)
— A series of emulator improvements: libraries support, higher max stack size, etc
— A series of tonlib and tonlib-cli improvements: wallet-v4 support, getconfig, showtransactions, etc
— Changes to public libraries: now contract can not publish more than 256 libraries (config parameter) and contracts can not be deployed with public libraries in initstate (instead contracts need explicitly publish all libraries)
— Changes to storage due payment: now due payment is collected in Storage Phase, however for bouncable messages fee amount can not exceed balance of account prior to message.

---

## [75] 2023-12-05T12:58:37+00:00

- Permalink: https://t.me/tonstatus/75
- Author: TON Status
- Views: 30.6K

**Mainnet Validators**

Please be prepared to **vote** to enable TVM Update on **December 12 at 9:00 UTC**.

[More info »](https://t.me/tonblockchain/223)

Please check that your node software is updated to the latest version (it should be on `51baec4` commits, both are fine). If your node is outdated, [upgrade immediately](https://t.me/tonstatus/74).

If 75%+ of the positive votes of the validators are collected in two rounds of 6 rounds, then TVM Update will be enabled.

---

## [76] 2023-12-06T19:05:42+00:00

- Permalink: https://t.me/tonstatus/76
- Author: TON Status
- Views: 32.7K

**Mainnet Validators**

To improve processing of recent payload please upgrade your validators, in MyTonCtrl:

`upgrade`

If you are on `queue_clearance3` and/or on `027338c` commit - you are fine, please do not switch to master branch right now, chose time in coming days.

If you are owner of LiteServer, no immediate update is needed.

---

## [77] 2023-12-07T10:00:16+00:00

- Permalink: https://t.me/tonstatus/77
- Author: TON Status
- Views: 35.7K

**Mainnet Validators**
**Mandatory action required**

If your validator nodes have less than 15 vCPUs we ask you to not participate in next elections for some times.
To do it, use 

```
set stake 0

```

command in **MyTONCtrl**. If, instead of MyTONCtrl you use your own election scripts and has less than 15 vCPU, please stop them.

---

## [78] 2023-12-08T10:34:37+00:00

- Permalink: https://t.me/tonstatus/78
- Author: TON Status
- Views: 34.8K

Mainnet validators, get ready to update your software today at **12:00 UTC**.

More updates are also possible during this day, please stay in touch.

---

## [79] 2023-12-08T12:00:50+00:00

- Permalink: https://t.me/tonstatus/79
- Author: TON Status
- Views: 33.2K

**Mainnet validators
**
Please update your validator software to commit `9b6d699` of master branch.

To do it run in mytonctrl:

`upgrade master`

If you have several validator nodes, update them one by one (updated, waited for synchronization, and moved on to the next one).

---

## [80] 2023-12-09T12:36:20+00:00

- Permalink: https://t.me/tonstatus/80
- Author: TON Status
- Views: 35.7K

**Critical bug detected and fixed thanks to bug bounty
**
It was found that no special check against "all bytes same" public keys in OpenSSL crypto.

Thus, due to the recent [zeroing](https://t.me/tonblockchain/221) of the configuration key, a vulnerability has opened up.

Just [now](https://tonscan.org/tx/MU%2FNmSFkC0pJiCi730Fmt6PszBooRZkzgiQMv0sExfY=) we have used this issue to yet another time update config contract storage - bytes of public key are replaced with 
`82b17caadb303d53c3286c06a6e1affc517d1bc1d3ef2e4489d18b873f5d7cd1` - 
sha256 hash of `Not a valid curve point` phrase. This means that the 
vulnerability is closed and no one can use the configuration key.

We thank everyone who participated in the [TON bug bounty](https://github.com/ton-blockchain/bug-bounty)! This is an example of a bug that gets a top reward.

---

## [81] 2023-12-12T12:48:46+00:00

- Permalink: https://t.me/tonstatus/81
- Author: TON Status
- Views: 49.9K

**TON coped with minting activity!**

What a week! Not without difficulty, but we did it.

Just for yesterday, TON has processed more than **21 million** transactions (which is ~**10%** of all transactions over the entire previous period). At the same time, we have maintained the cheap fixed cost of transactions, as before. In total, more than **90K TON** were spent on network commissions over the past week.

We have learned lessons, some of the fixes have already been made, and work on the remaining ones is planned.

**What is next?**

This stress test revealed points of further growth and improvement throughout the entire ecosystem: Liteservers network, Resilient indexing APIs, message delivery infrastructure. Recent days results reassured our confidence that we will solve huge challenge of truly mass-adoption and will bring the crypto to every pocket!

The upcoming updates are as follows:

• Next TON validator software upgrade is planned to December 14.

• Voting for TVM upgrade is moved for December 19.

• Tech report on events December 5 - December 12 is planned to the end of this week.

• New requirements and benchmarks for validator and lite-server hardware are planned to be released on next week.

**Thanks to the community**

We would like to note the well-coordinated and efficient work of community, in particular [@Wallet](https://t.me/Wallet), [Tonkeeper](https://t.me/tonkeeper_news), [TON API](https://tonviewer.com/blackout), [dTON](https://t.me/dtonforum), [re:doubt](https://tonalytica.redoubt.online/public/dashboards/9RmDshS0lvRDKjBseR2QtlVlAQa0tTHpAQmBfOTe?org_slug=default), [Tonhub](https://tonwhales.com/staking) and [Orbs](https://www.orbs.com/). Services have already begun eliminating detected bottlenecks.

Stay in touch!

---

## [82] 2023-12-14T11:30:55+00:00

- Permalink: https://t.me/tonstatus/82
- Author: TON Status
- Views: 44.9K

**Mainnet full node** **and** **lite server owners **

Please update your node software.
[
Instructions for update.](https://telegra.ph/v202311-Upgrade-Notes-11-30)

This update **is mandatory** for validators.


Target versions:
`mytonctrl: 342bad2 (master)
validator: 6897b56 (master)`

This update includes:

— Optimized message queue handling, now queue cleaning speed doesn't depend on total queue size

If you have several validator nodes, update them one by one (update, waite for synchronization, move to the next one).

---

## [83] 2023-12-18T11:26:48+00:00

- Permalink: https://t.me/tonstatus/83
- Author: TON Status
- Views: 44.9K

**Reminder
Mainnet Validators**

Please be prepared to vote to enable TVM Update **tomorrow** on **December 19 at 9:00 UTC**.
[
More info »](https://t.me/tonblockchain/223)
  
  Telegram

**Link preview:**
- [The Open Network](https://t.me/tonblockchain/223)
  - Meet the long awaited TVM update in mainnet

It has undergone months of testing on testnet, bug bounties and been audited by one of the world's best auditor - Trail of Bits.

This update makes TVM one of the most versatile virtual machines around, including…

---

## [84] 2023-12-19T09:02:21+00:00

- Permalink: https://t.me/tonstatus/84
- Author: TON Status
- Views: 52K

**Mainnet Validators
**
Please vote for enabling new TVM features.

[More info »](https://t.me/tonblockchain/223)


1) Please check that your node software is updated to the latest version (it should be on `6897b56` commit). If your node is outdated, upgrade immediately via `upgrade` command in MyTonCtrl.

2) To vote via mytonctrl you need to use the command:

```
vo 85710661254977802982316316252924652442954445780328502685001287213020431864656

```



If 75%+ of the positive votes of the validators are collected in two 
rounds of next 6 rounds, then the proposal will be accepted.

---

## [85] 2023-12-19T11:43:32+00:00

- Permalink: https://t.me/tonstatus/85
- Author: TON Status
- Views: 60.6K

**New hardware requirements**

**Validators:**
* 16 x Cores CPU
* 64GB Memory
* 1TB NVME SSD **OR** Provisioned 64+k IOPS storage
* 1 Gbit/s network connectivity

**Full Nodes:**
* 16 x Cores CPU
* 64GB Memory
* 1TB SSD **OR** Provisioned 32+k IOPS storage
* 1 Gbit/s network connectivity

**Archival Nodes:**
* 16 x Cores CPU
* 128GB ECC Memory
* 3.8TB SSD **OR** Provisioned 32+k IOPS storage (3.8TB assumes usage of ZFS volume with compression enabled).
* 1 Gbit/s network connectivity

Note that disk performance is important.

---

## [86] 2023-12-19T11:43:55+00:00

- Permalink: https://t.me/tonstatus/86
- Author: TON Status
- Views: 77.3K

**Guidelines for API clients**

Public liteservers (from the global config) and free plans in [TON API](https://tonapi.io/) and [Toncenter](https://toncenter.com/) exist to get you started with TON quickly. It can be used for learning to program in TON, or for applications and scripts that do not require 100% uptime.

If you're a developer of a popular product you can use:

— More advanced plans in [Toncenter](https://t.me/tonapibot) or [TON API](https://tonconsole.com/), which provide more requests per second and better stability. 

— Other APIs like [dton](http://dton.io/), [re:doubt](https://beta.redoubt.online/), [TON Access](https://www.orbs.com/ton-access/) may also provide extended plans.

— [Run](https://docs.ton.org/participate/run-nodes/full-node#how-to-run-the-node-video) your own node. In this case please pay attention to the [hardware requirements](https://t.me/tonstatus/85).

---

## [87] 2024-01-11T11:36:49+00:00

- Permalink: https://t.me/tonstatus/87
- Author: TON Status
- Views: 68K

**BSC Bridge Mantainance**

Toncoin transfers between the BSC and TON networks via [bridge.ton.org](http://bridge.ton.org/) have been suspended for unscheduled technical works. The work will take approximately one week. We apologize for any inconvenience.

All funds are safe and all unprocessed transfers will be processed after the technical work is completed.

Toncoin and token transfers between Ethereum and TON networks are operating as normal.

---

## [88] 2024-01-15T16:00:52+00:00

- Permalink: https://t.me/tonstatus/88
- Author: TON Status
- Views: 129K

Recently a highload wallet of [@wallet](https://t.me/wallet) in mainnet was stuck because current gas limit (1M) is not enough to clean up old queries, thus locking funds inside. More technical details can be found  in [crypto/smartcont/highload-wallet-v2-code.fc](https://github.com/ton-blockchain/ton/blob/testnet/crypto/smartcont/highload-wallet-v2-code.fc#L7-L19).

While locked funds represent only a small part of the total user assets on platform, loss of access to it can undermine the trust and user experience in TON.

To restore access to funds we plan to propose to validators temporarily increase gas limit for account [EQD_v9j1rlsuHHw2FIhcsCFFSD367ldfDdCKcsNmNpIRzUlu](https://dton.io/a/EQD_v9j1rlsuHHw2FIhcsCFFSD367ldfDdCKcsNmNpIRzUlu).

Next update planned to January 18 will contains (disabled by default) corresponding changes among other things and, once network will be upgraded, we will propose validators to vote for increased gas limits.

When developing node software, we strive for the best user experience. To this end, we collaborate with projects in the ecosystem, including exchanges and wallets. In particular, in situations where it is possible to correct problems without undermining monetary policy (without printing new money), we develop and invite validators to approve changes to the node like those mentioned above. In addition, contracts, guidelines, tools and documentation are being improved to prevent such situations from arising.

---

## [89] 2024-01-15T16:00:52+00:00

- Permalink: https://t.me/tonstatus/89
- Author: TON Status
- Views: 125K

**Scheduled network update on January 18**

We are asking validators to schedule a time on **January 18** at **9:00 UTC** for validator software update.

This update is mandatory and contains optimization of node stability as well as disabled by default changes to gas_limit behavior.

---

## [90] 2024-01-18T08:59:06+00:00

- Permalink: https://t.me/tonstatus/90
- Author: TON Status
- Views: 166K

**Mainnet full node and lite server owners**

Please update your node software (see "Target versions")

[Instructions for update](https://telegra.ph/v202310-Upgrade-Notes-10-25)

Target versions:
mytonctrl `b9d5937`
validator `9728bc6`

This update ***is mandatory*** for validators and lite servers.

Update includes:

- Fixes in how gas in transactions on special accounts is accounted in block limit.
- Improvements in LS behavior
- Improvements in DHT work and storage, CellDb, config.json ammendment, 
peer misbehavior detection, validator session stats collection, 
emulator.

Update also includes [conditional increase of gas limit](https://t.me/tonstatus/88) which may be activated by validator voting.

---

## [91] 2024-01-19T13:46:15+00:00

- Permalink: https://t.me/tonstatus/91
- Author: TON Status
- Views: 154K

**Scheduled network update on January 26**

We are asking validators to schedule a time on **January 26** at **9:00 UTC** for validator software update.

This update is mandatory and contains changes to gas_limit behavior that is more gentle for contracts and services. Technical details of upcoming updated and information for smart-contract developers is [here](https://telegra.ph/January-2024-network-updates-and-voting-01-19).

---

## [92] 2024-01-26T09:02:13+00:00

- Permalink: https://t.me/tonstatus/92
- Author: TON Status
- Views: 207K

**Mainnet full node and lite server owners**

Please update your node software (see "Target versions")

Instructions for update

Target versions:
mytonctrl `b9d5937`
validator `8a9ff33`

This update ***is mandatory*** for validators and lite servers.

Update includes:
- Improvement in how gas in transactions on special accounts is accounted in block limit.
- Solution for `block is not applied` issue
- Changes of how [library cells](https://github.com/ton-blockchain/ton/blob/master/doc/GlobalVersions.md#version-5) are handled

---

## [93] 2024-01-30T06:24:49+00:00

- Permalink: https://t.me/tonstatus/93
- Author: TON Status
- Views: 147K

**Mainnet Validators**

Please be prepared to vote for new gas limits behavior and parameters on **February 1 at 9:00 UTC**.

Details can be found [here](https://telegra.ph/January-2024-network-updates-and-voting-01-19). Proposed changes will make block generation, as well as TVM operations regarding libraries more predictable and thus more safe.

**All validators MUST be updated to the latest version before voting**. Target versions:
mytonctrl `b9d5937`
validator `8a9ff33`

---

## [94] 2024-02-01T15:42:38+00:00

- Permalink: https://t.me/tonstatus/94
- Author: TON Status
- Views: 240K

**Mainnet Validators**

Please vote for new gas limits behavior and parameters

[More info »](https://telegra.ph/January-2024-network-updates-and-voting-01-19)


1) Please check that your node software is updated to the latest version (validator should be on `8a9ff33` commit). If your node is outdated, upgrade immediately via upgrade command in MyTonCtrl.

2) Update mytonctrl (validator should be on `da1811d` commit), use commands:

```
update

```


```
set duplicateSendfile true

```


2) To vote via mytonctrl you need to use the command:


```
vo 103351160959426487254455866498906719583068006422970295467232122110660230563283
vo 20149481433343766729971377917926966688629021535513398999071024734089315101195
vo 26493909155671493333100442738656102962830077543704392831296933554790654390192

```


If 75%+ of the positive votes of the validators are collected in two 
rounds of next 6 rounds, then the proposal will be accepted.

---

## [95] 2024-02-04T15:29:17+00:00

- Permalink: https://t.me/tonstatus/95
- Author: TON Status
- Views: 282K

**The TON-BNB Smart Chain **[**bridge**](https://bridge.ton.org/)** is back on track
**
All funds are safe and all transfers have been processed.

We thank users for their patience.

---

## [96] 2024-02-15T18:48:01+00:00

- Permalink: https://t.me/tonstatus/96
- Author: TON Status
- Views: 275K

**Scheduled network update on February 21**

We are asking validators and lite server owners to schedule a time on **February 21** at **9:00 UTC** for validator software update.

This update is mandatory and contains changes improvements to validator synchronization as well as reliability of lite servers.

*Upd: network update was postponed to February 26*

---

## [97] 2024-02-20T08:23:27+00:00

- Permalink: https://t.me/tonstatus/97
- Author: TON Status
- Views: 213K

Network update is moved to February 26 at 10:00 UTC.

---

## [98] 2024-02-26T10:02:15+00:00

- Permalink: https://t.me/tonstatus/98
- Author: TON Status
- Views: 253K

**Mainnet Validators and Liteserver owners**

Please update your node software (see "Target versions")

[Instructions for update.](https://telegra.ph/v202402-Upgrade-Notes-02-17) Note new **section 5 for validators** and **section 6 for Liteserver** owners.

Target versions:
mytonctrl `b9d5937`
validator `692211f`

This update is **mandatory** for validators and lite servers.

Update includes:
- LS improvements: remote runmethods with full c7 and libs, caching, logging
- Precise control of open files
- Improvement of validator synchronization

---

## [99] 2024-03-07T12:53:02+00:00

- Permalink: https://t.me/tonstatus/99
- Author: TON Status
- Views: 241K

**Scheduled network update on March 13**

We are asking validators to schedule a time on **March 13 at 9:00 UTC** for validator software update.

This update is mandatory and contains TVM improvements that facilitate [fee calculations and handling Merkle-proofs](https://docs.ton.org/learn/tvm-instructions/fee-calculation-instructions) on-chain.

Voting for activation of these improvements is scheduled for **March 15**, details on the voting can be found [here](https://telegra.ph/Activation-of-new-TVM-instructions-03-07).

---

## [100] 2024-03-13T09:01:55+00:00

- Permalink: https://t.me/tonstatus/100
- Author: TON Status
- Views: 212K

**Mainnet Validators and Liteserver owners
**
Please update your node software (see "Target versions")

[Instructions for update](https://telegra.ph/v202403-Upgrade-Notes-03-11)

Target versions:
mytonctrl `244cad8`
validator `200508c`

This update is **mandatory** for validators and lite servers and is required for **voting scheduled for March 15**.

---

## [101] 2024-03-15T07:42:31+00:00

- Permalink: https://t.me/tonstatus/101
- Author: TON Status
- Views: 342K

**Mainnet Validators**

Please vote for activation of new opcodes for gas estimation.

[More info about opcodes »](https://docs.ton.org/learn/tvm-instructions/fee-calculation-instructions)
[More info about voting »](https://telegra.ph/Activation-of-new-TVM-instructions-03-07)

1) Please check that your node software is updated to the latest version (validator should be on `200508c` commit). If your node is outdated, upgrade immediately via upgrade command in MyTonCtrl.

2) Please check that your mytonctrl is updated to the latest version (should be on `244cad8` commit). If necessary, you can update your mytonctrl via:


```
update

```

command.

3) To vote via mytonctrl you need to use the command:


```
vo 62943188213554950431567175890704900183650560017761039378090136381016705792762
vo 70812101792553497242391430491941881046928125710785036909221479087825374611301

```


If 75%+ of the positive votes of the validators are collected in two 
rounds of next 6 rounds, then the proposal will be accepted.

*Update: proposals were accepted on March 16.*

---

## [102] 2024-04-08T17:07:43+00:00

- Permalink: https://t.me/tonstatus/102
- Author: TON Status
- Views: 299K

**ATTENTION FOR VALIDATORS — ACTION REQUIRED**

We anticipate a significant increase in network activity starting in mid-April.

In order to keep the network running smoothly, please make sure your validator matches the configuration below.

If it does not match, please upgrade your hardware within the next week.

This is critical and necessary.

**Minimal validators hardware:**
* 16 x Cores CPU
* **128GB** Memory
* 1TB NVME SSD **OR** Provisioned 64+k IOPS storage
* 1 Gbit/s network connectivity

We draw special attention of validators to IOPS disk requirements, it is crucially important for smooth network operation.

If you have several validators - upgrade one by one.

---

## [103] 2024-04-10T12:18:33+00:00

- Permalink: https://t.me/tonstatus/103
- Author: TON Status
- Views: 231K

**Scheduled network update on April 16**

We are asking validators to schedule a time on **April 16** at **11:00 UTC** for validator software update.

This update is **mandatory** and, among other things, contains DB and network usage optimization, LS improvement, transaction executor, tonlib and emulator updates.

---

## [104] 2024-04-16T11:01:16+00:00

- Permalink: https://t.me/tonstatus/104
- Author: TON Status
- Views: 195K

**Mainnet Validators and Liteserver owners
**
Please update your node software (see "Target versions")

[Instructions for update](https://telegra.ph/v202404-Upgrade-Notes-04-10) - take into account **liblz4-dev** installation in section 1 and archive-ttl setting in section 5.

Target versions:
mytonctrl `9182448`
validator  `4cfe1d1`

This update is **mandatory** for validators and lite servers.

---

## [105] 2024-04-16T14:06:00+00:00

- Permalink: https://t.me/tonstatus/105
- Author: TON Status
- Views: 210K

**Mainnet Validators**

Please be prepared to vote for block compression and transaction costs update on **April 18 at 9:00 UTC**.

[Plea to validators](https://telegra.ph/Making-TON-the-Most-Affordable-scalable-Layer-1-Network-04-16)

Tech details on proposals can be found [here](https://telegra.ph/Block-candidates-activation-and-fees-updates-04-15). Proposed changes will make block rate faster and transaction execution cheaper.

**All validators MUST be updated to the latest version before voting**. Target versions:
mytonctrl `9182448`
validator `4cfe1d1`

---

## [106] 2024-04-18T09:44:40+00:00

- Permalink: https://t.me/tonstatus/106
- Author: TON Status
- Views: 280K

**Mainnet Validators**

Please vote for for block compression and transaction costs update.

[Plea for validators ](https://telegra.ph/Making-TON-the-Most-Affordable-scalable-Layer-1-Network-04-16)[»](https://telegra.ph/Block-candidates-activation-and-fees-updates-04-15) 
[More info about voting »](https://telegra.ph/Block-candidates-activation-and-fees-updates-04-15)

1) Please check that your node software is updated to the latest version (validator should be on `4cfe1d1` commit). If your node is outdated, upgrade immediately via upgrade command in MyTonCtrl.

2) Please check that your mytonctrl is updated to the latest version (should be on `9182448` commit). If necessary, you can update your mytonctrl via `update` command.

3) To vote via mytonctrl you need to use the command:

```
vo 12569949138907918341069315485240244200950856934919263564437769934039235613720
vo 31401000267374798460859142836851320859735453480263346121138978843222681889801
vo 41296061520515347990487695386109651690420586907458454458768144735616166931033
vo 49537534789854976259071705210466523357997345897986090889040825189829923897628
vo 96491208725598318198215712468033934914881492234615821929017670238581734249187

```


If 75%+ of the positive votes of the validators are collected in two rounds of next 6 rounds, then the proposal will be accepted.

*Update: proposals were accepted on April 19.*

---

## [107] 2024-05-15T11:32:34+00:00

- Permalink: https://t.me/tonstatus/107
- Author: TON Status
- Views: 268K

**Mainnet Validators and Liteserver owners**

Tomorrow we expect drastic increase in network activity due to listing and minting of the Notcoin project, which is possibly the largest launch in the entire crypto industry in terms of userbase.

Please check you validators and liteserver software is up to date:
Target versions for node is `4cfe1d1`.

Also, please check that your nodes and validators have enough free space on disk. If you have less than 100 GB, check section 5  [here](https://telegra.ph/v202404-Upgrade-Notes-04-10), as well as [database grooming docs](https://docs.ton.org/participate/nodes/node-maintenance-and-security#database-grooming).

We ask you to keep an eye on the validators tomorrow and be ready to take action.

---

## [108] 2024-05-25T14:13:29+00:00

- Permalink: https://t.me/tonstatus/108
- Author: TON Status
- Views: 332K

**Liteserver owners
**
1) Please update MyTonCtrl to the new major MyTonCtrl 2.0 version.

In MyTonCtrl please run:

```
update mytonctrl2
disable_mode validator
enable_mode liteserver
```

Target MyTonCtrl revision is `a4b8bf2`.

2) Then please upgrade node to `db505f4`.

In MyTonCtrl:

```
upgrade master
```

If you are not using MyTonCtrl please use [instruction](https://telegra.ph/Update-Liteserver-without-using-MyTonCtrl-05-25).

Target node revision is `db505f4`.

This node update contains major optimization of liteserver resource usage.

Please upgrade your liteservers till the end of next week (June 2).

This update is **mandatory for liteservers** (full nodes and archive nodes). **Validators do not need to update now.**

---

## [109] 2024-06-03T16:00:53+00:00

- Permalink: https://t.me/tonstatus/109
- Author: TON Status
- Views: 346K

**Scheduled network update on June 10**

We are asking validators to schedule a time on **June 10** at **9:00 UTC** for validator software update.

This update is **mandatory** and, among other things, contains DB optimization, public overlay spam prevention mechanisms and optimization of block delivery.

---

## [110] 2024-06-09T15:02:01+00:00

- Permalink: https://t.me/tonstatus/110
- Author: TON Status
- Views: 762K

**Reminder
Mainnet Validators and Liteserver owners**

Please be prepared for [upgrade](https://t.me/tonstatus/109) **on Monday June 10 at 9:00 UTC**.
  
  Telegram

**Link preview:**
- [TON Status](https://t.me/tonstatus/109)
  - Scheduled network update on June 10

We are asking validators to schedule a time on June 10 at 9:00 UTC for validator software update.

This update is mandatory and, among other things, contains DB optimization, public overlay spam prevention mechanisms and…

---

## [111] 2024-06-10T09:01:48+00:00

- Permalink: https://t.me/tonstatus/111
- Author: TON Status
- Views: 425K

**Mainnet Validators and Liteserver owners**

Please update your node software (see "Target versions"):

```
update
upgrade

```


Note, that on this upgrade mytonctrl removes default flag `--state-ttl 604800`, so if you need more history (usually only liteservers need it) explicitly set state-ttl in systemd `validator.service` file.

Target versions:
— mytonctrl: validator `40daf3c` / lite-server `55c3c0d` 
— node: `5c392e0`

If you are not using mytonctrl, check [this instruction](https://telegra.ph/v202406-Update-without-using-MyTonCtrl-06-10).

This update is **mandatory** for validators and lite servers.

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [112] 2024-06-29T06:59:45+00:00

- Permalink: https://t.me/tonstatus/112
- Author: TON Status
- Views: 205K

**Mainnet Validators Urgent Action Required **

Please be prepared to vote for new gas limits for special transactions **July 2 at 8:00 UTC**.

In recent weeks, the number of validators has grown to a level that threatens the normal conduct of elections. Limits must be updated to continue smooth operation. If you are planning to launch a validator soon, please postpone it until the end of next week.

---

## [113] 2024-07-01T14:18:25+00:00

- Permalink: https://t.me/tonstatus/113
- Author: TON Status
- Views: 237K

**Reminder Mainnet Validators**

Please be prepared for vote **tomorrow** on **Tuesday July 2 at 8:00 UTC**.

Proposal will contain increase `special_gas_limit` from 35'000'000 to 70'000'000 in Config Parameter 20. In particular, this will allow Elector to conduct elections when more than 400 applications are submitted. Please note that according to the current configuration, the maximum number of validators is still limited to 400.

More details [here](https://telegra.ph/Special-transaction-gas-limit-update-07-01).

---

## [114] 2024-07-02T08:01:43+00:00

- Permalink: https://t.me/tonstatus/114
- Author: TON Status
- Views: 314K

**Mainnet validators**

Please take part in the voting for network config adjustment.
Details of updates are given [here](https://telegra.ph/Special-transaction-gas-limit-update-07-01).

1. Check that your validator software is on the latest version: commit `5c392e0`.

If you use mytonctrl:
1. Update mytonctrl via command: `update`
2. Vote for proposal: 

```
vo 22440293175314732041600029416833597878678297180899118901294602657772681323261
```



If you do not use mytonctrl, each round:
1.Create signed vote in validator-engine-console:
` createproposalvote 22440293175314732041600029416833597878678297180899118901294602657772681323261 vote-msg-body.boc`
2. Send obtained `vote-msg-body.boc` to `-1:5555555555555555555555555555555555555555555555555555555555555555` in internal message from any wallet from masterchain with 2 TON attached. If you are using `wallet.fif` script, it can be done via:
`fift -s wallet.fif <path-to-key> -1:5555555555555555555555555555555555555555555555555555555555555555 <seqno> 2 -B vote-msg-body.boc`
and send resulting message to network. If you are using lite-client, it can be done via
`lite-client -C global-config.json  -rc "sendfile wallet-query.boc"`

---

## [115] 2024-07-03T15:13:08+00:00

- Permalink: https://t.me/tonstatus/115
- Author: TON Status
- Views: 304K

**Mainnet validators**

Proposal to[ increase gas limit for special transactions, in particular election,](https://t.me/tonstatus/114) was accepted! Thank you.

---

## [116] 2024-07-03T15:13:08+00:00

- Permalink: https://t.me/tonstatus/116
- Author: TON Status
- Views: 320K

**Сritical vulnerability in OpenSSH**

Recently a critical vulnerability in OpenSSH was discovered: [https://ubuntu.com/security/CVE-2024-6387](https://ubuntu.com/security/CVE-2024-6387)
Since most of validators work on Ubuntu/Debian releases and use OpenSSH, we recommend check and update software on validator nodes if necessary.

---

## [117] 2024-07-27T19:34:47+00:00

- Permalink: https://t.me/tonstatus/117
- Author: TON Status
- Views: 163K

**Validation slots**

406 candidates participated in the last [validator elections](https://tonscan.com/validation). 

According to the [network rules](https://docs.ton.org/participate/network-maintenance/staking-incentives) each round candidates are sorted by effective stake size and the first **400** validators are elected to become validators.

If you don't have enough stake to pass as sole validator, that is less than 355'000 TON at the moment, - please participate in network maintenance via staking [https://ton.org/stake](https://ton.org/stake).

---

## [118] 2024-08-05T15:11:02+00:00

- Permalink: https://t.me/tonstatus/118
- Author: TON Status
- Views: 113K

**Scheduled network update on August 12**

We are asking validators to schedule a time on **August 12 at 9:00 UTC** for validator software update.

This update is mandatory and, among other things, contains introduction of dispatch queue and drastic improvement of state serialization process.

In the light of upcoming increase of network load we [remind validators](https://t.me/tonstatus/102) about importance of having strong machines, in particular having** at least 128 GB** of Memory.

---

## [119] 2024-08-12T08:59:38+00:00

- Permalink: https://t.me/tonstatus/119
- Author: TON Status
- Views: 107K

**Mainnet Validators and Liteserver owners**

Please update your node software (see "Target versions"):


```
update master
upgrade

```


Target versions:
— mytonctrl: `7e90e26` (same for all kind of nodes)
— node: `140320b`

If you are not using mytonctrl, check this [instruction](https://telegra.ph/v202406-Update-without-using-MyTonCtrl-06-10).

This **update is mandatory** for validators and lite servers. [Changelog](https://github.com/ton-blockchain/ton/blob/master/recent_changelog.md).

In case of any issues check [updated documentation](https://docs.ton.org/participate/run-nodes/nodes-troubleshooting#error-after-updating-mytonctrl) and contact us.

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [120] 2024-08-14T13:15:50+00:00

- Permalink: https://t.me/tonstatus/120
- Author: TON Status
- Views: 101K

**Validators require 128Gb RAM**

In a previous update, we implemented a Fast State Serializer, which reduces blockchain state serialization time from 18 hours to ~50 minutes.

This frees up more resources for the validator to work on validating transactions and blocks, which is necessary for network performance in general.

Fast serialization works only if there is enough RAM.

According to [requirements](https://t.me/tonstatus/102) validator should have at least 128Gb RAM. **If you have less - please upgrade your hardware.
**
This message is for validators only.

---

## [121] 2024-08-15T14:36:11+00:00

- Permalink: https://t.me/tonstatus/121
- Author: TON Status
- Views: 103K

**Mainnet Validators**

Please be prepared to vote on **Wednesday August 21 at 8:00 UTC** for new transaction executor behavior, dispatch queue activation and increasing minimal split.

Details can be found [here](https://telegra.ph/August-2024-network-updates-and-voting-08-13). Proposed changes will allow network to more evenly distribute load, improve stability of block generation and serialization process.

All validators MUST be updated to the latest version before voting. Target versions:
mytonctrl `7e90e26`
validator `140320b`

---

## [123] 2024-08-21T08:01:38+00:00

- Permalink: https://t.me/tonstatus/123
- Author: TON Status
- Views: 103K

**Mainnet validators**

Please take part in the voting for network config adjustment.
Details of updates are given [here](https://telegra.ph/August-2024-network-updates-and-voting-08-13).

1. Check that your validator software is on the latest version: commit `140320b`.

If you use mytonctrl:
1. Update mytonctrl via command: `update`
2. Vote for proposal: 

```
vo 20308659988793623196998942342425699672407754574159059846525327984142483923860 21241086152080161891970114314094131332811466103307811578007752491905358303034
```


If you do not use mytonctrl, each round:
1.Create signed vote in validator-engine-console: createproposalvote 20308659988793623196998942342425699672407754574159059846525327984142483923860  vote-msg-body.boc
2. Send obtained vote-msg-body.boc to -1:5555555555555555555555555555555555555555555555555555555555555555 in internal message from any wallet from masterchain with 2 TON attached. If you are using wallet.fif script, it can be done via:
`fift -s wallet.fif <path-to-key> -1:5555555555555555555555555555555555555555555555555555555555555555 <seqno> 2 -B vote-msg-body.boc` and send resulting message to network. If you are using lite-client, it can be done via `lite-client -C global-config.json  -rc "sendfile wallet-query.boc"
`3. repeat for 21241086152080161891970114314094131332811466103307811578007752491905358303034

---

## [124] 2024-08-26T12:34:10+00:00

- Permalink: https://t.me/tonstatus/124
- Author: TON Status
- Views: 69.3K

**Mainnet validators**

Please check efficiency of your validators. In case of low efficiency or frequent crashes (including OOM) immediately contact [@mytonctrl_help_bot](https://t.me/mytonctrl_help_bot)

In particular we ask the following validators to check their nodes

```
2,AE083C661DAD64F734CCBF5A4BEDF398BC4CF5A6BF454E376BB4B4437CBB4C9C
9,D4AB33E3C1F558143BF63ECF82B26B6A1AD635149AFCDA508DFCF53DDEF49EA1
10,20ED0665410992AEC5F476CAC9D452D89B1C34C210C48C1D578D1B46A82A4088
65,481532E012CB8F7E1C1B179F52E31D9B4F20EFE1BB032196E2690975E5989729
88,F82905F3161A1F7108B4A3807FC5C970B2B5B45E58219C033F1614582DDEAAC5
90,95343C09F5D4F1830C8AE4C8577C66EE779FA723D0C8D10ACAFFAC9F346B1ECA
96,F1A0A4153857E5385884E4EFCE50FABBC00662F54139A58CAD6DCE97529F35F5
```

---

## [125] 2024-08-28T01:21:04+00:00

- Permalink: https://t.me/tonstatus/125
- Author: TON Status
- Views: 78.4K

**Mainnet validator**

If your validator has index < 100 please be prepared to urgent action at **04:00 UTC** (Wed Aug 28 2024 04:00:00 GMT+0000). Please set alarm.


P.S. Due to high recent activity (>20m transactions in recent 2 days), garbage collection overloaded many of validators for enough time for them to lost consensus with each other. To restore consensus back, validators need to be restarted at about the same time with specific flags.

---

## [126] 2024-08-28T02:00:52+00:00

- Permalink: https://t.me/tonstatus/126
- Author: TON Status
- Views: 72.7K

List of top 100 validators of current round

---

## [127] 2024-08-28T03:50:44+00:00

- Permalink: https://t.me/tonstatus/127
- Author: TON Status
- Views: 83K

**Mainnet validators with index <100**

Please restart your nodes with updated flags at **4:00 UTC**


1. open `/etc/systemd/system/validator.service`
2. add flags `-F 39987437:600844:7 -F 39987437:600845:7 --state-ttl 86400` to the end of ExecStart
3. restart validator:

```
systemctl daemon-reload
systemctl restart validator
```

---

## [128] 2024-08-28T04:39:18+00:00

- Permalink: https://t.me/tonstatus/128
- Author: TON Status
- Views: 68.6K

**Mainnet validators with index <100**

So far not enough validators restarted their nodes with correct flags.
If you didn't restarted your nodes with new flags yet, please do it ASAP.

---

## [129] 2024-08-28T06:21:40+00:00

- Permalink: https://t.me/tonstatus/129
- Author: TON Status
- Views: 74.6K

**Mainnet validators**

Block production is restored and stable now. Thank you for cooperation!

For now you can delete `-F 39987437:600844:7 -F 39987437:600845:7` from ExecStart when it will be convenient for you. After that please run:

```
systemctl daemon-reload

```

**Note**: there is NO need to restart validators after removing flags.

In coming days, we will came with update for the node to mitigate recently discovered issues. Please stay tuned.

---

## [130] 2024-08-28T17:39:05+00:00

- Permalink: https://t.me/tonstatus/130
- Author: TON Status
- Views: 1.31M

**URGENT** **- Mainnet validators**

Please update your nodes and then restart.

In mytonctrl run:
`upgrade stable_testnet`

If you don't use mytonctrl manually switch node to [stable_testnet](https://github.com/ton-blockchain/ton/commits/stable_testnet/) branch.

If you have multiple validators you can update them all at once. Please stay tuned for a few hours, in case of subsequent instructions.

---

## [131] 2024-08-28T19:20:31+00:00

- Permalink: https://t.me/tonstatus/131
- Author: TON Status
- Views: 1.43M

**URGENT - Mainnet validators**

Please make sure you have done the [previous update](https://t.me/tonstatus/130). If you haven't please do. 

Then update node flags:

1. open `/etc/systemd/system/validator.service`
2. remove `-F 39987437:600844:7 -F 39987437:600845:7` if they are still present
3. add flags `-F 39991868:601006:7 --catchain-max-block-delay 0.5` to the end of ExecStart
4. restart validator:

```

systemctl daemon-reload
systemctl restart validator
```

---

## [132] 2024-08-29T14:59:46+00:00

- Permalink: https://t.me/tonstatus/132
- Author: TON Status
- Views: 44.1K

Dear TON Validators,

We are releasing an important **TON Validator Information Form** today. This form is crucial for improving our network's performance and stability, especially in light of anticipated increased loads.

- The form collects essential data about your validator setup.
- Your input is vital for network optimization.
- Please complete the form today.
- Your prompt response will help us collaborate effectively on network improvements.

[**Access the form here**](https://ed5nc9qb.paperform.co/)

Your cooperation is critical for the TON network's continued success. Thank you for your immediate attention to this matter.
  
  Paperform
  *
  Free Online Form Builder & Form Creator for SMBs in 2026 | Paperform

**Link preview:**
- [Free Online Form Builder & Form Creator for SMBs in 2026 | Paperform](https://ed5nc9qb.paperform.co/)
  - Create forms and surveys, take payments, automate workflows and send documents for signing, all from one easy, doc‑style form builder FOR FREE

---

## [133] 2024-08-29T15:19:13+00:00

- Permalink: https://t.me/tonstatus/133
- Author: TON Status
- Views: 52.3K

**Important Instructions for TON Validators**

Dear TON Validators, please follow these crucial steps to ensure network stability this week and to avoid new slashing penalties in the future.

**Essential Actions:
**
1) Verify you're on the `stable_testnet` branch (commit `97c57c3`). If not, update: [https://t.me/tonstatus/130](https://t.me/tonstatus/130). For multiple validators, update **one at a time**.

2) Ensure your hardware meets or exceeds system requirements: [https://t.me/tonstatus/102](https://t.me/tonstatus/102). Upgrade if necessary, **one at a time**.

3) We imperatively request you to use [mytonctrl](https://github.com/ton-blockchain/mytonctrl).

In your mytonctrl console:
- Update to the latest version: `update master`
- Enable telemetry: `set sendTelemetry true`

4) Set up monitoring dashboards for RAM, Disk, Network, and CPU usage. For technical assistance, contact [@mytonctrl_help_bot](https://t.me/mytonctrl_help_bot).

**DOGS Project Alert:**

This week, the DOGS gaming project (**50 million active users**) is minting and listing, causing increased network load. We experienced two network outages on August 27 and 28. Please:

1) Stay available this week and respond within 1 hour, around the clock.

2) Closely monitor your hardware. Contact [@mytonctrl_help_bot](https://t.me/mytonctrl_help_bot) immediately if you need help.

3) Follow [@tonstatus](https://t.me/tonstatus) and be ready to apply urgent updates if necessary.

**‼️*** **Updates on Slashing Mechanics for TON Validators:**

The TON Core team is working on implementing of **new slashing penalties** for non-performing validators. Executing the actions above is crucial to mitigate the risk of losing rewards for validating the network.

Your cooperation is vital for maintaining network stability and TON's prosperity. Thank you for your prompt attention to these matters.

---

## [134] 2024-09-02T16:54:40+00:00

- Permalink: https://t.me/tonstatus/134
- Author: TON Status
- Views: 55.2K

**ANNOUNCEMENT: DECENTRALISED SYSTEM OF PENALTIES FOR POORLY PERFORMING VALIDATORS
**
The current system of penalising poorly performing validators will be fully operational next **Monday, September 9**.

**How do validators determine that another validator has performed poorly?
**
The TON is supplied with the lite-client utility. In lite-client there is a `checkloadall` command.

This command analyses how many blocks the validator should have processed, and how many it actually processed in a given period of time.

If the validator processed less than **90%** of the expected number of blocks during a validation round, it is considered to be performing poorly and should be penalised.

Technical description of the process: [https://github.com/ton-blockchain/TIPs/issues/13#issuecomment-786627474](https://github.com/ton-blockchain/TIPs/issues/13#issuecomment-786627474)

**When and by whom a complaint is filed?**

After each validation round (~18 hours), the validator stakes of validators that participated in that round are on the Elector smart contract for another ~9 hours.

During this time, anyone can send a complaint against a validator who performed poorly in said round. This happens onchain on the Elector smart contract.

All validators do not need to send a complaint.

**How a complaint is validated?**

After each validation round, validators receive a list of complaints from the Elector smart contract and double-check them by calling `checkloadall`.

If a complaint is validated, they onchain vote in favour of that complaint.

These actions are built into mytonctrl and happen automatically.

If the complaint has 66% of the validators' votes (by their weight), a penalty is taken off from the validator's stake.

**What is the size of the fine?**

The amount of the fine is fixed and equals **101 TON**, which is roughly equal to the validator's income per round.

**Where does this fine go?**

The fine is distributed among the validators minus network costs and a small reward (~8 TON) to the validator who sent the correct complaint.

**When was this functionality made?**

This functionality was made in mytonctrl back in February 2021 [https://github.com/ton-blockchain/TIPs/issues/13](https://github.com/ton-blockchain/TIPs/issues/13).

The complaints and fines functionality in the Elector system smart contract was made initially at the time of network launch.

**Why didn't the penalty functionality work well earlier?**

The network fee for sending complaints was significant, which as the Toncoin exchange rate increased, made it uneconomical to send them.

This has now been fixed by optimising the complaint message.

In a week from 9 September 2024, an automatic complaint sender will start working on several nodes in the network.

**Is the system decentralised?**

Yes, anyone can send a complaint, the penalty is only applied by a quorum of validators on the network.

There is no way for anyone to single-handedly fine anyone.

**How do I prepare for the start of the penalty system?**

Since this functionality is already implemented in node, you don't need to do anything to make the system work.**
**
Please make sure you're complying with the validator [guidelines](https://t.me/tonstatus/133).

During the week, we will publish additional tools and best practices for monitoring and maintaining the effectiveness of your validator.

**Will the penalty system get stricter in the future?
**
Yes, the audience and the number of transactions in TON is growing rapidly and it is vital that the quality of work is at its best.

The system will improve and fines will increase this year. All updates will be announced in advance.

It makes sense to set up hardware, monitoring and validator work properly. If you don't want to do this please consider using staking services [https://ton.org/stake](https://ton.org/stake).

---

## [135] 2024-09-04T12:52:32+00:00

- Permalink: https://t.me/tonstatus/135
- Author: TON Status
- Views: 44.2K

**Tool for assessing the effectiveness of validators
**
The new version of mytonctrl has added a new command `check_ef` which outputs your validator efficiency data for the last round and for current round. This command retrieves data by calling `checkloadall` utility.

Previous efficiency score from the `status` command outdated and has been removed.

To update mytonctrl, type `update` in the mytonctrl console.

Then type `check_ef` in the mytonctrl console.

Note that the previous round may not be displayed immediately after the update. 

Note that the current round data becomes more accurate towards the end of the round.

Validators with an index less than 100 (sorted by effective stake) please ensure that your efficiency is greater than 90% (for the full round period).

Validators with an index greater than 100 will not receive penalties next week as they do not participate in masterchain validation, but please follow the validator guidelines, as you will be included in the penalty system in future updates.

If you need tech support please contract [@mytonctrl_help_bot](https://t.me/mytonctrl_help_bot) (validators only).

---

## [136] 2024-09-05T12:16:00+00:00

- Permalink: https://t.me/tonstatus/136
- Author: TON Status
- Views: 69.4K

**APIs for validation and effectiveness of validators**

1) [https://elections.toncenter.com/docs](https://elections.toncenter.com/docs) - use this API to get information about current and past validation rounds (cycles) - time of rounds, which validators participated in them, their stakes, etc. 

Information on current and past elections (for the validation round) is also available.

2) [https://toncenter.com/api/qos/index.html#/](https://toncenter.com/api/qos/index.html#/) - use this API to get information on the efficiency of validators over time. 

This API analyses the information from the catchain and builds an estimate of the validator's efficiency. This API does not use the `checkloadall` utility, but is its alternative.

Unlike `checkloadall` which works only on validation rounds, in this API you can set any time interval to analyse the validator's efficiency.

**How to use:
**
- pass ADNL address of your validator and time inverval (`from_ts`, `to_ts`) to API. For accurate result it makes sense to take a sufficient interval, for example from  18 hours ago the current moment.

- get the result. If your `efficiency` percentage field is less than 80%, your validator is **not** working properly. 

- It is important that your validator participates in validation and has the same ADNL address throughout the specified time period.

For example, if a validator participates in validation every second round - then you need to specify only those intervals when he participated in validation. Otherwise, you will get an incorrect underestimate.

- this works not only for masterchain validators (with index < 100) but also for other validators (with index > 100).

**Recommendations**

1) Please check the efficiency of your validator and in case of low efficiency - take action to fix the problem. Contact technical support [@mytonctrl_help_bot](https://t.me/mytonctrl_help_bot) if necessary.

2) Please set up dashboards to monitor your validators using these APIs.

---

## [137] 2024-09-06T08:21:34+00:00

- Permalink: https://t.me/tonstatus/137
- Author: TON Status
- Views: 73.4K

**Mainnet validators
Scheduled network update on September 11**

We are asking validators to schedule a time on **September 11 at 9:00 UTC** for validator software update.

This update is mandatory and introduces catchain, serialization, network and collator configuration updates that optimize work of validators.

During preparation of this update we focused on **minimal** and **safest** changes which can be reliably tested in short period of time from one hand and substantially improve stability of validation from the other.

---

## [138] 2024-09-11T09:03:10+00:00

- Permalink: https://t.me/tonstatus/138
- Author: TON Status
- Views: 123K

**Mainnet Validators**

Please update your node software (see "Target versions"):

```
update
upgrade master

```


Target versions:
— mytonctrl: 74e536b `a467af5` (updated)
— node: `1bef6df`

If you are not using mytonctrl, check this [instruction](https://telegra.ph/v202406-Update-without-using-MyTonCtrl-06-10).

This update is mandatory for validators. Node [changelog](https://github.com/ton-blockchain/ton/releases/tag/v2024.09). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.1.0).

**After upgrade** please remove from `/etc/systemd/system/validator.service` all recently added flags (they are not required anymore):
`-F *:*:*`,
`--catchain-max-block-delay 0.5`
`--state-ttl *` (note, if you intentionally set specific state-ttl, keep it as you need)


If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

P.S. We encourage validators to subscribe to [@tonstatus_notifications](https://t.me/tonstatus_notifications) channel with notifications of penalties for poorly performing TON validators.

---

## [139] 2024-09-13T18:19:32+00:00

- Permalink: https://t.me/tonstatus/139
- Author: TON Status
- Views: 121K

Block production in the shard 0x9000000000000000 has stopped. The other shards are working normally. The core team is investigating the problem.

---

## [140] 2024-09-13T18:42:36+00:00

- Permalink: https://t.me/tonstatus/140
- Author: TON Status
- Views: 114K

Block production in the shard has recovered. The situation is currently under review.

---

## [141] 2024-09-14T09:21:32+00:00

- Permalink: https://t.me/tonstatus/141
- Author: TON Status
- Views: 3.06M

The network is experiencing performance issues. Transactions may take longer than usual to complete. A fix is being worked on.

---

## [142] 2024-09-14T10:55:58+00:00

- Permalink: https://t.me/tonstatus/142
- Author: TON Status
- Views: 126K

Found a bug in node that caused performance issues overnight and today. Some validators have been updated, which solved the main problem.

Block production has been restored in all shards. It will take some time to process the accumulated messages (~ 1 hour), during this time there may be a slight performance degradation.

*Upd: *[https://telegra.ph/Report-on-September-13-2024-Operation-Incident-09-14](https://telegra.ph/Report-on-September-13-2024-Operation-Incident-09-14)

---

## [143] 2024-09-25T17:11:26+00:00

- Permalink: https://t.me/tonstatus/143
- Author: TON Status
- Views: 760K

Dear TON Validator

We would like to notify you that from the **26th of September** 10:00 UTC we are expecting an increased load on the TON blockchain, as the Hamster Kombat game project with more than 100 million monthly active users will be minting coins on the blockchain, which is a unique and first event of this scale for the blockchain industry.

We kindly request from** September** **26** to** September** **29**:

1) be in touch. Follow the [@tonstatus](https://t.me/tonstatus) channel. If emergency actions are required apply within the hour.

2) constantly monitor the status of your validator and hardware during these days

The quality of validators directly affects the quality of the blockchain. We appreciate your participation in The Open Network.

---

## [144] 2024-10-19T10:10:18+00:00

- Permalink: https://t.me/tonstatus/144
- Author: TON Status
- Views: 52.4K

**Mainnet validators and liteserver owners
Scheduled network update on October 28**

We are asking validators to schedule a time on **October 28 at 10:00 UTC** for validator software update.

This update is mandatory and, beside other things, decreases network consumption, and substantially improves synchronization and garbage collection speed.

---

## [145] 2024-10-28T09:59:02+00:00

- Permalink: https://t.me/tonstatus/145
- Author: TON Status
- Views: 54K

**Mainnet Validators and Liteserver Owners**

Please update your node software (see "Target versions"):

```
update
upgrade master

```


Target versions:
— mytonctrl:  `e0ead70`
— node` eed3153`

If you are not using mytonctrl, check this [instruction](https://telegra.ph/v202406-Update-without-using-MyTonCtrl-06-10).

This update is mandatory for validators and liteservers. Node [changelog](https://github.com/ton-blockchain/ton/blob/master/recent_changelog.md). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.2.0).

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [146] 2024-11-04T05:39:48+00:00

- Permalink: https://t.me/tonstatus/146
- Author: TON Status
- Views: 50.1K

**QoS maintenance**

Due to emergency infrastructure maintenance work, services [https://elections.toncenter.com](https://elections.toncenter.com/), [https://testnet-elections.toncenter.com](https://testnet-elections.toncenter.com/) and [https://toncenter.com/api/qos](https://toncenter.com/api/qos) will experience reduced availability in the period between **03:30am and 05:30am UTC on Tuesday, 5 of November 2024**.

---

## [147] 2024-12-09T13:51:55+00:00

- Permalink: https://t.me/tonstatus/147
- Author: TON Status
- Views: 36.9K

**Mainnet validators and liteserver owners**
Scheduled network update on December 17

We are asking validators to schedule a time on **December 17** at **11:00 UTC** for validator software update.

This update is mandatory and, beside other things, improves work with db, adds convenient option for key backups, removes duplicative calculations by caching, introduces new opcode in tvm and more.

---

## [148] 2024-12-17T11:01:38+00:00

- Permalink: https://t.me/tonstatus/148
- Author: TON Status
- Views: 35.6K

**Mainnet Validators and Liteserver Owners**

Please update your node software (see "Target versions"):


```
update
upgrade master

```


Target versions:
— mytonctrl:  `33bd174`
— node `ea0dc16`
If you are not using mytonctrl, check this [instruction](https://telegra.ph/v202406-Update-without-using-MyTonCtrl-06-10).

This update is mandatory for validators and liteservers. Node [changelog](https://github.com/ton-blockchain/ton/blob/master/recent_changelog.md). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.3.0).

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [149] 2025-01-30T09:45:00+00:00

- Permalink: https://t.me/tonstatus/149
- Author: TON Status
- Views: 24.3K

**Mainnet validators and liteserver owners**
Scheduled network update on February 6

We are asking validators to schedule a time on **February 6** at **9:00 UTC** for validator software update.

This update is mandatory and improves node IP address discovery mechanism, which will allow a stable validator migration process.
Besides, it contains multiple changes to improve the developer experience, as well as unlocking of previously locked highload wallets.

We plan to hold voting for activation of these changes on **February 10**, please schedule a time on this day as well.


* Software upgrade on **February 6, 2025**.
* Voting on **February 10, 2025**.

---

## [150] 2025-02-06T09:00:02+00:00

- Permalink: https://t.me/tonstatus/150
- Author: TON Status
- Views: 22.2K

**Mainnet Validators and Liteserver Owners**

Please update your node software (see "Target versions"):

```
update
upgrade master

```


Target versions:
— mytonctrl:  `ee82cb6`
— node `2a68c86`
If you are not using mytonctrl, check this [instruction](https://telegra.ph/v202406-Update-without-using-MyTonCtrl-06-10).

This update is mandatory for validators and liteservers. Node [changelog](https://github.com/ton-blockchain/ton/blob/master/recent_changelog.md). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.4.0).

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [151] 2025-02-08T13:20:51+00:00

- Permalink: https://t.me/tonstatus/151
- Author: TON Status
- Views: 16.3K

**Upgrade rate in mainnet reached 95%**, with 67% weight achieved during the first day of upgrade!

Dear validators, thank you for quick update and careful maintenance of your nodes!

---

## [152] 2025-02-08T13:22:20+00:00

- Permalink: https://t.me/tonstatus/152
- Author: TON Status
- Views: 19.6K

**Self hosted ton indexer owners and operators**
Please note that you must update your node and indexer latest by the end of day 12th of February. 

Target versions:
* TON Node `v2025.02`, github commit `2a68c86`
* Mytonctrl `v2.4.0`, github commit `ee82cb6`.
* TON indexer `v1.1.5`, github commit `c4510da5`

Make sure that you update indexer submodules by issuing: `git submodule update --init --recursive`, 
To check your submodule versions please issue `git submodule status --recursive`
Taget submodule versions are:

```
57b0f804cbcf5173f175ac6643256fd768b686dc ton-index-cpp (heads/fix_sharded_block_data)
e1c31967f1b566c87cddb83a6e679cc0df9b719a ton-index-cpp/external/ton (remotes/origin/ton-index-19-dec)
7b0a9b88f0ba5ef6e258b4a4e63cc54629546467 ton-index-go (heads/main)

```

API interfaces of indexer will retain backward compatibility.

This change is related to archive slices stored in shard-wise format.

Please note that the underlying database structure for ton indexer has undergone significant changes, migrations of your existing database will be performed by the updated index-worker on first start. However, your database will miss some historical information required for new API calls, if you want to load this historical data you can restore latest indexer database backup provided by us under the URL  [https://dump.ton.org/dumps/index/](https://dump.ton.org/dumps/index/)

---

## [153] 2025-02-10T09:49:55+00:00

- Permalink: https://t.me/tonstatus/153
- Author: TON Status
- Views: 28.7K

**Mainnet validators**

Please take part in the voting for network config adjustment.
Details of updates are given [here](https://telegra.ph/February-2025-update-proposal-02-10).

1. Check that your validator software is on the latest version: commit `2a68c86`.

If you use mytonctrl, vote for proposal via 

```
vo 10417343672849294554112215443001378457781115591675002087908853591275394331828 93006213601402719671660224737621496948953854898607742321670820361849739662796

```


If you do not use mytonctrl, each round:
1.Create signed vote in validator-engine-console: `createproposalvote 10417343672849294554112215443001378457781115591675002087908853591275394331828  vote-msg-body.boc`
2. Send obtained vote-msg-body.boc to -1:5555555555555555555555555555555555555555555555555555555555555555 in internal message from any wallet from masterchain with 2 TON attached. If you are using wallet.fif script, it can be done via:
`fift -s wallet.fif <path-to-key> -1:5555555555555555555555555555555555555555555555555555555555555555 <seqno> 2 -B vote-msg-body.boc `
and send resulting message to network.
If you are using lite-client, it can be done via 
`lite-client -C global-config.json  -rc "sendfile wallet-query.boc"`
3. repeat for `93006213601402719671660224737621496948953854898607742321670820361849739662796`

---

## [154] 2025-02-14T11:33:47+00:00

- Permalink: https://t.me/tonstatus/154
- Author: TON Status
- Views: 27.1K

**Mainnet validators**

Proposals to [update vm version and increase monitor_min_split](https://t.me/tonstatus/153) were accepted! Thank you
  
  Telegram

**Link preview:**
- [TON Status](https://t.me/tonstatus/153)
  - Mainnet validators

Please take part in the voting for network config adjustment.
Details of updates are given here.

1. Check that your validator software is on the latest version: commit 2a68c86.

If you use mytonctrl, vote for proposal via 
vo 1041734…

---

## [155] 2025-03-04T10:05:37+00:00

- Permalink: https://t.me/tonstatus/155
- Author: TON Status
- Views: 23.2K

**Mainnet validators**
Scheduled network update on March 11

We are asking validators to schedule a time on Tuesday, **March 11 **at **9:00 UTC** for validator software update.

This update is mandatory and improves validator self-assessment tools, broadcast speed control, as well as implement updated extra-currency behavior and other fixes and improvements.

---

## [156] 2025-03-11T08:59:30+00:00

- Permalink: https://t.me/tonstatus/156
- Author: TON Status
- Views: 29.2K

**Mainnet Validators **
Please update your node software (see "Target versions"):

```
update
upgrade master

```


Target versions:
— mytonctrl:  `53594f1`
— node `0439613`
If you are not using mytonctrl, check this instruction.

This update is mandatory for validators. Node [changelog](https://github.com/ton-blockchain/ton/blob/master/Changelog.md). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.5.0).

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [157] 2025-03-13T17:49:38+00:00

- Permalink: https://t.me/tonstatus/157
- Author: TON Status
- Views: 26.1K

**Upgrade rate in mainnet reached 90%
**
TON Core thanks validators for quick updates and diligent node maintenance!

---

## [158] 2025-03-13T17:49:38+00:00

- Permalink: https://t.me/tonstatus/158
- Author: TON Status
- Views: 27.3K

Recent and upcoming TON optimizations open the possibility of reducing network fees in the near future without reducing validator rewards.

[Read more about our plans >>](https://telegra.ph/Information-about-validation-economic-03-13)

---

## [159] 2025-04-25T18:13:19+00:00

- Permalink: https://t.me/tonstatus/159
- Author: TON Status
- Views: 19.1K

**Mainnet validators**
Scheduled network update on April 30

We are asking validators to schedule a time on Wednesday, **April 30 **at **9:00 UTC** for validator software update.

This update is mandatory and contains next TVM version, a [list of optimizations](https://github.com/ton-blockchain/ton/blob/0cc297ba58002a3312f72d787908e0a359e41f60/recent_changelog.md), [normalized message hashes ](https://github.com/ton-blockchain/TEPs/pull/467/files)and more. Please note, that for building this update you need Clang 16, please be prepared ([instructions here](https://gist.github.com/neodix42/e4b1b68d2d5dd3dec75b5221657f05d7)). Also note, that Ubuntu 20.04 will be deprecated for running nodes soon.

---

## [160] 2025-04-30T08:59:02+00:00

- Permalink: https://t.me/tonstatus/160
- Author: TON Status
- Views: 18.9K

**Mainnet Validators **
Please update your node software (see "Target versions"):

```
update
upgrade master

```

Target versions:
— mytonctrl:  `72d4357`
— node `cee4c67`
If you are not using mytonctrl, check this [instruction](https://telegra.ph/v202406-Update-without-using-MyTonCtrl-06-10).

This update is mandatory for validators. Node [changelog](https://github.com/ton-blockchain/ton/blob/master/recent_changelog.md). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.5.1).

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [161] 2025-05-01T11:10:15+00:00

- Permalink: https://t.me/tonstatus/161
- Author: TON Status
- Views: 21.7K

**Mainnet Validators**

Please be prepared to vote on **Monday May 5 at 9:00 UTC** for new TVM behavior.

Details can be found [here](https://telegra.ph/May-2025-update-proposal-05-01). Proposed changes will simplify contract development by disabling anycast functionality that clutter message processing, simplification fee flows for extracurrencies and shard-optimization.

All validators MUST be updated to the latest version before voting. Target versions:
— mytonctrl:  `72d4357`
— node `cee4c67`
  
  Telegraph

**Link preview:**
- [May 2025 update proposal](https://telegra.ph/May-2025-update-proposal-05-01)
  - We propose validators to vote for the following change of network configs: Config parameter 8

---

## [162] 2025-05-05T08:03:49+00:00

- Permalink: https://t.me/tonstatus/162
- Author: TON Status
- Views: 31.8K

**Mainnet validators**

Please take part in the voting for network config adjustment.
Details of updates are given [here](https://telegra.ph/May-2025-update-proposal-05-01).

1. Check that your validator software is on the latest version: commit `cee4c67`.

If you use mytonctrl, vote for proposal via 


```
vo 34798776028960531893650878155695543519007927204917026147352158691929180750546

```



If you do not use mytonctrl, each round:

    
**1.**Create signed vote in validator-engine-console: `createproposalvote 34798776028960531893650878155695543519007927204917026147352158691929180750546  vote-msg-body.boc`
**2. **Send obtained vote-msg-body.boc to -1:5555555555555555555555555555555555555555555555555555555555555555 in internal message from any wallet from masterchain with 2 TON attached. If you are using wallet.fif script, it can be done via:
    `fift -s wallet.fif <path-to-key> -1:5555555555555555555555555555555555555555555555555555555555555555 <seqno> 2 -B vote-msg-body.boc `
    and send resulting message to network.
    If you are using lite-client, it can be done via 
    `lite-client -C global-config.json  -rc "sendfile wallet-query.boc"`

---

## [163] 2025-06-01T12:51:52+00:00

- Permalink: https://t.me/tonstatus/163
- Author: TON Status
- Views: 86.6K

**Block creation has been suspended on the TON mainnet**

The TON Core team is aware of the issue and is working to resolve it.

---

## [164] 2025-06-01T13:32:32+00:00

- Permalink: https://t.me/tonstatus/164
- Author: TON Status
- Views: 429K

**Block production has been restored**

A quick fix was released, and updating only a few master chain validators was sufficient to resume block production.

The incident was related to an error in the processing of the masterchain dispatch queue.

We will release a technical report on the incident shortly.

*Update*: [https://telegra.ph/Report-on-June-1-2025-Operation-Incident-06-02](https://telegra.ph/Report-on-June-1-2025-Operation-Incident-06-02)

---

## [165] 2025-06-23T18:51:50+00:00

- Permalink: https://t.me/tonstatus/165
- Author: TON Status
- Views: 19.6K

**Mainnet validators and node owners**
Scheduled network update on June 30

We are asking validators to schedule a time on Monday, **June 30 **at **10:00 UTC** for validator software update.

This update is mandatory and contains next TVM version, optimizations of collation process and state serialization. The latter are needed to drastically improve user experience under low and moderate load of the network in the near future. Please be prepared.

---

## [166] 2025-06-30T10:01:57+00:00

- Permalink: https://t.me/tonstatus/166
- Author: TON Status
- Views: 16.4K

**Mainnet Validators and node owners**

Please update your node software (see "Target versions"):


```
update master
upgrade master

```

Target versions:
— mytonctrl:  `1b88179`
— node `8f99af7`
If you are not using mytonctrl, check this [instruction](https://telegra.ph/v202406-Update-without-using-MyTonCtrl-06-10).

This update is **mandatory** for validators, lite-servers and nodes. Node [changelog](https://github.com/ton-blockchain/ton/blob/master/recent_changelog.md). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.7.1).

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [167] 2025-07-01T07:34:44+00:00

- Permalink: https://t.me/tonstatus/167
- Author: TON Status
- Views: 13.6K

**Upgrade rate in mainnet reached 90%
**
TON Core thanks validators for quick updates and diligent node maintenance!

---

## [168] 2025-07-01T07:34:45+00:00

- Permalink: https://t.me/tonstatus/168
- Author: TON Status
- Views: 14.2K

**Mainnet Validators**

Please be prepared to vote on **Thursday July 3 at 10:00 UTC** for a few changes that will drastically improve user experience, developer experience and blockchain efficiency.

[Details](https://telegra.ph/July-2025-update-proposal-06-30) can be found here. 
All validators MUST be updated to the latest version before voting. Target versions:
— mytonctrl:  `1b88179`
— node `8f99af7`

---

## [169] 2025-07-01T12:02:37+00:00

- Permalink: https://t.me/tonstatus/169
- Author: TON Status
- Views: 15.4K

**Liteserver node owners and service providers**

Upcoming changes to the blockchain configuration require action on your part to ensure uninterrupted operation.

Please update your ton node / lite-servers according to [announcement](https://t.me/tonstatus/166)

Following componentes also require update if you use them in your environment:
- self-hosted [**ton-indexer**](https://github.com/toncenter/ton-indexer) to 1.1.8
- [**tonutils-go**](https://github.com/xssnick/tonutils-go)** **to 1.13.0
- [**gobicycle**](https://github.com/gobicycle/bicycle/) to v0.10.1

Failure to apply these updates may result in service disruptions. Please act promptly.

---

## [170] 2025-07-03T10:25:57+00:00

- Permalink: https://t.me/tonstatus/170
- Author: TON Status
- Views: 20.4K

**Mainnet validators**

Please take part in the voting for network config adjustment.
Details of updates are given [here](https://telegra.ph/July-2025-update-proposal-06-30).

1. Check that your validator software is on the latest version: commit `8f99af7`.

If you use mytonctrl, vote for proposal via 


```
vo 72950970141955009634493985157752471200893949891616436454729734426465997267196 34017568134187549009898704356228150517225485169222237192856032462351774897151 50468637853671300302577897933635869843820664891008449935708425835529897515286 47504358419253681406889633378045410026890000125944887347033305618500669184426 16182126426357247222833533845394616775372795037263659505290620106344006450574
```


If you do not use mytonctrl, each round:

    
1.Create signed vote in validator-engine-console: `createproposalvote 72950970141955009634493985157752471200893949891616436454729734426465997267196   vote-msg-body.boc`
2. Send obtained vote-msg-body.boc to `-1:5555555555555555555555555555555555555555555555555555555555555555` in internal message from any wallet from masterchain with 2 TON attached. If you are using wallet.fif script, it can be done via:
`fift -s wallet.fif <path-to-key> -1:5555555555555555555555555555555555555555555555555555555555555555 <seqno> 2 -B vote-msg-body.boc`
 and send resulting message to network.
If you are using lite-client, it can be done via
`lite-client -C global-config.json  -rc "sendfile wallet-query.boc"`

Repeat for 
`34017568134187549009898704356228150517225485169222237192856032462351774897151 50468637853671300302577897933635869843820664891008449935708425835529897515286 47504358419253681406889633378045410026890000125944887347033305618500669184426 16182126426357247222833533845394616775372795037263659505290620106344006450574`

---

## [171] 2025-07-05T17:17:01+00:00

- Permalink: https://t.me/tonstatus/171
- Author: TON Status
- Views: 21.7K

**Mainnet validators**

[All proposals](https://t.me/tonstatus/170) were accepted! Thank you!

The benefits of these proposals, including larger block sizes, [faster operations](https://t.me/toncore/67), optimized interaction with accounts' storage, and other enhancements, are already live and improving network performance and usability.

---

## [172] 2025-07-21T18:20:36+00:00

- Permalink: https://t.me/tonstatus/172
- Author: TON Status
- Views: 19.6K

**Mainnet validators**
Scheduled network update on July 28

We are asking validators to schedule a time on Monday, **July 28 **at **11:00 UTC** for validator software update and network parameters voting.

This update is **mandatory** and contains internal node optimization related to Accelerator update [[1]](https://t.me/toncore/65)[[2]](https://docs.ton.org/v3/documentation/infra/nodes/validation/collators)[[3]](https://t.me/toncore/6), as well as functionality required for BTC Teleport. Proposed voting is also related to BTC Teleport operation: it won't directly affect network behavior but allow validators to participate in BTC Teleport [governance](https://tgbtc.gitbook.io/docs/whitepaper/key-concepts/additional-components-and-security-mechanisms/consensus-based-system-updates).

---

## [173] 2025-07-28T11:03:55+00:00

- Permalink: https://t.me/tonstatus/173
- Author: TON Status
- Views: 20.4K

**Mainnet Validators**

Please update your node software (see "Target versions") and vote for proposal.


```
update master
upgrade master
vo 103573789540304366034812131625763525885200705204393285729566949988603434542737

```

Target versions:
— mytonctrl:  `bf46931`/`74bdb33` (both are fine)
— node `cac968f`
If you are not using mytonctrl, check this instruction.

This update is **mandatory** for validators.
Node update introduce [Accelerator update](https://t.me/toncore/71). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.8.0). Proposal is to update `-90` config that sets up BTC Teleport Governance. 

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [174] 2025-08-24T11:46:59+00:00

- Permalink: https://t.me/tonstatus/174
- Author: TON Status
- Views: 16.9K

**Update on Validator Quality of Service API**

Please note that when there is **1 shardchain **in the blockchain, the [QoS API ](https://toncenter.com/api/qos/index.html)collects enough data to calculate the efficiency of validators with an index >= 100 within** 6-8 hours **after the start of the validation cycle. Until then, efficiency estimates may be inaccurate due to insufficient data.

With more shardchains, this time is reduced; for example, with 4 shardchains, the efficiency rating is ready after 1 hour.

For validators with an index < 100, the efficiency rating is ready after 30 minutes, regardless of the number of shardchains.

---

## [175] 2025-09-05T09:59:50+00:00

- Permalink: https://t.me/tonstatus/175
- Author: TON Status
- Views: 16.5K

**Mainnet validators**
Scheduled voting on September 16

We are asking validators to schedule a time on Tuesday, ** September 16 **at **12:00 UTC** for network parameters voting.

Proposed voting is related to BTC Teleport operation and will allow to pass to [next stage](https://t.me/tonstatus/172) of Teleport rollout. Parameter `-90`, planned to be updated, won't directly affect network behavior and related to internal Teleport migration.

Upd: we also added to the list of planned parameters to update config 29, in particular bumping `proto_version` from `4` to `5`. This will enable special overlays that will speed up synchronization of collator nodes.
  
  Telegram

**Link preview:**
- [TON Status](https://t.me/tonstatus/172)
  - Mainnet validators
Scheduled network update on July 28

We are asking validators to schedule a time on Monday, July 28 at 11:00 UTC for validator software update and network parameters voting.

This update is mandatory and contains internal node optimization…

---

## [176] 2025-09-16T12:03:09+00:00

- Permalink: https://t.me/tonstatus/176
- Author: TON Status
- Views: 16.1K

**Mainnet validators**

Please take part in the voting for network config adjustment.
Details of updates are given [above](https://t.me/tonstatus/175).

1. Check that your validator software is on the latest version: commit `cac968f`.

If you use mytonctrl, first please ensure that you are up to date, in particular on commit `3816eb2` and vote for proposal via 


```
vo 82972944767423313821326283030352055259326179170465528006873474837778003422390 76533703899083343601323766308882775352019089807862422256342837336826006755613
```


If you do not use mytonctrl, each round:

    
1.Create signed vote in validator-engine-console: `createproposalvote 76533703899083343601323766308882775352019089807862422256342837336826006755613   vote-msg-body.boc`
2. Send obtained vote-msg-body.boc to `-1:5555555555555555555555555555555555555555555555555555555555555555` in internal message from any wallet from masterchain with 2 TON attached. If you are using wallet.fif script, it can be done via:
`fift -s wallet.fif <path-to-key> -1:5555555555555555555555555555555555555555555555555555555555555555 <seqno> 2 -B vote-msg-body.boc`
 and send resulting message to network.
If you are using lite-client, it can be done via
`lite-client -C global-config.json  -rc "sendfile wallet-query.boc"`

Repeat for 
`82972944767423313821326283030352055259326179170465528006873474837778003422390`

---

## [177] 2025-10-06T06:56:44+00:00

- Permalink: https://t.me/tonstatus/177
- Author: TON Status
- Views: 13.6K

**Mainnet validators**
Scheduled network update on October 13

We are asking validators to schedule a time on Monday, **October 13 **at **8:00 UTC** for validator software update.

This update is mandatory and contains next TVM version, in particular [developer friendly bounces](https://github.com/ton-blockchain/TEPs/pull/503) and cheap builder-to-slice operations, optimizations of node performance, including optimistic validation, work with db, block candidate distribution and compression. Please be prepared.

---

## [178] 2025-10-08T11:50:15+00:00

- Permalink: https://t.me/tonstatus/178
- Author: TON Status
- Views: 12.2K

This update is also **mandatory** for **Liteservers** **and full node operators**.


Please schedule time on next week to upgrade.

---

## [179] 2025-10-13T08:04:31+00:00

- Permalink: https://t.me/tonstatus/179
- Author: TON Status
- Views: 13.4K

**Mainnet Validators and node owners**

Please update your node software (see "Target versions"):


```
update master
upgrade master

```


Target versions:
— mytonctrl:  `87823a0`
— node `4ebd741`
If you are not using mytonctrl, check this [instruction](https://telegra.ph/v202406-Update-without-using-MyTonCtrl-06-10).

This update is mandatory for validators, lite-servers and nodes. Node [changelog](https://github.com/ton-blockchain/ton/blob/34823b1ea378edbe3bc59f3bcc48126480a0b768/recent_changelog.md). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.10.0).

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [180] 2025-10-13T08:11:04+00:00

- Permalink: https://t.me/tonstatus/180
- Author: TON Status
- Views: 15.1K

**Liteserver node owners and service providers**

Upcoming upgrade of network software requires your action to ensure uninterrupted operation of your infrastructure.

Please update your ton node / lite-servers according to announcement

Following components also require update if you use them in your environment:
**self-hosted ton-indexer**
— `v1.0.x` branch to `v1.0.3`
— `v1.1.x` branch to `v1.1.9`
— `v1.2.x` branch to `v1.2.3`
These updates do not introduce any changes that break backwards compatibility.

**self-hosted ton-http-api**
to `v2.0.61`
This update does not introduce any changes that break backwards compatibility.

Failure to apply these updates may result in service disruptions. Please act promptly.

---

## [181] 2025-10-29T14:45:23+00:00

- Permalink: https://t.me/tonstatus/181
- Author: TON Status
- Views: 11.3K

**Mainnet validators and node owners**
Scheduled network update on November 5

We are asking validators to schedule a time on Wednesday, **November 5 **at **8:00 UTC** for validator software update.

This update is **mandatory** and contains improved node synchronization stability as well as slight changes in TVM version 12 (including new opcodes). Besides upgrade is required for upcoming network voting planned for November 12.
Please be prepared.

---

## [182] 2025-11-05T08:04:35+00:00

- Permalink: https://t.me/tonstatus/182
- Author: TON Status
- Views: 11.8K

**Mainnet Validators
**
Please update your node software (see "Target versions"):


```
update master
upgrade master

```

Target versions:
— mytonctrl:  `87823a0`
— node `5c03491`
If you are not using mytonctrl or using ubuntu older than 22.04, check this [instruction](https://telegra.ph/TON-Node-Upgrade-202511-11-05).

This update is mandatory for validators. Node [changelog](https://github.com/ton-blockchain/ton/blob/34823b1ea378edbe3bc59f3bcc48126480a0b768/recent_changelog.md). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.10.0).

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [183] 2025-11-07T07:24:05+00:00

- Permalink: https://t.me/tonstatus/183
- Author: TON Status
- Views: 10.3K

**Upgrade rate in mainnet reached 97%
**
TON Core thanks validators for quick updates and diligent node maintenance!

---

## [184] 2025-11-07T07:24:55+00:00

- Permalink: https://t.me/tonstatus/184
- Author: TON Status
- Views: 14.1K

**Mainnet validators**
Scheduled voting on November 12

We are asking validators to schedule a time on W**ednesday,  November 12** at **10:00 UTC** for network parameters voting.

There will be 3 proposals to vote.

1. First is related to upcoming release of Major Regulated Stablecoin coming to the TON Ecosystem and it requires upgrade of config contract. After this upgrade two config parameters, in particular `-1024` and `-1025` (previously unassigned and without any effect on network operation) will become governed by `EQA_o6NFLu73wozeYNERTsW8lkU5OarbRbIkoNuWdy5SPDA_` address.

Code of upgraded config-contract is available [here](https://github.com/ton-blockchain/ton/blob/master/crypto/smartcont/config-with-ownable-params.fc). 

2. Second is related to activation TVM 12 (Config param `8`). It will bring long-time requested developer friendly new bounce types and opcodes.

3. Third is related to BTC Teleport (Config param `-90`), new config will introduce alternative script path spending with taproot timelocked multisig on BTC side which will make it's operation safer under validator misbehaving.

Please be prepared.

---

## [185] 2025-11-12T09:59:01+00:00

- Permalink: https://t.me/tonstatus/185
- Author: TON Status
- Views: 15.8K

**Mainnet validators**

Please take part in the voting for network config adjustment.
Details of updates are given [above](https://t.me/tonstatus/184).

1. Check that your validator software is on the latest version: commit `5c03491`.

If you use mytonctrl, first please ensure that you are up to date, in particular on commit `87823a0` and vote for proposal via 


```
vo 23904444691628258345928631083077623616080921932696498730525878822203253780796 47041144111931510246884934921852810661053253645699579321056455888130945579657 114378994789915754305566936325956928749149442521376354003451273810632019215741
```

If you do not use mytonctrl, each round:
    
1.Create signed vote in validator-engine-console: `createproposalvote 23904444691628258345928631083077623616080921932696498730525878822203253780796    vote-msg-body.boc`
    2. Send obtained vote-msg-body.boc to `-1:5555555555555555555555555555555555555555555555555555555555555555` in internal message from any wallet from masterchain with 2 TON attached. If you are using wallet.fif script, it can be done via:
    `fift -s wallet.fif <path-to-key> -1:5555555555555555555555555555555555555555555555555555555555555555 <seqno> 2 -B vote-msg-body.boc`
     and send resulting message to network.
    If you are using lite-client, it can be done via
    `lite-client -C global-config.json  -rc "sendfile wallet-query.boc"`

    Repeat for 
    `47041144111931510246884934921852810661053253645699579321056455888130945579657`  and `114378994789915754305566936325956928749149442521376354003451273810632019215741`

---

## [186] 2025-12-04T06:59:33+00:00

- Permalink: https://t.me/tonstatus/186
- Author: TON Status
- Views: 13.2K

**Mainnet validators and node owners**
Scheduled network update on December 15

We are asking operators to schedule a time on Monday, **December 15 **at **8:00 UTC** for software update.

This upgrade is **mandatory** and will migrate celldb to celldb_v2 while enabling the fast serialization process as the default (which also reduces RAM usage). The upgrade also includes emulator improvements, improvements of traffic compression, introduces parallel validation (not yet enabled by default), and addresses various minor issues.

---

## [187] 2025-12-15T08:49:17+00:00

- Permalink: https://t.me/tonstatus/187
- Author: TON Status
- Views: 14K

**Mainnet Validators and Node Owners**

Please update your node software (see "Target versions"):


```
update master
upgrade master

```


Target versions:
— mytonctrl:  `1b12526`
— node `f7f0c90`
If you are not using mytonctrl or using ubuntu older than 22.04, check this [instruction](https://telegra.ph/TON-Node-Upgrade-202511-11-05).

This update is mandatory for validators and node owners. Node [changelog](https://github.com/ton-blockchain/ton/blob/f7f0c90831b0df495a8dc9ea7413d3a6c0e74830/recent_changelog.md). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.11.0).

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [188] 2025-12-15T08:49:17+00:00

- Permalink: https://t.me/tonstatus/188
- Author: TON Status
- Views: 15.7K

If you are running on-premises Toncenter APIs you will need to ensure that those components are upgraded **alongside** with node upgrade to the following versions:

**Toncenter Indexer**
v1.0 tree -> v1.0.4
v1.1 tree -> v1.1.10
v1.2 tree -> v1.2.5

**Toncenter HTTP API**
v2.0.63

New versions of API components are backwards compatible with previous releases and do not introduce any breaking changes.

---

## [189] 2026-02-05T13:33:59+00:00

- Permalink: https://t.me/tonstatus/189
- Author: TON Status
- Views: 9.63K

**Mainnet validators and node owners**
Scheduled network update on February 12

We are asking validators to schedule a time on Thursday,** February 12 **at **8:00 UTC** for validator software update.

This update is **mandatory** and contains new broadcasts, compression, improved node synchronization stability as well as not yet enabled but required in the future update changes. Please be prepared.

---

## [190] 2026-02-12T07:57:26+00:00

- Permalink: https://t.me/tonstatus/190
- Author: TON Status
- Views: 9.55K

**Mainnet Validators and Node Owners**

Before upgrade please install clang-21 or higher (it is mandatory now, instruction is [here](https://gist.github.com/neodix42/24d6a401e928f7e895fcc8e7b7c5c24a)). And remove openssl binaries compiled by previous TON installations:

```
sudo rm -rf /usr/bin/openssl_3

```


Then please update your node software (see "Target versions"):


```
update master
upgrade master

```


Target versions:
— mytonctrl:  `c171ae5`
— node `f67a1d9`


This update is mandatory for validators and node owners. Node [change log](https://github.com/ton-blockchain/ton/blob/f67a1d95a21070decf54639bfd940e2460f46b47/recent_changelog.md). Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.12.0).
**
We ask validators and node operators to complete update as soon as possible no later than 20 February 2026.**

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one).

---

## [191] 2026-02-12T07:57:26+00:00

- Permalink: https://t.me/tonstatus/191
- Author: TON Status
- Views: 10.4K

If you are running on-premises Toncenter APIs you will need to ensure that those components are upgraded **alongside** with node upgrade to the following versions:

**Toncenter Indexer**
v1.2 tree -> v1.2.6

**Toncenter HTTP API**
v2.0.64

New versions of API components are backwards compatible with previous releases and do not introduce any breaking changes.

---

## [192] 2026-02-23T14:00:23+00:00

- Permalink: https://t.me/tonstatus/192
- Author: TON Status
- Views: 8.33K

**Mainnet validators and node owners**
Scheduled network update on February 24

We are asking validators to schedule a time on **Tuesday, February **24 at 8:00 UTC (tomorrow) for validator software update.

This update is **mandatory** and contains stability fixes. Validators and nodes that are already upgraded to `1690ba0` may skip this update.

---

## [193] 2026-02-24T07:59:43+00:00

- Permalink: https://t.me/tonstatus/193
- Author: TON Status
- Views: 13K

**Mainnet Validators and Node Owners**

Please update your node software (see "Target versions"):


```
update master
upgrade master

```


Target versions:
— mytonctrl:  `c171ae5`
— node `1690ba0`
 


This update is **mandatory** for validators and node owners and contains stability fixes. 
**
**Update is fully backward compatible and doesn't require update of ton-http-api (version v2.0.64+) and ton indexer (version v1.2.6+)

If you have several validator nodes, please update them one by one (update, wait for synchronization, move to the next one)

---

## [194] 2026-03-19T13:20:48+00:00

- Permalink: https://t.me/tonstatus/194
- Author: TON Status
- Views: 7.4K

**Mainnet validators and node owners**
Scheduled network update on March 31

We are asking validators and nodes to schedule a time on **Tuesday, March 31 at 8:00 UTC** for validator software update.

This update is mandatory and introduce changes to consensus that is expected to be activated in early April.

---

## [195] 2026-03-31T07:57:34+00:00

- Permalink: https://t.me/tonstatus/195
- Author: TON Status
- Views: 7.54K

**Mainnet Node Software Update** **[**[v2026.03](https://github.com/ton-blockchain/ton/releases/tag/v2026.03)**]**

Please update your node software (see "Target versions"):

Update with mytonctrl:

```
update master
upgrade master

```


Target versions:
— mytonctrl: `c38f540`
— node `af252bc`

If you are not using mytonctrl or using ubuntu older than 22.04, check this instruction ([https://telegra.ph/TON-Node-Upgrade-202511-11-05](https://telegra.ph/TON-Node-Upgrade-202511-11-05)).

If you have several validators, please update them one by one:
update a validator => wait for synchronization => move to the next one validator
__________________________________________________

Update is **mandatory** for:
- validators
- liteservers
- archive liteservers
and should be done before EOD April 1.


This release includes breaking changes to Catchain 2.0 Consensus that will be activated in early April and are therefore required for validator operation. It also contains many stability improvements.

This release **does not** include breaking API changes and is fully compatible with recent versions of ton-http-api (version: v2.0.64+) and TON Indexer (version: v1.2.6+).

Node [changelog](https://github.com/ton-blockchain/ton/blob/af252bcdaea357fee21739e984654c2c84e7d61d/recent_changelog.md).
Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.13.0).

---

## [196] 2026-03-31T13:02:30+00:00

- Permalink: https://t.me/tonstatus/196
- Author: TON Status
- Views: 7.21K

**Sub-Second mainnet activation timeline for validators**

**March 31 (today)**: [Upgrade validator nodes](https://t.me/tonstatus/195)** **to the version supporting the latest consensus changes.

**April 2:** Vote to **activate the new consensus on the basechain** and **enable a moderate block rate increase**.

**April 7: **First, vote to **fully activate fast consensus on both the basechain and masterchain**, and then upgrade validator nodes.

---

## [197] 2026-04-01T09:55:10+00:00

- Permalink: https://t.me/tonstatus/197
- Author: TON Status
- Views: 11.2K

**Mainnet validators**

Tomorrow, **April 2, at 8:00 UTC**, we ask validators to set aside time to vote on two proposals:

— Bump the TVM version to [13](https://github.com/ton-blockchain/ton/blob/master/doc/GlobalVersions.md#version-13). This fixes some logical issues in transaction execution and serialization (which does not affect real-world contract behavior) and allows faster than 1 block per second.

— Vote to activate Catchain 2.0 in the basechain, with a block time of 800 ms and a first-slot timeout of 1600 ms.

Due to the transition to the new consensus, and to prevent unjust penalties after the new consensus is activated, voting on fines in MyTONControl is disabled until April 20. Thank you for your attention to this matter.

---

## [198] 2026-04-02T07:59:02+00:00

- Permalink: https://t.me/tonstatus/198
- Author: TON Status
- Views: 6.71K

**Mainnet Validators**

Please ensure that your node is up-to-date (see "Target versions") and vote for proposal described [above](https://t.me/tonstatus/197).


```
vo 4584813700287845504087026157451368340466400045879786828806270820611372984010 67278638360635871279241310364679419892513753094383521529029204229246773004198
```

Target versions:
— mytonctrl: `c38f540`
— node `af252bc`
If you are not using mytonctrl, each round:
    

    1.Create signed vote in validator-engine-console: `createproposalvote 4584813700287845504087026157451368340466400045879786828806270820611372984010    vote-msg-body.boc`
    2. Send obtained `vote-msg-body.boc` to `-1:5555555555555555555555555555555555555555555555555555555555555555` in internal message from any wallet from masterchain with 2 TON attached. If you are using `wallet.fif` script, it can be done via:
        `fift -s wallet.fif <path-to-key> -1:5555555555555555555555555555555555555555555555555555555555555555 <seqno> 2 -B vote-msg-body.boc`
         and send resulting message to network.
        If you are using lite-client, it can be done via
        `lite-client -C global-config.json  -rc "sendfile wallet-query.boc"`

    3. Repeat for `67278638360635871279241310364679419892513753094383521529029204229246773004198`

---

## [199] 2026-04-03T06:34:07+00:00

- Permalink: https://t.me/tonstatus/199
- Author: TON Status
- Views: 9.95K

**Mainnet validators**

The [proposals](https://t.me/tonstatus/198) for the first stage of the migration to the TON Sub-Second regime have been accepted. Thank you for your support!

The mainnet basechain is already running on Catchain 2.0 with an 800 ms target block time. Services using [streaming APIs](https://t.me/toncenter_news/56), such as [MyTONWallet](https://t.me/myapp), have already seen up to a 3x improvement in transaction UX speed. Services relying on older, more established APIs should continue to operate as usual.

The second and final stage of the migration, which will fully enable Catchain 2.0 on the masterchain and reduce block time to 400 ms, will begin on April 7. We would appreciate your support for this step as well.

**⚠️*** Please note that full activation of Catchain 2.0 consensus requires an additional open UDP port for ingress traffic on nodes a**ctively participating in validation** (full nodes and lite servers are not affected). Documentation on this will be published later today in this channel.

---

## [200] 2026-04-04T04:49:18+00:00

- Permalink: https://t.me/tonstatus/200
- Author: TON Status
- Views: 11K

**New port configuration instruction for validators**

[https://telegra.ph/TON-Catchain-20-consensus-QUIC-Communication-Port-04-03](https://telegra.ph/TON-Catchain-20-consensus-QUIC-Communication-Port-04-03)

---

## [201] 2026-04-06T10:49:23+00:00

- Permalink: https://t.me/tonstatus/201
- Author: TON Status
- Views: 10.4K

**Mainnet Validators**

Voting and the upgrade have been postponed from April 7 to **April 8** at **14:00 UTC**.

Additional time has been allocated for infrastructure preparations by certain validators and services, as well as for additional preparation of the TON Core development team.

---

## [202] 2026-04-07T14:19:53+00:00

- Permalink: https://t.me/tonstatus/202
- Author: TON Status
- Views: 10.7K

**Mainnet validators**

Tomorrow, **April 8, at 14:00 UTC**, we ask validators to set aside time to upgrade and vote on the following proposal:

— Vote to change Config Parameter 30, to activate Catchain 2.0 in both masterchain and basechain with block production rate of 400ms.

In addition to improving network performance from a UX speed perspective, this change is also expected, based on the current network configuration, to increase total validator rewards. However, the final validation APY cannot be determined in advance, as it depends on the dynamic relationship between the total staked amount and the reward pool.

---

## [203] 2026-04-08T12:57:33+00:00

- Permalink: https://t.me/tonstatus/203
- Author: TON Status
- Views: 10.4K

**Mainnet Validator Software Update** **[**[v2026.04](https://github.com/ton-blockchain/ton/releases/tag/v2026.04)**]**

Please update your node software (see "Target versions") and vote for [full Catchain 2.0 activation](https://t.me/tonstatus/202):

Update with mytonctrl:

```
update master
upgrade master
vo 105891622821359345175052772982283277971723874256514599276871132830604887326799


```


Target versions:
— mytonctrl: `dedc7aa`
— node `76f0ac2`

If you are not using mytonctrl or using ubuntu older than 22.04, check this instruction ([https://telegra.ph/TON-Node-Upgrade-202511-11-05](https://telegra.ph/TON-Node-Upgrade-202511-11-05)).

If you have several validators, please update them one by one:
update a validator => wait for synchronization => move to the next one validator

**⚠️*** Updated instructions related to opening QUIC port is [available](https://telegra.ph/TON-Catchain-20-consensus-QUIC-Communication-Port-04-03). It includes details **how to check whether your validator setup is correct**, please use it.
__________________________________________________

Update is **mandatory for validators** and contains measures to improve stability and defense of validators in crowded overlays under elevated TPS loads, as well as tooling for fine-tuning QUIC transport.

It is **not required** for liteservers and archive liteservers.


This release **does not** include breaking API changes and is fully compatible with recent versions of ton-http-api (acceptable versions: v2.0.64 and higher) and TON Indexer (acceptable versions: v1.2.6 and higher).

Node [changelog](https://github.com/ton-blockchain/ton/blob/76f0ac235e66a45c21706b253b3b2feeff767b76/recent_changelog.md).
Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.14.0).

---

## [204] 2026-04-09T06:20:52+00:00

- Permalink: https://t.me/tonstatus/204
- Author: TON Status
- Views: 12.7K

**Catchain 2.0 activation**

The proposal to activate Catchain 2.0 passed the first round with [more than 85% support](https://vote.lagus.cooking/). Thank you!
We expect activation to take place shortly after the start of the next round, around 7:00 a.m. UTC.


**⚠️*** **At the moment, about 7% of the network has not yet been updated. Please**:
**
1) update immediately and **

**2) open QUIC port** **(**[**QUIC instructions**](https://telegra.ph/TON-Catchain-20-consensus-QUIC-Communication-Port-04-03)**) and** **verify that the QUIC port is available on **[**validators.ton.org**](http://validators.ton.org/)**.**

---

## [205] 2026-04-09T08:12:49+00:00

- Permalink: https://t.me/tonstatus/205
- Author: TON Status
- Views: 14.8K

**Sub-Second is Live**

The vote to enable Sub-Second has passed, and the blockchain has switched to the new high-speed mode.

The blockchain is currently running stably.

About 7% of validators have not yet updated, so the block production rate is still slightly below the target

We ask validators who have not yet updated to [do so](https://t.me/tonstatus/203).

API developers and product developers — please make sure everything is working properly in your services.

---

## [206] 2026-04-20T20:43:09+00:00

- Permalink: https://t.me/tonstatus/206
- Author: TON Status
- Views: 5.9K

**Scheduled Closure of the Token Bridge** **V3**

Effective **April 27 **at** 12:00 UTC**, token transfers from Ethereum to TON through the [bridge-v3.ton.org](https://bridge-v3.ton.org/) will be permanently discontinued.

Claims for previously completed transfers will remain available.

Transfers from TON to Ethereum will remain available. The token-amount-based fee for such transfers will be removed.

This is a planned closure of the Token Bridge V3, following the earlier discontinuation of [jUSDT](https://t.me/toncoin/1328) and [Toncoin transfers](https://t.me/toncoin/1935). All user funds remain safe.

The Token Bridge played an important role in the early development of the TON ecosystem.

The ecosystem is transitioning to newer cross-chain solutions:
[https://ton.org/bridges](https://ton.org/bridges)

---

## [207] 2026-04-20T20:43:30+00:00

- Permalink: https://t.me/tonstatus/207
- Author: TON Status
- Views: 6.96K

**Lite Server and Full Node operators
**
A [new update](https://github.com/ton-blockchain/ton/) is available to improve node stability and synchronization. Operators experiencing issues (including error 651) with their nodes are advised to update.

`master` branch: `03cc3da51db03b8876c2cc2a43fd46410ff8bc34`.

This update applies to Lite Servers and Full Nodes only. Validators do not need to update.

---

## [208] 2026-04-22T12:35:35+00:00

- Permalink: https://t.me/tonstatus/208
- Author: TON Status
- Views: 9.93K

**Liteserver Synchronization Instability**

Over the past several days, multiple operators have reported liteserver synchronization issues.

Our analysis has identified several potential causes affecting block and external message propagation in public overlays. We have already deployed a number of mitigations to reduce the impact. However, a full resolution will require additional analysis and a validator update.

Expected Impact:

At this time, the impact appears to be limited primarily to smaller 
third-party operators running a single liteserver. The blockchain 
continues to operate within an acceptable range, transaction processing performance has not deteriorated, and major services and wallets continue to function normally.

We currently expect the validator update to take place on April 28. Some validators may be asked to update earlier.

*Upd:* [https://telegra.ph/Synchronization-Instability-Report-04-23](https://telegra.ph/Synchronization-Instability-Report-04-23)

---

## [209] 2026-04-28T12:15:05+00:00

- Permalink: https://t.me/tonstatus/209
- Author: TON Status
- Views: 7.59K

**Mainnet Validator Software Update** **[**[v2026.04-1](https://github.com/ton-blockchain/ton/releases/tag/v2026.04-1)**]**

Please update your node software:

Update with mytonctrl:
`update master
upgrade master`

Target versions:
— mytonctrl: `62bbe8f`
— node `591b34d`

If you are not using mytonctrl or using ubuntu older than 22.04, check this instruction ([https://telegra.ph/TON-Node-Upgrade-202511-11-05](https://telegra.ph/TON-Node-Upgrade-202511-11-05)).

If you have several validators, please update them one by one:
update a validator => wait for synchronization => move to the next one validator


Update is **mandatory for validators** and contains measures to improve stability and security of validators.

It is **not required, but highly recommended** for liteservers and archive liteservers especially those that experienced synchronization instability.


This release **does not** include breaking API changes and is fully compatible with recent versions of ton-http-api (acceptable versions: v2.0.64 and higher) and TON Indexer (acceptable versions: v1.2.6 and higher).

Node [changelog](https://github.com/ton-blockchain/ton/blob/9f24a2644d97948392ff2280d4b4a433dcd51be8/recent_changelog.md).
Mytonctrl [changelog](https://github.com/ton-blockchain/mytonctrl/releases/tag/v2.15.0).

---

## [210] 2026-04-29T18:04:18+00:00

- Permalink: https://t.me/tonstatus/210
- Author: TON Status
- Views: 9.03K

**Mainnet Validators**

We ask you to support the [proposal by Pavel Durov to reduce transaction fees by 6 times](https://t.me/durov/499) as part of the broader MTONGA plan.

Technical details are available [here.](https://telegra.ph/MTONGA-step-27-04-29)

If accepted, the proposal would reduce total validator rewards by less than 0.4%, because transaction fees are only a small part of the validator reward.

Please be prepared to cast your vote after **13:00 UTC** on **April 30**, tomorrow.

---

## [211] 2026-04-30T13:11:50+00:00

- Permalink: https://t.me/tonstatus/211
- Author: TON Status
- Views: 11.4K

**Mainnet validators**

Please take part in the voting for network config adjustment.
Details of updates are given [above](https://t.me/tonstatus/210).

1. Check that your validator software is on the latest version: commit `591b34d`.

If you use mytonctrl, please vote for proposal via 


```
vo 84123553170509389098874880050862184605633619991871324449516531408050268055269 42941749423356085253181262402693749199117510848841139894863341148398531565866 65009153936108305610337904793535370282692919307756841131143481982045644609157
```

---

## [212] 2026-05-01T11:19:55+00:00

- Permalink: https://t.me/tonstatus/212
- Author: TON Status
- Views: 6.45K

**Mainnet validators**

[All proposals](https://t.me/tonstatus/211) were [accepted](https://vote.lagus.cooking/)! Thank you!

---

## [213] 2026-05-02T11:10:56+00:00

- Permalink: https://t.me/tonstatus/213
- Author: TON Status
- Views: 5.59K

**Mainnet Validators**

Due to the heightened attractiveness of staking, significant new capital has entered the validation, resulting in a corresponding increase in the minimum and maximum effective stakes required for validation.

We advise validators to verify whether their current machine allocations are sufficient to participate in validation and to aggregate their stakes into larger positions where feasible.

In the current round, the minimum and maximum stakes are 824,000 and 2,425,000 TON, respectively. We anticipate an increase to 1,000,000 and 3,000,000 TON in the near future. Please ensure you are prepared for this adjustment.

If you do not possess sufficient stake to participate in both rounds, consider utilizing staking services, which typically offer specialized conditions for large-scale stakeholders. Alternatively, you may configure 1-of-2 rounds validation. Please contact Core support for consultation regarding the implementation of this strategy to preserve maximal capital efficiency.

---

## [214] 2026-05-04T13:42:35+00:00

- Permalink: https://t.me/tonstatus/214
- Author: TON Status
- Views: 4.16K

**Clarification for TON Node Operators
**
The Rust implementation of the TON node has experimental status and is not intended for use on the main network, either as a validator or as a full node/liteserver.

At this time, alternative TON node implementations do not yet provide the required quality of operation or sufficient compatibility with current protocols. For validators, this means a risk of penalties for improper operation once the slashing system is re-enabled.

The TON network currently runs on the reference [C++ implementation](https://github.com/ton-blockchain/ton). Bringing alternative implementations into operation is not on the agenda — the priority is the continued rapid development of protocols and technologies in support of the MTONGA plan.

For the main network, operators should use the C++ version of the TON node.

---

## [215] 2026-05-23T14:25:02+00:00

- Permalink: https://t.me/tonstatus/215
- Author: TON Status
- Views: 5.02K

**Final shutdown stage for Toncoin and Token Bridge**

Toncoin and Token Bridge at [bridge-v3.ton.org](http://bridge-v3.ton.org/) will be permanently shut down on **September 1, 2026**.

All percentage-based transfer fees have been waived for the remaining bridge withdrawal period.

Users who have previously used the bridge should check their wallets and withdraw any remaining bridged assets before the shutdown date.

**Required action**

If you have Wrapped Toncoin in your [Ethereum](https://etherscan.io/token/0x582d872a1b094fc48f5de31d3b73f2d9be47def1) or [BNB Smart Chain](https://bscscan.com/token/0x76A797A59Ba2C17726896976B7B3747BfD1d220f) wallet, please bridge it back to TON using [bridge-v3.ton.org](http://bridge-v3.ton.org/) before September 1, 2026.

If you have jUSDT, jUSDC, jDAI, jWBTC, or any other j-tokens in your TON wallet, please bridge them back to Ethereum using [bridge-v3.ton.org](http://bridge-v3.ton.org/) before September 1, 2026.

After this date, the bridge will no longer be available for any transfers.

**Current status**

All previously submitted user transfers have been processed.

For transfers that had been executed but not claimed by users, the required TON and EVM network fees were covered, and those transfers have also been completed.

On June 2026, bridge oracles will withdraw their stakes from the bridge contracts. The oracles will continue processing bridge transfers until the final shutdown on September 1, 2026.

---

## [216] 2026-05-25T14:43:14+00:00

- Permalink: https://t.me/tonstatus/216
- Author: TON Status
- Views: 7.05K

**Mainnet validators and node owners**
Scheduled network update on June 1

We ask all validators and node owners to schedule time on **Monday, June 1, at 10:00 UTC** to update their validator software.

This update is mandatory and introduces security and performance-related changes to consensus.

On **June 3**, we expect to propose corresponding network configuration changes for voting, including:

- **Config8**: set TVM version to 14 and activate the full_collated_date capability to improve validation performance.
- **Config17**: increase max_stake_factor from 3 to 4.5, allowing validators with smaller stakes to continue participating in network maintenance despite higher maximum stakes.
- **Config29**: set max_collated_bytes to 10 MB.
- **Config30**: set enable_observers from 0 to 1, introducing a separate overlay for fast candidate broadcasts among validators.
- **Config79, 80, 81**: change of addresses to proceed with bridge [closure](https://t.me/tonstatus/215).

These changes will increase overall network performance and won't affect validation rewards

---
