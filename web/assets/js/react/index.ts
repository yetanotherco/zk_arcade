import { define } from "remount";
import Wallet from "./modules/Wallet";
import SubmitProof from "./modules/SubmitProof/";
import History from "./modules/History/";
import DepositOnAlignedBtn from "./modules/History/DepositOnAlignedBtn";
import UpdateUsernameBtn from "./modules/History/UpdateUsernameBtn";
import { CurrentBeastGame, SubmitBeastGameBtn } from "./modules/BeastGame/";
import WithdrawFromAlignedBtn from "./modules/History/WithdrawFromAlignedBtn";
import { HowItWorksModal } from "./modules/HowItWorksModal";
import InitialModals from "./modules/InitialModals";
import { ParityGame } from "./modules/Parity";

define(
	{ "x-app-user-wallet": Wallet },
	{
		attributes: [
			"network",
			"payment_service_address",
			"leaderboard_address",
			"user_address",
			"proofs",
			"username",
			"user_position",
			"explorer_url",
			"batcher_url",
			"user_beast_submissions",
			"is_eligible",
			"nft_contract_address",
		],
	}
);

define(
	{ "x-app-submit-proof": SubmitProof },
	{
		attributes: [
			"network",
			"payment_service_address",
			"user_address",
			"batcher_url",
			"leaderboard_address",
			"beast_submissions",
			"nft_contract_address",
		],
	}
);

define(
	{ "x-app-history": History },
	{
		attributes: [
			"network",
			"proofs",
			"leaderboard_address",
			"payment_service_address",
			"user_address",
			"explorer_url",
			"batcher_url",
			"nft_contract_address",
		],
	}
);

define(
	{ "x-app-history-deposit-on-aligned-btn": DepositOnAlignedBtn },
	{ attributes: ["network", "payment_service_address", "user_address"] }
);

define(
	{ "x-app-history-withdraw-from-aligned-btn": WithdrawFromAlignedBtn },
	{ attributes: ["network", "payment_service_address", "user_address"] }
);

define(
	{ "x-app-history-update-username-btn": UpdateUsernameBtn },
	{ attributes: ["network", "username"] }
);

define(
	{ "x-app-submit-beast-solution-btn": SubmitBeastGameBtn },
	{
		attributes: [
			"network",
			"payment_service_address",
			"user_address",
			"batcher_url",
			"leaderboard_address",
			"beast_submissions",
			"nft_contract_address",
		],
	}
);

define(
	{ "x-app-current-game-beast": CurrentBeastGame },
	{ attributes: ["network", "leaderboard_address", "user_address"] }
);

define({ "x-app-how-it-works-modal": HowItWorksModal });

define(
	{ "x-app-initial-modals": InitialModals },
	{
		attributes: [
			"network",
			"payment_service_address",
			"nft_contract_address",
			"user_address",
			"eligible",
		],
	}
);

define(
	{
		"x-app-parity-game": ParityGame,
	},
	{
		attributes: [
			"network",
			"payment_service_address",
			"user_address",
			"batcher_url",
			"leaderboard_address",
			"nft_contract_address",
		],
	}
);
