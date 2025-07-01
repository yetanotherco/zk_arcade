# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:
#
#     ZkArcade.Repo.insert!(%ZkArcade.SomeSchema{})
#
# We recommend using the bang functions (`insert!`, `update!`
# and so on) as they will fail if something goes wrong.

[
  %{
    address: "0xfd725eA08546656D0D66C7a18A8e70bA9562763F",
    amount: "100",
    merkle_proof: "great_merkle_proof"
  },
  %{
    address: "0x1d725eA08546656D0D66C7a18A8e70bA95627638",
    amount: "200",
    merkle_proof: "great_merkle_proof_2"
  },
  %{
    address: "0x2d725eA08546656D0D66C7a18A8e70bA95627639",
    amount: "300",
    merkle_proof: "great_merkle_proof_3"
  },
  %{
    address: "0x291093d315e4682EB1Ec51d7D4dc48141f07CcA3",
    amount: "417",
    merkle_proof: "great_merkle_proof_4"
  }
]
|> Enum.each(&ZkArcade.Accounts.create_wallet/1)
