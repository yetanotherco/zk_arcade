import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, FormInput, Modal } from "../../components";
import { useAligned, useBatcherPaymentService, useModal } from "../../hooks";
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
};

export default ({ payment_service_address, user_address }: Props) => {
	const { open, setOpen, toggleOpen } = useModal();
	const { csrfToken } = useCSRFToken();
	const formRef = useRef<HTMLFormElement>(null);
	const [proof, setProof] = useState<Uint8Array>();
	const [proofId, setProofId] = useState<Uint8Array>();
	const [publicInputs, setPublicInputs] = useState<Uint8Array>();
	const [submitProofMessage, setSubmitProofMessage] = useState("");
	const [submissionIsLoading, setSubmissionIsLoading] = useState(false);
	const [maxFee, setMaxFee] = useState(BigInt(0));

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
	}, []);

	const chainId = useChainId();
	const { estimateMaxFeeForBatchOfProofs, signVerificationData } =
		useAligned();

	const {
		nonce: {
			data: nonce,
			isLoading: nonceIsLoading,
			isSuccess: nonceIsSuccess,
		},
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

			if (type === "proof") setProof(data);
			else if (type === "vm-program-code") setProofId(data);
			else if (type === "pub") setPublicInputs(data);
		};

	const handleSubmission = useCallback(async () => {
		if (!proof || !proofId || !publicInputs || !user_address) {
			alert("You need to provide proof, proofid, public inputs");
			return;
		}

		if (nonce == undefined || nonceIsLoading || !nonceIsSuccess) {
			alert("Could not get nonce");
			return;
		}

		const maxFee = await estimateMaxFeeForBatchOfProofs(16);
		if (!maxFee) {
			alert("Could not estimate max fee");
			return;
		}

		const verificationData: VerificationData = {
			provingSystem: "Risc0",
			proof: Array.from(proof),
			publicInput: Array.from(publicInputs),
			vmProgramCode: Array.from(proofId),
			verificationKey: undefined,
			proofGeneratorAddress: user_address,
		};

		const noncedVerificationdata: NoncedVerificationdata = {
			maxFee: toHex(maxFee, { size: 32 }),
			nonce: toHex(nonce, { size: 32 }),
			chain_id: toHex(chainId, { size: 32 }),
			payment_service_addr: payment_service_address,
			verificationData,
		};

		const { r, s, v } = await signVerificationData(noncedVerificationdata);

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
		nonce,
		nonceIsLoading,
		nonceIsSuccess,
		estimateMaxFeeForBatchOfProofs,
		proof,
		proofId,
		publicInputs,
		user_address,
		payment_service_address,
		chainId,
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
			<div className="w-full flex justify-center items-center cursor-pointer">
				<Button variant="accent-fill" onClick={toggleOpen}>
					Submit solution proof
				</Button>
				<Modal open={open} setOpen={setOpen}>
					<div
						className="rounded bg-contrast-100 p-10 flex flex-col items-center gap-10"
						style={{ minWidth: 500 }}
					>
						<h3 className="text-md font-bold mb-2">
							Submit Beast solution proof
						</h3>

						<form ref={formRef} action="/proof/" method="post">
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
								label="Proof id"
								name="prood-id"
								id="prood-id"
								type="file"
								onChange={handleFile("vm-program-code")}
							/>
							<FormInput
								label="Public inputs"
								name="public-inputs"
								id="public-inputs"
								type="file"
								onChange={handleFile("pub")}
							/>
						</div>

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
								disabled={
									!proof ||
									!proofId ||
									!publicInputs ||
									(balance.data || 0) < maxFee
								}
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
