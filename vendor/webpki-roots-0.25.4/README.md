# webpki-roots 0.25.4 (patched)

Copy of [webpki-roots 0.25.4](https://crates.io/crates/webpki-roots/0.25.4)
(MPL-2.0) with two trust anchors removed because of the eMudhra intermediate CA
key compromise (https://emudhra.we-have-a-problem.com/):

- `emSign ECC Root CA - G3` (sha256 `86A1ECBA…A36BBE6B`): cross-signs
  `emSign Root TLS CA - G3`, the issuer of the compromised intermediates.
  Upstream removed it in webpki-roots 1.0.10.
- `AAA Certificate Services` (sha256 `D7A7A0FB…EA699EF4`): cross-signed the
  compromised intermediates. Mozilla no longer trusts it for TLS, and
  webpki-roots 1.x no longer ships it.

`ethers` 2.0.14 still depends on this version through `reqwest` 0.11 and
`tokio-tungstenite` 0.20, and 0.25.x will not get an upstream release. The
`[patch.crates-io]` entries in `merkle_tree/Cargo.toml` and
`games/beast/Cargo.toml` use this copy in its place. Remove it once nothing
depends on webpki-roots 0.25.
