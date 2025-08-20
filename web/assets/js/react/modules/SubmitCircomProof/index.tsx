import React, { useCallback, useEffect, useRef, useState } from "react";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { Button, FormInput, Modal } from "../../components";
import { useAligned, useBatcherPaymentService, useModal, useBatcherNonce } from "../../hooks";
import { Address } from "../../types/blockchain";
import { formatEther, toHex } from "viem";
import {
	NoncedVerificationdata,
	SubmitProof,
	VerificationData,
} from "../../types/aligned";
import { useCSRFToken } from "../../hooks/useCSRFToken";
import { useChainId } from "wagmi";
import { useToast } from "../../state/toast";

type Props = {
	payment_service_address: Address;
	user_address?: Address;
	batcher_url: string;
};

const SubmitCircomProof = ({ payment_service_address, user_address, batcher_url }: Props) => {
	const { open, setOpen, toggleOpen } = useModal();
	const { csrfToken } = useCSRFToken();
	const formRef = useRef<HTMLFormElement>(null);
	const [proof, setProof] = useState<Uint8Array>();
	const [verificationKey, setverificationKey] = useState<Uint8Array>();
	const [publicInputs, setPublicInputs] = useState<Uint8Array>();
	const [submitProofMessage, setSubmitProofMessage] = useState("");
	const [submissionIsLoading, setSubmissionIsLoading] = useState(false);
	const [maxFee, setMaxFee] = useState(BigInt(0));
	const { nonce, isLoading: nonceLoading, error: nonceError } = useBatcherNonce(batcher_url, user_address);

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
				title: "Proof sent",
				desc: "The proof was sent and it will be verified soon",
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

	const chainId = useChainId();
	const { estimateMaxFeeForBatchOfProofs, signVerificationData } =
		useAligned();

	const {
		balance,
	} = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});

	const handleFile =
		(type: "proof" | "vm-program-code" | "vk" | "pub") =>
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			const buffer = await file.arrayBuffer();
			const data = new Uint8Array(buffer);

            console.log(data);

			if (type === "proof") setProof(data);
			else if (type === "vk") setverificationKey(data);
			else if (type === "pub") setPublicInputs(data);

            console.log("proof", proof);
            console.log("verificationKey", verificationKey);
            console.log("publicInputs", publicInputs);
		};

	const handleSubmission = useCallback(async () => {
		if (!proof || !verificationKey || !publicInputs || !user_address) {
			alert("You need to provide proof, verificationKey, public inputs");
			return;
		}

		const maxFee = await estimateMaxFeeForBatchOfProofs(16);
		if (!maxFee) {
			alert("Could not estimate max fee");
			return;
		}

		if (nonce == null) {
			alert("Nonce is still loading or failed");
			return;
		}

		const verificationData: VerificationData = {
			provingSystem: "CircomGroth16Bn256",
			proof: Array.from(proof),
			publicInput: Array.from(publicInputs),
			vmProgramCode: undefined,
			verificationKey: Array.from(verificationKey),
			proofGeneratorAddress: user_address,
		};

		const noncedVerificationdata: NoncedVerificationdata = {
			maxFee: toHex(maxFee, { size: 32 }),
			nonce: toHex(nonce, { size: 32 }),
			chain_id: toHex(chainId, { size: 32 }),
			payment_service_addr: payment_service_address,
			verificationData,
		};

		const { r, s, v } = await signVerificationData(noncedVerificationdata, payment_service_address);

		const submitProofMessage: SubmitProof = {
			verificationData: noncedVerificationdata,
			signature: {
				r,
				s,
				v: Number(v),
			},
		};

		setSubmitProofMessage(JSON.stringify(submitProofMessage));
		setSubmissionIsLoading(true);
		window.setTimeout(() => {
			formRef.current?.submit();
		}, 100);
	}, [
		setSubmitProofMessage,
		signVerificationData,
		estimateMaxFeeForBatchOfProofs,
		proof,
		verificationKey,
		publicInputs,
		user_address,
		payment_service_address,
		chainId,
		nonce,
	]);

	useEffect(() => {
		const fn = async () => {
			const maxFee = await estimateMaxFeeForBatchOfProofs(16);
			if (!maxFee) return;
			setMaxFee(maxFee);
		};
		fn();
	}, [estimateMaxFeeForBatchOfProofs]);

	return (
		<>
			<div className="w-full flex justify-center items-center cursor-pointer mt-4">
				<Button variant="accent-fill" onClick={toggleOpen}>
					Submit circom proof
				</Button>
				<Modal maxWidth={600} open={open} setOpen={setOpen}>
					<div className="rounded w-full bg-contrast-100 p-10 flex flex-col items-center gap-10">
						<h3 className="text-md font-bold">
							Submit Circom proof
						</h3>

						<form
							ref={formRef}
							action="/proof/"
							method="post"
							className="hidden"
						>
							<input
								type="hidden"
								name="submit_proof_message"
								value={submitProofMessage}
							/>
							<input
								type="hidden"
								name="_csrf_token"
								value={csrfToken}
							/>
							<input
								type="hidden"
								name="game"
								value={"Sudoku"}
							/>
						</form>

						<div className="flex flex-col gap-6">
							<FormInput
								label="Proof bytes"
								name="proof"
								id="proof"
								type="file"
								onChange={handleFile("proof")}
							/>
							<FormInput
								label="Verification key"
								name="verification-key"
								id="verification-key"
								type="file"
								onChange={handleFile("vk")}
							/>
							<FormInput
								label="Public inputs"
								name="public-inputs"
								id="public-inputs"
								type="file"
								onChange={handleFile("pub")}
							/>
						</div>

						<div>
							<p className="text-sm mb-2">
								Current aligned balance:{" "}
								{Number(
									formatEther(balance.data || BigInt(0))
								).toLocaleString(undefined, {
									maximumFractionDigits: 10,
								})}{" "}
								ETH
							</p>
							<p
								className={`text-sm ${
									(balance.data || 0) < maxFee
										? "text-red"
										: "text-text-100"
								}`}
							>
								{(balance.data || 0) > maxFee
									? "This will cost you"
									: "You need at least"}{" "}
								~
								{Number(formatEther(maxFee)).toLocaleString(
									undefined,
									{
										maximumFractionDigits: 10,
									}
								)}{" "}
								ETH in your aligned balance
							</p>
						</div>

						<div>
							<Button
								variant="text"
								className="mr-10"
								onClick={toggleOpen}
							>
								Cancel
							</Button>
							<Button
								variant="accent-fill"
								isLoading={submissionIsLoading}
								onClick={handleSubmission}
							>
								Confirm
							</Button>
						</div>
					</div>
				</Modal>
			</div>
		</>
	);
};

type SubmitProps = {
    network: string;
    payment_service_address: Address;
    user_address: Address;
    batcher_url: string;
    leaderboard_address: Address;
    circom_submissions: string;
};

export default ({
	network,
	payment_service_address,
	user_address,
	batcher_url,
	leaderboard_address,
	circom_submissions,
}: SubmitProps) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
                <SubmitCircomProof
                    payment_service_address={payment_service_address}
                    user_address={user_address}
                    batcher_url={batcher_url}
                />
			</ToastsProvider>
		</Web3EthProvider>
	);
};
