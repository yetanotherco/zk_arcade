import { define } from "remount";
import AppCheckClaim from "./app-check-claim";
import AppSendClaim from "./app-send-claim";

console.log("Remount index.js ejecutado");

define(
    { "x-app-check-claim": AppCheckClaim },
    { attributes: ["network"] }
);

define(
    { "x-app-send-claim": AppSendClaim },
    {
        attributes: [
            "network",
            "proxy_contract_address",
            "merkle_proof",
            "amount"]
    }
);
