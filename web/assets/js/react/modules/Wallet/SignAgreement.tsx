import React, { useEffect, useRef, useState } from "react";
import { Modal } from "../../components/Modal";
import { useModal } from "../../hooks/useModal";
import { useToast } from "../../state/toast";
import { Button } from "../../components/Button";
import { useAccount, useSignMessage, useDisconnect, useChainId } from "wagmi";

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

	const [termsAccepted, setTermsAccepted] = useState(false);

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

		const messageToSign = "Zk Arcade wants you to sign and accept the Terms of Service and Privacy Policy \n\n"
			+ "Your address: " + address + "\n\n"
			+ "Click to sign in and accept the Zk Arcade Terms of Service (https://zkarcade.com/tos) and Privacy Policy (https://zkarcade.com/privacy).\n";

		try {
			setIsSigningAgreement(true);
			const sig = await signMessageAsync({
				message: messageToSign,
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

				{/* Connected Wallet Display */}
				<div className="bg-text-300 bg-opacity-20 p-6 rounded text-center">
					<p className="text-sm text-accent-100 mb-2">
						✓ Wallet Connected
					</p>
					<p className="text-sm font-mono text-text-200">
						{address?.slice(0, 6)}...{address?.slice(-4)}
					</p>
				</div>

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
