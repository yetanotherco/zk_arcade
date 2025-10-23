import React, { useEffect, useRef, useState } from "react";
import { Modal } from "../../components/Modal";
import { useModal } from "../../hooks/useModal";
import { useToast } from "../../state/toast";
import { Button } from "../../components/Button";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";

export const SignAgreement = () => {
	const { open, setOpen } = useModal();
	const formRef = useRef<HTMLFormElement>(null);
	const [csrfToken, setCsrfToken] = useState("");
	const { address, isConnected } = useAccount();
	const [signature, setSignature] = useState("");
	const [isSigningAgreement, setIsSigningAgreement] = useState(false);
	const { signMessageAsync } = useSignMessage();
	const { disconnect } = useDisconnect();
	const { addToast } = useToast();

	const [termsMessage, setTermsMessage] = useState("");
	const [termsAccepted, setTermsAccepted] = useState(false);

	// Fetch message to sign (with address) on mount
	useEffect(() => {
		if (address) {
			fetch(`/api/wallet/terms-message?address=${address}`)
				.then((res) => res.json())
				.then((data) => {
					if (data.terms_message) {
						setTermsMessage(data.terms_message);
					}
				});
		}
	}, [address]);

	useEffect(() => {
		const csrfToken =
			document.head
				.querySelector("[name~=csrf-token]")
				?.getAttribute("content") || "";
		setCsrfToken(csrfToken);
	}, []);

	// Auto-open modal when component mounts (connected wallet needs agreement)
	useEffect(() => {
		if (isConnected && address) {
			setOpen(true);
		}
	}, [isConnected, address, setOpen]);

	const handleSignAgreement = async () => {
		if (!isConnected || !address) {
			addToast({
				title: "Error while signing",
				desc: "Please connect your wallet first.",
				type: "error",
			});
			return;
		}

		try {
			setIsSigningAgreement(true);
			const sig = await signMessageAsync({
				message: termsMessage,
			});
			setSignature(sig);
		} catch (err) {
			addToast({
				title: "Error while signing",
				desc: "There has been an unexpected error while signing.",
				type: "error",
			});
			setIsSigningAgreement(false);
		}
	};

	useEffect(() => {
		if (signature) {
			formRef.current?.submit();
		}
	}, [signature]);

	const handleCancel = () => {
		// Disconnect wallet and close modal
		disconnect();
		setOpen(false);
	};

	return (
		<Modal
			maxWidth={600}
			open={open}
			setOpen={() => {}}
			shouldCloseOnOutsideClick={false}
			shouldCloseOnEsc={false}
			showCloseButton={false}
		>
			<div className="bg-contrast-100 w-full p-10 rounded flex flex-col gap-5">
				<form ref={formRef} action="/wallet/sign" method="post">
					<input type="hidden" name="_csrf_token" value={csrfToken} />
					<input type="hidden" name="address" value={address || ""} />
					<input type="hidden" name="signature" value={signature} />
				</form>

				<p className="text-center">
					Welcome to Zk Arcade! Please accept our terms to continue and play games.
				</p>

				{/* Terms Section */}
				<div className="bg-text-300 bg-opacity-20 p-6 rounded">
					<label className="flex items-center gap-4">
						<input
							type="checkbox"
							className="mr-2"
							checked={termsAccepted}
							onChange={(e) => setTermsAccepted(e.target.checked)}
						/>
						<p className="mb-1 text-sm">
							I agree with Zk Arcade{" "}
							<a
								href="/tos"
								className="text-accent-100 hover:underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								Terms of Service
							</a>{" "}
							and{" "}
							<a
								href="/privacy"
								className="text-accent-100 hover:underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								Privacy Policy
							</a>.
						</p>
					</label>
				</div>

				{/* Action Buttons */}
				<div className="flex justify-between items-center">
					<Button
						variant="text"
						onClick={handleCancel}
						className="text-red hover:text-red-600"
					>
						Decline & Disconnect
					</Button>
					<Button
						variant="accent-fill"
						onClick={handleSignAgreement}
						disabled={!isConnected || isSigningAgreement || !termsAccepted}
					>
						{isSigningAgreement ? "Signing..." : "Accept & Sign"}
					</Button>
				</div>
			</div>
		</Modal>
	);
};
