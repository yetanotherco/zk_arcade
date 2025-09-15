import { Address } from "viem";

export const batcherPaymentServiceAbi = [
	{
		name: "user_balances",
		type: "function",
		stateMutability: "view",
		inputs: [{ name: "account", type: "address", internalType: "address" }],
		outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
	},
	{
		name: "user_nonces",
		type: "function",
		stateMutability: "view",
		inputs: [{ name: "account", type: "address", internalType: "address" }],
		outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
	},
	{
		name: "withdraw",
		type: "function",
		stateMutability: "nonpayable",
		inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
		outputs: [],
	},
	{
		name: "user_unlock_block",
		type: "function",
		stateMutability: "view",
		inputs: [{ name: "account", type: "address", internalType: "address" }],
		outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
	},
	{
		name: "unlock",
		type: "function",
		stateMutability: "nonpayable",
		inputs: [],
		outputs: [],
	},
	{
		name: "lock",
		type: "function",
		stateMutability: "nonpayable",
		inputs: [],
		outputs: [],
	},
];

export const leaderboardAbi = [
	{
		type: "function",
		name: "submitBeastSolution",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "gameIndex", type: "uint256" },
			{ name: "proofCommitment", type: "bytes32" },
			{ name: "publicInputs", type: "bytes" },
			{ name: "proofGeneratorAddr", type: "bytes20" },
			{ name: "batchMerkleRoot", type: "bytes32" },
			{ name: "merkleProof", type: "bytes" },
			{ name: "verificationDataBatchIndex", type: "uint256" },
		],
		outputs: [],
	},
	{
		type: "function",
		name: "submitParitySolution",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "gameIndex", type: "uint256" },
			{ name: "proofCommitment", type: "bytes32" },
			{ name: "publicInputs", type: "bytes" },
			{ name: "proofGeneratorAddr", type: "bytes20" },
			{ name: "batchMerkleRoot", type: "bytes32" },
			{ name: "merkleProof", type: "bytes" },
			{ name: "verificationDataBatchIndex", type: "uint256" },
		],
		outputs: [],
	},
	{
		type: "function",
		name: "getUserScore",
		stateMutability: "view",
		inputs: [{ name: "user", type: "address" }],
		outputs: [{ type: "uint256" }],
	},
	{
		type: "function",
		name: "usersBeastLevelCompleted",
		inputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
		outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "beastGames",
		inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
		outputs: [
			{
				components: [
					{
						internalType: "uint256",
						name: "endsAtTime",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "gameConfig",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "startsAtTime",
						type: "uint256",
					},
				],
				internalType: "struct BeastGame",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "parityGames",
		inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
		outputs: [
			{
				components: [
					{
						internalType: "uint256",
						name: "endsAtTime",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "gameConfig",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "startsAtTime",
						type: "uint256",
					},
				],
				internalType: "struct BeastGame",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
	},
	{
		inputs: [],
		name: "getCurrentBeastGame",
		outputs: [
			{
				components: [
					{
						internalType: "uint256",
						name: "endsAtTime",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "gameConfig",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "startsAtTime",
						type: "uint256",
					},
				],
				internalType: "struct BeastGame",
				name: "",
				type: "tuple",
			},
			{
				internalType: "uint256",
				name: "idx",
				type: "uint256",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "getCurrentParityGame",
		outputs: [
			{
				components: [
					{
						internalType: "uint256",
						name: "endsAtTime",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "gameConfig",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "startsAtTime",
						type: "uint256",
					},
				],
				internalType: "struct ParityGame",
				name: "",
				type: "tuple",
			},
			{
				internalType: "uint256",
				name: "idx",
				type: "uint256",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		type: "function",
		name: "usersParityLevelCompleted",
		inputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
		outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
		stateMutability: "view",
	},
	{ type: "error", name: "NoActiveBeastGame", inputs: [] },
	{ type: "error", name: "NoActiveParityGame", inputs: [] },
];

export const zkArcadeNftAbi = [
	{
		type: "function",
		stateMutability: "view",
		name: "isWhitelisted",
		inputs: [{ name: "user", type: "address" }],
		outputs: [{ type: "bool" }],
	},
	{
		type: "function",
		stateMutability: "view",
		name: "balanceOf",
		inputs: [{ name: "owner", type: "address" }],
		outputs: [{ type: "uint256" }],
	},
	{
		type: "function",
		stateMutability: "nonpayable",
		name: "claimNFT",
		inputs: [
			{ name: "merkleProof", type: "bytes32[]" },
			{ name: "rootIndex", type: "uint256" },
		],
		outputs: [],
	},
] as const;

export const eip712Domain = (
	chainId: number,
	batcherPaymentServiceAddress: Address
) => ({
	name: "Aligned",
	version: "1",
	chainId,
	verifyingContract: batcherPaymentServiceAddress,
});

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
