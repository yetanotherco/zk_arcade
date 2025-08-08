import { useEffect } from "react";
import { useToast } from "../state/toast";

export const useProofSentMessageReader = () => {
	const { addToast } = useToast();

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const message = params.get("message");

		if (message == "proof-failed") {
			addToast({
				title: "Proof failed",
				desc: "The proof was sent but the verification failed",
				type: "error",
			});
		}

		if (message == "proof-sent") {
			addToast({
				title: "Proof sent to Aligned",
				desc: "The proof was sent and it will be verified soon. You can check the status of the proof in your profile",
				type: "success",
			});
		}

		// Remove the message param from the URL without reloading the page
		// this prevents showing the message again when the user refreshes the page
		if (message) {
			const newUrl = window.location.pathname;
			window.history.replaceState({}, "", newUrl);
		}
	}, []);
};
