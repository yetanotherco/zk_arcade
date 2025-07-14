import React, { useState, useRef, useEffect } from "react";

import { NoncedVerificationdata, VerificationData } from "../types/aligned";
import { useAligned } from "../hooks/useAligned";
import { useBatcherPaymentService } from "../hooks/useBatcherPaymentService";
import { Address, toHex } from "viem";
import { useChainId } from "wagmi";

type Args = {
	batcherPaymentServiceAddress: Address;
	userAddress: Address;
};

export default ({ batcherPaymentServiceAddress, userAddress }: Args) => {
	const [proof, setProof] = useState<Uint8Array | null>(null);
	const [vk, setVk] = useState<Uint8Array | null>(null);
	const [pub, setPub] = useState<Uint8Array | null>(null);

	const [formData, setFormData] = useState<{
		submitProofMessage: string;
	} | null>(null);
    
	const chainId = useChainId();
	const { signVerificationData, estimateMaxFeeForBatchOfProofs } =
		useAligned();
	const {
		nonce: { data: nonce, ...nonceRest },
	} = useBatcherPaymentService({
		contractAddress: batcherPaymentServiceAddress,
		userAddress,
	});

	const formRef = useRef<HTMLFormElement>(null);

	const handleFile = async (
		e: React.ChangeEvent<HTMLInputElement>,
		type: "proof" | "vk" | "pub"
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const buffer = await file.arrayBuffer();
		const data = new Uint8Array(buffer);

		if (type === "proof") setProof(data);
		else if (type === "vk") setVk(data);
		else if (type === "pub") setPub(data);
	};

	const handleSubmit = async () => {
		const maxFee = await estimateMaxFeeForBatchOfProofs();

		if (!proof || !vk || !pub || nonce == undefined || !maxFee) {
			alert("Files, address, nonce or maxFee missing or failed to fetch");
			return;
		}

		try {
			const verificationData: VerificationData = {
				provingSystem: "GnarkGroth16Bn254",
				proof,
				publicInput: pub,
				verificationKey: vk,
				vmProgramCode: undefined,
				proofGeneratorAddress: userAddress,
			};

			const noncedVerificationData: NoncedVerificationdata = {
				verificationData,
				nonce: toHex(nonce, { size: 32 }),
				maxFee: toHex(maxFee, { size: 32 }),
			};

			const { r, s, v } = await signVerificationData(
				noncedVerificationData
			);

			const submitProofMsg = JSON.stringify({
				verificationData: {
					...noncedVerificationData,
					chain_id: toHex(chainId, { size: 32 }),
					payment_service_addr: batcherPaymentServiceAddress,
				},
				signature: {
					r,
					s,
					v: Number(v),
				},
			});

			setFormData({
				submitProofMessage: submitProofMsg,
			});

			setTimeout(() => {
				formRef.current?.submit();
			}, 100);
		} catch (error) {
			console.error("Failure sending the proof: ", error);
			alert("Failure sending the proof: " + error.message);
		}
	};

	const metaTag = document.head.querySelector("[name~=csrf-token][content]") as HTMLMetaElement | null;
	if (!metaTag) {
		throw new Error("CSRF token meta tag not found");
	}

	return (
		<div>
			<h2>Upload the required files for the groth16 proof:</h2>

			<div style={{ padding: "8px 16px" }}>
				<label style={{ marginRight: 10 }}>.proof file:</label>
				<input type="file" onChange={e => handleFile(e, "proof")} />
			</div>

			<div style={{ padding: "8px 16px" }}>
				<label style={{ marginRight: 10 }}>.vk file:</label>
				<input type="file" onChange={e => handleFile(e, "vk")} />
			</div>

			<div style={{ padding: "8px 16px" }}>
				<label style={{ marginRight: 10 }}>.pub file:</label>
				<input type="file" onChange={e => handleFile(e, "pub")} />
			</div>

			<button
				onClick={handleSubmit}
				style={{
					border: "2px solid black",
					padding: "8px 16px",
					cursor: "pointer",
					marginLeft: 20,
					marginTop: 10,
				}}
			>
				Send to server
			</button>

			{formData && (
				<form ref={formRef} method="POST" action="/submit-proof">
					<input
						type="hidden"
						name="submit_proof_message"
						value={formData.submitProofMessage}
					/>
					<input
						type="hidden"
						name="_csrf_token"
						value={metaTag.content}
					/>
				</form>
			)}
		</div>
	);
};
