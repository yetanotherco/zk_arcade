import React, { useEffect, useRef, useState } from "react";
import { Modal } from "../../components/Modal";
import { useModal } from "../../hooks/useModal";
import { Button } from "../../components/Button";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectKitButton } from "connectkit";

export const ConnectWalletWithAgreement = () => {
	const { open, setOpen, toggleOpen } = useModal();
	
	// Custom modal control to prevent unwanted closing
	const handleModalClose = () => {
		if (!walletConnectionInProgress && !isSigningAgreement) {
			setOpen(false);
		}
	};

	const formRef = useRef<HTMLFormElement>(null);
	const [csrfToken, setCsrfToken] = useState("");
	const { address, isConnected } = useAccount();
	const [signature, setSignature] = useState("");
	const [isSigningAgreement, setIsSigningAgreement] = useState(false);
	const [walletConnectionInProgress, setWalletConnectionInProgress] = useState(false);
	const { signMessageAsync } = useSignMessage();

	useEffect(() => {
		const csrfToken =
			document.head
				.querySelector("[name~=csrf-token]")
				?.getAttribute("content") || "";
		setCsrfToken(csrfToken);
	}, []);

	const handleSignAgreement = async () => {
		if (!isConnected || !address) {
			alert("Please connect your wallet first.");
			return;
		}

		try {
			setIsSigningAgreement(true);
			const sig = await signMessageAsync({
				message: "I agree with the service policy",
			});
			setSignature(sig);
		} catch (err) {
			alert(`Error signing: ${err}`);
			setIsSigningAgreement(false);
		}
	};

	useEffect(() => {
		if (signature) {
			formRef.current?.submit();
		}
	}, [signature]);

	// Track wallet connection to prevent modal closing
	useEffect(() => {
		if (isConnected && walletConnectionInProgress) {
			setWalletConnectionInProgress(false);
			// Ensure modal stays open after wallet connection
			if (!open) {
				setOpen(true);
			}
		}
	}, [isConnected, walletConnectionInProgress, open, setOpen]);

	return (
		<>
			<div className="cursor-pointer" onClick={toggleOpen}>
				Connect Wallet
			</div>
			
			<Modal maxWidth={900} open={open} setOpen={handleModalClose}>
				<div className="bg-contrast-100 w-full p-10 rounded flex flex-col gap-8">
					<form ref={formRef} action="/wallet/sign" method="post">
						<input
							type="hidden"
							name="_csrf_token"
							value={csrfToken}
						/>
						<input
							type="hidden"
							name="address"
							value={address || ""}
						/>
						<input
							type="hidden"
							name="signature"
							value={signature}
						/>
					</form>

					<div className="text-center">
						<h3 className="text-3xl font-bold mb-2">
							Connect Wallet & Accept Terms
						</h3>
						<p className="text-text-200">
							Please read our terms of service and connect your wallet to continue
						</p>
					</div>

					{/* Progress Steps */}
					<div className="flex items-center justify-center gap-4 mb-4">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center text-white font-bold">
								1
							</div>
							<span className="text-sm">Read Terms</span>
						</div>
						<div className="w-8 h-0.5 bg-text-200"></div>
						<div className="flex items-center gap-2">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
								isConnected ? 'bg-accent-100 text-white' : 'bg-text-300 text-text-200'
							}`}>
								2
							</div>
							<span className="text-sm">Connect Wallet</span>
						</div>
						<div className="w-8 h-0.5 bg-text-200"></div>
						<div className="flex items-center gap-2">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
								signature ? 'bg-accent-100 text-white' : 'bg-text-300 text-text-200'
							}`}>
								3
							</div>
							<span className="text-sm">Sign Agreement</span>
						</div>
					</div>

					{/* Terms Section */}
					<div className="bg-text-300 bg-opacity-20 p-6 rounded">
						<h4 className="text-lg font-semibold mb-3">Terms of Service</h4>
						<div className="overflow-y-auto max-h-60 text-sm text-text-200 leading-relaxed">
							<p className="mb-4">
								Welcome to ZK Arcade. By using our service, you agree to these terms.
							</p>
							<p className="mb-4">
								<strong>1. Service Description:</strong> ZK Arcade is a platform for zero-knowledge proof games 
								where users can submit cryptographic proofs of game completion to earn rewards and compete 
								on leaderboards.
							</p>
							<p className="mb-4">
								<strong>2. Wallet Connection:</strong> You must connect an Ethereum-compatible wallet to use 
								our services. You are responsible for the security of your wallet and private keys.
							</p>
							<p className="mb-4">
								<strong>3. Proof Submission:</strong> By submitting proofs, you certify that they were 
								generated honestly and represent legitimate gameplay.
							</p>
							<p className="mb-4">
								<strong>4. Privacy:</strong> We use zero-knowledge proofs to verify gameplay without 
								revealing private information about your game state.
							</p>
							<p>
								<strong>5. Limitation of Liability:</strong> ZK Arcade is provided "as is" without warranties. 
								Use at your own risk.
							</p>
						</div>
					</div>

					{/* Wallet Connection Section */}
					<div className="bg-text-300 bg-opacity-20 p-6 rounded">
						<h4 className="text-lg font-semibold mb-3">Wallet Connection</h4>
						{!isConnected ? (
							<div className="text-center">
								<p className="text-sm text-text-200 mb-4">
									Connect your wallet to continue with the agreement
								</p>
								<ConnectKitButton.Custom>
									{({ show }) => (
										<Button 
											variant="accent-fill" 
											onClick={() => {
												setWalletConnectionInProgress(true);
												show();
											}}
										>
											Connect Wallet
										</Button>
									)}
								</ConnectKitButton.Custom>
							</div>
						) : (
							<div className="text-center">
								<p className="text-sm text-accent-100 mb-2">✓ Wallet Connected</p>
								<p className="text-sm font-mono text-text-200">
									{address?.slice(0, 6)}...{address?.slice(-4)}
								</p>
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex justify-between items-center">
						<Button variant="text" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						
						<Button 
							variant="accent-fill" 
							onClick={handleSignAgreement}
							disabled={!isConnected || isSigningAgreement}
						>
							{isSigningAgreement ? "Signing..." : "I Agree & Sign Message"}
						</Button>
					</div>
				</div>
			</Modal>
		</>
	);
};
