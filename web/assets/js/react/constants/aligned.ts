export const batcherPaymentServiceAbi = [
    {
        name: "user_balances",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "user_nonces",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
];

export const eip712Domain = {
    name: "Aligned",
    version: "1",
    chainId: 31337,
    verifyingContract:
        "0x7969c5eD335650692Bc04293B07F5BF2e7A673C0" as `0x${string}`,
} as const;

export const eip712Types = {
    NoncedVerificationData: [
        { name: "verification_data_hash", type: "bytes32" },
        { name: "nonce", type: "uint256" },
        { name: "max_fee", type: "uint256" },
    ],
};

export const GAS_ESTIMATION = {
    DEFAULT_CONSTANT_GAS_COST: BigInt(537500),
    ADDITIONAL_SUBMISSION_GAS_COST_PER_PROOF: BigInt(2000),
    GAS_PRICE_PERCENTAGE_MULTIPLIER: BigInt(110),
    PERCENTAGE_DIVIDER: BigInt(100),
} as const;
