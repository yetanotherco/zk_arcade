import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, FormInput, Modal } from "../../components";
import {
	useAligned,
	useBatcherPaymentService,
	useModal,
	useBatcherNonce,
	useLeaderboardContract,
	useEthPrice,
} from "../../hooks";
import { Address } from "../../types/blockchain";
import { formatEther, toHex } from "viem";
import {
	NoncedVerificationdata,
	SubmitProof,
	VerificationData,
} from "../../types/aligned";
import { useCSRFToken } from "../../hooks/useCSRFToken";
import { useChainId } from "wagmi";
import { useProofSentMessageReader } from "../../hooks/useProofSentMessageReader";
import { ProvingSystem, provingSystemByteToName } from "../../types/aligned";
import { useToast } from "../../state/toast";

type Props = {
	payment_service_address: Address;
	user_address?: Address;
	batcher_url: string;
	user_proofs_json: string;
	leaderboard_address: Address;
};

function parsePublicInputs(inputs: Uint8Array) {
	if (inputs.length < 96) return null;

	const levelBytes = inputs.slice(0, 32);
	const gameBytes = inputs.slice(32, 64);

	const level = (levelBytes[30] << 8) + levelBytes[31];
	const game_config = Buffer.from(gameBytes).toString("hex");

	return { level, game_config };
}

