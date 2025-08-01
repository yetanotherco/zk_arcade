import { define } from "remount";
import Wallet from "./modules/Wallet";
import SubmitProof from "./modules/SubmitProof/";
import History from "./modules/History/";
import DepositOnAlignedBtn from "./modules/History/DepositOnAlignedBtn";
import UpdateUsernameBtn from "./modules/History/UpdateUsernameBtn";
import CurrentBeastGame from "./modules/BeastGame/";

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
		],
	}
);

define(
	{ "x-app-history-deposit-on-aligned-btn": DepositOnAlignedBtn },
	{ attributes: ["network", "payment_service_address", "user_address"] }
);

define(
	{ "x-app-history-update-username-btn": UpdateUsernameBtn },
	{ attributes: ["network", "username"] }
);

define(
	{ "x-app-current-game-beast": CurrentBeastGame },
	{ attributes: ["network", "leaderboard_address", "user_address"] }
);
