import { define } from "remount";
import Wallet from "./modules/Wallet";
import SubmitProof from "./modules/SubmitProof/";
import History from "./modules/History/";

define(
	{ "x-app-user-wallet": Wallet },
	{
		attributes: [
			"network",
			"payment_service_address",
			"leaderboard_address",
			"user_address",
			"proofs",
		],
	}
);

define(
	{ "x-app-submit-proof": SubmitProof },
	{ attributes: ["network", "payment_service_address", "user_address"] }
);

define(
	{ "x-app-history": History },
	{ attributes: ["proofs", "leaderboard_address"] }
)
