# zk beast1984

This is a fork of [Beast](https://github.com/dominikwilkowski/beast), a minimalist tile puzzle game originally developed by [Dominik Wilkowski](https://github.com/dominikwilkowski).
All credit for the [original game](https://github.com/dominikwilkowski/beast) mechanics, design, and implementation goes to Dominik.

This version adds an experimental integration of zero-knowledge proving using the RISC Zero zkVM to demonstrate privacy-preserving proof-of-completion for games.

You can try the original version [here](dominik.wilkowski.dev/beast).

## Run the game

### Requirements

1. [Rust](https://www.rust-lang.org/tools/install)
2. [Risc0-Toolchain](https://dev.risczero.com/api/zkvm/install)

3. Clone the repo:

```shell
git clone https://github.com/yetanotherco/zk-beast1984.git
cd zk-beast1984
```

2. Compile the and run in the terminal:

```shell
cargo run --release --bin beast
```
