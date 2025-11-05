import pandas as pd
import sys
import logging
from pathlib import Path

# Reads previously filtered addresses from all campaigns from the specified folder
def read_previously_filtered(inserted_dir):
    print(f"Reading previously filtered addresses from the files of {inserted_dir} folder...")

    # Read all files in the specified folder and gets the addresses column of each file
    addresses = set()
    for file_path in Path(inserted_dir).glob("*.csv"):
        print(f"Processing {file_path}...")
        try:
            df = pd.read_csv(file_path)
            addresses.update(df['address'].str.lower())
        except Exception as e:
            logging.warning(f"Error reading {file_path}: {e}")

    return addresses

# Reads OFAC addresses from ofac.csv
def read_ofac_addresses():
    print(f"Reading OFAC addresses from data/ofac.csv...")
    try:
        df = pd.read_csv("data/ofac.csv")
        return set(df['address'].str.lower())
    except Exception as e:
        logging.warning(f"Error reading ofac.csv: {e}")
        return set()
    
def print_stats(whitelist_df, df_filtered, df_removed):
    print()
    print(f"Total addresses in original whitelist: {len(whitelist_df)}")
    print(f"Addresses after filtering: {len(df_filtered)}")
    print(f"Addresses removed: {len(df_removed)}")
    print(f" - Due to duplicates in current whitelist: {len(df_removed[df_removed['reason'] == 'duplicate_current_whitelist'])}")
    print(f" - Due to duplicates from previous campaigns: {len(df_removed[df_removed['reason'] == 'duplicate_previous_campaign'])}")
    print(f" - Due to OFAC list: {len(df_removed[df_removed['reason'] == 'ofac'])}")
    print()

# Filters out addresses that are duplicates, in previous campaigns, or in the OFAC list. Saves the filtered addresses
# to new_addresses.csv and the removed addresses to removed_addresses.csv with a reason column.
def filter_repeated_and_ofac_addresses(whitelist_path, inserted_dir):
    previously_filtered = read_previously_filtered(inserted_dir)
    ofac_addresses = read_ofac_addresses()

    whitelist_df = pd.read_csv(whitelist_path)
    whitelist_df['address'] = whitelist_df['address'].str.lower()

    # Find duplicates within the file
    duplicates_mask = whitelist_df.duplicated(subset=['address'], keep='first')
    duplicates_df = whitelist_df[duplicates_mask].copy()
    duplicates_df['reason'] = 'duplicate_current_whitelist'

    # Remove duplicates from the working dataframe
    whitelist_df_no_dups = whitelist_df[~duplicates_mask]

    # Filter out previous campaigns and OFAC addresses
    filtered_out_mask = whitelist_df_no_dups['address'].isin(previously_filtered) | whitelist_df_no_dups['address'].isin(ofac_addresses)
    df_filtered = whitelist_df_no_dups[~filtered_out_mask]
    df_removed_other = whitelist_df_no_dups[filtered_out_mask].copy()
    df_removed_other['reason'] = df_removed_other['address'].apply(
        lambda x: 'ofac' if x in ofac_addresses else 'duplicate_previous_campaign'
    )

    # Combine all removed addresses
    df_removed = pd.concat([duplicates_df, df_removed_other], ignore_index=True)

    print_stats(whitelist_df, df_filtered, df_removed)

    new_addresses_output_path = "data/exclusive/new_addresses.csv"
    removed_addresses_output_path = "data/exclusive/removed_addresses.csv"
    is_public = 'discount' in whitelist_path.lower()
    if is_public:
        print("Note: This whitelist is for the public campaign.")
        new_addresses_output_path = "data/discount/new_addresses.csv"
        removed_addresses_output_path = "data/discount/removed_addresses.csv"

    # NOTE: This is to be intended to be run from the root of the repository
    # so the data/ folder is correctly referenced.
    df_filtered.to_csv(new_addresses_output_path, index=False)
    df_removed.to_csv(removed_addresses_output_path, index=False)

    print(f"New addresses saved to {new_addresses_output_path}")
    print(f"Removed addresses saved to {removed_addresses_output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python preprocess_addresses.py <whitelist_path> <inserted_dir>")
        sys.exit(1)
    
    whitelist_path = sys.argv[1]
    inserted_dir = sys.argv[2]

    filter_repeated_and_ofac_addresses(whitelist_path, inserted_dir)
