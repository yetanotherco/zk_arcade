from pathlib import Path
import json

# ====== CONFIG ======
COUNT = 10000   # how many tickets you want
BASE_NAME = "Aligned ZK Arcade - Ticket - TESTNET ONLY"
DESCRIPTION = "Your ticket to the future of ethereum. TESTNET ONLY"
IMAGE_URI = "ipfs://bafkreiabklbmsnqwhjktmz55i4kyk6efypf7565n7nfkbkpevcsfsujb6i"
OUT_DIR = "."
# ====================

def make_metadata(name, description, image_uri):
    return {
        "name": name,
        "description": description,
        "image": image_uri,
    }

outdir = Path(OUT_DIR) / "metadata"
outdir.mkdir(parents=True, exist_ok=True)

for token_id in range(1, COUNT + 1):
    name = f"{BASE_NAME} #{token_id}"
    data = make_metadata(name, DESCRIPTION, IMAGE_URI)
    with (outdir / f"{token_id}").open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✅ wrote {COUNT} files under {outdir.resolve()}")
