import { define } from "remount";
import Wallet from "./modules/Wallet";

define(
	{ "x-app-user-wallet": Wallet },
	{ attributes: ["network", "payment_service_address", "user_address"] }
);
