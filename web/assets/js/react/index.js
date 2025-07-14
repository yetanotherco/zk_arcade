import { define } from "remount";
import { AppUserWallet } from "./app-user-wallet";

define(
	{ "x-app-user-wallet": AppUserWallet },
	{ attributes: ["network", "payment_service_address", "user_address"] }
);
