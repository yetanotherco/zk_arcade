# zk beast1984

This is a fork of [Beast](https://github.com/dominikwilkowski/beast), a minimalist tile puzzle game originally developed by [Dominik Wilkowski](https://github.com/dominikwilkowski).
All credit for the [original game](https://github.com/dominikwilkowski/beast) mechanics, design, and implementation goes to Dominik.

This version adds an experimental integration of zero-knowledge proving using the RISC Zero zkVM to demonstrate privacy-preserving proof-of-completion for games.

You can try the original version [here](dominik.wilkowski.dev/beast).

## Run the game and submit a proof

### Requirements

-   [Rust](https://www.rust-lang.org/tools/install)
-   [Risc0-Toolchain](https://dev.risczero.com/api/zkvm/install)

1. Clone the repo:

```shell
git clone https://github.com/yetanotherco/zk-beast1984.git
cd zk-beast1984
```

2. Compile the and run in the terminal:

```shell
make play_beast
```

3. Submit your proof:

First fill the variables in `beast1984/cmd/.<NETWORK>.env` depending on the network (mainnet|holesky|holesky-stage|devnet).

```shell
make submit_beast_solution NETWORK=<NETWORK>
```
