import { define } from "remount";
import AppAgreementSubmit from "./app-agreement-submit";

define(
    { "x-app-agreement-submit": AppAgreementSubmit },
    { attributes: ["network"] }
);
