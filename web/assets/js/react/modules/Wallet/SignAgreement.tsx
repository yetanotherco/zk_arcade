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
				message: "I agree with the service policy",
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
			maxWidth={900}
			open={open}
			setOpen={() => {}}
			shouldCloseOnOutsideClick={false}
			shouldCloseOnEsc={false}
			showCloseButton={false}
		>
			<div className="bg-contrast-100 w-full p-10 rounded flex flex-col gap-8">
				<form ref={formRef} action="/wallet/sign" method="post">
					<input type="hidden" name="_csrf_token" value={csrfToken} />
					<input type="hidden" name="address" value={address || ""} />
					<input type="hidden" name="signature" value={signature} />
				</form>

				<div className="text-center">
					<h3 className="text-3xl font-bold mb-2">
						Accept Terms of Service
					</h3>
					<p className="text-text-200">
						Welcome back! Please accept our terms to continue using
						ZK Arcade
					</p>
				</div>

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
					<h4 className="text-lg font-semibold mb-3">
						Terms of Service
					</h4>
					<div className="overflow-y-auto max-h-60 text-sm text-text-200 leading-relaxed">
						<p className="mb-4">
							Lorem ipsum dolor sit amet, consectetur adipiscing
							elit. Proin dapibus, felis sit amet convallis
							iaculis, felis purus commodo nibh, at sodales velit
							arcu a odio. Pellentesque dapibus volutpat odio, eu
							rutrum mauris malesuada et. Aliquam ligula velit,
							ultricies et mattis quis, ultrices in elit. Nam eget
							erat finibus, scelerisque purus eleifend, pretium
							lacus. Nam vitae tellus rhoncus, ornare libero eget,
							aliquam risus. Morbi lacinia lacinia ultricies.
							Morbi volutpat sollicitudin eros at vehicula.
							Pellentesque sed neque luctus, laoreet mi id, luctus
							est. Vivamus dictum ullamcorper lorem, non hendrerit
							purus condimentum et. Vestibulum viverra ligula vel
							lacinia porttitor. Donec blandit, ligula sit amet
							condimentum accumsan, quam elit sagittis nisl, et
							commodo lorem justo eget erat. Nam maximus arcu vel
							nibh feugiat accumsan. Ut aliquam massa ut pulvinar
							sagittis. Sed dictum mauris nec pretium feugiat.
							Aliquam erat volutpat. Mauris scelerisque sodales ex
							vel convallis.
						</p>
						<p className="mb-4">
							Sed ut perspiciatis unde omnis iste natus error sit
							voluptatem accusantium doloremque laudantium, totam
							rem aperiam, eaque ipsa quae ab illo inventore
							veritatis et quasi architecto beatae vitae dicta
							sunt explicabo. Nemo enim ipsam voluptatem quia
							voluptas sit aspernatur aut odit aut fugit, sed quia
							consequuntur magni dolores eos qui ratione
							voluptatem sequi nesciunt.
						</p>
						<p>
							TODO: Replace with actual terms of service content
						</p>
					</div>
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
						disabled={!isConnected || isSigningAgreement}
					>
						{isSigningAgreement ? "Signing..." : "Accept & Sign"}
					</Button>
				</div>
			</div>
		</Modal>
	);
};
