#!/bin/bash

RPC_URL="http://localhost:8545"
SENDER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
AMOUNT="10ether"
NUM_ACCOUNTS=100
OUTPUT_FILE="rich_accounts.json"

echo "[" > "$OUTPUT_FILE"

echo "Generating $NUM_ACCOUNTS accounts and sending $AMOUNT to each one..."

for i in $(seq 1 $NUM_ACCOUNTS); do
    echo "Processing account $i/$NUM_ACCOUNTS..."
    
    WALLET_OUTPUT=$(cast wallet new)
    
    ADDRESS=$(echo "$WALLET_OUTPUT" | grep "Address:" | awk '{print $2}')
    PRIVATE_KEY=$(echo "$WALLET_OUTPUT" | grep "Private key:" | awk '{print $3}')
    
    echo "  Sending $AMOUNT a $ADDRESS..."
    cast send "$ADDRESS" \
        --value "$AMOUNT" \
        --private-key "$SENDER_PRIVATE_KEY" \
        --rpc-url "$RPC_URL" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "  ✓ Successful transfer"
    else
        echo "  ✗ Transfer error"
    fi
    
    if [ $i -eq $NUM_ACCOUNTS ]; then
        echo "  {" >> "$OUTPUT_FILE"
        echo "    \"address\": \"$ADDRESS\"," >> "$OUTPUT_FILE"
        echo "    \"privateKey\": \"$PRIVATE_KEY\"" >> "$OUTPUT_FILE"
        echo "  }" >> "$OUTPUT_FILE"
    else
        echo "  {" >> "$OUTPUT_FILE"
        echo "    \"address\": \"$ADDRESS\"," >> "$OUTPUT_FILE"
        echo "    \"privateKey\": \"$PRIVATE_KEY\"" >> "$OUTPUT_FILE"
        echo "  }," >> "$OUTPUT_FILE"
    fi
    
    sleep 0.1
done

echo "]" >> "$OUTPUT_FILE"

echo ""
echo "✓ Process completed!"
echo "Total $NUM_ACCOUNTS accounts have been saved to $OUTPUT_FILE"