export default ({
	payment_service_address,
	user_address,
	batcher_url,
	user_proofs_json,
	leaderboard_address,
}: Props) => {
	const { open, setOpen, toggleOpen } = useModal();
	const { csrfToken } = useCSRFToken();
	const formRef = useRef<HTMLFormElement>(null);
	const [provingSystem, setProvingSystem] = useState<ProvingSystem>("");
	const [proof, setProof] = useState<Uint8Array>();
	const [proofId, setProofId] = useState<Uint8Array>();
	const [publicInputs, setPublicInputs] = useState<Uint8Array>();
	const [submitProofMessage, setSubmitProofMessage] = useState("");
	const [submissionIsLoading, setSubmissionIsLoading] = useState(false);
	const [maxFee, setMaxFee] = useState(BigInt(0));
	const [depositAmount, setDepositAmount] = useState("");
	const [showDepositSection, setShowDepositSection] = useState(false);
	const { nonce, isLoading: nonceLoading } = useBatcherNonce(
		batcher_url,
		user_address
	);
	useProofSentMessageReader();

	const userProofs = JSON.parse(user_proofs_json) as { level: number; game_config: string }[];

	const chainId = useChainId();
	const { estimateMaxFeeForBatchOfProofs, signVerificationData } =
		useAligned();
	const { price } = useEthPrice();
	const { addToast } = useToast();

	const { balance, sendFunds } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});

	const { currentGame } = useLeaderboardContract({
		contractAddress: leaderboard_address,
		userAddress: user_address ? user_address : "0x",
	});

	const handleCombinedProofFile = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const buffer = await file.arrayBuffer();
		const view = new DataView(buffer);
		const bytes = new Uint8Array(buffer);

		let offset = 0;

		const provingSystemId = bytes.slice(0, 1);
		const provingSystem = provingSystemByteToName[provingSystemId[0]];
		offset += 1;

		function readChunk(): Uint8Array {
			const len = view.getUint32(offset, true);
			offset += 4;
			const chunk = bytes.slice(offset, offset + len);
			offset += len;
			return chunk;
		}

		const proof = readChunk();
		const proofId = readChunk();
		const publicInputs = readChunk();

		setProvingSystem(provingSystem);
		setProof(proof);
		setProofId(proofId);
		setPublicInputs(publicInputs);
	};

	const handleDeposit = useCallback(async () => {
		if (!depositAmount || Number(depositAmount) <= 0) {
			addToast({
				title: "Invalid amount",
				desc: "Please enter a valid deposit amount",
				type: "error",
			});
			return;
		}

		try {
			await sendFunds.send(depositAmount);
			setDepositAmount("");
			setShowDepositSection(false);
		} catch (error) {
			console.error("Deposit failed:", error);
		}
	}, [depositAmount, sendFunds, addToast]);

	const handleSubmission = useCallback(async () => {
		if (!proof || !proofId || !publicInputs || !user_address) {
			alert("You need to provide proof, proofid, public inputs");
			return;
		}

		const parsed = parsePublicInputs(publicInputs);
		if (!parsed) {
			alert("Invalid public inputs");
			return;
		}

		// This conversions are done because the game_config is a hex string in the proof and a bigint in the contract
		const parsedGameConfigBigInt = BigInt('0x' + parsed.game_config);
		const currentGameConfigBigInt = BigInt(currentGame.data?.gameConfig || 0n);

		if (parsedGameConfigBigInt !== currentGameConfigBigInt) {
			alert(
				"Current game has changed since the proof was created."
			);
			console.log("Parsed game config:", parsed.game_config);
			console.log("Current game config:", currentGame.data?.gameConfig);
			return;
		}

		const alreadySubmitted = userProofs.some((p) =>
			typeof p.game_config === 'string' &&
			typeof parsed.game_config === 'string' &&
			p.game_config.toLowerCase() === parsed.game_config.toLowerCase() &&
			p.level >= parsed.level
		);

		if (alreadySubmitted) {
			alert("You have already submitted a proof with this game config and a higher or equal level.");
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
			provingSystem: provingSystem,
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

		const { r, s, v } = await signVerificationData(
			noncedVerificationdata,
			payment_service_address
		);

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
		proofId,
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

	useEffect(() => {
		if (sendFunds.receipt.isLoading) {
			addToast({
				title: "Transaction sent",
				desc: "Transaction was sent successfully, waiting for receipt...",
				type: "success",
			});
		}
	}, [sendFunds.receipt.isLoading]);

	useEffect(() => {
		if (sendFunds.receipt.isSuccess && sendFunds.receipt.data) {
			addToast({
				title: "Balance deposit confirmed",
				desc: "The transaction was included, your balance has been updated",
				type: "success",
			});
		}
	}, [sendFunds.receipt.isSuccess, sendFunds.receipt.data]);

	useEffect(() => {
		if (sendFunds.transaction.isError) {
			const errorMessage =
				sendFunds.transaction.error?.message ||
				"Something went wrong with the transaction.";

			addToast({
				title: "Transaction failed",
				desc: errorMessage,
				type: "error",
			});
		}
	}, [sendFunds.transaction.isError, sendFunds.transaction.error]);

	useEffect(() => {
		if (sendFunds.receipt.isError) {
			const errorMessage =
				sendFunds.receipt.error?.message ||
				"Something went wrong with the transaction.";

			addToast({
				title: "Transaction failed",
				desc: errorMessage,
				type: "error",
			});
		}
	}, [sendFunds.receipt.isError, sendFunds.receipt.error]);

	return (
		<>
			<div className="w-full flex justify-center items-center cursor-pointer">
				<Button variant="accent-fill" onClick={toggleOpen}>
					Submit solution proof
				</Button>
				<Modal maxWidth={600} open={open} setOpen={setOpen}>
					<div className="rounded w-full bg-contrast-100 p-10 flex flex-col items-center gap-10">
						<h3 className="text-md font-bold">
							Submit Beast solution proof
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
							<input type="hidden" name="game" value={"Beast"} />
						</form>

						<div className="flex flex-col gap-6">
							<FormInput
								label="Solution file"
								name="proof-data"
								id="proof-data"
								type="file"
								onChange={handleCombinedProofFile}
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
							{(balance.data || 0) < maxFee && (
								<div className="mt-4">
									<Button
										variant="text-accent"
										onClick={() => setShowDepositSection(!showDepositSection)}
									>
										{showDepositSection ? "Hide deposit" : "Deposit"}
									</Button>
								</div>
							)}
						</div>

						{showDepositSection && (
							<div className="w-full border-t pt-6">
								<h4 className="text-sm font-semibold mb-4">Deposit to Aligned</h4>
								<div className="mb-4">
									<FormInput
										label="Amount to deposit in ETH:"
										placeholder="0.0001"
										type="number"
										value={depositAmount}
										onChange={e => setDepositAmount(e.target.value)}
										min="0"
										step="0.0001"
									/>
									<p className="mt-1 text-sm text-gray-600">
										~
										{((price || 0) * Number(depositAmount || "0")).toLocaleString(
											undefined,
											{
												maximumFractionDigits: 3,
											}
										)}{" "}
										USD
									</p>
								</div>
								<div className="flex justify-end">
									<Button
										variant="accent-fill"
										onClick={handleDeposit}
										isLoading={sendFunds.receipt.isLoading}
										disabled={Number(depositAmount || "0") <= 0}
									>
										Deposit
									</Button>
								</div>
							</div>
						)}

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
									(balance.data || 0) < maxFee ||
									nonceLoading ||
									nonce == null
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
