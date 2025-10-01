# Stress test

## Instructions

1. Clean the `parity-game-data` field at the local storage
2. Play the three parity games, copy the solution from the local storage `parity-game-data` field and paste it on `solution.json` (in this folder). Note that as we erased the previous games there is going to be only one solution steps.
3. Install jq if you dont have it, and run `jq 'to_entries[0].value' solution.json > temp.json && mv temp.json solution.json` to remove the unneded key (the game config).
4. Execute the stress test script passing the csrf token as parameter with `node stress_test.js`.
