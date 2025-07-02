import { define } from "remount";
import AppAgreementSubmit from "./app-agreement-submit";
import AppGetUserBalance from "./app-get-user-balance";

define(
    { "x-app-agreement-submit": AppAgreementSubmit },
    { attributes: ["network"] }
);

define(
    { "x-app-get-user-balance": AppGetUserBalance },
    { attributes: ["network", "payment_service_address", "user_address"] }
);
