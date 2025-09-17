import { define } from "remount";
import Wallet from "./modules/Wallet";
import SubmitProof from "./modules/SubmitProof/";
import History from "./modules/History/";
import DepositOnAlignedBtn from "./modules/History/DepositOnAlignedBtn";
import UpdateUsernameBtn from "./modules/History/UpdateUsernameBtn";
import HistoryClaimNFT from "./modules/History/ClaimNFT";
import { CurrentBeastGame, SubmitBeastGameBtn } from "./modules/BeastGame/";
import WithdrawFromAlignedBtn from "./modules/History/WithdrawFromAlignedBtn";
import { HowItWorksModal } from "./modules/HowItWorksModal";
import InitialModals from "./modules/InitialModals";
import { ParityGame } from "./modules/Parity";
import { BackgroundMusicPromptBtn } from "./modules/BackgroundMusic/BackgroundMusicPrompt";
import { MuteBackgroundBtn } from "./modules/BackgroundMusic/MuteBtn";

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
	{ "x-app-history-claim-nft": HistoryClaimNFT },
	{
		attributes: [
			"network",
			"payment_service_address",
			"user_address",
			"nft_contract_address",
			"is_eligible",
		],
	}
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
			"nft_contract_address",
			"highest_level_reached",
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
			"highest_level_reached",
		],
	}
);

define(
	{ "x-app-background-music-prompt": BackgroundMusicPromptBtn },
	{
		attributes: [],
	}
);

define(
	{ "x-app-background-music-mute-btn": MuteBackgroundBtn },
	{ attributes: [] }
);
