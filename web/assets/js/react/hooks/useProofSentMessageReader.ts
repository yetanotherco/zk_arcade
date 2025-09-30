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
				desc: "The proof submission failed. Please try again later.",
				type: "error",
			});
		}

		if (message == "bump-failed") {
			addToast({
				title: "Bump failed",
				desc: "The bump transaction failed. Check if the original proof transaction was verified before bumping the fee again.",
				type: "warning",
			});
		}

		if (message == "underpriced-proof") {
			addToast({
				title: "Underpriced proof",
				desc: "The proof was underpriced. Please send the proof again with a higher fee.",
				type: "warning",
			});
		}

		if (message == "invalid-nonce") {
			addToast({
				title: "Invalid nonce",
				desc: "The proof was included in the batch, the bump transaction was skipped.",
				type: "warning",
			});
		}

		if (message == "insufficient-balance") {
			addToast({
				title: "Insufficient balance",
				desc: "You do not have enough funds to bump the proof fee. The transaction was skipped.",
				type: "warning",
			});
		}

		if (message == "proof-sent") {
			addToast({
				title: "Proof sent to Aligned",
				desc: "The proof was sent and it will be verified. You can check the proof status in your profile",
				type: "success",
			});
		}

		if (message == "proofs-bumped") {
			addToast({
				title: "Proofs successfully bumped",
				desc: "The fee has been increased for your pending proofs. They will be processed with higher priority.",
				type: "success",
			});
		}

		if (message == "user-not-connected") {
			addToast({
				title: "User not connected",
				desc: "You must be connected to a wallet to view your profile.",
				type: "error",
			});
		}

		if (message == "level-reached") {
			addToast({
				title: "Level already reached",
				desc: `You have already reached this level in a previous run for today's game`,
				type: "error",
			});
		}

		// Remove the message param from the URL without reloading the page
		// this prevents showing the message again when the user refreshes the page
		if (message) {
			const params = new URLSearchParams(window.location.search);
			params.delete("message");

			const newUrl =
				window.location.pathname +
				(params.toString() ? `?${params.toString()}` : "") +
				window.location.hash;

			window.history.replaceState({}, "", newUrl);
		}
	}, []);
};
