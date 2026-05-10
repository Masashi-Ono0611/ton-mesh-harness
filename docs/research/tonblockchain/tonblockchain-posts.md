# Resistance Tools — All Posts (chronological)

Format per post: `## [<msg_id>] <datetime>` followed by author / metadata / body.

---

## [1] 2020-05-19T16:38:23+00:00

- Permalink: https://t.me/tonblockchain/1
- Author: The Open Network

Channel created

---

## [3] 2020-05-28T23:12:28+00:00

- Permalink: https://t.me/tonblockchain/3
- Author: The Open Network
- Views: 77.2K

**The Open Network** — the next gen network to unite all blockchains and the existing Internet.

Developers, validators, TON Blockchain Contests winners and decentralized technology enthusiasts teamed up to finish work on the next generation blockchain **TON** after the Telegram team was [forced to stop](https://telegra.ph/What-Was-TON-And-Why-It-Is-Over-05-12) its work.

Members of the community are located in different parts of the world, **do not belong to any commercial** organization, and share the principles of **open source** software.

[Official website »
](https://ton.org/)[Github »

](https://github.com/ton-blockchain)**💎***** **[**Wallets**](https://ton.org/wallets)[

](https://tonwallet.me/plugin)**🔧***** **[**Developers**](https://ton.org/dev)[
](https://github.com/toncenter/tonweb)
**⚙️*** [**Validators**](https://ton.org/validator)[
](https://ton.org/validator)[
](https://newton-faucet.herokuapp.com/)**💬*** [**Community**](https://ton.app/channels)

**🎮***** **[**Apps**](https://ton.app/)

**📔*** **Сonfigs**
Mainnet (wallets only) - [https://ton.org/global-config-wallet.json](https://ton.org/global-config-wallet.json)
Mainnet - [https://ton-blockchain.github.io/global.config.json](https://ton-blockchain.github.io/global.config.json)
Testnet - [https://ton-blockchain.github.io/testnet-global.config.json](https://ton-blockchain.github.io/testnet-global.config.json)

---

## [8] 2021-01-02T14:55:43+00:00

- Permalink: https://t.me/tonblockchain/8
- Author: The Open Network
- Views: 52.2K

The [config](https://newton-blockchain.github.io/global.config.json) has been updated in the TON testnet2 network. You need to change it in your wallets, as well as rebuild the tonlib with a new config.

---

## [9] 2021-02-04T12:38:22+00:00

- Permalink: https://t.me/tonblockchain/9
- Author: The Open Network
- Views: 42.8K

In preparation for major updates we added versioning to the catchain.

Most of the TON testnet2 validators have already migrated to the new version.

If you want to validate testnet2, you need to build code from the repo [https://github.com/newton-blockchain/ton](https://github.com/newton-blockchain/ton) maintained by the community, because the old code no longer works on the network.

---

## [10] 2021-02-07T17:23:27+00:00

- Permalink: https://t.me/tonblockchain/10
- Author: The Open Network
- Views: 35.5K

To simplify testnet support we made a proposal to reduce the minimum number of shardchains to 1 and increase shard_validators_num to 23.
If you are a testnet validator please vote for this proposals.

*Via mytonctrl:
*`vo 54797850960887351737150708146680849283627538596966347842507940068453684468690`
`vo 2882807040088121645257779306400087831792455420681265829869268582504873919135`

*Via lite-client or validator-console:
*Please follow instructions [https://test.ton.org/ConfigParam-HOWTO.txt](https://test.ton.org/ConfigParam-HOWTO.txt) 4th chapter and following.

UPD: done!

---

## [12] 2021-02-10T14:50:10+00:00

- Permalink: https://t.me/tonblockchain/12
- Author: The Open Network
- Views: 30.4K

As the next step we plan to complete slashing on the TON network (in particular, a community member Igroman has already done a lot of work on slashing idle validators).

We also invite you to join the TON Developers & Validators chat if you are:
a) the author of TON services / apps
or
b) the winner of the TON contests
or
c) the owner of 100k+ testgrams (as confirmation that you have been interested in TON for a long time).

Please write to [@tolyayanot](https://t.me/tolyayanot) if you want to participate in the development of TON.

---

## [13] 2021-02-22T19:33:22+00:00

- Permalink: https://t.me/tonblockchain/13
- Author: The Open Network
- Views: 26.8K

We are glad to announce that we have finished functionality of slashing idle validators. It is a necessary part for security and stability of network.

If the validator created less than 90% of the expected number of blocks during the validation period, then it is considered idle.

At the moment, for testing, idle validators will be fined for symbolic 101 coins (this is significantly less than the reward for the validation period).

Users of mytonctrl need to do next commands: `update` and then `upgrade`. Please do not update all validators at the same time.

The next big task is to make the functionality of slashing cheating validators.

---

## [14] 2021-03-25T15:30:48+00:00

- Permalink: https://t.me/tonblockchain/14
- Author: The Open Network
- Views: 28K

We announce that working wallets for Windows, MacOS, Linux, Web, Android are available on the site [toncoin.org/wallets](http://toncoin.org/wallets).

iOS wallet and Google Chrome extension are pending store approval.

All wallets are open source. 

Thanks to neodix, the most convenient autobuild system works [https://github.com/newton-blockchain/wallet-desktop/actions](https://github.com/newton-blockchain/wallet-desktop/actions).

The global network config is located at the link [https://newton-blockchain.github.io/global.config.json](https://newton-blockchain.github.io/global.config.json).

**Photos:**
- https://cdn4.telesco.pe/file/jV50IZGKkK6qZCbLeg2fy7n0sWj9gTN0XIE1mPZ0H3ngXgRygAtSmwZhDxP_DcoYOIuHt4KIBHEDHUufh3sJtacbkipsgy9nAkb_nTnHTU_jk0Eu1js9y1PW-P2JukEMIlRuMvuLW5n1QxHpylDB2bvpNYEzj27s84Pcsm4mZ34qeRr986RRZLzFAw7FbKrO2Xjhb4bzU6Ow9S4ZP6FdtfGM3iktebHd1fCFOglhsx1EpYRK8xoOMPL_kJYYUNRQxNzbkTb2Psred9wpTVDn54o9FON020FQ9qYaV9aZCi4tBBAuZm0fve9qSChyuEIo_SeVjcJDXDpmfMCx0vDkyQ.jpg

---

## [16] 2021-04-04T14:35:16+00:00

- Permalink: https://t.me/tonblockchain/16
- Author: The Open Network
- Views: 29.9K

Good news!

iOS TON wallet has been reviewed and is now available on the [AppStore](https://apps.apple.com/by/app/toncoin-wallet/id1560210939).

In addition, community members [added TON support to the Ledger ](https://github.com/newton-blockchain/ledger-app-ton)hardware wallet. The first integration with Ledger is already available in the web wallet [tonwallet.me](http://tonwallet.me/). 

We are planning to add TON to the Ledger Live Catalog and for this **we need your help**.

Please make positive reactions to the pull request [https://github.com/satoshilabs/slips/pull/1091](https://github.com/satoshilabs/slips/pull/1091). This will help to add TON Coin to the list faster.

UPD: TON Coin added to SLIP-0044 with ID 607. Thank you!

**Videos:**
- https://cdn4.telesco.pe/file/5b4a7141e5.mp4?token=X44MRSqiH_hAQW5hXJ4IG3rLsy2ACsCd1CQ1C2wYL4Q2i9CL11JvUDB-bbGalA30Imwm0Lbl2obqTQ4LTJHOx7tGXkjellNICu785FOb64VLMpAfd0Kca50bJUdrloEx7lpaXV1Jgs9jY8iS-CXpnzCJtD2M6nFnVCmCd2jHSH1ogDoutAW3cUa9FJi69Uz7ZzhrIIMaJlgMxe87_ZBQ93T5OEDH8PmAlKt6P_ZmRKNqCuTfX7JqPKohVC_K6vrH5nAingbTCFMmXHtt_AR6yB8_hQXbIyTgKYUarsCXWullaVPNV8WfYRY4h8CA7I0YmeC1nY7laf9S-9VEOEK-2w

---

## [17] 2021-04-07T13:14:37+00:00

- Permalink: https://t.me/tonblockchain/17
- Author: The Open Network
- Views: 37.2K

A detailed description of [slashing of idle validators (TIP-13)](http://github.com/newton-blockchain/TIPs/issues/13) and [slashing of cheating validators (TIP-14)](http://github.com/newton-blockchain/TIPs/issues/14) is ready.

Slashing is one of the most important parts of network stability and security.

At the moment, most validators use [mytonctrl](https://github.com/igroman787/mytonctrl) with already implemented slashing of idle and cheating validators.

**We ask all validators who do not use mytonctrl** to make their scripts that implement voting for complaints as detailed in [https://github.com/newton-blockchain/TIPs/issues/13#issuecomment-814360053](https://github.com/newton-blockchain/TIPs/issues/13#issuecomment-814360053)

---

## [18] 2021-04-07T15:40:02+00:00

- Permalink: https://t.me/tonblockchain/18
- Author: The Open Network
- Views: 41.4K

Thanks to sonofmom and akme, we have network monitoring tools [tonmon.xyz](http://tonmon.xyz/) and [tonmine.xyz](http://tonmine.xyz/).

We were surprised to find that many users are spending [significant](https://tonmine.xyz/) power to pow-givers mining on the current network and this process is growing.

Since coins in the current network have value, it seems to make sense to create a separate testnet for development and testing.

---

## [20] 2021-04-13T20:08:27+00:00

- Permalink: https://t.me/tonblockchain/20
- Author: The Open Network
- Views: 30K

Since we assume that the value of the TON coin will only grow, we ask you to participate in the creation of the fund of TON Foundation.

Please make a feasible TON coins donation to the address EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N which is controlled by community members. Once the multisig contract is ready the fund will be transferred there.

These funds will be used to further develop and maintain the TON network.

This is very important for us because the TON community is a non-profitable organization.

A substantial number of transfers were already made to the fund by the validators and miners of the current network and now we are kindly asking all of the coin holders who may be reached by that post not to stay away and make their donations.

---

## [21] 2021-05-26T19:41:19+00:00

- Permalink: https://t.me/tonblockchain/21
- Author: The Open Network
- Views: 26.4K

In accordance with the messages above, the current TON network, which previously had the testnet2 ID, is being renamed to the **mainnet**.

For debugging and testing purposes, a separate testnet with test coins has been launched.

Testnet config added to the [first post](https://t.me/tonblockchain/3) of this channel.

[Updated](https://toncoin.org/wallets) wallets for Windows, MacOS, Linux - now you can use the **mainnet** blockchain ID in the settings.

Updated mobile wallets in the process of approval by stores.

All wallets validate the init block and key blocks of the network, so the **mainnet** blockchain ID guarantees that you are connected to the correct network.

**Photos:**
- https://cdn4.telesco.pe/file/k_2v-ZWJBLS72rEdJ0vls49SoODV4pOLJ7jntDOyFEL-ABWd9a51KfvIGD4rsea6LRvjm_MqDrppteezL5eizNyhX1Br5AyFR6-acyY2w8G-e01EhPtYy0szOdptDpOWYDfmpBL-FzY4BN1rLK-p25H5Njfuqco9QGAhYcnVy4pOFhXB67Ikd7UEQX9JCVk7SszZ8HNzrQ3LTeAokQarNaxU7FhVFtxptszVhoAAg1mQ8SD1W_jw4NvuatFG8L73hnYtpuAsqSsO7ADFkRYWnU2hCDAT4TX21rdhhgsetQpq76z4i5r_cbEgkPSCUspqkNV9pmkCh16a9n4E9aRrMg.jpg

---

## [22] 2021-06-06T13:30:42+00:00

- Permalink: https://t.me/tonblockchain/22
- Author: The Open Network
- Views: 22K

Validators who for some reason do not use [mytonctrl](https://github.com/igroman787/mytonctrl) please use this **punisher script** [https://github.com/newton-blockchain/punisher](https://github.com/newton-blockchain/punisher)

This script implements receiving complaints about idle or cheating validators, checking complaints and voting for complaints to fine such validators.

This single file script has no dependencies and can be easily reviewed.

If you are using mytonctrl (recommended) you do not need to use this script as the complete slashing process is already built into mytonctrl.

---

## [23] 2021-06-14T16:53:50+00:00

- Permalink: https://t.me/tonblockchain/23
- Author: The Open Network
- Views: 21.3K

**TON Services** are one of the core parts of The Open Network.

Introducing [TON Store](https://toncoin.org/services) - a catalog of third-party TON apps and dapps.

There are big plans for the development of TON Store - adding new functionality, such as app ratings and user reviews, as well as expecting a large number of new apps.

**Photos:**
- https://cdn4.telesco.pe/file/EtVI86XVH-EQjbN9vZiffDbYwy_G0y2Kl_nKJxNLFumPgmPpHNHAWIk2VUKvfIHXDkCiT8sWNSWfnvXFrdIvXr-_gOIPIItpSMMN8Hry3oyY1Kl_n89k-Ycsy1I9j4hrmY3o2lBSPoaeXD9X8G-csElcyPkfsULsZIT264_fgIrKj1abISP5xufLhTSdG79q16d1c_V5Y8D6sHmWwemgnABO9lLUXJCyZZciF_zqob8tDeEIYafZvMyHgamLAD1BKGjeM49qdUj46_gtfwICIAsbmUMvvGZkLc-oAX5Bn9VylmgGZP3UI3h9q9PT1SJWPi-IRX5zOlMgbUrhuFwU1A.jpg

---

## [24] 2021-06-14T16:54:03+00:00

- Permalink: https://t.me/tonblockchain/24
- Author: The Open Network
- Views: 21.4K

We are impressed with the superior design and quality of the first third-party TON apps like [@CryptoBot](https://t.me/CryptoBot).

**Videos:**
- https://cdn4.telesco.pe/file/78cb946ee8.mp4?token=spk0Mgxm-6RLtAL95SEosNISQC3V4oY9q60PQxPD3bQ0-O7267IqZn6Ua--74Ty7OjbiXbAN6m745nloTNPWPrGH2dZtXjqeoj8kybvigpkHpZ-AClXBy35jqND2OrDAtZaXmBWnY0A4K_tAEqCymSsa_bJa0nEWFLl8Qau-KeCF_Y6tMgvYDvETzyxzsthepq30_CofB04FjzRChe0_UoQ3mKmCoifN-KJ43AzxO65fJQD_qj2Am5rDdZj2X8oa_zOWMi76vijYsr3KIfWjE3njvdsgD01haRZ2Hka8x_aaClJ_2blwKVtBSVEk1npFHYjWDrN2uo2jR0ZZGtdhCA

---

## [25] 2021-06-19T15:37:34+00:00

- Permalink: https://t.me/tonblockchain/25
- Author: The Open Network
- Views: 27.7K

Introducing the [**TON-ETH Bridge**](https://toncoin.org/bridge)** **- a user-friendly decentralized bridge that allows transfer TON Coins between the TON network and the Ethereum network.

The main development phase of the bridge has been completed and now you can [test](https://toncoin.org/bridge) transfers between TON testnet and Ethereum Ropsten testnet.

You can find out [how it works](https://toncoin.org/how-it-works/bridge) and check out the [technical documentation](https://github.com/newton-blockchain/TIPs/issues/24).

Preparations have begun for the launch of the bridge on the mainnet.

**Videos:**
- https://cdn4.telesco.pe/file/fb4a743fd3.mp4?token=RE9RRLn-7cgkAWYNiUm76bHsOYaTFL9BmrN0nkNgaVKLB-ojSTRo195_W3KQfkD6CjZBXgECOfnE53f-qBeVfmPyMgCutXr7Jl2Jbol0ufCkDitdJpRathhJPqPHIniKP1Ow2_aREbeiAgOa8qk05C_TjvbkBb1zsNDpXrT4cVw1Oi-hs1ILbcq-KH1nQ6_OrQ0n3W1Gftn6UH7M-l7t8GPf1so5rEwEjpwFXc2IHtZD-frL4rgjNVcBccGGHDG1jDhzSIZof7J3TeQqvj7LtV6K4sTC8CDOxUUpkNWwh-Au8tsjWpuAXq6cW-tPPdc7ntoL-syOILeiP7TY7DStAA

---

## [26] 2021-06-28T21:42:19+00:00

- Permalink: https://t.me/tonblockchain/26
- Author: The Open Network
- Views: 24.3K

Validators please update your software to the latest commit 4f0480b from the repo [https://github.com/newton-blockchain/ton](https://github.com/newton-blockchain/ton).

This network update aims to improve stability, launch the TON-ETH bridge and nominator-pools (a system for lending stakes to validators). You can read more about the changes [here](https://github.com/newton-blockchain/TIPs/issues/34).

This update is **required** to take further steps.

---

## [28] 2021-07-06T17:44:28+00:00

- Permalink: https://t.me/tonblockchain/28
- Author: The Open Network
- Views: 26.3K

Introducing TON documentation at [toncoin.org/docs](http://toncoin.org/docs)

**Photos:**
- https://cdn4.telesco.pe/file/QG3_aNDy4DB4BqKzYVOuT7g0bOYTEc5eTnY-uxCpHBiSE6zvnuHJuzHcrNts322wU1xrzGC3MBWvxzoZbx91_Ez8SO_3_syj0EDeViBdF1w0IsTeCgfZcLhmlWn1ulTcTdmbdTiy7sOicC3r5j5wtZTPkRsFmY0y8lqzAk3u8pmlVhCexx8bCV3D9dH3jW2RawrpGWZuAtE-B1iUDvrHPxtAnPeDo1c6FGZp84XHtVVzGCLCcakzTIgzEcbkNciyQAWkehIUsgPKIDwwMam22D8o_sNFmUOeDL_3NRNxXanaeNCp9h2DOpPnSfIY6RvlzfxDCyRrPHUypmzy9sk9vg.jpg

---

## [29] 2021-08-03T12:56:17+00:00

- Permalink: https://t.me/tonblockchain/29
- Author: The Open Network
- Views: 28K

In response to the [public](https://github.com/newton-blockchain/TIPs/issues/33) [letter](https://github.com/newton-blockchain/TIPs/issues/33) from our open-source community, the Telegram team [agreed](https://github.com/newton-blockchain/TIPs/issues/33#issuecomment-870824166) to transfer the [ton.org](http://ton.org/) domain and the ton-blockchain repository to the community.

While we are saddened that Telegram has been forced to withdraw its involvement from the TON project in 2020, community will continue to align ourselves with original intentions for TON as we further our work on its development.

Welcome to [ton.org](http://ton.org/)!

---

## [32] 2021-08-07T11:48:45+00:00

- Permalink: https://t.me/tonblockchain/32
- Author: The Open Network
- Views: 28.1K

**Mobile & desktop wallet users please update your wallet settings
**
* Make sure your wallet is downloaded from [ton.org/wallets](http://ton.org/wallets)

* Make sure you have your recovery words backed up

Open Settings:

* In config url enter [https://ton.org/global-config-wallet.json](https://ton.org/global-config-wallet.json)

* Enter **mainnet** into blockchain ID

Of course, your account and balance will be saved.

Web wallets are updated automatically (no action required).

If you cannot enter **mainnet** into blockchain ID - update your wallet from [ton.org/wallets](http://ton.org/wallets)

**Photos:**
- https://cdn4.telesco.pe/file/l9H2-ROe7fMuv2X1U1uMYg18XlpYnkhX3MeTnP_8CZWPX_FBsAHf1eFh53Ydz6-etPSUw-2zFU_v97IYIdxqooBpFVk1BCcf9-wxne8z-DzyGpnJy6ZHp92WPwHfGGsptKOlDXCJwPdsNFDbGdklC5hSihGqx0_1eBm-b0zCNKTEkPgX-DBHFjcV_FXFzUuBA8lcHTnFcuCIfkuD9B7mCE_RVu6Vyb6GAkAbs9Aso4qRJBu8XzafsTdTqdmVLP2NBDdZeZGUu8BSpn3qPi-SOgDP_3nLLSeUjScOurQuJ5ywoU9QnitwmKxlMKjSnvLRtluq5XLLmvUVKGRElSH1nA.jpg

---

## [33] 2021-08-07T11:48:45+00:00

- Permalink: https://t.me/tonblockchain/33
- Author: The Open Network
- Views: 26.4K

If you have any problems with wallet connectivity - please check out [https://ton.org/docs/#/howto/wallets](https://ton.org/docs/#/howto/wallets)

---

## [35] 2021-08-16T20:21:57+00:00

- Permalink: https://t.me/tonblockchain/35
- Author: The Open Network
- Views: 25K

We are pleased to announce that testing of the **ETH-TON bridge** has been completed.

Validators please vote for network config `-71` (bridge config) with hash `D855FFBCF813E50E10BEAB902D1177529CE79785CAE913EB96A72AE8EFBCBF47`.

You can get acquainted with the full information in [TIP-35](https://github.com/newton-blockchain/TIPs/issues/35) and [TIP-24](https://github.com/newton-blockchain/TIPs/issues/24).

To vote via [mytonctrl](https://github.com/igroman787/mytonctrl) you need to use the command:

`vo 86288317131724994092252721964900886660334541228443687319705725361155044390570`

---

## [36] 2021-08-20T18:49:16+00:00

- Permalink: https://t.me/tonblockchain/36
- Author: The Open Network
- Views: 27.5K

**Bridge between TON and Ethereum networks launched on the mainnet**.

Now transfers of TON coins between networks are available for anyone at [ton.org/bridge](http://ton.org/bridge).

There are no limits, except that the transfer must be more than 10 TON coins.

You can find the address of the ERC20 TONCOIN token on [ton.org/coin](http://ton.org/coin).

**Photos:**
- https://cdn4.telesco.pe/file/DPsRKPfMy-zUjgYNoRAJGebZ3lhmEuDC0EjsFIpOq3Zszlv6IbqjaSAKzSyTlnXO3LIzrqJIthV2YkO3Bf4718nGlM5lcweax1vyobv--QCZvUQakI7GIJcM0LWv4A4lRLVOIGGhUxQ6gl-kpr3jpM9V75r6CzodyN-guLkjkyhw80yVjAc7mPSM7L_bNX7n7bMZCspK2jbJ9c3W71aDP09QwDjZ8bVKQq2TPm_TaJFcYYB-32k2myvHOux5ydJ39Tk7AGPDbpM9weIJQR4fEmaqg8KeIgrXOwMJbhiEkBJplUk1f7a6SqW9LstZZlhXhflG8KVjebxneOfmMjmuDw.jpg

---

## [38] 2021-08-24T14:37:32+00:00

- Permalink: https://t.me/tonblockchain/38
- Author: The Open Network
- Views: 34.1K

Validators please rebuild your **ton** to last commit of [https://github.com/newton-blockchain/ton](https://github.com/newton-blockchain/ton)

If you use **mytonctrl** just enter `upgrade` command

Then please restart your nodes with flag `-F 13991798:218126:7` **at 15:30 UTC / 18:30 MSK**
For mytonctrl users:
1. open `/etc/systemd/system/validator.service`
2. add flag `-F 13991798:218126:7` to the end of ExecStart: thus full line will be as follows: 
`ExecStart = /usr/bin/ton/validator-engine/validator-engine --daemonize --global-config /usr/bin/ton/validator-engine/ton-global.config.json --db /var/ton-work/db/ --logname /var/ton-work/log --state-ttl 604800 --verbosity 1 -F 13991798:218126:7
`
3. Run `systemctl daemon-reload`
4. make `systemctl restart validator` **at 15:30 UTC / 18:30 MSK**

For other users please restart your `validator-engine` instance with `-F 13991798:218126:7` flag added **at** **15:30 UTC**

---

## [39] 2021-08-24T16:02:27+00:00

- Permalink: https://t.me/tonblockchain/39
- Author: The Open Network
- Views: 28.9K

Thanks! Validators can now remove `-F 13991798:218126:7` from the launch command.

MyTonCtrl users don't forget to do `systemctl daemon-reload` after removing the flag.

---

## [40] 2021-09-09T19:10:56+00:00

- Permalink: https://t.me/tonblockchain/40
- Author: The Open Network
- Views: 25.3K

Validators please update your software to the latest commit `0d246dd` of the repo [https://github.com/newton-blockchain/ton](https://github.com/newton-blockchain/ton).

This network update aims to launch the **TON-Binance Smart Chain bridge**.

This update is **required** to take further steps.

If you use mytonctrl just execute `upgrade` command.

---

## [41] 2021-09-17T21:47:58+00:00

- Permalink: https://t.me/tonblockchain/41
- Author: The Open Network
- Views: 25.1K

It is interesting to watch the growth of the TON mining industry.

Over the past 10 weeks, the total hash rate has [grown](https://ton.org/mining) by almost 10 times!

In addition, enthusiasts have recently [invented](https://github.com/tontechio/pow-miner-gpu/blob/main/crypto/util/pow-miner.md) GPU mining of TON Coin and put it into open-source.

We welcome the idea of ​​creating simple GPU miner apps for Windows to make it easier for ordinary users to participate.

Proof-of-Work distribution of coins in a Proof-of-Stake network is a unique phenomenon.
This format of the initial distribution of TON Coins arose accidentally and spontaneously.

Perhaps this distribution format will become popular with subsequent various blockchain projects due to its obvious advantages - decentralization and equal conditions for receiving coins for everyone.

We would suggest the name "IPOW" for this type of distribution.

---

## [42] 2021-09-27T09:31:26+00:00

- Permalink: https://t.me/tonblockchain/42
- Author: The Open Network
- Views: 23.5K

Validators please **check** that your software is updated to commit `0d246dd` which becomes **MANDATORY** now: your validator will fall out the consensus upon voting for new config params. So, if you missed it - **update as soon as possible**.

Optionally please update your software to the latest commit `15dfedd` of the repo [https://github.com/newton-blockchain/ton](https://github.com/newton-blockchain/ton). This network update fixes issues in TON VM.

If you use mytonctrl just execute `upgrade` command.
  
  GitHub

**Link preview:**
- [GitHub - newton-blockchain/ton](https://github.com/newton-blockchain/ton)
  - Contribute to newton-blockchain/ton development by creating an account on GitHub.

---

## [43] 2021-09-27T12:16:17+00:00

- Permalink: https://t.me/tonblockchain/43
- Author: The Open Network
- Views: 25.2K

Validators please vote for network config 71 as described in the "Finalization" section in the TON-ETH bridge [launch roadmap](https://github.com/newton-blockchain/TIPs/issues/35).

Config proposal hash is `89037104007028780601616222740553578917031455449190660734376528584392031927343`

To vote via [mytonctrl](https://github.com/igroman787/mytonctrl) you need to use the command:

`vo 89037104007028780601616222740553578917031455449190660734376528584392031927343`
  
  GitHub

**Link preview:**
- [Mainnet ETH-TON bridge launch · Issue #35 · ton-blockchain/TIPs](https://github.com/newton-blockchain/TIPs/issues/35)
  - ETH-TON bridge allows to transfer in decentralized way TON Coins between TON Network and Ethereum Network. It is required to run ETH-TON bridge on the mainnet. Given that bridge is an important par...

---

## [44] 2021-10-01T10:06:58+00:00

- Permalink: https://t.me/tonblockchain/44
- Author: The Open Network
- Views: 23.5K

Validators please vote for network config 72 to launch TON-Binance Smart Chain Bridge.

Description [here](https://github.com/newton-blockchain/TIPs/issues/37).

To vote via **mytonctrl** you need to use the command:

`vo 20575609338280724755538687681162344667930263280458054660658295542292032341235`

---

## [45] 2021-10-04T14:15:06+00:00

- Permalink: https://t.me/tonblockchain/45
- Author: The Open Network
- Views: 25.8K

We are pleased to announce that the bridge between TON and Binance Smart Chain has been launched and is available to everyone at [ton.org/bridge/bsc](http://ton.org/bridge/bsc)

Everything is the same with the TON-ETH bridge: there are no limits, except that the transfer must be more than 10 TONs.

You can find out the address of the wrapped Toncoin (BEP-20) on the updated [ton.org/coin](http://ton.org/coin).

**Photos:**
- https://cdn4.telesco.pe/file/X2qBzAiJu1BSb1sazUBtiBtVcWrHqDWjIicEDF8fj4f91nVw5nkuP21Px-eVWWwK5UnrJh0-x6gjUjd323nKEJy7G3hsLd4HeXPnp1QmEfHP6D9TDqx-Njba1TZdoQuLf13slQSHWQyaUucIHQ5gi75ui6Xk8oqXRs5WWTEI5uAan04kzNcLhHViZFBGvf_JXD3OXZpJVxVEApvOreSNyafYguTZN1D1i-Kta17uU2bLoSNWhCPAcikuD-absKLwkIdqDUsPj3GlsVVcgg8HmeQUPf9G55eEm9ReC71Sb0ig6HqSxsm-B_2AYZFofVrSZ3T-j985ezzdzow8mA7Rwg.jpg

---

## [46] 2021-10-05T19:45:35+00:00

- Permalink: https://t.me/tonblockchain/46
- Author: The Open Network
- Views: 30.2K

Yesterday, Facebook went down along with almost each and every one of its external and internal services: websites, mobile apps, Messenger, Instagram, WhatsApp and others. Half of the Internet that somehow uses Facebook experienced trouble.

Users flocked to other platforms and congested them, too. Among the affected services was Google and a number of other big shots. It’s worth noting that, Telegram [welcomed](https://t.me/durov/170) 70 million new users and didn’t even break a sweat.

According to the CloudFlare’s [investigation](https://blog.cloudflare.com/october-2021-facebook-outage/) released today, the blackout was allegedly caused by an system administrator that misconfigured BGP for the Facebook’s network. Being completely honest, CloudFlare also suffered lengthy downtimes in the past, cutting out the part of the web.

It took Facebook long to go back online as the employees themselves lost access to usual services, infrastructure, and means of communication.

All of this reminds us that the modern Internet is built upon technologies and protocols that were designed around 30 years ago or earlier. No one considered there would be a global borderless network with billions of users in it at the time. The Internet has been rush in its development, sometimes failing to follow an optimal path. The outages of Facebook, CloudFlare, Akamai, Amazon and others show just how fragile and centralized the Internet has become.

And massive personal data leaks show how it’s no longer safe.

The Open Network’s mission is to unite the Internet and blockchains. The combination of the best of two worlds — centralized and decentralized, will allow for the creation of a brand new global network; a network that will be safer, stabler, and ready to face any challenge the modern-day world ever presents it with.

---

## [47] 2021-10-09T13:42:30+00:00

- Permalink: https://t.me/tonblockchain/47
- Author: The Open Network
- Views: 32.5K

[**Primer**](https://ton.org/primer.pdf)** updated - added sections Toncoin Roadmap, TON Nominators, TON Reserve**

Initial distribution of Toncoins was carried out spontaneously via PoW mining. 

This type of distribution has obvious advantages like decentralization and equal
conditions of obtaining coins for all. 

Yet, there are challenges: risk of uneven distribution of coins, miner anonymity and
zero knowledge of their further plans regarding the use of coins.

TON Foundation announces **TON Nominators** and **TON Reserve** components that
will allow large Toncoin holders to invest their assets under most profitable
conditions. Implementation of new components will benefit the overall network: the
more coins locked in these components, the more stable the network and Toncoin
tokenomics will get.

---

## [48] 2021-10-15T08:53:29+00:00

- Permalink: https://t.me/tonblockchain/48
- Author: The Open Network
- Views: 37.9K

**Contest:** FunC plugin for popular IDE.

**Prize fund:** 10000 TON.

**Deadline**: 13:00 on Oct, 29 (Dubai Time).

**Task**: FunC is a programming language for developing smart contracts in TON.

We ask you to develop a plugin for one of the popular IDE (Intellij IDEA, Visual Studio Code, Sublime Text in priority) that helps development on FunC - code highlighting, error highlighting, autocomplete, etc.
The more useful functionality you implement correctly, the closer you are to the first place. For non-trivial functionality, an additional bonus to the prize pool is possible.

You might find the [FunC documentation](https://ton.org/docs/#/func), standard smart contracts *.fc [code](https://github.com/newton-blockchain/ton/tree/master/crypto/smartcont), and the FunC compiler source [code](https://github.com/newton-blockchain/ton/tree/master/crypto/func) useful.

**Who can take part:** Anyone.

**How do I submit:** Please comment [this](https://github.com/newton-blockchain/TIPs/issues/39) issue on the GitHub by attaching an archive or link to the open source code with a solution, a description of the functionality, a description of the installation, your TON address to receive an award.

To avoid plagiarism, you can attach a link to a private repo to the submission, which you will make public after the deadline.

---

## [49] 2021-11-03T14:18:03+00:00

- Permalink: https://t.me/tonblockchain/49
- Author: The Open Network
- Views: 27K

[https://youtu.be/XgzHmV_nnpY?1](https://youtu.be/XgzHmV_nnpY?1)
  *
  YouTube

**Link preview:**
- [TON - The Open Network](https://youtu.be/XgzHmV_nnpY?1)
  - https://ton.org 
https://t.me/tonblockchain

---

## [50] 2021-11-03T14:18:43+00:00

- Permalink: https://t.me/tonblockchain/50
- Author: The Open Network
- Views: 27.7K

Back in 1665–1667, when self-isolating during the Great Plague that swept England, Isaac Newton had made a number of scientific discoveries that subsequently impacted the entire world.

As time passed by, the period that saw Sir Isaac’s major breakthroughs in optics and calculus along with the invention of laws of motion and universal gravitation became known as the [‘Year of Wonders’](https://en.wikipedia.org/wiki/Annus_mirabilis).

Fast-forward to 2020, and a couple of open-source developers calling themselves ‘*New*ton’ decided to give a new life to the TON technology amid the lockdown inflicted by the most recent pandemic in history.

As a result of extensive research and hundreds of thousands of lines of code, today we have a fully operational TON network that delivers fast and cheap transactions and whose horizontal scalability makes it capable of withstanding any amount of load.

As of today, TON is one of the few PoS-powered networks with functioning sharding. But what may look as the final destination to many other projects is just the point of take-off to us.

We aim to fulfill TON’s original vision, which is a protocol uniting all existing & new blockchains and the Internet itself into a single global network.

The next-gen worldwide network will be built as an aggregator of networks *and* blockchains, meaning it’ll require a fitting tech.

‘Newton’ has since evolved into TON Foundation and acquired new talented devs. While we continue our work, the community grows by the day.

We don’t know if what we do in the present will ever come close to be remembered by the title of ‘Year of Wonders,’ but we have a feeling that we’re on the right path.

---

## [51] 2021-11-07T17:42:26+00:00

- Permalink: https://t.me/tonblockchain/51
- Author: The Open Network
- Views: 24K

There are network issues, the development team is already working.

---

## [54] 2021-11-07T21:33:25+00:00

- Permalink: https://t.me/tonblockchain/54
- Author: The Open Network
- Views: 23.9K

Validators please update to the last commit `9875f02` of [ton](https://github.com/newton-blockchain/ton) repo.

To do this, type `upgrade` if you use mytonctrl.**
**
Update your validator nodes one by one.

---

## [55] 2021-11-08T00:57:40+00:00

- Permalink: https://t.me/tonblockchain/55
- Author: The Open Network
- Views: 24.7K

**The network is up and running normally again!**

We have successfully fixed an extremely rare serialization bug.

If you are a developer or miner and use lite-servers, lite-clients, or tonlib - please rebuild them with the latest [ton](https://github.com/newton-blockchain/ton) revision `9875f02`.

The desktop and mobile wallets will be updated soon.

For now, instead of those, you can use the [web](https://tonwallet.me/) [wallet](https://tonwallet.me/) or our very own **novelty** wallet from the next post.

---

## [56] 2021-11-08T00:58:09+00:00

- Permalink: https://t.me/tonblockchain/56
- Author: The Open Network
- Views: 28.1K

We are glad to present you **Tonkeeper** - a TON wallet on steroids!

Our standard wallets are simple and perform basic functions - securely storing and sending Toncoins, and they will always operate this way.

The **Tonkeeper** plans to expand this functionality. It will have the capability of supporting other cryptocurrencies, a built-in bridge, staking, and something else that will pleasantly surprise you.

Whilst the team works on the implementation of these plans, you can install the first version yourself.
 
Available for iOS and Android.

[https://tonkeeper.com](https://tonkeeper.com/)
  
  Tonkeeper
  *
  Tonkeeper | Self-Custody TON wallet

**Link preview:**
- [Tonkeeper | Self-Custody TON wallet](https://tonkeeper.com/)
  - Leading non-custodial TON wallet supporting Ton coin, USDT TRC20 (TRON) and USDT (TON), instant transactions, built-in swap, staking, NFT support, and dApps browser.

---

## [57] 2021-11-08T09:50:45+00:00

- Permalink: https://t.me/tonblockchain/57
- Author: The Open Network
- Views: 29.7K

Validators please restart your nodes with flags -`F 15929181:244474:7` -`F 15929181:244475:7` **at 10:30 UTC / 13:30 MSK**
For mytonctrl users:
1. open `/etc/systemd/system/validator.service`
2. add flags -`F 15929181:244474:7` -`F 15929181:244475:7` to the end of ExecStart: thus full line will be as follows: 
`ExecStart = /usr/bin/ton/validator-engine/validator-engine --daemonize --global-config /usr/bin/ton/validator-engine/ton-global.config.json --db /var/ton-work/db/ --logname /var/ton-work/log --state-ttl 604800 --verbosity 1 `-`F 15929181:244474:7` -`F 15929181:244475:7
`
3. Run `systemctl daemon-reload`
4. make `systemctl restart validator` **at 10:30 UTC **

For other users please restart your `validator-engine` instance with -`F 15929181:244474:7` -`F 15929181:244475:7` flags added **at** **10:30 UTC**

---

## [58] 2021-11-08T10:43:13+00:00

- Permalink: https://t.me/tonblockchain/58
- Author: The Open Network
- Views: 30K

Thanks! Validators can now remove -`F 15929181:244474:7` -`F 15929181:244475:7` flags from the launch command.

MyTonCtrl users don't forget to do `systemctl daemon-reload` after removing the flags.

---

## [59] 2021-11-08T12:12:11+00:00

- Permalink: https://t.me/tonblockchain/59
- Author: The Open Network
- Views: 31.8K

**Standard wallets updated.
**
If you are using a desktop wallet, please download the new version from [ton.org/wallets](http://ton.org/wallets).

Your mobile wallets will work again, as soon as the update is approved by the stores.

Web wallet do not require any action.

---

## [60] 2021-11-09T21:48:09+00:00

- Permalink: https://t.me/tonblockchain/60
- Author: The Open Network
- Views: 28.2K

**🏆*** **FunC IDE Plugin Contest Results!**

**🥇*** 1st place - **savva425** - 5000 TON

**🎖*** Bonus reward - **undrfined** - 500 TON

Please find the contest review at [GitHub](https://github.com/newton-blockchain/TIPs/issues/39#issuecomment-964506288). 
Continuing work on these plugins may become a useful contribution to TON. We hope that participants or other community members will be able to help with that.

We are planning a long list of contests ahead. We will announce 2 new contests and 1 bounty program within 12 hours.

You will be able to find new contests announcements in the [@toncontests](https://t.me/toncontests) channel. It also may be interesting for you to join the multilingual [@tondev](https://t.me/tondev) developers' chat.

You know what to do **😉***

P.S. Once the NFT standard is released, all winners, of course, will receive personalized digital medals.

**Photos:**
- https://cdn4.telesco.pe/file/nsoas5fFuKxkN6Wp-4ghjBwnU786rp_qoQwlkdfZ81N-toYr4QueSpHlKigol1sKw5jii_02rbnzrvJmZtCFnbJDg0zf5_X-BLsjc4xXLg0pesi66yGU0WI3naJNXciT26Itpwp-LlURg85KdtyFbuBUaYKYAQj1vkRtX3RMBpcJlfdflYN43LIJQTPjpIF8u0cWHKlC77fSNWDLhfa7x6qSyREQwmrnoEaP6_sMiabyeJkOkFiRp1PTX_CXTDxszMRxCNAq97ZbSi4BKPiI30VaKTnNvUyUiNqn7ObPtBg7TPKf15-90DpYmqCJdqodwZzbB8J5X6ZmdtifJ3DYOQ.jpg

---

## [61] 2021-11-10T14:58:37+00:00

- Permalink: https://t.me/tonblockchain/61
- Author: The Open Network
- Views: 27.4K

[https://twitter.com/OKEx/status/1457907421599477762](https://twitter.com/OKEx/status/1457907421599477762)
  
  Twitter

**Videos:**
- https://cdn4.telesco.pe/file/c39d0e9e81.mp4?token=KtU5OOKYWcZLc8hH_t6VfioWVLgyCBSufvvNzhwEqF2JkWqSAm7nELao8ZJJOEzEj9plcZ15E1K4wEHuKLEwhjzmSHaxv1Wb7bgAkcHp8Em4aVsZKF9feEaOkB7rtX6TGZegXRFVYnF2J7Ew2EpEOpuQZZtbk1tgs5IG3xjw8FzCxA9vh0taGGCLhifiieGabhssnVNOmcJRbnF8JMK5NI2g3yV_1W0e-2F8KgN8V5iNFT8sICo1ELB6j9RRVWQFjg-_rdFCiJ-JRkVJOjFYyBVqV5UNfsST-0LQUPfimwJSMmIrtO01tkZmPhge84pf6mlCsGSMauy-v11LcIFfdA

**Link preview:**
- [OKEx](https://twitter.com/OKEx/status/1457907421599477762)
  - Featuring #OKExJumpstart Mining **🚀*** @ton_blockchain — the #blockchain developed by @Telegram & continued by the open-source community. Only on #OKEx! **🪓*** Stake $OKB to earn TONCOIN: **☑️*** A total mining pool of 1,000,000 TONCOIN **☑️*** No min. staking amount **🔗***bit.ly/3qluzEk

---

## [62] 2021-11-11T00:20:51+00:00

- Permalink: https://t.me/tonblockchain/62
- Author: The Open Network
- Views: 24.3K

**🏆***** Security Bug Bounty Program.
**
We have announced a permanent security bug bounty program.

If you find a critical bug or vulnerability in the TON Blockchain (in the C ++ code of the [main repository](https://github.com/newton-blockchain/ton/)) or TON main services ([standard wallets](https://ton.org/wallets), [bridge](https://ton.org/bridge), [standard smart contracts](https://github.com/newton-blockchain/ton/tree/master/crypto/smartcont)), you can send its description and exploitation scenario and receive a reward.

We are interested in critical vulnerabilities: crash, loss/theft of coins, etc.

You can target a reward of up to $100,000 in Toncoins for vulnerability, depending on the severity.

Let's perfect the safety and security of TON together!

Send reports to [@toncontests_bot](https://t.me/toncontests_bot).

*We reserve the right not to review some reports.*

---

## [63] 2021-11-11T00:20:51+00:00

- Permalink: https://t.me/tonblockchain/63
- Author: The Open Network
- Views: 27.6K

**🏆***** Non-technical Contest:** Explanation of the blockchain

**Prize fund:** 1000 TON.

**Deadline:** 18:00 on Nov, 17 (UTC).

**Task: 
**
Explain in English or Russian how the blockchain works in simple words.

This text should target an audience who are not familiar with blockchains.

The text should not be larger than 1-2 pages.

Explain the basic principles of blockchain technology (not just a specific one) - blocks, decentralized nodes, etc.

We want to make TON blockchain for people, not just geeks, to help everyone buy, store and transfer assets in a convenient, familiar way.

The clearest texts will be used in the corresponding sections of the [ton.org](http://ton.org/) and channels.

**Who can take part:** Anyone.

**How do I submit:** Please send a plain text message (not a file or Word document) to [@toncontests_bot](https://t.me/toncontests_bot).

---

## [64] 2021-11-11T00:20:51+00:00

- Permalink: https://t.me/tonblockchain/64
- Author: The Open Network
- Views: 31.2K

**🏆***** Frontend Contest: **Frontend of DEX with liquidity pools, Stage 1.**
**
**Prize fund:** 30 000 TON.

**Deadline:** 18:00 on Nov, 30 (UTC).

**Task: 
**
Create a frontend of DEX with liquidity pools for TON Blockchain.

In this stage, you need to create a working UI. Asynchronous calls to smart contracts must be mocked-up.

We require a UI for exchanging one token for another token, a UI for creating a pool with two tokens, a UI for adding and removing liquidity from a pool, a UI with a list of pools and pool statistics.

You can explore services like Uniswap and Pancake.

You must use the Typescript+React+Redux stack.

Extra dependencies and extra code are not welcome.

You can't use the idea of just copying the entire open-source Uniswap code - there is a lot of unnecessary code there.

When considering the design options, you can focus on the [ton.org](http://ton.org/) site, UI of standard wallets and bridge. You may find the [brand assets](https://ton.org/brand-assets) page helpful.

We deliberately did not give ready-made references so that you have the opportunity to rethink some things in using such services.

Evaluation priorities: understandability of the code and the possibility of its further support, general correctness and speed of the application and attention to detail.

**Who can take part:** Anyone.

**How do I submit: 
**
Please comment on [this](https://github.com/newton-blockchain/TIPs/issues/42) issue on GitHub by attaching an archive or link to the open-source code with a solution, a description of the functionality, a description of the build process, your TON address to receive an award. Submission must be under the MIT license.

To avoid plagiarism, you can attach a link to a private repo to the submission, which you will make public after the deadline.

---

## [65] 2021-11-11T00:20:51+00:00

- Permalink: https://t.me/tonblockchain/65
- Author: The Open Network
- Views: 38.5K

**🏆*****Frontend contest: TON status page
**
**Prize fund:** $30’000 in Toncoins (currently 10’000 TON).

**Deadline:** 18:00 on Nov, 17 (UTC).

**Task:
**Create a web app and corresponding open-source backend, which display summarized data on the state and availability of TON Blockchain.

In particular, the page should display:
  - Performance and block rate of TON chains: masterchain and basechain (note that there may be more than one shard on basechain)
  - Performance and responsiveness of primary TON services: [ton.org](http://ton.org/), [ton.sh](http://ton.sh/), [toncenter.com](http://toncenter.com/)
  - TON/ETH and TON/BSC bridge operability status
  - Status of main on-chain governance activity: validator elections, config votings, slashing.
  - Public liteservers performance: response time and sync state
  - Public DHT-servers performance
  - Basic on-chain stats: tps, accounts activity, transferred amount by type, number of validators

API and integration with notification services (Telegram channel/bot) will increase your chances to win.

Evaluation priorities: 
  - The coverage and detail of basic metrics.
  - Speed and aesthetic appearance.
  - The complexity of the service deployment (we expect detailed instructions).
  - Understandability of the code and the possibility of its further support.

**Who can take part:** Anyone.

**How do I submit:
**
Comment on this [issue](https://github.com/newton-blockchain/TIPs/issues/43) on GitHub by attaching an archive or link to the open-source code with a solution, a description of the functionality, the build process, your TON address to receive an award. Submission must be under the MIT license.

To avoid plagiarism, you can attach a link to a private repo to the submission and hash of the last commit, which you will make public after the deadline.

---

## [66] 2021-11-11T00:21:56+00:00

- Permalink: https://t.me/tonblockchain/66
- Author: The Open Network
- Views: 41.4K

We’ve already launched **three** contests and **one** bounty program on [@toncontests](https://t.me/toncontests). You’re more than welcome to join — that way, you’ll be able to make a meaningful and substantial contribution to the development of TON along with the opportunity to earn a considerable amount in prize Toncoins.

For non-tech contests, we’ve also started a channel in Russian [@toncontests_rus](https://t.me/toncontests_rus). It will list all the competition announcements for Russian speakers.

---

## [67] 2021-11-11T15:35:20+00:00

- Permalink: https://t.me/tonblockchain/67
- Author: The Open Network
- Views: 55.7K

[https://twitter.com/FTX_Official/status/1458797138318544898?s=20](https://twitter.com/FTX_Official/status/1458797138318544898?s=20)
  
  X (formerly Twitter)
  *
  FTX (@FTX_Official) on X

**Link preview:**
- [FTX (@FTX_Official) on X](https://twitter.com/FTX_Official/status/1458797138318544898?s=20)
  - upcoming listing on FTX! @ton_blockchain

---

## [68] 2021-11-12T01:09:50+00:00

- Permalink: https://t.me/tonblockchain/68
- Author: The Open Network
- Views: 57.8K

**Big update for TON Store
**
TON Store is a catalog of apps and dApps on The Open Network. Just like AppStore or GooglePlay, but for blockchains.

– The service has migrated to a new, short domain [ton.app](http://ton.app/).

– Each app now has its own page with video, screenshots, and description.

– Users can comment on the applications and rate them.

A one-stop place for everything you need!

If you are a developer and have already started working on your TON project (it’s right about time), you can publish it on this platform.

**Photos:**
- https://cdn4.telesco.pe/file/dP7Y056lE8fczmxAoQNucu10209UX7p9eo_QlFPw45zIPe5PiKRNqWAa0GxqSir3kuKDwRQCcw8QWNfwhfI2v9vTvXoiiezBCKF2XbGCjvSRWI61dC7B3arYgHUufHRPEK7JOP4mIKetNObl25z341z1Bc6jCWwuqgWEgqIuLxWPsDsizONf1f8PX2oEQVybxI0E0avq00ZxTgC-dVzYv2AD0ji621o_Qu9_hCuz4MK_5f4LXU61gV8daRvrTLdXF5AK_nMdcwJAKEYNQr1-biqsHMA530k6iMwm_hOj1r8yGYyfoJFYG5asC1rLvqyfKWO9SdX5n0MSnGbx6eUApQ.jpg

---

## [69] 2021-11-12T15:37:30+00:00

- Permalink: https://t.me/tonblockchain/69
- Author: The Open Network
- Views: 56.2K

We’re seeing an explosive growth of TON as account and user counts increase at lightning-fast speed.

The TON blockchain’s scalability allows it to operate under any amount of load by splitting into sub-blockchains (also known as shardchains). Currently, the network is stable and hasn’t needed even a single one of such splits.

Endpoints for wallets and other frontends, however, are pretty jammed. We’re already working on the scaling of endpoints and soon, your wallets will become lag-free again.

**🚀***

---

## [70] 2021-11-14T15:20:12+00:00

- Permalink: https://t.me/tonblockchain/70
- Author: The Open Network
- Views: 72.4K

**Introducing TON Extension for Google Chrome

**In addition to ordinary functionality of storage/transfer of Toncoins and interacting with dApps we have created something special:

1) Beta-version: In settings you can enable ‘TON Magic’ mode, by doing so you **will enable **[**TON**](https://telegra.ph/Telegram--TON-11-10)** **[**integration**](https://telegra.ph/Telegram--TON-11-10)** in your Web Telegram**.

Developers from our community were able to create this functionality by researching [open-source](https://github.com/Ajaxy/telegram-tt) code of official Web Telegram and by writing small TON related piece of code that is ‘injected’ into Web Telegram.

This code is [open-source](https://github.com/newton-blockchain/telegram) and can be reviewed by anyone who wishes to check its safety and security.

2) In next future TON Extension will also **feature support of TON Proxy** – your browser will be able to open .ton sites using TON DNS, small payment for usage of TON Proxy will be deducted from the balance of TON Extension.

**Download TON Extension from official **[**Google Chrome Store**](https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd)**.**

If you already have the extension installed, you need to [update](https://support.cloudhq.net/how-to-manually-update-chrome-extensions/) it to version 1.1.15+ to enable new functionality.

---

## [71] 2021-11-26T20:56:56+00:00

- Permalink: https://t.me/tonblockchain/71
- Author: The Open Network
- Views: 46.4K

**TON-BSC bridge update to increase the bandwidth.**

Validators please vote for config `72` update.

To vote via mytonctrl you need to use the command:
`vo 50819470484841751784191809281711678689562450243968828557706837664200078806706`

The source code can be found on the [GitHub](https://github.com/ton-blockchain/bridge-func/tree/bsc).

---

## [72] 2021-11-30T14:03:56+00:00

- Permalink: https://t.me/tonblockchain/72
- Author: The Open Network
- Views: 1.93M

---

## [73] 2021-11-30T14:03:56+00:00

- Permalink: https://t.me/tonblockchain/73
- Author: The Open Network
- Views: 118K

**We pay lots of attention to simplicity of our apps and services.

**You might have noticed that our wallets and other apps contain almost no technical information. What you see is animated stickers, not transaction hashes or block heights.

The only tech info you’ll find is your wallet address, which is no harder than card or phone number. But it will be dropped soon, too – once **TON DNS** goes live, everyone will be able to register a short **username** and use it instead.

People don’t need to get under the hood of the blockchain to start using it. Blockchain’s advantages such as privacy and security should be available to everyone.

We’re often asked if we’re planning a full-fledged TON blockchain explorer (a service that scans blocks and transactions). Development of such an explorer is not on our top priority list because we believe average user won’t need it.

Whenever you send transfer to a friend using your regular mobile banking, you don’t need to go to ‘banking explorer’ afterwards or launch Internet traffic scanner to make sure the money’s indeed been sent. We’ll release a full-fledged explorer, sure, but it’ll be used by devs for debugging – average users simply won’t need it.

Most of the existing interfaces were created during the era of blockchains of the past. You send coins and wait anywhere between 10 minutes and a couple of hours, usually not even sure if your transfer will be processed.

In TON, transactions are cheap and almost instant. A modern tech now gives us an opportunity to redefine and simplify people’s interaction with blockchain.

---

## [74] 2021-12-02T15:02:11+00:00

- Permalink: https://t.me/tonblockchain/74
- Author: The Open Network
- Views: 44K

We have created a separate [@tonstatus](https://t.me/tonstatus) channel where we will post up-to-date requests for action for validators, information about scheduled maintenance, and other technical notifications.

We ask validators, developers, and technical integrators of Toncoin to follow this channel.

Please note that official requests from TON Foundation will only be communicated via the [@tonblockchain](https://t.me/tonblockchain) and [@tonstatus](https://t.me/tonstatus) channels.

---

## [76] 2021-12-05T15:34:46+00:00

- Permalink: https://t.me/tonblockchain/76
- Author: The Open Network
- Views: 51.2K

TON mining industry continues to grow and evolve. Total hashrate has already exceeded 100 **Th**/s, meaning that since the beginning of this year, interest in Toncoin mining has grown thousands of times.

There are already 40 forks in the repository with the source code of the standard miner, and the number of repo views has reached 300K.

New mining software:

**1. Hive OS Miner**

Hive OS is a Linux-based operating system used by professional miners. Now you can mine Toncoin on Hive OS using OpenCL or CUDA. And of course the miner is available in open-source.

This is a useful addition to existing miners for Linux and Windows with CUDA or OpenCL.

Despite the fact that the mining software development is not the primary target of the TON Foundation, our developers devote their time and energy to make mining more accessible for everyone.

[TON miner for Hive OS »](https://github.com/tontechio/pow-miner-gpu-hiveos)

**2. Mining pool by the Ton Whales team**

Last month, a third-party development team launched the first mining pool in TON.

Now users with weak hardware can unite their forces and mine Toncoin, with rewards distributed proportionally to their input.

During this time, the pool managed to collect thousands of participants and claimed a significant share in the overall mining hash rate.

TON Foundation has received the pool source code for the review. We see that new professional developers and entrepreneurs are coming to the TON ecosystem, and they are successfully launching their services.

[Ton](https://tonwhales.com/mining) [Whales Mining Pool »](https://tonwhales.com/mining)

---

## [77] 2021-12-05T20:07:55+00:00

- Permalink: https://t.me/tonblockchain/77
- Author: The Open Network
- Views: 58.3K

In [previous](https://t.me/tonblockchain/73) posts, we talked about how important it is to create TON applications simple and convenient for regular users.

Developers should feel comfortable too!

We are introducing **MyLocalTon**, your personal TON blockchain for development.

With it, you will be able to get a local TON blockchain up and running on your Windows, MacOS or Linux PC.

Use MyLocalTon for debugging as it can be restarted and reset whenever you need. The UI displays all information about blocks, transactions, and accounts. There are many settings provided.

Early access is already available. Source codes published on GitHub.

[MyLocalTon EAP »](https://github.com/neodiX42/MyLocalTon/releases)

**Photos:**
- https://cdn4.telesco.pe/file/UeytN28AnPBFsEZPKcydznyjPLkGmHM4lObmr1NSiameaJoZ_vCUuZ_b5E-UtX3Kowfjvu9Rjn_mAR5EUkp18Weh5xUiumiQKiAuGJoLY2TPa1DTPa83_VgDACGpzv5EHph9GT-cj_IMq-rftAaSNTk_njNLxjsGdgCUlRAs8XPExkgYZDSSaXZuLpKwUeiKTs5fr7oRlravhiTQMmpkDFH2MwQ222JRohJWLNX4pAWK-AFFuQjGqef0gJOSYlqpEFvoFkgTpf1Bcy8SRNjhYU91P7SP1Ssf6a8c8Z7ZJUtxUyvUNpmIoAIga8bshry-E0iwwOdJuhPEFlVfF9UPLg.jpg

---

## [79] 2021-12-14T18:07:42+00:00

- Permalink: https://t.me/tonblockchain/79
- Author: The Open Network
- Views: 42.8K

[**@CryptoBot**](https://t.me/CryptoBot)** introduces Crypto Pay API 
**
If you are an owner of a Telegram bot or other service, this [API](https://telegra.ph/Crypto-Pay-API-11-25) will let you create an invoice that users will be able to easily pay with Toncoin via [@CryptoBot](https://t.me/CryptoBot).

**Videos:**
- https://cdn4.telesco.pe/file/e697a6e38b.mp4?token=UlZUTECVToPtxeaq7ms6JbWhNWn0v3IaxtcaNHTpMTnH8t-MX43GzeLRgzlMC4kcTxIhI15hEvMb3z-59zn-X4VN-yZvlJkfQTZC2a3bSq8fFdE7NqtyepVbGgLpqm5QoqaXUPXvNwSRaFEFzcfvxCXyW-MeXo1-8h63wNxe0sErH7iJUrUj0ae1wIUQwNcepKb9IMrw9zu41Sl6borPYsNQ0SEXh0OZwfeR2PGu6JSIgKotysKpmlA6FpJfgNiN-H7ovrUDruZXLPZ1FZTCPGNMX5eq2WHs9ElI3vUICytZRyT5cjg44zYt25fYkn7wZblOEyMoQsmeG8s5JPWoBQ

---

## [80] 2021-12-14T18:07:43+00:00

- Permalink: https://t.me/tonblockchain/80
- Author: The Open Network
- Views: 45.9K

**New feature in **[**@CryptoBot**](https://t.me/CryptoBot)**
**
Now you can add a hidden message that will be shown to the recipient after an invoice is paid.

The message may contain a link or any other text.

**Videos:**
- https://cdn4.telesco.pe/file/fdbf6fc16d.mp4?token=gXwZ1M8daWEKChz6mdt2wthObAC6vVyAHnHRyOxsgxgxIFBtZeIX9MJ8e-52OWA4P9wvDXTCHIZkMEFwgiQmaqS2Eb0sJo7rQosKo3u-a1NqrW429DBRgAssz07ev6002Q_Maso0F_HnHNES0N2sRzFhAYJjnkI8xQw1FGW3KH23YIzQI3MMas_ki8MeT1yA1d_j-aLJP9d1UQ_Fqg5tD6V5ybIFsUxw-BBKfIwC5bXon4j6GrBsDCjpWUZlOpFDNmqYVIwuiYh6y5WdYStky2Jb-I5hW7iOS4bt2VwmpBkZeh-e1YVS8czCdBdpdJjQrCRioHhJgVBVrYH_e673BA

---

## [81] 2021-12-14T18:22:10+00:00

- Permalink: https://t.me/tonblockchain/81
- Author: The Open Network
- Views: 49.7K

Now you can receive a cashback in Toncoin with** **[**Backit.me**](http://Backit.me/). Backit is a popular cashback service **with over 3.5 million active users **which** **supports over 800 stores.

**Videos:**
- https://cdn4.telesco.pe/file/0b1c62fbc0.mp4?token=tpk0bS9sKdJ4dL5bgNg1rFCAAXp1q1L4HVbmk2OOaj29R0IUvZbE8GlzWKXrU_i2HXqr4USlH-Ocf6RzzDmwG8GK6OsrmnJPcVYT-nSAcJ26EPIuPHkQJXXZhZcfTujO_3WCVPX-iEpjzRNOjI5LOWeKEdiTZF2iocx8iX5HXhkVR72Eu4rN_kJN-KFdy0Q8UvCzu16kpLdDXbURnqScM6Z3mPnVWaYP9WTLjjlATzfGPoWfor0rUBMRX4_RrVFbC7WygaXgYibimloWoYobSLVP-W7Hgpma3RBQ0qDC6zhiS8tIBysSDueLeV2bw-tGk68u6R21PAWPwwYm0C2xHA

---

## [82] 2021-12-15T15:29:50+00:00

- Permalink: https://t.me/tonblockchain/82
- Author: The Open Network
- Views: 62.1K

**Web Interface for Validators**

Most TON network validators use the convenient command line tool called **mytonctrl** that simplifies and automates their operations.

Now you can connect **Web User Interface** to **mytonctrl** which can display all necessary information about validator quality, transactions, and rewards.

The dashboard is working in read-only mode and absolutely secure. You can log into your validator via [tonadmin.org](http://tonadmin.org/) or configure a connection directly to your machine.

[Connect Web Interface »](https://github.com/igroman787/mtc-jsonrpc)

**Photos:**
- https://cdn4.telesco.pe/file/CYyAJl14bYFZTz-U6emN1st2Im8byblQ_Re5d3bVT6S32_Fwxs5Ql-rxjcbHLptZuXuFFKDt-ZjdkvK-Ea5r6NTR5nelTDtzvDpBp0E-1N0TGk7ZPdZnWs9WxIYCuRUHCDnqsOMQaILYFMo4gjkkyomaVIx80k-oENrCZZBselxjA35j7CTKgLGxjI1Hgc2fM5mFtYN4m5rBfsBdYkv64iIw6HnDSbe1iA8sHdS3oxMggIZY7cgsLDSg6im63-mWceY250XvkLF3DQyln5OGypcLWnbuw3hYc2EbvUpR1EqHVjpNaT8ITfTOa3gepxQ1XSouy0ECLRQ61ZO5zR_AsQ.jpg

---

## [84] 2021-12-16T15:57:05+00:00

- Permalink: https://t.me/tonblockchain/84
- Author: The Open Network
- Views: 92.6K

**Web wallet is now available at the new **[**wallet.ton.org**](http://wallet.ton.org/)** domain!
**
If you have any problems with migration, please contact support [@toncoin_help](https://t.me/toncoin_help).

---

## [85] 2021-12-21T15:12:28+00:00

- Permalink: https://t.me/tonblockchain/85
- Author: The Open Network
- Views: 71.5K

**New mining pool by third-party developers — **[**toncoinpool.io**](http://toncoinpool.io/)**
**
Pool has their own cross-platform open sourced client with an excellent user interface.

[Join toncoinpool.io »](https://toncoinpool.io/)

**Videos:**
- https://cdn4.telesco.pe/file/6830c1fcae.mp4?token=NEiilN2G4u-h2L_r2HsC5svfTGB-HO5XuMJWdgAeeBU0uj5URRXKmX5RmPPbpwvWD9LUYGOuGjlterWMC6EDEMMd4lN9c1IXuJgZX9pgJyXQ81K-957wVhhZu9eUP47hNjyPTw5QDZRcqAbYY_NJn_KmTVM4rl8T8KC2Nik3rAJcHcw1yWOGkMan7-8aRZglHj7-2YJa0n6_M2rRWhiHDVOOZK_kwJdRBF7LDhO2jy49SDY5cr6OfLTfRYEj5oerFAotpjuB1mW9trKkxkeAPiGGlI5fSC44Ury1xULlthhBhhVi8bLaJbEx52FyhUDzMfkXm-oh2ho6GrlYM7Ztrg

---

## [86] 2021-12-23T15:10:56+00:00

- Permalink: https://t.me/tonblockchain/86
- Author: The Open Network
- Views: 50.9K

When Telegram [said goodbye](https://telegra.ph/What-Was-TON-And-Why-It-Is-Over-05-12) to TON last year, I expressed the hope that future generations of developers would one day carry on with our vision of a mass-market blockchain platform.

So I was inspired to see the champions of Telegram's coding contests continue developing the open TON project, which they rebranded to [Toncoin](https://t.me/toncoin).

I'm proud that the technology we created is alive and evolving. When it comes to scalability and speed, TON is still years ahead of everything else in the blockchain realm. It would have been a shame to see this project not benefitting humanity.

Unlike the original TON, Toncoin is independent from Telegram. But I wish its team the same success. Coupled with the right go-to-market strategy, they have all they need to build something epic **💪***

---

## [87] 2021-12-30T23:13:45+00:00

- Permalink: https://t.me/tonblockchain/87
- Author: The Open Network
- Views: 41.1K

[**ePN Affiliate**](https://epn.bz/en/affiliate)** network supported withdrawals in Toncoin

**ePN Affiliate is the global affiliate network with Cost Per Action (CPA) offers which unites more than **700,000 webmasters**.

**Photos:**
- https://cdn4.telesco.pe/file/gErkWYAggQ0AVLfJ5Bvrn_hVdCDn9KCHXIeKAewblHjgkj4CR1G8NIgGdp2Ost-Dc0vgeXX285RY6DqehnC5cku-LONeJUu0hJTNgHPTz-_9lrozjUNyBcVU9bkXoPPVNQ-gVSN6hFcdEaxnhY5YKHA4WTve-UiBF4JyNoosgusX503vqd5uHBqf7S04xsHdA7PsBsY1iI7kS9mS3_BWNH5SY0CitgBsayDiklxiys8_bSZl9w-zBmhIrfWfhYd09deC5a9mSv63x_US7wVWdLOoXxBPTLtq6GhCCasSwZv3N9tSz4gS987GOUR4mx-eGdw27V2YKf8WyH4Hpipe5Q.jpg

---

## [88] 2021-12-30T23:13:45+00:00

- Permalink: https://t.me/tonblockchain/88
- Author: The Open Network
- Views: 42.9K

**TonMine Pool**

New Toncoin mining pool by third-party developers.

[Join tonmine.com »](https://tonmine.com/)

**Photos:**
- https://cdn4.telesco.pe/file/jqmfH3moOTj8FK7xAohJP-FtOKPo5L8L-hvDNIXq-bKJS3EP7j4OHg_chFDeLIENOyk__CFoFwFNr9FycgmauNHnszvN8SyVkaYWQgx9znnzJN5r5p965OAVIlgIYOyCKbKeOg1J3b4XleDBELtLOad0hJjQS5NXd41oCxwrLbH-efBf9XVchjdHil_vWHHevxVP1bOWqbK4gA8GcNUZ9TBfKkszIZCjUaBBL9_YsrK5E14BhonplZfYPx--PMqQ2l6thPNPEtQ6mq5JMEdPXbKjhi70XAJICw9Y8tcxUuEa8VLDIoNlUSZDkNSU6uQB1AD9bTNz0emkWNPZnBmnvw.jpg

---

## [89] 2021-12-30T23:13:45+00:00

- Permalink: https://t.me/tonblockchain/89
- Author: The Open Network
- Views: 44.3K

**TonUniverse Pool**

And one more new open source mining pool by third-party developers.

[Join tonuniverse.com »](https://tonuniverse.com/)

**Photos:**
- https://cdn4.telesco.pe/file/CRKQ7t9cKsGtxHlVb9Fbk_oPn08PjFEAOOEVe2ZPAtR1FugVsmHj3V8QpCkZIOZpYo1GL-xT6o7_5SCcZz7cXQ30o4XlUgDgBZsliZE0jfdMzy_XJkIxdQFiXGqtZ3dn8SyzTU9cdtduAA1OJu6ZQcJS-X_YBTdG_fo4JNpewVmUl4bWjG-aZzIV-q1gyUE5OQYCEujNgeXLvZBjhAX6NDEWkOy89V5DKS9R7BYJNKSchvVDo2jzkv0198QftOM-VWvzoKb3WtoCuUzkKU4rBp7TSLFi2Pcllo14Wj2bONJLeLKV7VK2uwiX1BOZWfZyIXfslJohXbbzAH5QSzfHHg.jpg

---

## [90] 2021-12-30T23:13:45+00:00

- Permalink: https://t.me/tonblockchain/90
- Author: The Open Network
- Views: 48.9K

**New standard Wallet's Smart Contract

**In TON, each user account (wallet) is a smart contract. We have developed and approved a new 4th version of the wallet's smart contract.

Now users' wallets can provide an unlimited functionality enhancement by adding other smart contracts as "plugins".

This solution gives developers new great opportunities and allows them to create completely new use cases.

The first new feature was recurring paid subscriptions.

In the near future, all wallet apps will support this 4th version of the smart contract.

[GitHub »](https://github.com/ton-blockchain/wallet-contract)

**Photos:**
- https://cdn4.telesco.pe/file/k0UeODki2UJehvr8Jy-h5PkYC80r3DjL2fYyBRBXj0vvdYSa7FG4dbXaYLK27VQ5VqzORmcNyJOngXkvHTGhP9Ta3mopy6ZxUv28S3ONFaQSQaDUsHuvxOnzXYXZF2elmbN5rrw5l8JYcTagpgcu-fj9aBcNpuOlGJsXp9rRWSvOayugiJoXw1jgoDocAK_N_N0KOIvxgCyO_mfHd-XDYT_FaxjB8G7KZ_7AbMPIK-u7jzmCY0LgVZvY4VRIAVooCyCsHUJ1JEYF4G0Wc341uXeCC1CM0xsu4qYAa50XdbJJhtO6QvmazwV--Im2s8VyMcYo8CO-yD13LTCT10-uvA.jpg

---

## [91] 2021-12-30T23:13:45+00:00

- Permalink: https://t.me/tonblockchain/91
- Author: The Open Network
- Views: 52.9K

**New standard Smart Contract for Subscriptions

**The architecture of decentralized recurring P2P subscriptions for The Open Network has been designed.

We have writed and tested the new standard smart contract for subscriptions to anything for Toncoin.

This smart contract guarantees that a specified amount of Toncoins will be debited to a user's wallet not oftener than once a specified period.

We are glad to announce that all these features have already found a real application — more details on the next post.

[GitHub »](https://github.com/ton-blockchain/wallet-contract)

---

## [92] 2021-12-30T23:13:45+00:00

- Permalink: https://t.me/tonblockchain/92
- Author: The Open Network
- Views: 56.1K

**Videos:**
- https://cdn4.telesco.pe/file/0c9997197c.mp4?token=U2rvlcMg9FwAhzWFBS85B-uBbk3Ip3HZGiBCCtMjQ96ZAOw27LvLJhGexxm8zeGgfIO2-BDr-6PBx2VQgjfFFPL6p0Q53lYfgJIdMei1ZRJdXNNEluokQ86qx4bReaPnwJZ38TxzxG2tXXXpjzIYPM27HXO8cV_ry7Bvv7aj60a-XiYII1T73FiACEhYy9dnM3CTgJxHiDDhLUo-0aq5Rd2PRZDlBHWeau6JPSY-mjX27iOBCNNaC6GkaaZrurU5JPSq0U5YquZHO-EiVV-WvbM3D418P4ttHw9wXKcTj4AD5-tBObsPSxF-4-iv2EHTFQmbivuCEky8R_kYDIiAaQ

---

## [93] 2021-12-30T23:13:45+00:00

- Permalink: https://t.me/tonblockchain/93
- Author: The Open Network
- Views: 79.3K

**Decentralized Subscriptions Revolution

**The verified bot [@donate](https://t.me/donate) has integrated TON. From now on, everyone can make donations to authors in Toncoin and use it to pay for joining private Telegram channels.

Recurring payments for subscriptions are charged to your Tonkeeper wallet, which is just as simple as using Apple Pay or a credit card.

What’s under the hood of a convenient interface, though, is a decentralized system where readers pay authors directly with no one in the middle, with the smart contracts ensuring that the agreed upon amount is charged once in a given period.

The user can see all of their active subscriptions in Tonkeeper and may cancel them at any time.

Other projects’ attempts at introducing a similar solution have failed due to high network fees and the low speed of the previous-generation blockchains. Another reason might be a lack of creators and their content.

Thanks to its cheap and fast transactions, the TON bloсkchain has allowed channels’ authors to receive coins for even $1 subscriptions straight into their wallets.

[More and more channels](https://t.me/subscriptions) are connecting [@donate](https://t.me/donate). Who knows, maybe we’re witnessing the beginning of a global era of content makers’ transition to P2P technologies.

**Chats, Channels, and More

**We believe that in the future, the** **subscriptions model will be rooted deeply into many aspects of our life.

It’s likely that soon enough, the very idea of ‘making a payment’ will almost disappear, and people will be living their lives while goods and services will be paid for in the background.

We understand that it sounds unusual now because many of us don’t really trust automatic payments. That is why it’s so important to switch to blockchain — it will guarantee that all operations are correct and secure.

The launch of decentralized subscriptions to digital content is a major event by itself, but it’s also yet another step towards even more significant tech breakthroughs.

---

## [94] 2022-01-07T19:29:35+00:00

- Permalink: https://t.me/tonblockchain/94
- Author: The Open Network
- Views: 93.8K

**🥳***** 2021 is the year of great success for TON**
 
We started the last year almost from scratch. In January 2021, we had practically nothing but a strong desire to bring TON technology back to life.
 
The abandoned network was kept alive by no more than 10 enthusiastic validators. There was no infrastructure, the project didn't even have an up-to-date website.
 
With great efforts, we have succeeded in all areas, so let us tell you about our steps in order.
 
 
**👨‍💻*** **Development and infrastructure**
 
Thanks to bug hunting, improvements in the base code, and network configuration, today we have a working, stable and secure network.
 
— The slashing system has been set up and **mytonctrl**, convenient software for validators, has been developed.
 
— The number of blockchain **validators** has increased by **1450%**: from 10 to 155. Their total stake is now more than **112,000,000 Toncoin**.
 
— The whole infrastructure has been built: API, DHT nodes, liteservers, and archive nodes that store the entire history of the blockchain.
 
— The number of **liteservers** has increased from 1 to 40.
 
— Web documentation, **SDK** for various languages, development tools (such as **mylocalton**) have been created, [contests](http://t.me/toncontests) for developers have been launched.
 
— Standard wallet applications for all platforms have been restored and decentralized bridges between **TON**, **Ethereum**, and **Binance Smart Chain** have been built.
 
— Some of the biggest launches last year were: [Tonkeeper](https://tonkeeper.com/), [TON Extension](https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd), [ton.app](http://ton.app/), as well as bots [@wallet](https://t.me/wallet) and [@CryptoBot](https://t.me/CryptoBot), which set high standards of excellent UX in the blockchain world.
 
— At the end of the year, we have launched a system of **decentralized subscriptions** that takes full advantage of TON's capabilities. Such a product can only be made on a fast and scalable blockchain with cheap transactions and the right approach to creating of user interfaces.

**⛏*** **Mining**
 
Thanks to the successful development of the network, there is a constantly growing interest in Toncoin mining. The equipment cost set the initial value of the coin and then mining turned into a real industry.
 
— The hashrate of the network has increased by **10,000,000%** **😅***, from 50 Gh to 500 Th.
 
— Complex technical developments were made, including the software for GPU mining, miners for Windows, HiveOS. Several **mining pools** appeared at the end of the year.
 
 
**💎*** **Toncoin**
 
At the beginning of 2021, the network coin was not traded on any place and most couldn't see the value of it.
 
— Over the past year, many technical integrations were carried out and now Toncoin has appeared on the world's top exchanges like **FTX**, **OKEx**, **Gate io**, **EXMO**, the decentralized exchanges **Uniswap** and **PancakeSwap**, and payment services such as **Mercuryo**.
 
— Popular services **Backit Cashback** and **ePN** have started integrating Toncoin.
 
— The price of Toncoin has increased by **3800%**. Starting from ~**$0.3** at the first listing, the price reached **$3.8** by the end of the year with **$5.84** price at its peak. Before the listings, Toncoin was estimated at ~$0.1, based on the cost of its mining.
 
 
**👨‍👩‍👦*** **Community**

In addition to technical achievements, we have also been working on a completely new approach to community formation and striving to appeal to the mass user with the privacy and security of blockchain technology.
 
— **Community has grown by 60,000%**. Several chats about TON with a total audience of ~1,000 people have developed into a community in 10 languages, which already has more than **600,000 participants**.
 
— The number of network accounts with a balance has increased from 76,000 to 128,000.
 
— In the middle of the year, in response to the open letter, our open source project received the original ton-blockchain repository and the website [ton.org](http://ton.org/).
 
— At the end of the year, we were very pleased to hear [kind words ](https://t.me/durov/175)from Pavel Durov about the successes and prospects of TON.

The previous season of the project aimed to** build a new Internet** was exciting. Let's try to make 2022 even more action-packed **🚀***

---

## [95] 2022-01-08T14:45:44+00:00

- Permalink: https://t.me/tonblockchain/95
- Author: The Open Network
- Views: 156K

**Adjustments in the roadmap

**Some points of the roadmap have been swapped around:
 
**In Q4 2021**, TON Subscriptions, the decentralized subscription system, and technical integrations with the world's top exchanges were launched, which has caused a rapid growth of network users.
 
**In Q1 2022**, we will focus on the TON Developers Program, TON DeFi, and the launch of TON Nominators.
 
**Q2 2022** – TON DNS and TON Payments.
 
**Q3 2022** – TON Proxy and TON Sites.
 
**Q4 2022** – TON Storage.
 
Right now you can notice a lot of new developers in the community chats working with TON, but experiencing some lack of information and tools.
 
Of course, we assumed that TON would be of interest to third-party developers and product creators, but we did not assume that it would happen so quickly.
 
Therefore, we consider it necessary to adjust the flow of work.
 
First, we are going to start the **TON Developers Program**: create additional documentation, tutorials, as well as improve API, SDK and development tools.
 
Previously, it was planned to start this project halfway through the year.
 
Also, at the beginning of the year, we will focus on **TON DeFi **– standard smart-contacts for tokens, NFT, liquidity pools on the TON blockchain, – as we see a great need of the community in this direction.
 
The launch of **TON Nominators **is important to both users and validators, which is also a priority.

---

## [96] 2022-01-31T20:39:12+00:00

- Permalink: https://t.me/tonblockchain/96
- Author: The Open Network
- Views: 86.7K

**Completion of the NFT standard**

We invite developers to join us for the completion of the standard and the implemention of TON non-fungible tokens.

If you have specific suggestions for an improvement - you can comment on the current [draft](https://github.com/ton-blockchain/TIPs/issues/62).

Please note that any flood, offtopic and messages that do not make sense will be deleted and their authors will be banned forever.

---

## [97] 2022-02-02T13:58:20+00:00

- Permalink: https://t.me/tonblockchain/97
- Author: The Open Network
- Views: 98.1K

**Toncoin’s ticker will soon be changed on exchanges and services from TONCOIN to TON.
**
The ticker of the wrapped token on Ethereum and BSC networks will remain TONCOIN as before.

During the transitional period, you may encounter both versions of the ticker. Pease check [ton.org](http://ton.org/) in case of doubt.

**Photos:**
- https://cdn4.telesco.pe/file/fi5ItrS5eFAhmbiMslBry2O50_YG4M-Zbg7YHcFdb_tQhw9XnKvTE5TxOrY7WI_vr8e6EeTFGKcWKFWnI-rBgmGcVNUmLPWAxXs24Qy28i7mH_zl8aRT682rkrIxIB6a11k4C_mBQGjWrCpBf4ece6nuFcHEDH4_-eQnC5CUpe1QP8Ooluzh7f33sS_f4mYaMAFgPeuJUU9JE5hYH5DUOX_izM5frfTlnoH6vo_HeFFRoOVRiMCgeC2sqI2Ru3wlVbvlxGw5CgxojYrOtMmWUQQYkHMyRxfvXAZM9kIeSisIev1qjv5mIeA2evRGAP01IYsIBn7OK9qW1VjQu7sIxQ.jpg

---

## [98] 2022-02-18T16:20:31+00:00

- Permalink: https://t.me/tonblockchain/98
- Author: The Open Network
- Views: 81.7K

**NFT standard received Release Candidate status

**Developers of TON products and NFT authors can start implementing the technology on the **testnet**.

[Specification »
](https://github.com/ton-blockchain/TIPs/issues/62)[Smart contracts »
](https://github.com/ton-blockchain/token-contract/)[JS SDK »

](https://github.com/toncenter/tonweb)Main features of TON NFT:

— **Cheap network fees**. TON NFT deployment is ~500 times cheaper than in Ethereum and does not depend much on the market price of Toncoin.

— **Scalability**. Tokens have a distributed architecture, and collections with millions of NFTs will not be the bottleneck of the network.

— **New mechanics**. You can make new mechanics where one NFT smart contract can not only change the content of another NFT smart contract, but even change its code. Looking forward to games and other use cases for this.

---

## [99] 2022-02-21T12:52:46+00:00

- Permalink: https://t.me/tonblockchain/99
- Author: The Open Network
- Views: 83.1K

**HTTP API for TON has been greatly improved over the past months.
**
Developers can use the fast, multi-threaded and reliable [toncenter.com](http://toncenter.com/) by getting an API key in the bot for free.

It’s also possible to run your own API instance since it is [open-source](https://github.com/toncenter/ton-http-api) and can be easily installed.

**Photos:**
- https://cdn4.telesco.pe/file/ICQqfsCsb2iYDICVPfpoN7FvvPpUk6w7huDDqT7hgHWmZ8K-02ee1KWRxNzvJKnFsDYcYzgbLhb2MqU0C8bGtG_6HE5b-866HA9Iu78nhetj8Xn85VTMCX3SZc4iyYrIRfDMdXl9LFvacXs72HDfjvFsMKJIh1O-SrRk2xyJaft3Swf0Rht7MDOK6keR4L3pdF9nwSDT19MV2-kxnOnGLf1b-C6b0KGyw5rw9mo4Mg8kUGJiGR0alur4qQBoo-VkfUZ2QnfXATciEnZamr60gBaAxKryOFTs5Cgp4WwTcpvYLfO54waRjUXuaGQMS5FjY5y-39kHq6hWoe8WnwFwaA.jpg

---

## [100] 2022-03-05T18:56:59+00:00

- Permalink: https://t.me/tonblockchain/100
- Author: The Open Network
- Views: 342K

Users of the [TON extension](https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd) for Google Chrome, **please write down your wallet recovery phrases if you have not already done so**.

Click menu in the top right corner → Backup Wallet → Write down your 24 recovery words in correct order and store them in secret place.

Google Chrome has released a new extension format [V3](https://developer.chrome.com/docs/extensions/mv3/intro/). With it extensions will become more secure and private.

The TON extension will be updated to the V3 format in the coming days.

You may need wallet recovery phrases, make sure you have them written down.

---

## [101] 2022-03-07T13:47:47+00:00

- Permalink: https://t.me/tonblockchain/101
- Author: The Open Network
- Views: 57.9K

**Strategic **[**partnership**](https://blog.bit.com/bit-com-partners-with-ton-to-support-the-ton-ecosystem/)** Matrixport x TON
**
“After learning about TON’s history and roadmap, as well as observing the performance of TON after [bit.com](http://bit.com/)’s listing we are convinced about TON’s potential. [Bit.com](http://Bit.com/) and Matrixport have a rich variety of product offerings including trading tools and asset management tools, we are very happy to work with TON and would like to embrace TON in our various products”  noted Toya Zhang, Chief Marketing Officer of [bit.com](http://bit.com/).

---

## [102] 2022-03-07T18:40:21+00:00

- Permalink: https://t.me/tonblockchain/102
- Author: The Open Network
- Views: 62.8K

[**TON Wallet extension**](https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd)** for Google Chrome was updated.
**
While other extensions such as Metamask still use the outdated format, TON is at the forefront of web technology with new, more secure and private [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/).

Moreover, the new version of TON Wallet includes a nice-tweaked UI and other improvements.

Many thanks to our open source contributors on GitHub: **zavtramen**, **neverthirty**, **sergeiivankov**, **D2Phoenix**, **futpib**.

---

## [103] 2022-03-09T01:22:50+00:00

- Permalink: https://t.me/tonblockchain/103
- Author: The Open Network
- Views: 70.6K

We are glad to announce that **TON** **JavaScript SDK **[**TonWeb**](https://github.com/toncenter/tonweb) is developing rapidly and today open-source contributor **slavafomin** has added full library typing.

Also note that TonWeb includes block subscriptions, work with NFT, periodic subscriptions and supports work not only in the browser or nodejs, but also in the react-native or worker environment.

**Photos:**
- https://cdn4.telesco.pe/file/q8ND2aNTgTUsZp_cxZNU4mpRQDfRlqjTiJZvDOVUQWGv8m3JTkBZBowlTHHCb4Vc4qB0AveGZNqoVFC6s-ZqjPUgk_x79opNYTYpFZ4VZdy8CD2woTtjlIzZdpFyxSPtSFP8tADvLHy0Lq_5-2Twr8B0yNEml-RdF0_t07mtEzhqu-euUrEM1jsW5sbtPpPBP1JJ-gPbR6iVAe0Y1H2zPjj9w729MxluruV7sTjiF2PJDa-DD12G_NSsfV91JndjRYWj4aXs9oUJcYmD8Mr6XwUSOcAFoHvtgm-06J_A2DvLLeRAyGaBtcxEaedgawKsNNK8KtxxWMnqQ6mTIoVqxg.jpg

---

## [104] 2022-03-11T18:12:08+00:00

- Permalink: https://t.me/tonblockchain/104
- Author: The Open Network
- Views: 194K

**Completion of the fungible tokens standard**

We invite developers to join us for the completion of the standard and the implemention of TON fungible tokens (called **jettons**).

If you have specific suggestions for an improvement - you can comment on the current [draft](https://github.com/ton-blockchain/TIPs/issues/74).

Please note that any flood, offtopic and messages that do not make sense will be deleted and their authors will be banned forever.

---

## [105] 2022-03-21T18:00:49+00:00

- Permalink: https://t.me/tonblockchain/105
- Author: The Open Network
- Views: 53.3K

---

## [106] 2022-03-21T18:16:25+00:00

- Permalink: https://t.me/tonblockchain/106
- Author: The Open Network
- Views: 54.5K

TON Foundation team are pleased to support the** CodeTON round** on [**Codeforces**](https://codeforces.com/blog/entry/101056).

**Codeforces** is a famous project joining people interested in and taking part in programming contests.

Thousands of skilled programmers participate in each contest to determine the best and have fun.

[CodeTON round »](https://codeforces.com/blog/entry/101056)

---

## [107] 2022-03-24T18:46:01+00:00

- Permalink: https://t.me/tonblockchain/107
- Author: The Open Network
- Views: 52.1K

[https://telegra.ph/TON-NFT-Opens-up-New-Opportunities-for-Game-Creators-03-24-2](https://telegra.ph/TON-NFT-Opens-up-New-Opportunities-for-Game-Creators-03-24-2)
  *
  Telegraph

**Link preview:**
- [TON NFT Opens up New Opportunities for Game Creators](https://telegra.ph/TON-NFT-Opens-up-New-Opportunities-for-Game-Creators-03-24-2)
  - The 2000s saw the arrival of social networks. Soon, gaming platforms started launching there. Third-party developers got a chance to create and publish games on social network platforms, and users, to play with one another.

---

## [108] 2022-03-25T23:09:48+00:00

- Permalink: https://t.me/tonblockchain/108
- Author: The Open Network
- Views: 42.4K

**More then 11,000 programmers took part in the **[**CodeTON**](https://codeforces.com/blog/entry/101056)** contest on the Codeforces!**

The top** 1000** were awarded in Toncoins.

We invite CodeTON partipiants and anyone who wants to take part in the [**TON Smart Challenge**](https://t.me/toncontests/25) on **March 28th**.

In this competition, you will get acquainted with the FunC programming language for developing TON smart contracts.

[**Contest page with details and **](https://ton.org/contest)[**sample**](https://ton.org/contest) [**task**](https://ton.org/contest)** **[»](https://ton.org/contest)

---

## [109] 2022-03-25T23:09:48+00:00

- Permalink: https://t.me/tonblockchain/109
- Author: The Open Network
- Views: 51.6K

Why does TON have its own programming language? 

We tell in a new article (spoiler: ||the next generation blockchain could not be made with old generation language||): [https://telegra.ph/Its-time-to-try-something-new-Asynchronous-smart-contracts-03-25](https://telegra.ph/Its-time-to-try-something-new-Asynchronous-smart-contracts-03-25)
  *
  Telegraph

**Link preview:**
- [It’s time to try something new: Asynchronous smart contracts](https://telegra.ph/Its-time-to-try-something-new-Asynchronous-smart-contracts-03-25)
  - To run smart contracts, most modern blockchains use the Ethereum Virtual Machine (EVM) or try to be EVM-compatible. The thing is that on the Ethereum blockchain currently, there is the largest number of users, but other blockchain projects want to acquire…

---

## [110] 2022-03-31T16:05:34+00:00

- Permalink: https://t.me/tonblockchain/110
- Author: The Open Network
- Views: 38.3K

**👨‍💻*** **Developer Program Q1 2022 Report

**We’re happy to share what’s been done in this area:

— [API](https://t.me/tonblockchain/99) and [SDK](https://t.me/tonblockchain/103) significantly improved.

— TON [documentation](https://ton.org/docs) revisited: from basic concepts to Toncoin payment acceptance code examples.

— New [network explorers](https://ton.app/explorers) emerged.

— Dev tools — e.g., [MyLocalTON](https://ton.org/docs/#/nodes/local-ton)  — majorly revamped. New perfect tools such as [toncli](https://github.com/disintar/toncli) and [IDEA Plugin](https://plugins.jetbrains.com/plugin/18541-ton-development) were delivered by developer community itself.

— Rules for publishing apps and dApps on the [ton.app](http://ton.app/) catalogue were eased. From now on, anyone can list their product following a simplified moderation procedure. Community channels issue round-ups of newly arrived TON products.

— Big work on [TON browser extension](https://t.me/tonblockchain/102) as one of the main ways to interact with dApps.

— New independent dev platform [tonic.cx](http://tonic.cx/), which hosts AMA sessions from time to time. In general, we see a notable growth of chats and other communication channels for TON developers in many languages.

— Special attention is paid to competitions among developers. [@toncontests](https://t.me/toncontests) keeps organizing more and more contests, the most recent of which – [CodeTON](https://codeforces.com/blog/entry/101056) on Codeforces, saw over **11,000 programmers** participate. At the time of writing, there’s an ongoing [Smart Challenge](https://t.me/toncontests/28) with a prize fund of $30,000 — a great way to get acquainted with the FunC language that’s used for writing TON smart contracts.

We’re thrilled to see new products and teams along with pull requests to open-source repos coming in volumes.

We’re not stopping at this. TON developers and product creators will always be one of the top priorities in The Open Network.

---

## [111] 2022-03-31T16:05:34+00:00

- Permalink: https://t.me/tonblockchain/111
- Author: The Open Network
- Views: 35.3K

**First nominator pool by TonWhales team**

You can stake Toncoins into the pool and earn income from this.

Unlike other forms of staking, nominator pools are the most useful: pool’s stakes participate in [validation](https://ton.org/validator) rounds and, as result, increase the stability and decentralization of the network.

The pool by the TonWhales team runs on their own open-source smart contract. It’s worth noting that TonWhales team has organized an emergency fund of 1 million TON, and also launched an open bug bounty program.

[TonWhales Nominator Pool »](https://tonwhales.com/staking)

**Photos:**
- https://cdn4.telesco.pe/file/Jnzx_o0qiHEy6r1FnTqB9akilp2RlaP_r5bpKoEixw_p6pGQFUiR6RXjS5SahTmObT3McyeJkYT4XA_szWP8QvH4CQnBxH8BO49VHb0zGDEw-Id25whCH9GpU0WyoDVNgBA1qfJe25lnmE2-zLufkJZVsHpVDasMU0rTQX7cDz2fg74jml5rKFqAeWsnv9RmInNvEOYZSkBLxnaEI976plxof3jlhW8W6xzgLxTYZBcFhIDroZikxMVT_fWfRJLVcmBiaXlmp8oDqQINHA-lrxTBurcsS_-iJsV_VLN82WX2flBnYypo5LbfxrZfkYPaHA5V5RmEVy6UCV-wS1K-iw.jpg

---

## [112] 2022-03-31T16:05:34+00:00

- Permalink: https://t.me/tonblockchain/112
- Author: The Open Network
- Views: 48.1K

**TON scalable DeFi standards are here!**

For the last three months, we've been working to locate a proper solution for creating asynchronous scalable DeFi in TON.

The discussion was open and available on GitHub, all comments were considered and many of them influenced the final standard.

Today, we are happy to present ready-made standards and examples of smart contract implementation for Fungible, Semi-Fungible, and Non-Fungible tokens as well as applied contracts for NFT-marketplaces and ICOs.

TON tokens built on a new architecture: they are fast, cheap, provide new features, and ultra-scalable. 

[Read the article about the design and the benefits of TON DeFi »](https://telegra.ph/Scalable-DeFi-in-TON-03-30)

**NFT**: [Standard](https://github.com/ton-blockchain/TIPs/issues/62), [Implementation](https://github.com/ton-blockchain/token-contract), [JS SDK](https://github.com/toncenter/tonweb/blob/master/src/test-nft.js) [»](https://github.com/toncenter/tonweb/blob/master/src/test-nft.js)

**Jettons** (Fungible): [Standard](https://github.com/ton-blockchain/TIPs/issues/74), [Implementation](https://github.com/ton-blockchain/token-contract), [JS SDK »](https://github.com/toncenter/tonweb/blob/master/src/test-jetton.js)

**Semi-fungible** is combination of **NFT** and **FT**.
  *
  Telegraph

**Link preview:**
- [Scalable DeFi in TON](https://telegra.ph/Scalable-DeFi-in-TON-03-30)
  - In 2015, the Ethereum blockchain saw the arrival of a new standard called ERC-20, allowing anyone to create their own tokens (cryptocurrencies) in the network. A few years later, in 2018, the ERC-721 standard was introduced for NFTs, which prove ownership…

---

## [113] 2022-03-31T16:05:34+00:00

- Permalink: https://t.me/tonblockchain/113
- Author: The Open Network
- Views: 62.5K

We welcome **hundreds** of NFT projects created by various teams in TON.

You can check them out on new 3rd party marketplaces like [getgems.io](http://getgems.io/) or [disintar.io](http://disintar.io/).

And NFTs are already [supported](https://tonscan.org/nft/EQDwxUWb1ZxUarpj-mUF1gzD_jT4yiScHi_VL5AezWjsMT88) by some blockchain explorers as well. 

Moreover, 3rd party launchpads like [rocketon.org](http://rocketon.org/) have started emerging.

Now, when token standards have [received](https://t.me/tonblockchain/112) release status, we invite all developers to implement and launch their projects on the mainnet.
In the coming days, deployment instructions and guidelines will be published for NFT authors.

More interesting things are coming further **😏***

**Photos:**
- https://cdn4.telesco.pe/file/uSAs56PopO5P6CnJ_sNi2bkteAp-NKePiTwpWBU6q5CF3whj-FxRcCCiWeyBCIz2bLUBA4cB23WMz4PVmt3N8v6eXX16HVGjXOhpbtB6_Vwn0Lfx28Eic42qzk6rTkCFR_H0fwCvlgwMvler_MP_ctMxI4fENMKghffmKUbjoeh4ZFijAkiDplrmOsyNiJqbi6DSSHTIjWGLBC-E1OPiTCrico_c3QYmIbdFmHjAfgvjnrn9Ra35EJx8goE8ofXkD9I5ujZOMVJN-nOOIPrDvFy_HDq8y310xoMapC8oSoOjMwovyaWZpaY4eUYZM5fi_HNA5hGI1GoSqELrB-lf-g.jpg

---

## [114] 2022-04-04T18:54:13+00:00

- Permalink: https://t.me/tonblockchain/114
- Author: The Open Network
- Views: 92.6K

The first NFT project for TON - [ton.diamonds](https://ton.diamonds/) - has published instructions for deploying NFT collections, as well as a ready-made open source script and a web page for deployment.

You can use these tools to deploy your NFT collections on the mainnet.

Also, in the near future, the UI for deploying NFT collections will become available on TON-based NFT marketplaces. 

[Instruction & ](https://github.com/tondiamonds/ton-nft-deployer/)[tools »](https://github.com/tondiamonds/ton-nft-deployer/)

---

## [115] 2022-04-07T13:51:40+00:00

- Permalink: https://t.me/tonblockchain/115
- Author: The Open Network
- Views: 51.3K

**📊*** **Some Q1 numbers**

Over the past three months, the number of accounts created in The Open Network more than **doubled** **from** **170,270** on Jan. 1 **to** **382,148** on March 31.

The total number of subscribers across all TON [social media](https://ton.app/channels) pages and accounts surpassed **1.7 million subscribers** — this number was merely **800,000 followers **at the beginning of the year. Our community from over 10 countries read material in 12 languages.

Also, the growing interest is evidenced by the fact that the number of people following Toncoin at [CoinMarketCap](https://coinmarketcap.com/currencies/toncoin/) grew 6 times since the beginning of the year from around **35,000 **to over **214,000 **followers.

---

## [116] 2022-04-07T13:52:01+00:00

- Permalink: https://t.me/tonblockchain/116
- Author: The Open Network
- Views: 68.7K

Over the last few months, we’ve received suggestions from prospective partners and TON miners to create a larger reserve of Toncoin to secure resources for chasing new and exciting top-tier partnerships and integrations.
 
We understand that further development of the TON ecosystem will require significant funding, and it’s great to see that large holders are ready to back it up.
 
Considering the above, we are announcing a formation of a new Toncoin reserve that will be focused on supporting new product integrations, community growth campaigns, and partnerships with the world’s best companies in the blockchain sphere and beyond.
 
Due to the increasing demand for security and to represent the specialized nature of that new reserve, we’ve created an address with a multi-sig wallet smart contract:
`EQAhE3sLxHZpsyZ_HecMuwzvXHKLjYx4kEUehhOy2JmCcHCT`
 
It’s empty now, but we expect that community members who have offered their assistance will participate in forming that reserve and help the TON ecosystem grow and prosper.
 
We invite all TON enthusiasts and large holders to make donations to the new reserve and support the further growth of the ecosystem.

---

## [117] 2022-04-17T18:12:26+00:00

- Permalink: https://t.me/tonblockchain/117
- Author: The Open Network
- Views: 53.2K

**Brilliant week for TON**

The governments of Cameroon, the Democratic Republic of Congo (DRC) and the Republic of Congo (Congo-Brazzaville) have all announced intentions to adopt cryptocurrency and blockchain-based solutions to drive economic progress. The three countries recently published separate press releases in which they outlined their initial thoughts on cryptocurrency and how they plan to integrate it into their respective economies. The countries mentioned that they are in discussions with The Open Network (TON) to help lunch their first crypto initiatives.

Press releases:

Republic of Cameroon - [Ministry of Posts and Telecommunications](https://www.minpostel.gov.cm/index.php/en/documentations/418-a-propos-de-l-ere-de-la-monnaie-numerique).

Democratic Republic of Congo - [Ministry of ](https://numerique.gouv.cd/actualites/que-retenir-de-la-crypto-monnaie-en-afrique-et-specifiquement-en-republique-democratique-du-congo-kxa5a8)[Digital](https://numerique.gouv.cd/actualites/que-retenir-de-la-crypto-monnaie-en-afrique-et-specifiquement-en-republique-democratique-du-congo-kxa5a8).

Republic of Congo - [Ministry of Posts and Telecommunications](https://postetelecom.gouv.cg/reflexion-sur-les-cryptomonnaies/).

---

## [118] 2022-04-17T18:12:26+00:00

- Permalink: https://t.me/tonblockchain/118
- Author: The Open Network
- Views: 54.9K

**Huobi Incubator, Kucoin Ventures, MEXC Pioneer Fund, Others Lead $250M Toncoin Ecosystem Fund
**
[toncoin.fund »](https://toncoin.fund/)

---

## [119] 2022-04-17T18:12:26+00:00

- Permalink: https://t.me/tonblockchain/119
- Author: The Open Network
- Views: 71.3K

**Technical comparison of TON with some other networks**

As of 2022, TON Blockchain remains one of the few truly scalable blockchain projects. As such, it still is the most advanced blockchain project, capable of performing millions and, if becomes necessary in the future, tens of millions of true Turing-complete smart contract transactions per second, requiring only minor internal changes. TON still remaining at the cutting edge of general-purpose blockchain technology.

[https://ton.org/comparison_of_blockchains.pdf](https://ton.org/comparison_of_blockchains.pdf)

---

## [120] 2022-04-26T12:13:44+00:00

- Permalink: https://t.me/tonblockchain/120
- Author: The Open Network
- Views: 60.8K

[@wallet](https://t.me/wallet) bot now uses the full power of the new bot API and can be added to the attachment menu.

**Videos:**
- https://cdn4.telesco.pe/file/a3a7667f0f.mp4?token=ONSrZFQpFGelnWBvKiG-W4rCgyCgBAJaLjMR_mbhGA7rQmP55LTxlyQNTTGWoWKUhiYkX_n4Tm9pQgX7OxtqeadgvzUm7v3KeKKawpXA_9cjg3HD5_K4CZiYJzk6cyRmMRg_4sA270PEewPqdt5uaN19OB1Ty44cJBI3e1lHJppvLxqtHfjiLEE1at7nG1k1b3I2GdifUUOBoHpu5L8NpH3eYSUL_OYPlDmEdfZjhQAXHBCzgAeV1JgGgxkD4yRPQNHngcJ-vEIhBszXKd0nqP7Z4bppjS84jA7bb3NUGPgaNZTG9EXmesKArdnx0cDbY0QIWuU7RHwsLC7sqzHjgA

---

## [121] 2022-04-29T07:01:27+00:00

- Permalink: https://t.me/tonblockchain/121
- Author: The Open Network
- Views: 59.9K

We welcome independent developers who are working on the implementation of the TON ADNL transport protocol in different programming languages, in addition to the original C++ implementation:

TypeScript - [adnl-js](https://github.com/tonstack/adnl-js)

Rust - [adnl-rs](https://github.com/tonstack/adnl-rs)

Golang - [tonutils-go](https://github.com/xssnick/tonutils-go)

Kotlin - [ton-kotlin/ton-adnl](https://github.com/andreypfau/ton-kotlin/tree/main/ton-adnl)

We recommend to keep eye on them and join the development if you are interested.

The ADNL protocol and the built-in support for Merkle Proofs in TON - these technological solutions bring us closer to a full-fledged decentralized Internet. We will talk about this in more detail in the future articles.

---

## [122] 2022-05-13T14:22:46+00:00

- Permalink: https://t.me/tonblockchain/122
- Author: The Open Network
- Views: 39.5K

We remind you that the recommended RAM size for the validator is 64 GB, the minimum is 32 GB. 

If you are validating on hardware with less then 32 GB RAM - **immediately** stop sending new election requests (type command `set stake 0` in mytonctrl), you should not participate in subsequent elections until you improve the hardware.

This is a **mandatory** requirement for network stability.

---

## [123] 2022-05-14T11:49:07+00:00

- Permalink: https://t.me/tonblockchain/123
- Author: The Open Network
- Views: 40.9K

MEXC now [supports](https://support.mexc.com/hc/en-001/articles/6509135196825-MEXC-Now-Supports-Toncoin-TON-Mainnet-) Toncoin (TON) mainnet.

**Photos:**
- https://cdn4.telesco.pe/file/KTElWMZD3fuLjMMpFhgFIAmKAgUaeD8yo_Y5RlGWpvO9A-5p4qoW_ZgVqPrirLk3FSG4i-cBWdO8twUkWH69dyqT3i9qZ7FqUODoI8ZGc61_KZZSbG-7N_cA0u87zzW-eeehyc1OTxS5YDE6kzWRSuliTFToyfkK6q_7W2BDcZ4LKNzi2v2aYPENHqoHk9oNtI-UQxClPz2UB4oxUT6cRVdnT3xxMd9x6mazB5wdMHtUm-LYJzNuDUgtSfUfmvrA7CGCd5v7zj5OF2nSkWm_6SXsYoFsZgSY2cYa6LB9vQsPHIDdalBM7MpB5z4vMLWd6_ChwUYByMrobfKfRy1FmA.jpg

---

## [124] 2022-05-14T15:53:52+00:00

- Permalink: https://t.me/tonblockchain/124
- Author: The Open Network
- Views: 37.9K

The token data standard [TIP-64](https://github.com/ton-blockchain/TIPs/issues/64) has been expanded, it is suitable not only for NFT but also for Jettons.

Please use the recommended token metadata fields.

---

## [125] 2022-05-14T16:08:38+00:00

- Permalink: https://t.me/tonblockchain/125
- Author: The Open Network
- Views: 40.6K

Please note that the development of TON is fully migrated to the original [https://github.com/ton-blockchain](https://github.com/ton-blockchain). 

Use sources and submit PR's to this repository.

---

## [126] 2022-05-18T09:30:00+00:00

- Permalink: https://t.me/tonblockchain/126
- Author: The Open Network
- Views: 31.4K

**FunC programming language update**

Useful update of the FunC programming language for writing smart contracts for TON.

[List of new features »](https://telegra.ph/FunC-Update-202205-05-17)

---

## [127] 2022-05-18T09:30:00+00:00

- Permalink: https://t.me/tonblockchain/127
- Author: The Open Network
- Views: 39.3K

**TON Core Update 2022.05
**
**Node**

— Improved persistent state serialization - optimized memory usage; nodes start the serialization process now not at the same time.

— Improved peer-to-peer network stability and DDoS resistance.

— Improved lite-server DoS resistance for running get-methods.

— Initial node synchronization improved - nodes with low network speed and/or bad connectivity will synchronize faster and consistently.

— Fixed some theoretical edge cases in TVM arithmetic operations related to big numbers (2**63+).

— RocksDB updated to a newer version.

**TonLib**

— Support smart contract libraries.

— Get-methods completely fill `c7` register.

— Get-methods support `Slice` arguments.

— Improved messages listing for transactions.

— Added extended block header params.

— Added `getConfig` method.

**Misc**

— Fixed rarely manifested bugs in `Asm.fif`.

— Lite-client supports base64 remote public key as CLI argument.

Thanks to all the contributors who participated in this update!

---

## [128] 2022-05-18T09:30:35+00:00

- Permalink: https://t.me/tonblockchain/128
- Author: The Open Network
- Views: 44K

Mainnet validators please update your software to [new version](https://t.me/tonblockchain/127): 

— in **mytonctrl** run `update` then `upgrade https://github.com/ton-blockchain/ton`.

— if you don't use **mytonctrl** please manually rebuild code from master branch of [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton).

Update your validators one by one, don't update all at the same time.

---

## [129] 2022-05-25T21:40:55+00:00

- Permalink: https://t.me/tonblockchain/129
- Author: The Open Network
- Views: 38.4K

**New testnet**

Developers usually test their products on a testnet (a separate network where coins have no value) before launching them on the mainnet.

This week TON testnet was completely [relaunched](https://t.me/tonstatus/18) on powerful hardware to increase its stability and responsiveness. Testnet API, explorers, wallets and other testnet infrastructure have been updated.

We launched the previous testnet exactly a year ago, when there were not so many developers. We are glad to see that now the number of TON developers has increased greatly, so that the previous testnet, launched on rather weak hardware, has ceased to cope with the load.

---

## [130] 2022-05-25T21:40:55+00:00

- Permalink: https://t.me/tonblockchain/130
- Author: The Open Network
- Views: 43.7K

We remind you that you should follow the [@tonstatus](https://t.me/tonstatus) channel if you:

— TON network validator;
— developer of TON service;
— Toncoin is integrated into your product;

The [@tonstatus](https://t.me/tonstatus) channel posts important technical announcements and network updates.

---

## [131] 2022-05-28T15:48:21+00:00

- Permalink: https://t.me/tonblockchain/131
- Author: The Open Network
- Views: 50.3K

**Nominator pools**

In the Q1 of this year, the first TON staking pools (nominator pools) were [launched](https://t.me/tonblockchain/111) by the TonWhales team on their own smart contract. At the moment, users have staked more than **7.5M** Toncoins in these pools!

Today we present an alternative version of the pool [smart contract](https://github.com/ton-blockchain/nominator-pool). This smart contract is natively [integrated](https://github.com/ton-blockchain/mytonctrl/blob/master/docs/en/nominator-pool.md) into the **mytonctrl** tool used by validators.

This means that now any validator can easily run their own pools and users can stake Toncoins into these pools.

The [tonvalidators.org](http://tonvalidators.org/) catalog has been created where validators can publish their pools, and users can find the most suitable pool for a stake.

[tonvalidators.org ](https://tonvalidators.org/)[**»**](https://tonvalidators.org/)

---

## [132] 2022-06-04T23:20:44+00:00

- Permalink: https://t.me/tonblockchain/132
- Author: The Open Network
- Views: 48.2K

[https://telegra.ph/NFTs-are-our-way-to-fight-for-property-rights-06-04](https://telegra.ph/NFTs-are-our-way-to-fight-for-property-rights-06-04)
  *
  Telegraph

**Link preview:**
- [NFTs are our way to fight for property rights](https://telegra.ph/NFTs-are-our-way-to-fight-for-property-rights-06-04)
  - NFT technology is only beginning to tap into its full potential. Today, a lot of people view NFTs exclusively as a speculation tool: They want to buy some token representing art at a low price and then sell it at a higher price. But if we delve deeper, we’ll…

---

## [133] 2022-06-09T10:43:14+00:00

- Permalink: https://t.me/tonblockchain/133
- Author: The Open Network
- Views: 41.7K

[@mobile](https://t.me/mobile) - anonymous international **eSIM** that you can purchase with TON.

**Photos:**
- https://cdn4.telesco.pe/file/JqWtWfuJgpbFq2ErAEgZtjwMlZbnQd8bEQgiok-mrqGDnzAjYQqcsnZWx78xXD32VQmf795Jz7AlTUn7JRTjkFrQJGTkSb3Fb9tLEOjHxcnrtEaMT3lvpiZtMs58FvcFn9l3rxWkbE7FPJG0xuMa6Uc_hbOAn3iC1yRqWOXqCTW18vBxWyyQNp4XhuH2UKCkExc4pJSWqu7OxEGyrhR5KCs9wrqPctDlLoWfdnrr9fcxHzNIet6GrfJClWDA7kdgHZCcJUjDyHx9pfUapxQwJiT_2zgDvB3RF40LFWc9goI8wFQOI3NKMLwz_AEOGKrBUQActCa_JapQR-kpa4OGdg.jpg

---

## [134] 2022-06-17T12:13:23+00:00

- Permalink: https://t.me/tonblockchain/134
- Author: The Open Network
- Views: 40.2K

**IntelliJ IDEA Plugin for FunC language gets major update**

With the new update, the plugin has overtaken the Solidity plugin in terms of functionality and convenience:
 
— Syntax highlighting;

— Code completion;

— File templates;

— Goto declaration;

— Code formatting;

— Support not only FunC but also Fift and TL-B;

— Support for the latest FunC language [updates](https://t.me/tonblockchain/126);

The source code is [open](https://github.com/ton-blockchain/intellij-ton). We thank the author **andreypfau** for the excellent work.

[Install FunC Plugin from IntelliJ catalog »](https://plugins.jetbrains.com/plugin/18541-ton-development)

Happy coding **❤️***

---

## [135] 2022-06-17T12:24:51+00:00

- Permalink: https://t.me/tonblockchain/135
- Author: The Open Network
- Views: 42.1K

**Hack-a-TON**

Online Hack-a-TON with a prize fund of **40,000 TON** will start on **July 1** and will run for only **48 hours**.

Unite in teams of up to 4 people and get ready for a brainstorm and the implementation of MVP in JavaScript.

More on [@toncontests](https://t.me/toncontests).

---

## [136] 2022-06-21T12:55:14+00:00

- Permalink: https://t.me/tonblockchain/136
- Author: The Open Network
- Views: 41K

**Today’s Cloudflare **[**outage**](https://www.theverge.com/2022/6/21/23176519/cloudflare-outage-june-2022-discord-shopify-fitbit-peleton)** brought down a large portion of the internet**

Luckily, a company that provides network services to millions of sites quickly fixed the problem.

The current internet has become quite fragile due to centralization and excessive corporate dominance. We [wrote](https://t.me/tonblockchain/46) about this earlier, predicting that the number of such incidents will only increase.

We see the future of the global network in decentralization and blockchain technologies. TON has a chance to play a decisive role in this because TON is a decentralized metacloud.

Our vision is described in more detail in this article: [https://telegra.ph/TON--The-metacloud-06-15](https://telegra.ph/TON--The-metacloud-06-15)

---

## [137] 2022-06-28T08:02:13+00:00

- Permalink: https://t.me/tonblockchain/137
- Author: The Open Network
- Views: 37.2K

**Toncoin mining has successfully ended**

Today, the last Toncoin was mined, signaling the successful closure of TON’s initial distribution. 

Read all about this major event:
[https://telegra.ph/Toncoin-mining-has-successfully-ended-06-17](https://telegra.ph/Toncoin-mining-has-successfully-ended-06-17)
  *
  Telegraph

**Link preview:**
- [Toncoin mining has successfully ended.](https://telegra.ph/Toncoin-mining-has-successfully-ended-06-17)
  - In July 2020, all of the available Toncoin tokens (98.55% of the total supply) became available for mining. The tokens were placed in special Giver smart contracts, allowing anyone to participate in the mining — up until today. Users mined around 200,000…

---

## [138] 2022-06-30T15:21:27+00:00

- Permalink: https://t.me/tonblockchain/138
- Author: The Open Network
- Views: 36.6K

**Introducing TON DNS**

TON DNS is a service that allows users to assign a human-readable name to crypto wallets, smart contracts, and websites.

With TON DNS, access to decentralized services is analogous to access to websites on the internet.

Read all about this new TON component: [https://telegra.ph/TON-DNS-06-30](https://telegra.ph/TON-DNS-06-30)
  *
  Telegraph

**Link preview:**
- [TON DNS](https://telegra.ph/TON-DNS-06-30)
  - TON DNS is a service that allows users to assign a human-readable name to crypto wallets, smart contracts, and websites. With TON DNS, access to decentralized services is analogous to access to websites on the internet. Your nickname on a decentralized network…

---

## [139] 2022-07-01T11:55:18+00:00

- Permalink: https://t.me/tonblockchain/139
- Author: The Open Network
- Views: 40.9K

**Introducing** **TON Payments**

TON Payments is a technology for micropayments and a micropayment channel network. It can be used for many instant off-chain value transfers between parties without network fees. Safeguards built into the system ensure that these transfers are as secure as on-chain transactions.

Read more: [https://telegra.ph/TON-Payments-07-01](https://telegra.ph/TON-Payments-07-01)
  *
  Telegraph

**Link preview:**
- [TON Payments](https://telegra.ph/TON-Payments-07-01)
  - On the TON blockchain, block time is about 5 seconds. Even with an increase in network load, that time won’t increase either. In other words, in those 5 seconds, millions of transactions can be processed. Moreover, the TON blockchain has exceptionally low…

---

## [140] 2022-07-14T17:52:29+00:00

- Permalink: https://t.me/tonblockchain/140
- Author: The Open Network
- Views: 30.1K

**Mytonctrl update**

TON has a very convenient tool for installing and maintaining a node or a validator.

Just take a server with the recommended hardware requirements and [run](https://ton.org/docs/#/nodes/run-node) one script.

The [**mytonctrl**](https://github.com/ton-blockchain/mytonctrl) tool received a big update c83a3a:

**New functionality**
— Quick installation mode using dump download.
— Nominator pool support is now in the master branch with new improvements.
— Validators can now issue certificates for liteservers.

**Improved work with wallets**
— Added support for different wallet versions (v1, v2, v3) and wallet version detecting.
— Import & export wallet by address and private key.
— Now no restart is required to apply changes to wallets.

**Stats improvement**
— More info in the status command and more accurate calculation of indicators — e.g., TPS.
— Display of past elections, validators, and complaints.
— Improved telemetry (disks iops, network pps, uname, memory, swap).

**Misc**
— Refactoring.
— Miner removed.

Thank you to **igroman787**, the permanent maintainer of mytonctrl.

---

## [141] 2022-07-14T17:52:29+00:00

- Permalink: https://t.me/tonblockchain/141
- Author: The Open Network
- Views: 35.2K

**Results of the first-ever Hack-a-TON!**

The hackathon’s goal was to show the best application of [TON payments ](https://t.me/tonblockchain/139)technology in 48 hours. We received over **80** submissions. 

The teams made MVPs showing the use of TON Payments in various areas — social networks, API, streaming, calls, advertising, games, internet traffic, decentralized finances, and more. The ideas are so cool that we decided to double the prize pool.

It was also the first TON programming event with an offline part — the participants could gather in Prague.

See the results on the [@toncontests](https://t.me/toncontests) channel.

**Photos:**
- https://cdn4.telesco.pe/file/vruMEDX3g1qIGyQALtNhoA0b-gS-6H3hPZtriF30c4sP_-rZH6u0yQ4woXOUB3l5iIXdcmTPjjZrFjTusDFeBGaU6s6KTnuJ-rMua-39SuC6sOsdaEgWagt6mdF-SB8iWkdbUHVaz7mW1HnwSxdVXA_QvHwB170h2fTmzzUkTdWcFJuPcLFH0N7pWgHQS1DemMZB71H_mzuWovSjMpPvyXnriZuMRlhKVoFc05UTkMZoJG68Uh0nbdsKv04vjEdf-LpVdYg33kxLjoL5LIsJQcRVdvPeMopsDRANF08o8gstLpq5T81XZ5jCBQMgWaD4r-ikGGNbUYO3bc9qRhG-pw.jpg

---

## [142] 2022-07-14T17:52:29+00:00

- Permalink: https://t.me/tonblockchain/142
- Author: The Open Network
- Views: 45.3K

Last week, we were pleased to announce that TON has become a sponsor of the competitive programming platform [Codeforces](https://codeforces.com/).

Codeforces is a popular platform where tens of thousands of the world’s strongest programmers compete in various competitions at the highest level.

More than **11,000** programmers took part in our last event, [CodeTON](https://t.me/tonblockchain/108).

In total, more than **1.5 million **people are registered on the site.

**Photos:**
- https://cdn4.telesco.pe/file/YQ7QcfE62QkCk_otCLHCIBXUwbogiiTh7T8lbzG1_vFdhhXQ2mk1K2d9sSSCoV5r8cyKRBC0RgwjOxfqndk8afJ10x_r9V65YooQZUgsYdvMKPx3i98z_RP0NRQ4NHpBUzWR1SNYAvZmTXdJbb9xl5JwtizugPTRu4MuPzCUimVBY94eabFJxWOpPZIxtXjstaYrK3GzsrYgO30QXRJhauacpj0e0RFLQV5gF538gVyQoRhPPrDiW1MgvruMOojFExg_RXZqHgBtUn9tHtddc0KdGAJATYBKtJMVKXuhOj7QOt6wnnyYzgIUYddn1_FfKtCgzoX5QzIz9EnFhbvpBA.jpg

---

## [143] 2022-07-29T13:13:37+00:00

- Permalink: https://t.me/tonblockchain/143
- Author: The Open Network
- Views: 35.8K

The TON DNS auction starts tomorrow, **July 30**,** at 9:00 UTC** on the [dns.ton.org](http://dns.ton.org/) site.

Network validators, on Aug. 2, it is planned to set the root DNS contract in the network config by voting — all validators need to participate.

---

## [144] 2022-07-30T09:04:23+00:00

- Permalink: https://t.me/tonblockchain/144
- Author: The Open Network
- Views: 38.4K

The **TON DNS** auction has [started](https://dns.ton.org/)!

**Photos:**
- https://cdn4.telesco.pe/file/nu8RuuWxxLJa-Tx0Jy8bwiQiSe2CpCU-TtbdfWsqRYL6Pi1wF8dYyVCDpXQq7NFflTgWspb3dPeZ0hK2TtyDeLsdzPR360KrKMv0KTeH_uq9tY7zXJynhZ4CeaW7T-0nWH_5LVMXUJXZMHOAMAQ_uKJyGUY06-O0fVIg0zeoxnpZK2uLRU2MM3dJsowKnEM65t79NX0vYV_yuS3_AXT6MkJHPLgZQsYvwLxYmbt5JdAep8jyQwFTHoUYcRn95xSiH2IbyWevmWFu9NxI8rqQO2wbA23qnItA_rxngFJE1GfBttZIfob3OO2nKjCUu1AXIY1zeyLh7Kw1OsKOxsslDg.jpg

---

## [146] 2022-08-05T14:44:17+00:00

- Permalink: https://t.me/tonblockchain/146
- Author: The Open Network
- Views: 35.2K

**TON Crosschain Roadmap**

One of the overall missions of TON is to unite blockchains and the internet into a single network.

We’d like to share with you what projects are working toward this goal at the moment:

**TON Sites and TON Proxy**

We plan to launch the TON Sites and TON Proxy components at the end of this quarter. In addition to the two components, we plan to provide the capability of smart contract communication with sites and vice versa. 

**Crosschain NFT transfers**

The [XP.Network](https://xp.network/) dev team is about to complete its work on a multichain bridge via which users will be able to transfer NFTs between TON and multitude of blockchains, including Ethereum, Polygon, BNB Chain, Tron, Tezos, Elrond, Algorand. Decentralized oracles will keep the bridge running.  

**Crosschain token transfers**

The [RSquad](https://rsquad.io/) dev team has been working on a bridge through which users can transfer any token (altcoins) from Ethereum and BNB Chain to TON and back. This new functionality will be added to [ton.org/bridge](http://ton.org/bridge) and will operate by a similar principle.

**Rainbow bridge with EVM-compatible blockchains (Ethereum, BNB Chain, and others)**

Decentralized oracles control transfers between networks at the moment. This common approach is a stable and safe solution. However, we plan on taking it to the next step and making it ideal: All operations will occur only through smart contracts without any intermediaries.

To make this happen, new tools need to be created so that the smart contracts from other blockchains can verify the authenticity of TON blockchain’s data and vice versa. We and blockchain developers from the [RSquad](https://rsquad.io/) have come together to work on Solidity code that will be able to verify TON blocks and transactions. After that, we plan to make FunC code that can verify EVM blocks and transactions.

The project has grand aspirations, but the Rainbow Bridge solution will fully launch in 2023. However, the developers plan on publishing results, code, and tools intermittently.

**Toncoin bridge update**

On the [ton.org/bridge](http://ton.org/bridge) site, the ability to transfer Toncoin among Ethereum, BNB Chain, and TON has been available for over a year already. In that timespan, a large number of crypto transfers from users has been processed. A UI update is in the pipeline to make everything even more convenient for users. Thank you to developer **Zavtramen**.

---

## [147] 2022-08-08T12:24:15+00:00

- Permalink: https://t.me/tonblockchain/147
- Author: The Open Network
- Views: 36.4K

**TON Core Update 2022.08**

**Node**

— Optimized memory usage for blockchain state serialization.

— Improved performance of internal database.

— Updated dependencies: abseil-cpp and crc32.

— Added detailed stats on ADNL network usage.

— Improved auto-builds for wide range of systems.

— Extended error notes for unacceptable external messages.

— [Catchain DoS protection](https://github.com/ton-blockchain/ton/blob/master/doc/catchain-dos.md).


**FunC**

— Allowed unbalanced code branches (not every branch should `return`).

— Corrected inline functions behavior.

— Allowed ifelse statements.

Validators please update your software as described [here](https://t.me/tonstatus/23).

Thanks to all the contributors who participated in this update!

---

## [148] 2022-08-24T23:48:45+00:00

- Permalink: https://t.me/tonblockchain/148
- Author: The Open Network
- Views: 26.6K

**Introducing a major **[**@wallet**](https://t.me/wallet) **update: The popular service now has a new user-friendly interface.**

On the home screen, you can see your balance, transaction history, and buy or send Toncoin. You can now buy Toncoin in just a couple of taps without leaving Telegram — you only need to link a bank card to the service once.

There’s no need to chat with the bot to use the wallet: simply add [@wallet](https://t.me/wallet) to the Attachments Menu, start the bot, and send Toncoin directly within chats with your contacts.

If you are still not familiar with the service, right now is a great chance to get to know it: There’s no service fee for purchasing Toncoin, and the exchange rate is as close as possible to the market price.

The developers continue to improve the service, equipping it with better features and making it one of the most integral parts of the TON ecosystem.

Join the [Wallet News](https://t.me/wallet_news_en) [channel](https://t.me/wallet_news_en)  to stay up-to-date with all the latest news.

**Videos:**
- https://cdn4.telesco.pe/file/0e74436f09.mp4?token=s9S_lL80E5XXZjXmEJS08MrxeKcov_vhBaaNFyrmCclCwMbxM9Jdn5Otv6wMtfU4gDuglZsOV2cLhvZTShXebx8X93HlBUkcpsp9ZiS9t_TlKyj-dm2O4I0e3Bnur-GHFZTzvl2kqht9D-QbZRe_sqNhBLitQLHD5eVRprSJXZnQF-6jYZR9UBS2JHZQt6H4WR63HbIBXdZ4DbdYDqF0mScJl15ziUG-cBqmJ3wJrHqP6pUxUz3hsj3IGfSKyrcn0pBnkHi50nfYuBKxpA73wXtwZJD-tQdBGaqGFAw8-5T5K7weVwvlQFJ9-8-ubb-koFgrwaAHubPm33DTnbWC3Q

---

## [149] 2022-08-24T23:48:45+00:00

- Permalink: https://t.me/tonblockchain/149
- Author: The Open Network
- Views: 27.3K

I'm really impressed by the [success of the auction](https://t.me/toncoin/522) TON recently conducted for their domain/wallet names. [Wallet.ton](http://Wallet.ton/) was sold for 215,250 Toncoin (~$260000) while [casino.ton](http://casino.ton/) was sold for ~$244000. 

If [TON](https://t.me/durov/175) has been able to achieve these results, imagine how successful Telegram with its 700 million users could be if we put reserved @ usernames, group and channel links for auction. In addition to millions of catchy [t.me](http://t.me/) addresses like [@storm](https://t.me/storm) or [@royal](https://t.me/royal), all four-letter usernames could be made available for sale ([@bank](https://t.me/bank), [@club](https://t.me/club), [@game](https://t.me/game), [@gift](https://t.me/gift) etc). 

This would create a new platform where username holders could transfer them to interested parties in protected deals – with ownership secured on the blockchain via NFT-like smart-contracts. Other elements of the Telegram ecosystem, including channels, stickers or emoji, could later also become part of this marketplace.

When it comes to scalability and speed, TON probably has the best technology to host such decentralized sales. Our team can write bullet-proof smart contracts for TON (since it was us who invented its smart-contract language), so we are inclined to try out TON as the underlying blockchain for our future marketplace. 

Let's see if we can add a little bit of Web 3.0 to Telegram in the coming weeks.

---

## [150] 2022-08-24T23:48:45+00:00

- Permalink: https://t.me/tonblockchain/150
- Author: The Open Network
- Views: 35.1K

Step by step, TON is moving forward to become truly mainstream so that ordinary users can enjoy the security, transparency and benefits of decentralized technologies.

In fact, TON is the only modern blockchain project that is really moving in this direction.

The contribution of each member of the community brings us closer to complete this historical mission, just as the development of the internet was the collective work of various enthusiasts.

---

## [151] 2022-08-25T12:39:53+00:00

- Permalink: https://t.me/tonblockchain/151
- Author: The Open Network
- Views: 44.7K

**New tutorials for TON developers
**
— 10 FunC [lessons](https://github.com/romanovichim/TonFunClessons_Eng) from basic to advanced.

— [TON Hello World](https://society.ton.org/ton-hello-world-step-by-step-guide-for-writing-your-first-smart-contract-in-func) and other articles on [society.ton.org](https://society.ton.org/#get-started).

— Participating in [@toncontests](https://t.me/toncontests) is a great way to learn TON. Also, for learning purposes, you can study [past contests](https://ton.org/docs/#/func/overview?id=contests).

— [FunC quiz](https://t.me/toncontests/60) for selfcheck.

— New “TON” tag on [stackoverflow](https://stackoverflow.com/questions/tagged/ton).

— Updated [documentation](https://ton.org/docs/#/smart-contracts/).

We also want to remind you that we are proud to be the sponsors of [codeforces.com](https://codeforces.com/) and that we have a [chat](https://t.me/tondev_eng) for developers.

---

## [152] 2022-08-31T19:01:11+00:00

- Permalink: https://t.me/tonblockchain/152
- Author: The Open Network
- Views: 42K

**TEPs**

[TON Enhancement Proposals](https://github.com/ton-blockchain/TEPs) is the new home for current and future The Open Network standards, which replaced [TIPs](https://github.com/ton-blockchain/TIPs) on GitHub Issues.

The process of studying the current standards, suggesting and discussing new standards has become more convenient.

Thanks to **hacker-volodya **for his help in creating TEPs.

---

## [153] 2022-09-06T19:03:10+00:00

- Permalink: https://t.me/tonblockchain/153
- Author: The Open Network
- Views: 47.8K

Developers, please note that there have been additions to the standards:

— Added `forward_payload` format to [NFT](https://github.com/ton-blockchain/TEPs/blob/master/text/0062-nft-standard.md#forward_payload-format) and [Jettons](https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md#forward_payload-format) standards.

— Added note about data encoded in TL-B schema in [Token Data](https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md#data-serialization) standard.

---

## [154] 2022-09-07T15:03:23+00:00

- Permalink: https://t.me/tonblockchain/154
- Author: The Open Network
- Views: 40.3K

Toncoin is [listed](https://www.huobi.com/support/en-us/detail/24916760243384) on **Huobi Global**.

Please note that [toncoin.fund](http://toncoin.fund/), a $250-million fund and the first in the TON ecosystem, was [founded](https://t.me/tonblockchain/118) with the help of investment company [Huobi Incubator](https://www.huobi.co.ma/huobiincubator/) and Huobi Group.
  
  HTX
  *
  HTX to Open Trading for TON at 12:00 (UTC) on September 7

**Link preview:**
- [HTX to Open Trading for TON at 12:00 (UTC) on September 7](https://www.huobi.com/support/en-us/detail/24916760243384)
  - HTX serves its 10 million+ users worldwide with secure and stable trading services. Here at HTX, you can buy Bitcoin, Ethereum, Dogecoin, SHIB, and over 500 quality cryptocurrencies anywhere, anytime.

---

## [156] 2022-09-30T12:59:01+00:00

- Permalink: https://t.me/tonblockchain/156
- Author: The Open Network
- Views: 45.3K

**Introducing TON Sites, TON WWW & TON Proxy**

Are you ready for the real Web 3.0?

Today, we’re opening the TON Network for users and launching TON Proxy and TON Sites with integrated TON DNS — decentralized, secure, and reliable services that surpass the familiar World Wide Web in terms of ease of use.

[https://telegra.ph/TON-Sites-TON-WWW-and-TON-Proxy-09-29-2](https://telegra.ph/TON-Sites-TON-WWW-and-TON-Proxy-09-29-2)
  *
  Telegraph

**Link preview:**
- [TON Sites, TON WWW, and TON Proxy](https://telegra.ph/TON-Sites-TON-WWW-and-TON-Proxy-09-29-2)
  - The TON project is more than just a blockchain — it also has a unique network technology. First of all, network protocols were created specifically for the TON blockchain so that nodes could communicate with one another and exchange data. Currently, the network…

---

## [158] 2022-10-06T07:15:04+00:00

- Permalink: https://t.me/tonblockchain/158
- Author: The Open Network
- Views: 38.2K

**TON Core Update 2022.10**

**Node**

— Added extended block creation and general perfomance stats gathering

— Forbidden report data on blocks not committed to the master chain for LS

— Fixed bugs related to invalid TVM output (c4, c5, libaries) and non-validated network data; avoided too deep recursion in libraries loading

— Fixed multiple undefined behavior issues

**FunC 0.3.0**

— Introduced multi-line asms with quotes

— Bitwise operations for constants

— Allowed duplication of identical definition for constants and asms 

**Misc**

— Added build of FunC and Fift to WASM

— Improved debug in TVM

— Introduced new tonlib methods: `sendMessageReturnHash`, `getTransactionsV2`, `getMasterchainBlockSignatures`, `getShardBlockProof`, `getLibraries`.

Thanks to all the contributors who participated in this update!

Validators please update your software as described [here](https://t.me/tonstatus/33).

---

## [160] 2022-10-22T16:08:43+00:00

- Permalink: https://t.me/tonblockchain/160
- Author: The Open Network
- Views: 30.2K

**The TON contest team will never let you get bored!**

Large [@toncontests](https://t.me/toncontests) are regularly held on various topics: sometimes you need to write the most optimized smart contracts on FunC; sometimes, you need to find bugs in ecosystem apps or show the best application for newly launched TON components.

[Hack-TON-berfest](https://www.tonspace.co/hacktonberfest/) is underway right now, yet you still have time to participate.

In addition, tomorrow at **09:00 UTC**, there will be a very interesting new event:

We put **30,000 TON** in smart contracts that intentionally have a vulnerability. The persons who hacks the smart contracts first will be able to steal TONs for keeps!

[More about TON Hack Challenge »](https://t.me/toncontests/80)

---

## [161] 2022-10-22T16:08:43+00:00

- Permalink: https://t.me/tonblockchain/161
- Author: The Open Network
- Views: 33K

At the after-party, we recommend you go to check the [Telegram auction](https://t.me/contest/306) smart contracts for strength.
  
  Telegram

**Link preview:**
- [Telegram Contests](https://t.me/contest/306)
  - **💎*** Smart Contract Cracking Competition

Prize fund: Up to $100,000 
Deadline: 18:00 on October 25th (Dubai time)
Who can participate: Everyone

The Task is to identify potential vulnerabilities and issues in the smart contract that would form the basis of…

---

## [162] 2022-10-24T00:44:23+00:00

- Permalink: https://t.me/tonblockchain/162
- Author: The Open Network
- Views: 35.3K

We are pleased to announce that the token bridge is in the final stages of testing.

Using this bridge, users can transfer any ERC-20 or BEP-20 tokens (for example, USDC or USDT) originally created on Ethereum or BNB Smart Chain to the TON Blockchain, with the ability to return them back.

The transferred tokens will be represented on TON as regular Jettons so that TON services, such as DEXs, will be able to work with them without any additional modifications.

You can get acquainted with smart contracts and testnet version:

[Solidity smart contracts »](https://github.com/ton-blockchain/token-bridge-solidity)

[FunC smart contracts »](https://github.com/ton-blockchain/token-bridge-func)

[Testnet bridge »](https://ton-blockchain.github.io/token-bridge/?testnet=true)

---

## [163] 2022-10-27T16:56:59+00:00

- Permalink: https://t.me/tonblockchain/163
- Author: The Open Network
- Views: 27.3K

While other blockchain projects seem frozen in the crypto winter, TON continues to move forward consistently.

[Epic releases this month](https://t.me/tonblockchain/164) **⬇️***

**Photos:**
- https://cdn4.telesco.pe/file/Ylc2Val4vpQtTq4FJRr5UpnJP_JJQYnOanf37K2cyMDwy6bjLdBDfHUW3CCaTfUjloQ_tRvqgE-G1VlvtJVecKRurI-dQ4u-uHx_V9N-QGFCEoeeh19GFiMG8M1nYyDivhzqYa4tBaCgbe65YPRgV2QH2_shuK6iyURdQM0dZMnkZUA_l1qexQzdFlIDyHDkDRKXiAfpDrDyaPNeY4n4kruMaLgCPCE-u3tph3eRRfGWXx4K0RpxaoyTHzJ7MkTo4azy9AsRbOKvQ1qz3jJDTC6cnLVHHq6EnLBqsXjThwMExBuJ-zkH-rK-74xIc4HUrNj2peaCamqnGMD4q7XQ-w.jpg

---

## [164] 2022-10-27T16:56:59+00:00

- Permalink: https://t.me/tonblockchain/164
- Author: The Open Network
- Views: 30.9K

**The launch of** **a P2P exchange in the **[**@wallet**](https://t.me/wallet)** bot
**
The previous [@wallet](https://t.me/wallet) update [introduced](https://t.me/toncoin/400) a simpler UI that allows users to send coins directly in the messenger, which is the most convenient way in the world to send crypto to someone. 

This month, [@wallet](https://t.me/wallet) launched a P2P exchange — users can now directly buy and sell cryptocurrency to and from one another.

**Videos:**
- https://cdn4.telesco.pe/file/9cfa08a58a.mp4?token=RTTVU6K6HXeH9jHywe9CW1V7NV4aHLmP4Ik7UiKsf8LtuFVAhyzlQKlHbnNfZES5wOMaXsRN8U0sxzzJnjPKYbLIoMgR58ULrGEZRnlF8Yw8B-wXTjSwWEH2XRRqhgXe8MUOG0hqVckQWFvWC_PxF8FK6C0vw1lmveIeqCbjo-ySWWiafKgU68M1OUcx1QuNNePAYzSmOMwHNWYNga-43FBEcb3Zl67jHqlyO7AG9x9RqS8LysoR-ygAyFrQCDk4eQ5b1B9aP7BmTNQBroBVj4dl1tZV13QeDdHGtl6oY6McmcJKfGfTkgtV6ZWlXFarLilevCv24mNZOA1hnDUXVg

---

## [165] 2022-10-27T16:56:59+00:00

- Permalink: https://t.me/tonblockchain/165
- Author: The Open Network
- Views: 32.6K

**Toncoin gets listed on KuCoin!**

[https://www.kucoin.com/news/en-toncoin-ton-gets-listed-on-kucoin](https://www.kucoin.com/news/en-toncoin-ton-gets-listed-on-kucoin)

**Photos:**
- https://cdn4.telesco.pe/file/JiPhg6kbasgMaogMX-EQMDRCdQzqyTu5vQKEkwoHuvrkBRSu_7ELia0gyvNaX3PTNSkZ-NmoPGkTlyLuDOPfw2zH7sZKl-87hBHGcFXEnoDch3GmnijWGyYIoOKYEPrWPaLdRSi43I6iY9tYT-71Wng3zb0ihRI_9UrsvNO1DnSYqwIksgmfxLiYEYnACSrAgXYOhJG01XMCtdti8QOXs6qy8Gv7P6EggGVswGqkmy1ixwDC-rljP-5prIhWmW4wTvWBPI2COwwOSxOV7YyOE7FAQWKoDzXgcUGoNCkhayceuCWqGg3oCfAZzY40fB8hNvRXVWnuUbwEHWPdG9HMEw.jpg

---

## [166] 2022-10-27T16:56:59+00:00

- Permalink: https://t.me/tonblockchain/166
- Author: The Open Network
- Views: 41.3K

**The launch of** **an auction** **of** **Telegram usernames on the TON blockchain
**
Now you can purchase a beautiful [Telegram username](https://t.me/username/10) with Toncoin, which will be assigned to you on the TON blockchain.

Users can put their usernames up for sale or auction on [fragment.com](http://fragment.com/) or a little later on other marketplaces, such as [getgems.io](http://getgems.io/) or [disintar.io](http://disintar.io/).

**Photos:**
- https://cdn4.telesco.pe/file/iBpec8Ng5Nn9rySeT3HZtdtgLPPH11Yxszrikm4bKH84UtLWF-n7_ZZbuyMz8be7zXB3xCrAgzTsV2NgG2jJuimOMd581QbZfzzzFWiSoHRna1X49lr1uSVlgM4C_WYW-HADdfgezQhS9MCelKnZx5RhpFLXdQ4US1Jy3TyW3A3HPB_SMu0M7OLAPrz4rLOEW6huj1D3KuyQ29RBXWQPx3rYctifn6GmGmaGIMA6TexW-Jb16aBMjUOFMkK3IXMuPheuBbrtERfigsetZo625av_kHD148mnYf484JCni2jtOPj3-FMFis1Zs0ePUwY5eGcBkA6M4EnW0fqy283gNA.jpg

---

## [167] 2022-10-27T17:43:03+00:00

- Permalink: https://t.me/tonblockchain/167
- Author: The Open Network
- Views: 63.3K

**Telegram Usernames and TON DNS
**
Given that Telegram usernames [comply](https://github.com/TelegramMessenger/telemint) with [TON DNS](https://github.com/ton-blockchain/TEPs/blob/master/text/0081-dns-standard.md) standard, we consider it a great idea to add the "[t.me](http://t.me/)" domain zone to the TON DNS root smart contract.

Almost all TON wallets and apps allow you to enter a ".ton" domain instead of a wallet address.

After updating the root TON DNS, it will be possible to enter a Telegram username into TON apps in the same way as ".ton" domains. In other words, you will be able to send Toncoins to "any.[t.me](https://t.me/example)" address. The TON apps themselves will not require modifications.

Since the blockchain configuration can only be changed by validator voting, we’re scheduling a network vote for this proposal on **Oct. 31** **at 12:00 UTC**. Validators, please be ready to send your vote at this time. Detailed instructions will be posted later.

---

## [168] 2022-10-31T12:00:24+00:00

- Permalink: https://t.me/tonblockchain/168
- Author: The Open Network
- Views: 43.7K

**Vote to update the root DNS smart contract**

Network validators, please vote for this proposal as described [here](https://t.me/tonstatus/37).

---

## [169] 2022-11-02T11:24:32+00:00

- Permalink: https://t.me/tonblockchain/169
- Author: The Open Network
- Views: 44.3K

The voting was successfully completed, the root TON DNS smart contract was updated.

---

## [170] 2022-11-15T14:26:50+00:00

- Permalink: https://t.me/tonblockchain/170
- Author: The Open Network
- Views: 43.3K

**TON Foundation x CertiK
**
[CertiK](https://certik.com/) is a well-known and highly sought-after company in the blockchain industry that is professionally engaged in searching for vulnerabilities and checking smart contracts, services, and blockchains for security.

This spring, the TON Foundation team began massive work with CertiK to check the TON blockchain’s core code and the main system services and smart contracts.

The first public results are now [available](https://www.certik.com/projects/the-open-network) on the company’s website. The “Audits” section has also appeared on the Toncoin page on [CoinMarketCap](https://coinmarketcap.com/currencies/toncoin/).

At the moment, audit reports covering the TON core (catchain), TON system smart contracts, and smart contracts of vesting wallets have been published.

The audit has confirmed how bulletproof TON is, and non-critical bugs were discovered and promptly fixed by the TON Foundation team.

In the future, the remaining parts of the audit will be published.

In the course of their work, specialists from CertiK studied the TON blockchain and the FunC smart contract programming language, which means that now other projects and products based on TON will be able to order audits from CertiK.

This is excellent news for the ecosystem, TON projects, and the industry.

Interaction with such professional auditing companies is an essential addition to our open [Security Bug Bounty Program](https://github.com/ton-blockchain/bug-bounty).

---

## [171] 2022-11-16T15:29:33+00:00

- Permalink: https://t.me/tonblockchain/171
- Author: The Open Network
- Views: 53.2K

The population of the Earth recently exceeded 8 billion people. According to the most optimistic estimates, only a few percent of the population have ever used a crypto wallet. TON has all the prerequisites to change this and become a truly massive blockchain network.

In a new article for the developer community, we will identify what has been done to date in the TON project and set out priorities for the future.

[https://telegra.ph/TON--next-steps-11-16](https://telegra.ph/TON--next-steps-11-16)
  *
  Telegraph

**Link preview:**
- [TON — next steps](https://telegra.ph/TON--next-steps-11-16)
  - To the developer community — in this article, we will identify what has been done to date in the TON project and set out goals for the future. 2021 As you know, the Telegram team designed the blockchain and the TON network, implemented the main portion of…

---

## [172] 2022-11-30T15:09:33+00:00

- Permalink: https://t.me/tonblockchain/172
- Author: The Open Network
- Views: 55.9K

The blockchain industry was built on the promise of decentralization, but ended up being concentrated in the hands of a few who began to abuse their power. As a result, a lot of people lost their money when FTX, one of the largest exchanges, went bankrupt. 
  
The solution is clear: blockchain-based projects should go back to their roots – decentralization. Cryptocurrency users should switch to trustless transactions and self-hosted wallets that don't rely on any single third party.   
  
We, developers, should steer the blockchain industry away from centralization by building fast and easy-to-use decentralized applications for the masses. Such projects are finally feasible today. 
  
It took only 5 weeks and 5 people including myself to put together [Fragment ](https://fragment.com/)– a fully decentralized auction platform. We were able to do this because Fragment is based on The Open Network, or TON – a blockchain platform that is fast and efficient enough to host popular applications (unlike Ethereum, which unfortunately remains outdated and expensive even after its recent tweaks). 
  
Fragment has been an amazing success, with 50 million USD worth of usernames sold there in less than a month. This week, Fragment will expand beyond usernames. 
  
Telegram's next step is to build a set of decentralized tools, including non-custodial wallets and decentralized exchanges for millions of people to securely trade and store cryptocurrencies. This way we can fix the wrongs caused by the excessive centralization, which let down hundreds of thousands of cryptocurrency users.  
  
The time when the inefficiencies of legacy platforms justified centralization should be long gone. With technologies like TON reaching their potential, the blockchain industry should be finally able to deliver on its core mission – giving the power back to the people.

---

## [173] 2022-12-17T13:28:11+00:00

- Permalink: https://t.me/tonblockchain/173
- Author: The Open Network
- Views: 78.6K

**An important community request to TON miners who have never used their coins

**The level of interest in TON from the open-source community has grown exponentially over the year.

One of the main challenges of 2022 was reaching a community consensus on what the circulating supply is. Today, different data aggregators show different statistics. They often use a definition that simply does not capture the uniqueness of the TON’s history. 

Therefore, we are proposing to launch a community-wide effort to determine what the community should consider dormant, inactive or uncirculating supply going forward.

Currently, the total number of inactive mining addresses with a balance of over 1 TON is 204. The total balance of these addresses is about 1.08 Billion TON. The full list of these addresses, which is public and on-chain, is made available by the independent data aggregator [TonTech](https://tontech.io/stats/early-miners).

We kindly ask all owners of these inactive mining wallets — the genesis wallets that received Toncoin directly from Givers without the history of a single outgoing transaction — to activate and make an outgoing transfer to any address on the TON network by **00:00 UTC on January 1, 2023**.

Through this community exercise, we hope to achieve greater clarity and certainty on the tokenomics of the TON network. The community has the right to know. This will remove the obstacles and hindrances faced by some contributors. We kindly ask all miners to take part in this initiative.

The data will be useful for providing a more accurate data to service providers, such as CoinMarketCap. It will remove discrepancies between different statistics.

We strongly encourage all members of the TON community to spread information about this initiative in order to reach as many participants as possible.

---

## [174] 2022-12-22T17:29:33+00:00

- Permalink: https://t.me/tonblockchain/174
- Author: The Open Network
- Views: 45.3K

The core team has finished reviewing and testing the smart contracts of the Token Bridge.

We have devoted considerable time to this because the bridge will operate with a large number of tokens, and blockchain bridges currently are the main target of hackers.

Finally, we invite you to participate in a public [contest](https://t.me/toncontests/101) to find vulnerabilities in the bridge’s smart contracts with a prize pool of **$50,000**.
  
  Telegram

**Link preview:**
- [TON Contests](https://t.me/toncontests/101)
  - Token Bridge Smart Contract Cracking Competition

Prize fund: Up to $50,000 
Deadline: 18:00 UTC on December 30
Who can participate: Everyone

The Task is to identify potential vulnerabilities and issues in the FunC and Solidity smart contracts of Token Bridge.…

---

## [175] 2022-12-31T13:00:31+00:00

- Permalink: https://t.me/tonblockchain/175
- Author: The Open Network
- Views: 44.2K

**TON Core Update 2022.12
**
— Improvements of TON Proxy: fixed few bugs, improved stability.

— Improved Collator/Validator checks, added optimization of storage stat calculation, generation and validation of new blocks is made safer.

— Some previously hard-coded parameters such as split/merge timings, max sizes and depths of internal and external messages, and others now can be updated by validators through setting ConfigParams. Max contract size added to configs.

— TonLib: updated raw.getTransactions (now it contains InitState), fixed long bytestrings truncation.

— abseil-cpp is updated to newer versions.

— Added configs for Token Bridge.

— LiteServers: a few bug fixes, added liteServer.getAccountStatePrunned method, improved work with not yet applied blocks.

— Improved DHT: works for some NAT configurations, optimized excessive requests, added option for DHT network segregation.

— FunC v0.4.0: added try/catch statements, added throw_arg functions, allowed in-place modification of global variables, forbidden ambiguous modification of local variables after it's usage in the same expression.

— TON Storage: added storage-daemon (create, download bag of Files, storage-provider staff), added storage-daemon-cli.

Besides the work of the core team, this update is based on the efforts of **vtamara** (help with abseil-cpp upgrade), **krigga** (in-place modification of global variables) and third-party security auditors.

The network update is scheduled for January 9.

---

## [176] 2022-12-31T13:00:31+00:00

- Permalink: https://t.me/tonblockchain/176
- Author: The Open Network
- Views: 64.2K

**Introducing TON Storage**

TON Storage is a technology for reliable storage of any size on decentralized TON network.

We can't wait to see what products our community will create using this technology.

[https://telegra.ph/TON-Storage-12-28](https://telegra.ph/TON-Storage-12-28)
  *
  Telegraph

**Link preview:**
- [TON Storage](https://telegra.ph/TON-Storage-12-28)
  - We’re introducing technology for reliable storage of any size on decentralized TON network. Individual users and services with an audience of millions can use TON Storage to store their public and private files. The challenge People and services require storing…

---

## [177] 2022-12-31T13:00:31+00:00

- Permalink: https://t.me/tonblockchain/177
- Author: The Open Network
- Views: 59.4K

**Happy New Year!** **🥳***

The highlights of 2022 don't fit into one post: [https://t.me/ton2022_en/22](https://t.me/ton2022_en/22)
  
  Telegram

**Link preview:**
- [TON Rewind 2022](http://t.me/ton2022_en/22)
  - Happy New Year! **🥳***

2022 was the year of rapid development for the TON network and its wider ecosystem.

Let’s take this opportunity to look back at some of the highlights **⬇️***

---

## [178] 2023-01-23T16:01:08+00:00

- Permalink: https://t.me/tonblockchain/178
- Author: The Open Network
- Views: 59.8K

**A Community Proposal for Tokenomics Optimization
**
On December 17, in response to repeated requests for greater certainty, clarity and transparency over the tokenomics of the TON network, the [community has called](https://t.me/tonblockchain/173) for all early miners to activate their inactive mining wallets by the end of 2022.

Out of the 204 inactive mining wallets identified by the [community](https://tontech.io/stats/early-miners), 194 wallets holding 1,081,425,847 Toncoin remain inactive today. These mining wallets — the genesis wallets that have mined Toncoin directly from the Proof-of-Work smart-contracts — have never been activated and do not have a single outgoing transfer in their history.

Toncoin is a gas required to access decentralized services on the TON network. It has been widely speculated that access to these inactive wallets may have been lost. What is clear is that there is a community consensus: the existence of these unutilized Toncoin only increases the uncertainty for the network participants. 

TON is a community-driven blockchain, and we believe that the network validators should listen to the voice of the community. 

Therefore, we are suggesting a validator vote for the proposal of tokenomics optimization, one that enables these inactive mining wallets to remain inactive for a certain period of time. 

In spite of some people proposing a permanent inactivation, the majority of the community was in favour of preserving the very idea that keeps us as one: decentralization. For this reason, the community has reached a consensus to set this period to 48 months. This will give the TON ecosystem enough time to flourish while providing flexibility to those who may not be aware of these discussions in the community. 

Like any network proposals, this will require at least 75% of the validator votes in two consecutive validation rounds to take effect.

The owners of the inactive mining wallets can opt out by activating their wallets at anytime** **before the end of the voting that will start on February 21, 2023. The full list of inactive mining wallets can be found here: [https://tontech.io/stats/early-miners](https://tontech.io/stats/early-miners). 
Wallets that did not receive Toncoin directly from the mining smart contracts ("Givers") or made an outgoing transaction at any time in the past will not be affected.**
**
We are proud that TON is a uniquely decentralized blockchain community. Our mission of decentralization can be achieved as long as we have the active participation of the community, which we have today.

We strongly encourage the community to discuss and voice their opinions about this proposal.

---

## [179] 2023-02-01T18:07:56+00:00

- Permalink: https://t.me/tonblockchain/179
- Author: The Open Network
- Views: 66.3K

**TON Roadmap 2023

**The roadmap for this year has been put together and [published](https://ton.org/roadmap).

Over the last year, an ecosystem of various TON products has been rapidly built, ranging from decentralized exchanges and multifunctional wallets to marketplaces and blockchain games. Components of The Open Network were also launched including: TON DNS, TON Payments, TON Proxy, TON Sites, and TON Storage.

The first half of this year will be dedicated to harmonizing, improving and optimizing all of our current development projects to make TON as useful and convenient as possible for users. 

The roadmap includes many TON improvements specifically designed to meet the needs of TON developers, providing them with the tools and resources they previously lacked. 

TON is the only modern blockchain finding new, sometimes unexpected, ways to attract users. In the second half of the year, we aim to surpass all of our previous efforts with the goal of bringing even more users to TON.

Because we always try to solve the most pressing problems, and events are dynamically changing, Q3 and Q4 are not completely filled-in and additions will be made as our work progresses. 

In technical terms, TON already surpasses all other existing blockchains by a large margin.

In order to confirm this, we have planned a show to demonstrate the real performance of TON and its ability to scale under heavy load.

Further developments for [TON Proxy](https://ton.org/roadmap?filterBy=ton_proxy), [TON Payments](https://ton.org/roadmap?filterBy=ton_payment) and [TON Storage](https://ton.org/roadmap?filterBy=ton_storage) are described on separate pages.

---

## [180] 2023-02-07T18:04:26+00:00

- Permalink: https://t.me/tonblockchain/180
- Author: The Open Network
- Views: 56.6K

**TON Awards 2022**

If you've made an open-source non-commercial product on TON and it's working you can submit it to the **TON Awards 2022**.

[Learn more »](https://github.com/ton-blockchain/ton-awards-2022)

---

## [181] 2023-02-21T06:39:14+00:00

- Permalink: https://t.me/tonblockchain/181
- Author: The Open Network
- Views: 56.3K

It’s great to see how the TON community creates new self-government tools. Orbs team recently performed a preliminary informational voting at [ton.vote](http://ton.vote/) for the last proposal to improve tokenomics allowing all network users to participate and show validators their preferences.

Now it's time for validators to make a choice.

TON validators, please participate in the voting for the [community proposal for tokenomics optimization](https://t.me/tonblockchain/178) as [described in the @tonstatus](https://t.me/tonstatus/47) channel.

---

## [182] 2023-02-22T11:46:23+00:00

- Permalink: https://t.me/tonblockchain/182
- Author: The Open Network
- Views: 65.4K

[Community proposal for tokenomics optimization](https://t.me/tonblockchain/178) has been approved — more than 75% of validators voted for it in two consequent rounds.

[171](https://tontech.io/stats/early-miners) inactive early miners' wallets with a total balance of **1,081,389,417** **TON** (more than 20% of the total supply) will not be able to become activated until February 21, 2027, 09:00 UTC. 

This decision is going to provide additional clarity regarding Toncoin tokenomics and increase predictability for the network participants. In combination it will contribute to the further growth of the TON ecosystem.

---

## [183] 2023-02-26T13:03:24+00:00

- Permalink: https://t.me/tonblockchain/183
- Author: The Open Network
- Views: 56K

Submissions for the [**TON Awards 2022**](https://t.me/tonblockchain/180)** **will close on **March 1**,** 12:00 UTC**.

You can send a submission on [GitHub](https://github.com/ton-blockchain/ton-awards-2022).

---

## [184] 2023-02-27T22:30:19+00:00

- Permalink: https://t.me/tonblockchain/184
- Author: The Open Network
- Views: 78.5K

**TON Connect**

The Open Network pretends to have a unified way for communication between TON wallets and TON apps to achieve following goals:

— Any TON app can be operated by any TON wallet. No matter web or desktop application, mobile wallet, hardware wallet or browser extension — all need to be compatible with each other and communicate using the same protocol.

— Users get a familiar and friendly experience across all TON apps. The user should not be required to do anything more complicated than click a link or scan a QR code to connect the wallet.

The Tonkeeper team did a great job developing TON Connect that solves these problems in a decentralized way.

TON community developers please participate in the open discussion about TON Connect before it becomes a network-wide standard. If you find any shortcomings or weaknesses of the proposed solution please report it.

[TEP discussion »](https://github.com/ton-blockchain/TEPs/pull/115)

---

## [185] 2023-03-29T10:23:30+00:00

- Permalink: https://t.me/tonblockchain/185
- Author: The Open Network
- Views: 54.5K

**😺*** You can now buy Telegram Premium subscriptions with TON **🥳***
[https://fragment.com/premium](https://fragment.com/premium)

---

## [186] 2023-04-08T11:09:25+00:00

- Permalink: https://t.me/tonblockchain/186
- Author: The Open Network
- Views: 46.4K

**🏆*** The TON Awards ceremony will be held online in text format **tomorrow** at **15:00 UTC**.

See you soon!

---

## [188] 2023-04-18T14:06:55+00:00

- Permalink: https://t.me/tonblockchain/188
- Author: The Open Network
- Views: 39.4K

**TON Connect

**Public discussions on the [TON Connect standard](https://github.com/ton-blockchain/TEPs/blob/master/text/0115-ton-connect.md) have been finalized.

Most TON wallets already supported TON Connect (2.0), we hope that other ecosystem wallets will start supporting this standard in the near future.

Nonetheless, developers may still hold [public discussions](https://github.com/ton-blockchain/ton-connect/issues) about how to improve new versions of the TON Connect protocol.

---

## [189] 2023-04-18T14:06:55+00:00

- Permalink: https://t.me/tonblockchain/189
- Author: The Open Network
- Views: 40.3K

**Results of the TON Awards 2022

301,920 TON **(**$676,300**) was [distributed](https://github.com/ton-blockchain/ton-awards-2022) between **42** great open-source projects**.

**The Open Network is a community-driven project where everyone is involved in contributing to a more decentralized and freer world.

The TON Foundation team is proud to be working with such talented developers from all over the world and would like to invite new teams to join our collective venture.

---

## [190] 2023-04-18T14:06:55+00:00

- Permalink: https://t.me/tonblockchain/190
- Author: The Open Network
- Views: 45.8K

**Token Bridge

**The unlimited bridge for token transfer between the Ethereum and TON blockchains has been launched.

At the moment, you can freely transfer USDT, UDSC, DAI and WBTC tokens.

In the future, users will be able to transfer any ERC-20 compatible tokens.

The bridge has been verified by leading audit companies, including CertiK, Hexens, Quantstamp, and a public competition has been held to find vulnerabilities.

The Toncoin bridge has also received an update which added support for different languages as well as a number of UI improvements.

[bridge.ton.org](https://bridge.ton.org/)

---

## [191] 2023-04-18T14:06:55+00:00

- Permalink: https://t.me/tonblockchain/191
- Author: The Open Network
- Views: 53.7K

**Q1 2023 Results

**TON Ecosystem has demonstrated impressive growth, with a 25% increase in the total number of accounts and transactions, a thriving DeFi sector, a cohesive ecosystem that continues to improve synergy between components, and a developer community that is rapidly expanding.

[https://telegra.ph/TON--Results-from-Q1-2023-04-18](https://telegra.ph/TON--Results-from-Q1-2023-04-18)
  
  Telegraph

**Link preview:**
- [TON – Results from Q1 2023](https://telegra.ph/TON--Results-from-Q1-2023-04-18)
  - At the start of the year, TON joined Cointelegraph’s Top-30 most influential crypto industry players. However, our ambitions go much further than this and TON continues to develop rapidly according to our roadmap. Stability and scalability Over the last three…

---

## [192] 2023-05-09T13:10:12+00:00

- Permalink: https://t.me/tonblockchain/192
- Author: The Open Network
- Views: 44.9K

**Best practices for processing deposits and withdrawals in Toncoin and Jettons
**
When integrating Toncoin and Jettons to your exchange/bot/payment system, please refer to the JS examples:

**Toncoin**

— [Processing deposits](https://github.com/toncenter/examples/blob/main/deposits.js)

— [Processing withdrawals](https://github.com/toncenter/examples/blob/main/withdrawals.js)

— [Detailed ](https://docs.ton.org/develop/dapps/asset-processing#global-overview)[info](https://docs.ton.org/develop/dapps/asset-processing#global-overview)

**Jettons**

— [Processing deposits](https://github.com/toncenter/examples/blob/main/deposits-jettons.js)

— [Processing withdrawals](https://github.com/toncenter/examples/blob/main/withdrawals-jettons.js)

— [Detailed ](https://docs.ton.org/develop/dapps/asset-processing/jettons)[info](https://docs.ton.org/develop/dapps/asset-processing/jettons)

---

## [193] 2023-06-01T15:53:11+00:00

- Permalink: https://t.me/tonblockchain/193
- Author: The Open Network
- Views: 36.1K

**Big interview with TON’s Technical Lead Anatoliy Makosov
**
[Read on TON Blog »](https://blog.ton.org/interview-with-anatoly-makosov)

**Photos:**
- https://cdn4.telesco.pe/file/IYlRDGGYc6nFQcCvFFoIubckKbVt9jlWYPUAo7q5dY2Nlr3X1xs_v6BJChTCvZ7dNGPC1JvxsbvaeObHCh6dXVplxvHySeNPdlCx8LUwzzDw1D_oi7-AntOFVHH_mT-0VjLLmeLXuHaPZUDhcOj9_iJwjs-hVYSYUujH6OrHQFPchRoioDbQSnQBjvvcJcGq8oSO8Ezp_nu4bdM5x1nTCid10NTl6yTIQ6oNndTVf0051ANKQhrQ6AymoL7ZSrnutahDtMV4tsZ_ZtnvZuHDPAMRZI89LF1zTonyc7gRWIHeOFZ6SKHpZUAjtmbJqwfLcSVbJL3mVu7qwGim6aTa2w.jpg

---

## [194] 2023-06-01T15:53:11+00:00

- Permalink: https://t.me/tonblockchain/194
- Author: The Open Network
- Views: 43.2K

**Tokenomics deflation mechanism

**The latest TON updates ([2023.04,](https://github.com/ton-blockchain/ton/releases/tag/v2023.04) [2023.05](https://github.com/ton-blockchain/ton/releases/tag/v2023.05)) were devoted to optimization, security, and stability.

Today's TON update (2023.06) introduces a new Toncoin deflation mechanism:

**🔥*** Burning part of the network commission.

**🕳*** Black hole – if you send Toncoin here, it will completely disappear and be deducted from the total supply.

Network-wide voting for the activation of this functionality is scheduled for June 15th.

[Read more »](https://blog.ton.org/ton-community-proposal-to-implement-toncoin-real-time-burn)

---

## [195] 2023-06-05T19:37:51+00:00

- Permalink: https://t.me/tonblockchain/195
- Author: The Open Network
- Views: 41.3K

**Big TVM update**

The most significant TON Virtual Machine update so far – extended cryptography, arbitrary-precision arithmetic, and new instructions – this update will make TVM one of the most versatile virtual machines around and allow developers to create an even more diverse range of smart contracts, services, and products on TON.

We invite everyone to take part in the programming [contest](https://t.me/toncontests/116) with **30,000 TON** prize pool and showcase their best use of the new TVM features or take part in the [bug bounty](https://github.com/ton-blockchain/bug-bounty) program receiving a reward for found bugs and vulnerabilities of the new TVM in the testnet.

[Read more »](https://blog.ton.org/the-most-significant-tvm-update-so-far-extended-cryptography-arbitrary-precision-arithmetic-and-new-instructions)

---

## [196] 2023-06-13T12:29:46+00:00

- Permalink: https://t.me/tonblockchain/196
- Author: The Open Network
- Views: 41.5K

**🛡️***** Discussion on updating the TON address format**

TON is a blockchain designed for mass adoption. As part of this endeavor, we propose to add several guidelines and make small changes to the address format. The goal is to ensure that even inexperienced users who mistakenly send funds to the wrong place do not lose their funds and have them returned in most cases.

We encourage all developers to join in the discussion regarding the TON address format.

This proposal focuses on changes that almost completely maintain backward compatibility. However, we are open to discussing other proposals, including more radical ones.

[TEP discussion »](https://github.com/ton-blockchain/TEPs/pull/123)

---

## [197] 2023-06-13T16:53:08+00:00

- Permalink: https://t.me/tonblockchain/197
- Author: The Open Network
- Views: 66.3K

**💎***** The Locker bug bounty event**

**Task:** Find vulnerabilities in the [Locker](https://github.com/ton-blockchain/locker-contract) smart contract.

**Prize fund**: Up to **50'000 TON**
**Deadline**: 23:59 on June 30th (UTC)
**Who can participate**: Everyone
**How to submit**: Open issue on [github](https://github.com/ton-blockchain/locker-contract/issues)

---

## [198] 2023-06-16T13:40:32+00:00

- Permalink: https://t.me/tonblockchain/198
- Author: The Open Network
- Views: 45.8K

Validators please vote for or against the proposal to **burn 50% network fees**.

[Proposal](https://blog.ton.org/ton-community-proposal-to-implement-toncoin-real-time-burn) [info »](https://blog.ton.org/ton-community-proposal-to-implement-toncoin-real-time-burn)

[Public poll results »](https://ton.vote/EQCb8dxevgHhBnsTodJKXaCrafplHzAHf1V2Adj0GVlhA5xI/proposal/EQAx5JjTHpQ_5EeWBAErl4_AWhh_JFBh2UvuTWAeqdbpC0C1)

[How to vote »](https://t.me/tonstatus/66)

---

## [199] 2023-06-19T20:39:26+00:00

- Permalink: https://t.me/tonblockchain/199
- Author: The Open Network
- Views: 40K

**Validators voted to activate** **50% network fees** **burning**

By this time, the first 1000 TON have been burned **🔥***

---

## [200] 2023-06-20T11:27:08+00:00

- Permalink: https://t.me/tonblockchain/200
- Author: The Open Network
- Views: 41K

**Token bridge fee**

Starting June 26, 12:00 UTC, in the [token bridge](https://bridge.ton.org/), the commission for transferring tokens from the TON network to the Ethereum network will be 1 TON plus 0.1% of the transfer amount.

The commission for transferring tokens from the Ethereum network to the TON network will remain unchanged - exactly 1 TON.

---

## [201] 2023-06-25T12:46:12+00:00

- Permalink: https://t.me/tonblockchain/201
- Author: The Open Network
- Views: 42.6K

**Intermediate results of Rainbow Cross-Chain development for The Open Network 
**
Roman Nguyen shared at the BUIDL Vietnam 2023 our significant results in the development of a unique cross-chain solution that works absolutely without intermediaries and private keys, and checks all data on smart contracts.

[https://blog.ton.org/intermediate-results-of-rainbow-cross-chain-development-for-the-open-network](https://blog.ton.org/intermediate-results-of-rainbow-cross-chain-development-for-the-open-network)
  
  ton.org
  *
  Intermediate Results of Rainbow Cross-Chain Development for The Open Network

**Link preview:**
- [Intermediate Results of Rainbow Cross-Chain Development for The Open Network](https://blog.ton.org/intermediate-results-of-rainbow-cross-chain-development-for-the-open-network)
  - We're bringing you the latest updates on the development of TON's trustless bridge that we've been working on with the RSquad team.

---

## [202] 2023-07-03T15:48:01+00:00

- Permalink: https://t.me/tonblockchain/202
- Author: The Open Network
- Views: 39K

**TON wallet becomes an encrypted messenger**

[https://blog.ton.org/ton-wallet-becomes-an-encrypted-messenger](https://blog.ton.org/ton-wallet-becomes-an-encrypted-messenger)

**Videos:**
- https://cdn4.telesco.pe/file/a235158425.mp4?token=AdMMD1Ta26OgT0JOA51sUtKKDgh3aVVMu371sWxIYG1s38BWVlbwnd1vJg27F8oV8lbzaZimiiDNDCT6AbpjZZFiWbXoF3ZQWucrI3NQq6MdKtq_xzP47JT5uixbYTw4qkkLkXhh9W8O1Rd1TN0rCGzsmpq3bNgAHmYBZwAMWHAbaljAQkeofieghD7f-Ld85a_jZwjsivA_3_yeyPuMyiHBP-BEGlhbedUk8sDQS_pFbVCs50M-HDTT22WmB_8qWDd8g2W_kyc1Tzq5b1KgXuYxOprF4gfBrTaacH6EhFptj1jeFObz-j6MOxoGWOBr8N3deiJkzbXidi6YM4Alyw

---

## [203] 2023-07-03T15:48:01+00:00

- Permalink: https://t.me/tonblockchain/203
- Author: The Open Network
- Views: 39.7K

**Developer Tools**

You should definitely try the latest TON developer tools if you haven't already.

We recommend to use the [ton.js](https://github.com/ton-org/ton-core) library, the [Blueprint](https://github.com/ton-org/blueprint) environment, and the [IntelliJ IDEA plugin](https://plugins.jetbrains.com/plugin/18541-ton-development) for the development, testing, and deployment of [FunC](https://docs.ton.org/develop/func/overview) smart contracts.

For dApps there is [TON Connect](https://github.com/ton-connect) and a number of APIs: [tonapi.io](http://tonapi.io/), [toncenter.com](http://toncenter.com/), [TON Access](https://www.orbs.com/ton-access/), [dTON ](https://dton.io/graphql)[GraphQL](https://dton.io/graphql).

These tools make TON developing convenient and enjoyable.

For payment services, the time-tested [tonweb](https://github.com/toncenter/tonweb) (which we plan to refresh and make a "library for paranoids" as much as possible getting rid of third-party dependencies), locally runned [ton-http-api](https://github.com/toncenter/ton-http-api) and ready-made code [examples](https://t.me/tonblockchain/192) are well suited.

To run your own TON node, please use [mytonctrl](https://docs.ton.org/participate/nodes/node-types) or [GetBlock](https://getblock.io/nodes/ton/).

---

## [204] 2023-07-03T15:48:02+00:00

- Permalink: https://t.me/tonblockchain/204
- Author: The Open Network
- Views: 45.3K

**Liquid staking**

Liquid staking is the newest solution that allows you to earn staking rewards and use your assets in DeFi at the same time. Liquid staking is more convenient and accessible for users compared to previous staking options, it also allows you to vote for network updates without having a lot of Toncoins.

Smart contracts for liquid staking developed, and you can participate in testing them by the [test application.](https://teststaking.xyz/) After the testing phase, the source code of the smart contracts will be published under an free open-source license. 

You can find more details in the [documentation.](https://ton-ls-protocol.gitbook.io/ton-liquid-staking-protocol/) 

The [Tonstakers](https://tonstakers.com/) team has already announced the creation of a custom service based on these contracts.

Alternative available - in partnership with DWF Labs, Bemo successfully [launched](https://bemo.finance/) its own liquid staking protocol.

---

## [205] 2023-07-03T15:48:02+00:00

- Permalink: https://t.me/tonblockchain/205
- Author: The Open Network
- Views: 55.6K

**Q2 2023 Results**

Actively adopting DeFi, optimizing tokenomics, and steadily following the roadmap:
[https://blog.ton.org/ton-q2-2023-results](https://blog.ton.org/ton-q2-2023-results)
  
  ton.org
  *
  TON – Q2 2023 Results

**Link preview:**
- [TON – Q2 2023 Results](https://blog.ton.org/ton-q2-2023-results)
  - Over the past three months, several significant events have unfolded in TON Ecosystem

---

## [206] 2023-07-09T12:44:12+00:00

- Permalink: https://t.me/tonblockchain/206
- Author: The Open Network
- Views: 48.8K

[**The Locker bug bounty event**](https://t.me/tonblockchain/197)**: Results
**
The Locker smart contract remained unbroken.

**🎖*** **thekiba** receives a bonus prize of 100 TON for a minor remark.

More events on [@toncontests](https://t.me/toncontests) and [bug bounty](https://github.com/ton-blockchain/bug-bounty) program.

---

## [207] 2023-07-13T13:59:36+00:00

- Permalink: https://t.me/tonblockchain/207
- Author: The Open Network
- Views: 63.8K

**Videos:**
- https://cdn4.telesco.pe/file/9b645b0d18.mp4?token=l2HnZVriNYN0U4OueCLik-nIELIK_vAqtHI8PQFzzL7tfhjGZRFez-VY2HpEChi-1jpxlk5APluovcYswzhSKh2qxOG9ePHwpdbNavNsMJY94SNexAAdiChvoryK5nANFZOV7JKVwi1pG2COpS3ygEcQESu0PTfXOQv03wEGj2zhJ2VM9Zq4z8G2gwi2UAkUZxLab3t2AqhJDg1J0VSTF2jrTFTC1LfDQ2nDUlQbMd2e9B2uioo85B6xgCMElMaadgE0nfVdUR8p5QFSaJZkgIYXq8qwq4qPKlUhnV8BpR8WZDNpVfny1F7Zm7ATZ0DeZKQ4PEtDaXexVJxjaitr0g

**Link preview:**
- [https://telegra.ph/file/6eef1fd2a304119896fe3.mp4](https://telegra.ph/file/6eef1fd2a304119896fe3.mp4)

---

## [208] 2023-08-08T15:34:07+00:00

- Permalink: https://t.me/tonblockchain/208
- Author: The Open Network
- Views: 60.7K

[https://blog.ton.org/ton-connect-the-future-without-passwords](https://blog.ton.org/ton-connect-the-future-without-passwords)
  
  ton.org
  *
  TON Connect – The Future Without Passwords

**Link preview:**
- [TON Connect – The Future Without Passwords](https://blog.ton.org/ton-connect-the-future-without-passwords)
  - In this article, we will talk about the development of TON Connect, as well as announce the introduction of a password manager in TON wallets.

---

## [209] 2023-08-11T14:12:16+00:00

- Permalink: https://t.me/tonblockchain/209
- Author: The Open Network
- Views: 57.6K

**Liquid staking**

Following public [alpha-test of liquid staking protocol](https://t.me/tonblockchain/204) in July, we are ready to publish [protocol source-code](https://github.com/ton-blockchain/liquid-staking-contract/) and announce public beta-test.

Since July, code has passed a few external code reviews by best TON hackers, however a few more code reviews are undergoing. Use protocol code at own risk.

Liquid staking protocol is aimed to be development of Nominators concept from [original whitepaper](https://ton.org/ton.pdf#page=45): [further](https://t.me/tonblockchain/131) democratize participation in network operation by connecting TON holders and node operators. Simultaneously Liquid Staking Pool jettons can work as basic block for higher level DeFi protocols.

Protocol utilizes ideas of jetton-based DAO to give voting power to *nominators* as well as specific TON feature exotic *library* *cells* for forward fees optimization.

Last but not least point is that great power is great responsibility. Staking secures TON blockchain, where stake is guarantee of correct behavior. By sharing profits with specific pool you also shares responsibility for TON future and stake assets risks. Participate only in the pools you trust.

---

## [210] 2023-08-24T16:02:21+00:00

- Permalink: https://t.me/tonblockchain/210
- Author: The Open Network
- Views: 81.4K

[**Believers.ton**](http://Believers.ton/)** — A community-driven effort to bring more transparent and predictable Toncoin tokenomics

**As you know, the community is continuously working on systematic actions to amplify the TON tokenomics, which started with decentralized distribution through [mining](https://t.me/tonblockchain/137). 

So far, the community reached multiple important milestones: 

— Created a fund and [reserve](https://t.me/tonblockchain/116) of more than 550M TON 
— [Nominators](https://t.me/tonblockchain/131) were established, bringing the number of validators to over 300 and the total stake employed in validation to over 450M TON
— Implemented a [community proposal to optimize tokenomics](https://t.me/tonblockchain/182), affecting 1.081B TON[
](https://ton.vote/EQCb8dxevgHhBnsTodJKXaCrafplHzAHf1V2Adj0GVlhA5xI/proposal/EQCVy5bEWLQZrh5PYb1uP3FSO7xt4Kobyn4T9pGy2c5-i-GS)— Launched a mechanism to [burn a portion of the network fees](https://t.me/tonblockchain/194)[

](https://ton.vote/EQCb8dxevgHhBnsTodJKXaCrafplHzAHf1V2Adj0GVlhA5xI/proposal/EQAx5JjTHpQ_5EeWBAErl4_AWhh_JFBh2UvuTWAeqdbpC0C1)A new [Believers.ton](https://tonscan.org/locker/EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2) initiative has recently emerged in the community[,](https://github.com/ton-blockchain/locker-contract) allowing users to lock their Toncoins into the [Believers.ton](http://Believers.ton/) smart contract for five years, while other users can donate Toncoins, rewarding those who have locked their coins. The more coins are locked in the smart contract, the more transparent and predictable tokenomics become, which is vital for developing the network and attracting new participants.

We have audited and [tested](https://t.me/tonblockchain/197) this smart contract at the community's request. The smart contract is fully autonomous and guarantees the described functionality.
**
**This effort is an excellent example of how the TON community can organize itself. An excellent community-driven effort, where individual community members encourage and reward each other for contributing towards the greater good. This initiative has a significant potential to positively impact the future of TON, especially if large holders participate. 

As proof of our deep interest in this effort and based on the results of the [last community survey](https://ton.vote/EQCb8dxevgHhBnsTodJKXaCrafplHzAHf1V2Adj0GVlhA5xI/proposal/EQAiqphPtZ2jLyzqrcfVrhBZfarghWKpkt0fSfALsqRbofQ7),  the TON Foundation will support it by sending 1 million TON from the TON reserve to reward depositors. 
**
**Please consider participating in [Believers.ton](http://Believers.ton/) as a patron or depositor.

[Instruction »](https://telegra.ph/TON-Believers-Fund-Guidelines-08-24)

---

## [211] 2023-09-08T11:37:46+00:00

- Permalink: https://t.me/tonblockchain/211
- Author: The Open Network
- Views: 82.1K

**Link preview:**
- [https://ton.foundation/](https://ton.foundation/)
  - The Open Network Foundation is a non-profit organization funded entirely by community contributions.

---

## [212] 2023-09-08T11:37:46+00:00

- Permalink: https://t.me/tonblockchain/212
- Author: The Open Network
- Views: 78.9K

**TON is presenting with Telegram at **[**TOKEN2049**](https://www.token2049.com/)**.
**
Get ready for something the industry has never seen before as they present "Converting Telegram to Web3 with Toncoin".

**🗓️*** Save the date: Wed, Sep 13, 3:00 PM - 3:15 PM GMT +8, KuCoin Stage, Singapore.

We're very proud to be the Platinum Partner at TOKEN2049.

---

## [213] 2023-09-27T11:32:48+00:00

- Permalink: https://t.me/tonblockchain/213
- Author: The Open Network
- Views: 62.3K

**Recording of the epoch-making performance of Telegram and TON at TOKEN2049 is **[**here**](https://www.youtube.com/watch?v=VC5G2581M8s)**!**

Key highlights:

— Telegram starts working with TON Foundation to integrate and promote TON-based Web3 ecosystem.

— Last year, Telegram enabled users to buy and sell Telegram usernames and IDs on [Fragment](https://fragment.com/) – a TON-based auction platform. It was a phenomenal success. Telegram sold **$120M** worth of digital assets in auctions, while early buyers of some Telegram-related digital assets – such as Telegram anonymous numbers – have seen a **27x **(!) increase in value after only 9 months.

— Telegram now has **800 million** active users from all over the world. By 2028, the number is expected to reach **1.5** **billion**. TON Foundation aims to onboard **30%** of active Telegram users to TON in the next 3-5 years. That's 30 times the entire current active crypto audience in the world.

— [Wallet](https://t.me/wallet/start) has appeared in Telegram Menu for its current users.

— In November, [Wallet](https://t.me/wallet/start) will appear in Menu and Attachment Menu for ALL non-US Telegram users.

— You can already try [TON Space](https://t.me/wallet?attach=wallet&amp;startattach=scw_onboarding), a non-custodial wallet inside Telegram.

— Exclusive for TON-based projects: priority access to Telegram Ads for Web3.

For more information, watch a [recording](https://www.youtube.com/watch?v=VC5G2581M8s) of the perfomance or read the [post](https://t.me/durov/225) on Pavel Durov's personal blog.
  *
  YouTube

**Link preview:**
- [Transforming Telegram to Web3 with Toncoin - TOKEN2049 Singapore 2023](https://www.youtube.com/watch?v=VC5G2581M8s)
  - Learn more about TOKEN2049: https://token2049.com
Follow us on X: https://x.com/token2049

Keynote: Transforming Telegram to Web3 with Toncoin

Speakers:
Steve Yun, President @ TON Foundation
John Hyman, CIO @ Telegram

Stage: KuCoin Stage

#token2049 #toncoin…

---

## [214] 2023-10-01T10:34:09+00:00

- Permalink: https://t.me/tonblockchain/214
- Author: The Open Network
- Views: 61K

**TON-based Telegram Mini Apps — The Next Major Web3 Trend

**The combination of TON and the [Telegram Mini Apps platform](https://core.telegram.org/bots/webapps) allows any developer to create various valuable and user-friendly Web3 services for hundreds of millions of Telegram users.

This is becoming a global trend as popular tracking services [CoinGecko](https://www.coingecko.com/categories/telegram_apps) and [CoinMarketCap](https://coinmarketcap.com/view/telegram-bot/) have already deployed trackers for crypto apps in Telegram. In addition, the [tApps.center](https://www.tapps.center/) catalog has been launched that lists over 75 Telegram-based Mini Apps.

TON-based Mini Apps running on Telegram enjoy native Telegram integration and priority access to Telegram Ads, making it easier to approach the masses and onboard new users. Additionally, developers can buy [Fragments](https://fragment.com/) — short usernames for their apps on the TON Blockchain to even further boost their awareness and provide ease of access. 

On top of that, there are multiple incentives and benefits for developers. In July, the TON Foundation held the [TON-based Telegram Apps contest](https://t.me/toncontests/135) with a prize pool of $60,000. There is another [Mini Apps contest](https://t.me/contest/327) with a prize pool of $50,000 from the Telegram team running now.

Here, fresh ideas and new solutions are born in a creative environment of collaboration and innovation. The TON Community, in an initiative with the TON Foundation and Telegram, is rapidly building a new decentralized future, and developers are welcome to join. 

[Trending Mini Apps »

](https://t.me/trendingapps)[Documentation for developers »](https://docs.ton.org/develop/dapps/telegram-apps/)

---

## [215] 2023-10-01T10:34:10+00:00

- Permalink: https://t.me/tonblockchain/215
- Author: The Open Network
- Views: 79.1K

**Strategic **[**partnership**](https://apnews.com/press-release/news-direct-corporation/philanthropy-3e3ea003105079811955b7f8162325da)** with Tencent Cloud** **and** **Chainbase**

Tencent Cloud and TON Foundation are devoted to supporting web applications and bots built within Telegram. For example, Telegram games built on TON can benefit from Tencent Cloud’s enriched [gaming solution ](https://www.tencentcloud.com/solutions/game)and reference cases. For all projects built on TON, Tencent Cloud will offer, subject to approval, a dedicated amount of cloud credits and product discounts, made available through the [Tencent Cloud Startup Program](http://www.tencentcloud.com/campaign/startupprogram).

[https://apnews.com/press-release/news-direct-corporation/philanthropy-3e3ea003105079811955b7f8162325da](https://apnews.com/press-release/news-direct-corporation/philanthropy-3e3ea003105079811955b7f8162325da)
  
  AP News
  *
  The Open Network (TON) Foundation engages Chainbase and Tencent Cloud for Web3 development and adoption

**Link preview:**
- [The Open Network (TON) Foundation engages Chainbase and Tencent Cloud for Web3 development and adoption](https://apnews.com/press-release/news-direct-corporation/philanthropy-3e3ea003105079811955b7f8162325da)
  - --News Direct-- The partnership entails an enterprise node deployment service offered by Chainbase The Open Network (TON) Foundation has partnered with Chainbase and Tencent Cloud to simplify blockchain development as the Foundation ushers in the next era…

---

## [216] 2023-10-07T11:09:28+00:00

- Permalink: https://t.me/tonblockchain/216
- Author: The Open Network
- Views: 81.4K

**Q3 2023 Results**

[https://blog.ton.org/ton-ecosystem-report-q3-2023](https://blog.ton.org/ton-ecosystem-report-q3-2023)
  
  TON Blog
  *
  TON Ecosystem Report: Q3 2023

**Link preview:**
- [TON Ecosystem Report: Q3 2023](https://blog.ton.org/ton-ecosystem-report-q3-2023)
  - With the third quarter of 2023 behind us, now is the right time to review everything that happened within the TON Ecosystem over the past three months.

---

## [217] 2023-11-01T12:55:15+00:00

- Permalink: https://t.me/tonblockchain/217
- Author: The Open Network
- Views: 78.6K

**TON is officially the world’s fastest blockchain

**On October 31, we proved that TON is the fastest and most scalable blockchain in the world.

During public performance testing on **256** validator nodes, a speed of **104 715** transactions of smart contract execution per second was set. CertiK, the Web3's leading auditor, participated in the event as an independent party and [confirmed](https://www.certik.com/resources/blog/7KVtBkHfJkcj0U6u0kKtPe-how-certik-verified-tons-tps-results) the results.

This number not only exceeds all confirmed results of other blockchains, but also exceeds the maximum speed of centralized payment systems such as Visa and MasterCard.

The most impressive thing is that the result is far from the limit. TON can handle millions of transactions per second if there are enough validator nodes in the network.

[Read the full recap of the event »](https://blog.ton.org/100000-transactions-per-second-ton-sets-the-world-record-on-its-first-performance-test)

[Watch the event »](https://www.youtube.com/watch?v=jWWl1sLGY7s)

---

## [218] 2023-11-01T21:08:17+00:00

- Permalink: https://t.me/tonblockchain/218
- Author: The Open Network
- Views: 75.5K

**Planned Change of the Ecosystem Reserve Address
**
A planned change of the Ecosystem Reserve address will be performed on Friday, November 3, 2023. This requires transferring the [Ecosystem Reserve](https://tonscan.org/address/EQAhE3sLxHZpsyZ_HecMuwzvXHKLjYx4kEUehhOy2JmCcHCT) balance to the new address: [EQBmzW4wYlFW0tiBgj5sP1CgSlLdYs-VpjPWM7oPYPYWQEdT](https://tonscan.org/address/EQBmzW4wYlFW0tiBgj5sP1CgSlLdYs-VpjPWM7oPYPYWQEdT).

This transfer is not a response to any security breach or compromise. It is a planned action linked to a change of the security protocol by the reserve holders and involved technical solutions.

---

## [220] 2023-11-21T09:26:40+00:00

- Permalink: https://t.me/tonblockchain/220
- Author: The Open Network
- Views: 78K

**TON Performance Test Transparency Add-on**

In [TON's performance test](https://t.me/tonblockchain/217), it was important to show the highest performance among all blockchains, but also to create a standard for transparent speed tests.

"It's uncommon to see organizations willing to undergo performance evaluations as rigorous as the one we performed for TON" — CertiK.

It is our hope that the same transparent methodology can become the standard for the industry to hold itself to.

Transparency links:

[Certik's audit report on methodology »   ](https://www.certik.com/resources/blog/7KVtBkHfJkcj0U6u0kKtPe-how-certik-verified-tons-tps-results)

[Testnet network dump »](https://github.com/ton-blockchain/performance-test/blob/main/README.md#public-dump-of-test-network)

[Frequently asked questions »](https://github.com/ton-blockchain/performance-test/blob/main/README.md#faq)

---

## [221] 2023-11-22T15:57:14+00:00

- Permalink: https://t.me/tonblockchain/221
- Author: The Open Network
- Views: 102K

**Commitment to decentralization**

Since its genesis, TON is a decentralized and self-govern blockchain. Any changes and updates in the network are only possible with the consensus of 66% of the validators.

Today we have [removed](https://tonscan.org/tx/i6oRAQLL8keqIuJmLOi-Sf3bsQblB-5NYt7Sn8YcO5o=) the last element that could be considered as inconsistent with this principle – the configuration key.

The configuration key could be used in case of [emergency](https://docs.ton.org/develop/smart-contracts/governance#emergency-update) to change some technical parameters of the network configuration. This key has never been able to modify of arbitrary smart contracts (e.g balance, code or account data changing). But still it was the last element, which removal was needed to achieve full decentralization of the TON blockchain.

[https://tonscan.org/tx/i6oRAQLL8keqIuJmLOi-Sf3bsQblB-5NYt7Sn8YcO5o=](https://tonscan.org/tx/i6oRAQLL8keqIuJmLOi-Sf3bsQblB-5NYt7Sn8YcO5o=)

---

## [222] 2023-12-05T12:40:43+00:00

- Permalink: https://t.me/tonblockchain/222
- Author: The Open Network
- Views: 91.7K

**The Gateway Rewind**

The Open Network Conference hosted by TON Community held in Dubai this November.

[Read the highlights »](https://blog.ton.org/the-gateway-rewind)

[Watch Day 1 » ](https://www.youtube.com/watch?v=vsAyfdmt374)

[Watch Day 2 »](https://www.youtube.com/watch?v=oi9d-iUOpBs)
  
  ton.org
  *
  The Gateway Rewind

**Link preview:**
- [The Gateway Rewind](https://blog.ton.org/the-gateway-rewind)
  - Let's rewind The Gateway and reflect on the most important announcements, product launches, and tech developments shared during the event.

---

## [223] 2023-12-05T12:40:43+00:00

- Permalink: https://t.me/tonblockchain/223
- Author: The Open Network
- Views: 130K

**Meet the long awaited **[**TVM update**](https://t.me/tonblockchain/195)** in mainnet**

It has undergone months of testing on testnet, bug bounties and been audited by one of the world's best auditor - Trail of Bits.

This update makes TVM one of the most versatile virtual machines around, including the ability to create Zero-Knowledge protocols.

Multiple community teams have already built amazing services using new functionality: 
**🌪***[Tonnel Network](https://t.me/tonnel_en), **💠***[Redstone](https://redstone.finance/), **💥***[Evaa](https://t.me/evaaprotocol), **💎***[TON Teleport](https://t.me/tonblockchain/201), [Clean.ton](https://cleanton.org/). There were a lot of great ideas at the [TVM hackathon](https://blog.ton.org/tvm-challenge-is-here-with-over-54-000-in-rewards).

Network validators have already updated their software on November 30, and new TVM functionality is scheduled to be enabled on December 12.

[Read more](https://blog.ton.org/the-most-significant-tvm-update-so-far-extended-cryptography-arbitrary-precision-arithmetic-and-new-instructions) [about TVM update](https://blog.ton.org/the-most-significant-tvm-update-so-far-extended-cryptography-arbitrary-precision-arithmetic-and-new-instructions)[ »
](https://blog.ton.org/the-most-significant-tvm-update-so-far-extended-cryptography-arbitrary-precision-arithmetic-and-new-instructions)
[Technical documentation »](https://docs.ton.org/learn/tvm-instructions/tvm-upgrade-2023-07)

---

## [224] 2023-12-07T10:43:10+00:00

- Permalink: https://t.me/tonblockchain/224
- Author: The Open Network
- Views: 163K

For the last two days, the TON blockchain has realized a new milestone while experiencing a significant slowdown in transaction processing.

No smart contracts or user assets are at risk. All sent messages will be processed.

We're working on fixing the problem.

[Tech report »‎](https://telegra.ph/7-Dec-2023-12-07)
  
  Telegraph

**Link preview:**
- [TON Technical Incident Report](https://telegra.ph/7-Dec-2023-12-07)
  - For the last two days, the TON blockchain has realized a new milestone while experiencing a significant slowdown in transaction processing. The most substantial periods were on 5 Dec 22:30 - 6 Dec 02:30 (Dubai Time) and 6 Dec 22:45 to the current time. No…

---

## [225] 2023-12-07T21:47:26+00:00

- Permalink: https://t.me/tonblockchain/225
- Author: The Open Network
- Views: 222K

**Call for Network Validators to get in contact**

The TON blockchain is experiencing reduced performance now due to a backlog of transactions in the queue to be validated. We’ve received a response from many validators on the network who have already upgraded using the [patch](https://t.me/tonstatus/76) provided this morning.

However, there are still some we have been unable to reach. We need to collect the machine specifications from all validators to progress the upgrade as quickly as possible. If you maintain a TON validator node, please get in touch with us urgently so we can resolve the network performance issues. 

You can reach the team via this [google form.](https://docs.google.com/forms/d/e/1FAIpQLSdyIAH4UEQMqwA7y34B4maoKmdhIKSnR923xn6A0Ozwj-Kc1A/viewform) If you know someone who maintains a validator node on TON, please also feel free to forward this message.

---

## [226] 2023-12-20T19:12:16+00:00

- Permalink: https://t.me/tonblockchain/226
- Author: The Open Network
- Views: 212K

**Validators voted to activate TVM update**

Now TON developers even more equipped to develop [cutting edge](https://t.me/tonblockchain/223) protocols.

---

## [227] 2024-01-28T16:55:21+00:00

- Permalink: https://t.me/tonblockchain/227
- Author: The Open Network
- Views: 334K

**The highlights of 2023**

The most significant of last year's many events:

**Mass-adoption:** 

— [TON x Telegram](https://t.me/tonblockchain/213);

**Performance:** 

— [World blockchain speed and scalability record](https://t.me/tonblockchain/217);

— [80M transactions in 15 days in mainnet](https://t.me/toncoin/1102);

**Tokenomics:** 

— Achieving transparency and predictability for more than 66% of tokenomics [[1]](https://t.me/tonblockchain/182) [[2]](https://t.me/toncoin/1035) [[3]](https://t.me/tonblockchain/210);

— Implementation of the mechanism of [burning](https://t.me/tonblockchain/194) half of the network fees, achieving deflationary in December;

**Recognition:** 

— The Dubai Financial Services Authority [added](https://www.dfsa.ae/news/notice-crypto-token-recognition) TON;

— Swiss[ non-profit ](https://t.me/tonblockchain/211)TON Foundation;

— [The Gateway Conference](https://tongateway.org/);

**Decentralization:** 

— [Deleting](https://t.me/tonblockchain/221) the configuration key;

— [Network-wide votings](https://t.me/tonblockchain/181) has become commonplace;[
](https://t.me/tonblockchain/181)
**Usability:** 

— Lots of updates to wallets, DEX's, staking, bridge and every service in the TON ecosystem;

**Integration:** 

— TON x Trust Wallet, Ledger, Amazon Web Services, Tencent Cloud, Elliptic, [Blockchain.com](http://Blockchain.com/), Animoca Brands, Bitget Wallet, Atomic Wallet, Changelly and many others;

**Technology:**

— [Zero-Knowledge](https://t.me/tonblockchain/223) on TON;

— Constant kernel and developer updates;

Read more [detailed review](https://blog.ton.org/the-open-network-year-in-review-2023) and [developer report](https://blog.ton.org/ton-developer-report-q4-2023) on the blog.

---

## [228] 2024-02-29T16:26:21+00:00

- Permalink: https://t.me/tonblockchain/228
- Author: The Open Network
- Views: 251K

**😝*** Next month, channel owners on Telegram can start receiving financial rewards from their work. 

Broadcast channels on Telegram generate 1 trillion views monthly. Currently, only 10% of these views are monetized with [Telegram Ads](https://promote.telegram.org/) — a promotion tool [designed with privacy](https://t.me/durov/203) in mind.

In March, the Telegram Ad Platform will officially open to all advertisers in nearly a hundred new countries. Channel owners in these countries will start receiving 50% of any revenue that Telegram makes from displaying ads in their channels.

To ensure ad payments and withdrawals are fast and secure, we will exclusively use the TON blockchain. Similar to our approach with Telegram usernames on [Fragment,](https://fragment.com/) we will sell ads and share revenue with channel owners in Toncoin. This will create a virtuous circle, in which content creators will be able to either cash out their Toncoins — or reinvest them in promoting and upgrading their channels **🤑***

---

## [229] 2024-02-29T16:26:21+00:00

- Permalink: https://t.me/tonblockchain/229
- Author: The Open Network
- Views: 310K

After my [last post,](https://t.me/durov/247) some people expressed concern that, as a result of ad sales exclusively for TON, Telegram may end up holding an unhealthy share of Toncoin, which will be too concentrated for a decentralized ecosystem. We acknowledge these concerns and have come up with a solution.

To limit Telegram’s share of TON at ≈10% of the supply, we’ll be selling the upcoming surplus of our TON holdings to long-term investors — under 1-4 years lockup and vesting plan, but at a discount to the market price. This way free-floating TON will get locked up, stabilizing the ecosystem and reducing volatility. 

Potential investors in TON have been actively trying to reach out to us through various means. To make the process of any TON sales from Telegram fair and streamlined, we set up a new email address investors@telegram.org, where large investors ($1M+) can express their interest. Thanks to the participation of more long-term holders, TON will remain stable and decentralized.

---

## [230] 2024-03-20T11:49:54+00:00

- Permalink: https://t.me/tonblockchain/230
- Author: The Open Network
- Views: 276K

**TON Foundation joins forces with Fireblocks and DWF Labs
**
Fireblocks [integrates](https://t.me/toncoin/1181) TON Blockchain and adds support for Toncoin.

[Fireblocks](https://www.fireblocks.com/) is an enterprise-grade platform delivering a secure infrastructure for moving, storing, and issuing digital assets, having secured the transfer of over $4 trillion in digital assets to date.

Earlier, Bitgo custodial service also [supported](https://t.me/toncoin/1145) Toncoin, and Binance Futures [launched](https://www.binance.com/en/support/announcement/binance-futures-will-launch-usd%E2%93%A2-m-ton-perpetual-contract-with-up-to-50x-leverage-57bb7f41d63a44b090b27c3df483344b) TON perpetual contract.

---

## [231] 2024-04-01T15:39:40+00:00

- Permalink: https://t.me/tonblockchain/231
- Author: The Open Network
- Views: 244K

**The Open League Season 1
**
$115M for TON Community **🤩***

Read more: 

[https://blog.ton.org/april-1st-the-open-league-season-1-115-million-in-toncoin-community-rewards](https://blog.ton.org/april-1st-the-open-league-season-1-115-million-in-toncoin-community-rewards)

For projects:

[https://blog.ton.org/the-open-league-season-1-for-projects](https://blog.ton.org/the-open-league-season-1-for-projects)
  
  ton.org
  *
  April 1st. The Open League Season 1. $115 million in Toncoin community rewards.

**Link preview:**
- [April 1st. The Open League Season 1. $115 million in Toncoin community rewards.](https://blog.ton.org/april-1st-the-open-league-season-1-115-million-in-toncoin-community-rewards)
  - The Open League's pilot season saw a 70% increase in TVL and a 370% rise in daily active wallets in two weeks, prompting expansion efforts. The TON Foundation will distribute 30 million Toncoin, worth about $115 million, in the first full season to engage…

---

## [232] 2024-04-18T09:54:01+00:00

- Permalink: https://t.me/tonblockchain/232
- Author: The Open Network
- Views: 182K

**Voting to reduce network fees
**
TON has always been known for its low network fees. 

Fees in TON are fixed (in Toncoin) and do not depend on the load in the network in any way. However, given the rise of Toncoin price, they are no longer so low in terms of dollars.

Fortunately, TON provides a mechanism for reducing the cost of fees by network-wide voting.

We encourage validators to vote for this fee reduction.

[https://telegra.ph/Making-TON-the-Most-Affordable-scalable-Layer-1-Network-04-16](https://telegra.ph/Making-TON-the-Most-Affordable-scalable-Layer-1-Network-04-16)

[How to vote »](https://t.me/tonstatus/106)
  
  Telegraph

**Link preview:**
- [Making TON the Most Affordable, scalable Layer 1 Network.](https://telegra.ph/Making-TON-the-Most-Affordable-scalable-Layer-1-Network-04-16)
  - The TON Core team wants to share with the validator community new plans to improve our ecosystem’s affordability and growth. The team is looking to introduce an initiative to cut transaction fees, making TON transactions more affordable to encourage activity…

---

## [233] 2024-04-22T08:06:07+00:00

- Permalink: https://t.me/tonblockchain/233
- Author: The Open Network
- Views: 137K

**Validators voted to reduce fees
**
Network fees decreased by 2.5 times. We thank the validators for your choice.

This is the first use of the TON fees reduction mechanism on the mainnet.

Validators also voted for the first [precompiled](https://t.me/tondev_news/99) smart contract, which will further reduce fees for USDt in particular.

Developers please pay attention to the [guidelines](https://t.me/tondev_news/102).

---

## [234] 2024-04-22T08:06:07+00:00

- Permalink: https://t.me/tonblockchain/234
- Author: The Open Network
- Views: 159K

**Key highlights of the groundbreaking perfomance of Telegram, TON and Tether at TOKEN2049**

— Telegram is #6 most used app in the world. 900M MAU, 360M Mini Apps MAU. The number of Mini Apps users can be doubled.

— Telegram Mini Apps, Wallet and TON blockchain provide unprecedented opportunities for developers — an example is Notcoin, which engaged 35M users in 3 months.

— Telegram has launched [Ad revenue sharing](https://t.me/tonblockchain/228) — payments and withdrawals in TON.

— Telegram will also launch optional monetization of large public chat groups.

— Announce of a revenue sharing model for tips to creators — withdrawals in TON.

— Telegram will allow users to buy digital goods and services — withdrawals in TON.

— Telegram will tokenize stickers and emoji.

— Tether launched [USDt](https://blog.ton.org/usdt-comes-to-ton-embrace-the-true-peer-to-peer-experience) on TON. Tether noted the scalability of the TON blockchain and its low fees.

[Recording of the perfomance »](https://youtu.be/gBEOJRvZ-wI?t=1519)
  *
  YouTube

**Link preview:**
- [Token 2049 Announcement](https://youtu.be/gBEOJRvZ-wI?t=1519)
  - Pavel Durov, CEO of Telegram
Andrew Rogozov, Founder and CEO of The Open Platform
Paolo Ardoino, CEO of Tether

---

## [235] 2024-04-22T08:06:07+00:00

- Permalink: https://t.me/tonblockchain/235
- Author: The Open Network
- Views: 203K

**USDt on TON**

— Already integrated into [@wallet](https://t.me/wallet) and into many exchanges, onramp and services.

— Free withdrawals from major exchanges and [@wallet](https://t.me/wallet) until the end of June.

— 11M Toncoin [rewards](https://t.me/toncoin/1269) for USDt users.**
**
— USDt-TON Learn and Earn [campaign](https://www.okx.com/campaigns/usdt-ton-promotion) on OKX.

— Low on-chain fees.

— Soon: on-chain fees in USDT.

[https://ton.org/en/borderless](https://ton.org/en/borderless)
  
  ton.org

**Link preview:**
- [Send Digital Dollars to anyone, anywhere.](https://ton.org/en/borderless)
  - Digital Dollars on TON are based on USDT, a US dollar backed stable coin. Now you can send and receive them right in Telegram. As easy as sending a message.

---

## [236] 2024-04-24T13:37:45+00:00

- Permalink: https://t.me/tonblockchain/236
- Author: The Open Network
- Views: 224K

**Attention TON Community** **💎***

If you have experience with learning and development on TON and have noticed something missing in the documentation or tools, this is your chance to let us know.

We encourage every community member to share their experiences with TON development by [participating in our survey.](https://nletwfvh.paperform.co/)

The survey encompasses** four key topics** and will take approximately **5-8 minutes** of your time.

We invite you to contribute to this important initiative and share your valuable experiences here:
**👉*** [https://nletwfvh.paperform.co](https://nletwfvh.paperform.co/)

---

## [237] 2024-05-20T10:08:21+00:00

- Permalink: https://t.me/tonblockchain/237
- Author: The Open Network
- Views: 161K

**USDt-TON reaches 200 million in circulation
**
[USDt-TON](https://ton.org/en/borderless) has doubled its success, reaching $200 million in circulation in less than a month after [launch,](https://t.me/toncoin/1267) setting a new record as the fastest growing launch in the history of Tether’s USDt.

Wen 1 billion?

**Videos:**
- https://cdn4.telesco.pe/file/5e54434b20.mp4?token=sS4aS6n3xS730gVzF_5MB9O1tNG8FPwFDYEcqOXmfUlP3dmTH4O1MqvOjBe6C_qt9aMOLSWq8WukHMxewqFSwTwXDosu4Gy7164i004NXrAtDLj20pzi_AzhTi1XuEXFeOOFrYp7lUcoSHCpxby4wJekk5s9c_AgOxvmAWAYmx6PA4lHXqsAzDxQqDdd6mOw81y-A0CfnaPzoN0q4RgKdz_M8RWgyNhZfmeZtwe-CcYBdx1CG2SfbowxviK8ZhxxoJefkuFbvq9Q-7ZMrcp6aGXIdrK2WGi8muxqgRLVyBeE5lFuLNYgfRxfId_Hkh6yo9CvyUhclI__KBMAhXKCkw

---

## [238] 2024-05-20T10:08:21+00:00

- Permalink: https://t.me/tonblockchain/238
- Author: The Open Network
- Views: 177K

**Link preview:**
- [TON, Our Largest Investment Ever](https://panteracapital.com/blockchain-letter/ton-our-largest-investment-ever/)

---

## [239] 2024-05-20T10:08:21+00:00

- Permalink: https://t.me/tonblockchain/239
- Author: The Open Network
- Views: 217K

**💎*** [Notcoin,](https://t.me/notcoin_bot) a miniapp on Telegram, reached 35M active users in just a few months. 

**🐸*** In this app, users could earn a game currency “notcoins” by clicking on the screen. Yesterday, the cryptocurrency Notcoin was minted on the TON blockchain and [listed](https://coinmarketcap.com/currencies/notcoin/) on all major cryptoexchanges. All of a sudden, Notcoin users who just played this game for fun could convert their in-game currency into real money **🤑***

**🚀*** Notcoin instantly became a top-10 cryptocurrency in the world by trading volume, and reached almost $700 million in market capitalization. Imagine — hundreds of millions of dollars in value were created for Telegram users in this miniapp out of nowhere in a matter of months **😲***

**💪*** This amazing success story shows how powerful the Telegram / TON ecosystems are for app developers. Telegram offers app developers more freedom than any other platform, providing unmatched opportunities to leverage social interactions for viral distribution. TON, in turn, provides scale and flexibility for any blockchain project on top of it **💎***

We are now seeing a large wave of new miniapps being built on Telegram and TON. Notcoin, the leader of the pack, used its mighty paws to pave the way for many apps to come **🐺***

---

## [240] 2024-05-27T18:47:49+00:00

- Permalink: https://t.me/tonblockchain/240
- Author: The Open Network
- Views: 375K

**Transition from jUSDT to native USDt **

USDt's launch on TON had [huge success](https://t.me/toncoin/1318): there are already 316 million USDt in circulation!

Before launching the native USDt, the [bridged](https://bridge.ton.org/) jUSDT fulfilled its role in the TON blockchain.

Along with the launch of native USDt on TON, work has begun on cross-chain solutions that will allow transfers of native USDt from various networks into TON blockchain and vice versa. 

Thus, we are proposing to start migrating from jUSDT to the native USDt on TON. 

— The perсentage fee in bridge has been removed from the transfer of jUSDT from TON back to Ethereum.

— Over the next few weeks, TON Foundation will add liquidity to the jUSDT-USDt pools on TON DEX(es) for a while to allow small holders of jUSDT be able to exchange them for native USDt on TON DEX(es).

— After two weeks, jUSDT transfers from Ethereum to TON on [bridge.ton.org](http://bridge.ton.org/) will be closed at **12:00 UTC **on** June 10**. Transfers of jUSDT from TON to Ethereum will work as long as there are jUSDT holders. Other tokens will continue to be processed without changes.

This is a scheduled event, all your funds are safe.
Please consider transferring either your jUSDT back to Ethereum via [bridge](https://bridge.ton.org/) (for larger amounts) or exchanging your jUSDT to native USDt on DEXes (for smaller amounts).

---

## [241] 2024-05-29T18:20:16+00:00

- Permalink: https://t.me/tonblockchain/241
- Author: The Open Network
- Views: 449K

**Toncoin circulating supply update**

The circulating Toncoin supply has been updated on data aggregators ([CoinGecko](https://www.coingecko.com/en/coins/toncoin), [CoinMarketCap](https://coinmarketcap.com/currencies/toncoin/), and [Tontech.io](http://Tontech.io/)) to align with [industry practice](https://www.coingecko.com/en/methodology) as laid out by CoinGecko. 

This new figure, effective from 29 May at 17:00 GST, follows an in-depth review of TON Blockchain data and among other things, specifically excludes the following locked or reserved tokens:

— Toncoin in the TON Believers Fund 
— Toncoin held by Telegram
— Toncoin held by The Open Network Foundation

---

## [242] 2024-06-01T13:04:14+00:00

- Permalink: https://t.me/tonblockchain/242
- Author: The Open Network
- Views: 433K

**Onchain fees in USDt**

Developers of TON wallets please read the following information:

[https://t.me/tondev_news/114](https://t.me/tondev_news/114)

[https://t.me/tondev_news/115](https://t.me/tondev_news/115)

---
