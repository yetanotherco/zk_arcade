from pathlib import Path
import json

# ====== CONFIG ======
COUNT = 700   # how many tickets you want
BASE_NAME = "Aligned ZK Arcade - Testnet ONLY - Premium Ticket"
DESCRIPTION = "Your - Testnet ONLY - ticket to the future of ethereum."
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

for token_id in range(0, COUNT ):
    name = f"{BASE_NAME} #{token_id}"
    data = make_metadata(name, DESCRIPTION, IMAGE_URI)
    with (outdir / f"{token_id}").open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✅ wrote {COUNT} files under {outdir.resolve()}")
