import { Address, Cell } from '@ton/ton'

// -----------------------------------------------------------------------
// Tonkeeper transfer deeplink
// -----------------------------------------------------------------------
// A transfer deeplink asks the wallet to send `amount` nanoTON to `to` with
// `body` attached as the message payload. It is the simplest way to get a
// single message signed: no TonConnect bridge, no daemon, no QR pairing —
// the user opens the link in Tonkeeper and approves once. We use it to set a
// `.ton` `site` record (a `change_dns_record` to the domain NFT) without
// touching the `storage` record or re-uploading a bag.
//
// Shape (Tonkeeper universal link):
//   https://app.tonkeeper.com/transfer/<addr>?amount=<nano>&bin=<base64url(boc)>
// Ref: https://github.com/tonkeeper/wallet-api (transfer link `bin` param).

const TONKEEPER_TRANSFER_BASE = 'https://app.tonkeeper.com/transfer'

/**
 * RFC 4648 §5 base64url: `+`→`-`, `/`→`_`, strip `=` padding. Tonkeeper's
 * `bin` parameter expects the message-body BOC encoded this way.
 */
export function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export interface TonkeeperTransferLink {
  /** Destination contract (here: the `.ton` domain NFT item). */
  to: Address
  /** Attached value in nanoTON; must be positive (covers gas). */
  amountNano: bigint
  /** Message body cell (here: a `change_dns_record` op). */
  body: Cell
  /** Encode `to` in testnet form (`testOnly` address flag). */
  testnet?: boolean
}

/**
 * Build a Tonkeeper transfer deeplink for a single signed message.
 *
 * The address is encoded bounceable (it targets a deployed contract) and
 * url-safe; the body is serialized to BOC and base64url-encoded into `bin`.
 * Both `amount` and `bin` use URL-safe characters, so the query string is
 * left intact by `URLSearchParams`.
 */
export function buildTonkeeperTransferDeeplink(link: TonkeeperTransferLink): string {
  if (link.amountNano <= 0n) {
    throw new Error(`Transfer amount must be positive (got ${link.amountNano})`)
  }
  const addr = link.to.toString({ urlSafe: true, bounceable: true, testOnly: !!link.testnet })
  const bin = toBase64Url(link.body.toBoc())
  const params = new URLSearchParams({ amount: link.amountNano.toString(), bin })
  return `${TONKEEPER_TRANSFER_BASE}/${addr}?${params.toString()}`
}
