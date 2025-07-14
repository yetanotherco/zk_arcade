import React, { useCallback, useEffect, useRef, useState } from "react";
import Web3EthProvider from "./providers/web3-eth-provider";
import { Modal } from "./components/Modal";
import { useModal } from "./hooks/useModal";
import { Button } from "./components/Button";
import { useAccount, useConnect, useConnectors, useSignMessage } from "wagmi";

type Props = {
	network: string;
	payment_service_address: string;
	user_address?: string;
};

export const AppUserWallet = ({
	network,
	payment_service_address,
	user_address,
}: Props) => {
	return (
		<Web3EthProvider network={network}>
			<div
				className="bg-contrast-100 p-1 rounded flex justify-between items-center"
				style={{ width: 180 }}
			>
				{user_address ? (
					<>
						<div>
							<p className="text-xs">Connected:</p>
							<p className="font-bold text-md">0x032...3211</p>
						</div>
						<span className="hero-chevron-down size-3.5" />
					</>
				) : (
					<ConnectWallet />
				)}
			</div>
		</Web3EthProvider>
	);
};

const ConnectWallet = () => {
	const { open, setOpen, toggleOpen } = useModal();

	const formRef = useRef<HTMLFormElement>(null);
	const [csrfToken, setCsrfToken] = useState("");
	const { address } = useAccount();
	const { connectAsync } = useConnect();
	const [signature, setSignature] = useState("");
	const connectors = useConnectors();
	const { signMessageAsync } = useSignMessage();

	useEffect(() => {
		const csrfToken =
			document.head
				.querySelector("[name~=csrf-token]")
				?.getAttribute("content") || "";
		setCsrfToken(csrfToken);
	}, []);

	const handleAgreement = async _e => {
		if (!window.ethereum.isMetaMask) {
			alert(
				"Metamask not installed, this application only supports metamask currently"
			);
			return;
		}

		try {
			if (!address) {
				const metamaskConnector = connectors[0];
				await connectAsync({ connector: metamaskConnector });
			}
			const sig = await signMessageAsync({
				message: "I agree with the service policy",
			});
			setSignature(sig);
		} catch (err) {
			alert(`Error signing: ${err}`);
		}
	};

	useEffect(() => {
		if (signature) formRef.current?.submit();
	}, [signature]);

	return (
		<>
			<div className="cursor-pointer" onClick={toggleOpen}>
				Connect Wallet
			</div>
			<Modal open={open} setOpen={setOpen}>
				<div
					className="bg-contrast-100 p-10 rounded flex flex-col items-center gap-8"
					style={{ maxWidth: 800 }}
				>
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

					<h3 className="text-3xl text-center font-bold">
						Agreement
					</h3>
					<div className="overflow-scroll" style={{ maxHeight: 400 }}>
						<p className="text-sm text-text-200">
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
							vel convallis. Lorem ipsum dolor sit amet,
							consectetur adipiscing elit. Proin dapibus, felis
							sit amet convallis iaculis, felis purus commodo
							nibh, at sodales velit arcu a odio. Pellentesque
							dapibus volutpat odio, eu rutrum mauris malesuada
							et. Aliquam ligula velit, ultricies et mattis quis,
							ultrices in elit. Nam eget erat finibus, scelerisque
							purus eleifend, pretium lacus. Nam vitae tellus
							rhoncus, ornare libero eget, aliquam risus. Morbi
							lacinia lacinia ultricies. Morbi volutpat
							sollicitudin eros at vehicula. Pellentesque sed
							neque luctus, laoreet mi id, luctus est. Vivamus
							dictum ullamcorper lorem, non hendrerit purus
							condimentum et. Vestibulum viverra ligula vel
							lacinia porttitor. Donec blandit, ligula sit amet
							condimentum accumsan, quam elit sagittis nisl, et
							commodo lorem justo eget erat. Nam maximus arcu vel
							nibh feugiat accumsan. Ut aliquam massa ut pulvinar
							sagittis. Sed dictum mauris nec pretium feugiat.
							Aliquam erat volutpat. Mauris scelerisque sodales ex
							vel convallis.
						</p>
					</div>

					<div className="flex flex-col gap-2">
						<Button variant="accent-fill" onClick={handleAgreement}>
							Agree
						</Button>
						<Button variant="text" onClick={toggleOpen}>
							Cancel
						</Button>
					</div>
				</div>
			</Modal>
		</>
	);
};
