import pandas as pd
import sys
import logging
from pathlib import Path

# Reads previously filtered addresses from all campaigns from the /inserted folder
def read_previously_filtered():
    print(f"Reading previously filtered addresses from the files of inserted folder...")

    # Read all files in the /inserted folder and gets the addresses column of each file
    addresses = set()
    for file_path in Path("data/inserted").glob("*.csv"):
        print(f"Processing {file_path}...")
        try:
            df = pd.read_csv(file_path)
            addresses.update(df['address'].str.lower())
        except Exception as e:
            logging.warning(f"Error reading {file_path}: {e}")

    return addresses

# Reads OFAC addresses from ofac.csv
def read_ofac_addresses():
    print(f"Reading OFAC addresses from ofac.csv...")
    try:
        df = pd.read_csv("data/ofac.csv")
        return set(df['address'].str.lower())
    except Exception as e:
        logging.warning(f"Error reading ofac.csv: {e}")
        return set()

# Filters out addresses that are either in previous campaigns or in the OFAC list. Saves the filtered addresses
# to new_addresses.csv and the removed addresses to removed_addresses.csv with a reason column.
def filter_repeated_and_ofac_addresses(whitelist_path):
    previously_filtered = read_previously_filtered()
    ofac_addresses = read_ofac_addresses()

    whitelist_df = pd.read_csv(whitelist_path)
    whitelist_df['address'] = whitelist_df['address'].str.lower()

    df_filtered = whitelist_df[~whitelist_df['address'].isin(previously_filtered) & ~whitelist_df['address'].isin(ofac_addresses)]
    df_removed = whitelist_df[whitelist_df['address'].isin(previously_filtered) | whitelist_df['address'].isin(ofac_addresses)].copy()
    df_removed['reason'] = df_removed['address'].apply(
        lambda x: 'ofac' if x in ofac_addresses else 'repeated'
    )

    df_filtered.to_csv("data/new_addresses.csv", index=False)
    df_removed.to_csv("data/removed_addresses.csv", index=False)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python filter_repeated.py <whitelist_path>")
        sys.exit(1)
    
    whitelist_path = sys.argv[1]

    filter_repeated_and_ofac_addresses(whitelist_path)
