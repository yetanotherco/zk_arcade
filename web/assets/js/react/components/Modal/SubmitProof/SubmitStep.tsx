import React, { useCallback, useEffect, useRef, useState } from "react";
import { FormInput } from "../../Form";
import { useCSRFToken } from "../../../hooks/useCSRFToken";
import {
	NoncedVerificationdata,
	ProofSubmission,
	ProvingSystem,
	provingSystemByteToName,
	SubmitProof,
	VerificationData,
} from "../../../types/aligned";
import {
	useAligned,
	useBatcherNonce,
	useBatcherMaxFee,
	useBatcherPaymentService,
	useEthPrice,
	useBeastLeaderboardContract,
} from "../../../hooks";
import { Address } from "../../../types/blockchain";
import { useToast } from "../../../state/toast";
import { formatEther, toHex } from "viem";
import { useChainId } from "wagmi";
import { Button } from "../../Button";
import { BumpFeeModal } from "../../Modal/BumpFee";
import { ProgressBar } from "../../ProgressBar";
import { usePendingProofsToBump } from "../../../hooks/usePendingProofsToBump";
import { SocialLinks } from "../../SocialLinks";

type Game = {
	id: "beast" | string;
	name: string;
	cover: string;
};

const GAMES: Game[] = [
	{
		id: "beast",
		name: "Beast",
		cover: "/images/beast.jpg",
	},
	{
		id: "parity",
		name: "Parity",
		cover: "/images/parity.jpg",
	},
];

const getGameData = (id: GameId) => GAMES.find(game => game.id === id);

type GameId = (typeof GAMES)[number]["id"];

function parsePublicInputs(inputs: Uint8Array) {
	if (inputs.length < 96) return null;

	const levelBytes = inputs.slice(0, 32);
	const gameBytes = inputs.slice(32, 64);

	const level = (levelBytes[30] << 8) + levelBytes[31];
	const game_config = Buffer.from(gameBytes).toString("hex");

	return { level, game_config };
}

export const SubmitProofStep = ({
	batcher_url,
	leaderboard_address,
	user_address,
	payment_service_addr,
	setOpen,
	setStep,
	proofSubmission,
	proofStatus,
	setProofStatus,
	proofToSubmitData,
	gameName,
	initialGameIdx,
	highestLevelReached,
	currentLevelReached,
	highestLevelReachedProofId,
}: {
	batcher_url: string;
	user_address: Address;
	leaderboard_address: Address;
	payment_service_addr: Address;
	setOpen: (open: boolean) => void;
	setStep: (step: string) => void;
	proofSubmission?: ProofSubmission;
	proofStatus?: ProofSubmission["status"];
	setProofStatus: (status: ProofSubmission["status"]) => void;
	proofToSubmitData: VerificationData | null;
	gameName: string;
	initialGameIdx?: number;
	highestLevelReached?: number;
	currentLevelReached?: number;
	highestLevelReachedProofId?: string | number;
}) => {
	const chainId = useChainId();
	const { csrfToken } = useCSRFToken();
	const formRef = useRef<HTMLFormElement>(null);
	const [submitProofMessage, setSubmitProofMessage] = useState("");
	const { estimateMaxFeeForBatchOfProofs, signVerificationData } =
		useAligned();

	const [provingSystem, setProvingSystem] = useState<ProvingSystem>(
		proofSubmission?.proving_system
	);
	const [proof, setProof] = useState<Uint8Array>();
	const [proofId, setProofId] = useState<Uint8Array>(proofSubmission?.id);
	const [publicInputs, setPublicInputs] = useState<Uint8Array>();
	const [maxFee, setMaxFee] = useState(BigInt(0));
	const [submissionIsLoading, setSubmissionIsLoading] = useState(false);
	const { nonce, isLoading: nonceLoading } = useBatcherNonce(
		batcher_url,
		user_address
	);
	const { maxFee: latestMaxFee, isLoading: previousMaxFeeLoading } = useBatcherMaxFee(
		batcher_url,
		user_address
	);
	const [invalidGameConfig, setInvalidGameConfig] = useState(false);
	const [levelAlreadyReached, setLevelAlreadyReached] = useState(false);
	const [gameIdx, setGameIdx] = useState(initialGameIdx);
	const { price: ethPrice } = useEthPrice();
	const {
		proofsToBump,
		isLoading: proofsToBumpIsLoading,
		refetch,
	} = usePendingProofsToBump({
		user_address: user_address,
	});

	const [parsedPublicInputs, setParsedPublicInputs] = useState<
		| {
				level: number;
				game_config: string;
		  }
		| undefined
	>(
		proofSubmission
			? {
					level: proofSubmission?.level_reached,
					game_config: proofSubmission?.game_config,
			  }
			: undefined
	);

	const { currentGame } = useBeastLeaderboardContract({
		contractAddress: leaderboard_address,
		userAddress: user_address,
	});

	const { balance } = useBatcherPaymentService({
		contractAddress: payment_service_addr,
		userAddress: user_address,
	});

	const { addToast } = useToast();

	useEffect(() => {
		const fn = async () => {
			const estimatedMaxFee = await estimateMaxFeeForBatchOfProofs(16);
			if (!estimatedMaxFee) return;

			const maxFee = latestMaxFee && latestMaxFee < estimatedMaxFee
				? latestMaxFee
				: estimatedMaxFee;

			setMaxFee(maxFee);
		};
		fn();
	}, [estimateMaxFeeForBatchOfProofs, latestMaxFee, maxFee]);

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
		setProvingSystem(provingSystem);
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

		const parsed = parsePublicInputs(publicInputs);
		if (!parsed) {
			addToast({
				title: "Invalid inputs",
				desc: "The provided public inputs are invalid",
				type: "error",
			});
			return;
		}
		setParsedPublicInputs(parsed);

		const parsedGameConfigBigInt = BigInt("0x" + parsed.game_config);
		const currentGameConfigBigInt = BigInt(
			currentGame.game?.gameConfig || 0n
		);

		if (parsedGameConfigBigInt !== currentGameConfigBigInt) {
			setInvalidGameConfig(true);
			return;
		} else {
			setInvalidGameConfig(false);
		}

		const alreadySubmitted = (highestLevelReached ?? 0) >= parsed.level;

		if (alreadySubmitted) {
			setLevelAlreadyReached(true);
			return;
		}

		setProof(proof);
		setProofId(proofId);
		setPublicInputs(publicInputs);
		setGameIdx(currentGame.gameIdx);
	};

	const handleSubmission = useCallback(async () => {
		if (!proof || !proofId || !publicInputs || !user_address) {
			addToast({
				title: "Missing data",
				desc: "You need to provide proof, proofId, and public inputs",
				type: "error",
			});
			return;
		}

		const parsed = parsePublicInputs(publicInputs);
		if (!parsed) {
			addToast({
				title: "Invalid inputs",
				desc: "The provided public inputs are invalid",
				type: "error",
			});
			return;
		}

		// This value should be capped by the previous proof max fee
		const estimatedMaxFee = await estimateMaxFeeForBatchOfProofs(16);
		if (!estimatedMaxFee) {
			alert("Could not estimate max fee");
			return;
		}

		const maxFee = latestMaxFee && latestMaxFee < estimatedMaxFee
			? latestMaxFee
			: estimatedMaxFee;

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
			payment_service_addr,
			verificationData,
		};

		const { r, s, v } = await signVerificationData(
			noncedVerificationdata,
			payment_service_addr
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
		payment_service_addr,
		chainId,
		nonce,
		latestMaxFee,
		maxFee,
	]);

	const handleSend = useCallback(
		async (proofToSubmitData: VerificationData) => {
			const estimatedMaxFee = await estimateMaxFeeForBatchOfProofs(16);
			if (!estimatedMaxFee) {
				alert("Could not estimate max fee");
				return;
			}
			const maxFee = latestMaxFee && latestMaxFee < estimatedMaxFee
				? latestMaxFee
				: estimatedMaxFee;

			if (nonce == null) {
				alert("Nonce is still loading or failed");
				return;
			}

			const noncedVerificationdata: NoncedVerificationdata = {
				maxFee: toHex(maxFee, { size: 32 }),
				nonce: toHex(nonce, { size: 32 }),
				chain_id: toHex(chainId, { size: 32 }),
				payment_service_addr,
				verificationData: proofToSubmitData,
			};

			const { r, s, v } = await signVerificationData(
				noncedVerificationdata,
				payment_service_addr
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
		},
		[
			setSubmitProofMessage,
			estimateMaxFeeForBatchOfProofs,
			signVerificationData,
			payment_service_addr,
			chainId,
			nonce,
			latestMaxFee,
			maxFee,
		]
	);

	useEffect(() => {
		if (
			proofSubmission?.status === "pending" ||
			proofSubmission?.status === "underpriced" ||
			proofSubmission?.status === "submitted"
		) {
			const interval = setInterval(() => {
				const checkStatus = async () => {
					try {
						const res = await fetch(
							`/proof/status/${proofSubmission.id}`
						);
						if (!res.ok) return;

						const data = await res.json();
						setProofStatus(data.status);

						if (data.status === "verified") {
							setStep("claim");
							clearInterval(interval);
						}
					} catch (err) {
						console.error("Error checking proof status:", err);
					}
				};

				checkStatus();
			}, 12000);

			return () => clearInterval(interval);
		}
	}, [proofSubmission]);

	useEffect(() => {
		if (!proofToSubmitData) return;
		if ((highestLevelReached ?? 0) > (currentLevelReached ?? 0)) {
			setLevelAlreadyReached(true);
			return;
		}
	}, [setLevelAlreadyReached, proofToSubmitData, currentLevelReached]);

	const [bumpFeeOpen, setBumpFeeOpen] = useState(false);

	if (
		proofStatus === "pending" ||
		proofStatus === "underpriced" ||
		proofStatus === "submitted"
	) {
		return (
			<div className="flex flex-col gap-4 justify-between h-full">
				{proofStatus === "pending" ? (
					<p className="bg-yellow/20 rounded p-2 text-yellow">
						The proof has been submitted to Aligned. Settling your
						proofs on Ethereum typically takes 5-15 minutes, though
						occasionally it takes more time.
					</p>
				) : proofStatus === "underpriced" ? (
					<p className="bg-orange/20 rounded p-2 text-orange">
						The proof transaction is currently underpriced. We
						recommend increasing the fee to ensure it gets processed
						in the next batches.
					</p>
				) : (
					<p className="bg-accent-100/20 rounded p-2 text-accent-100">
						The proof has been included and is now awaiting
						verification by Aligned.
					</p>
				)}

				<div className="flex flex-col gap-2">
					<p>Game: {gameName}</p>
					<p>Daily Quest: {Number(gameIdx) + 1}</p>
					<p>Level reached: {parsedPublicInputs?.level}</p>
					<p>Prover: {provingSystem}</p>
				</div>

				{!bumpFeeOpen && (
					<div className="flex w-full items-center justify-center mb-2">
						<svg
							className="w-6 h-6 animate-spin-slow "
							viewBox="0 0 50 50"
						>
							<circle
								cx="25"
								cy="25"
								r="20"
								fill="none"
								stroke="currentColor"
								strokeWidth="6"
								strokeLinecap="round"
								strokeDasharray="45 195"
							/>
						</svg>
					</div>
				)}

				{!bumpFeeOpen && proofStatus !== "submitted" && (
					<Button
						className=""
						variant="text-accent"
						onClick={() => {
							setBumpFeeOpen(true);
						}}
					>
						Bump fee
					</Button>
				)}

				{(proofStatus === "pending" ||
					proofStatus === "underpriced") && (
					<BumpFeeModal
						open={bumpFeeOpen}
						proofsToBump={proofsToBump}
						setOpen={setBumpFeeOpen}
						proofsToBumpIsLoading={proofsToBumpIsLoading}
						paymentServiceAddr={payment_service_addr}
						afterBump={() => {
							refetch();
						}}
					/>
				)}
				<SocialLinks className="text-xs text-text-200 mt-4" />
			</div>
		);
	}

	if (proofStatus === "failed") {
		return (
			<div className="flex flex-col gap-4 justify-between h-full">
				<p className="bg-red/20 rounded p-2 text-red">
					The proof failed to be verified, this can happen because the
					proofs was invalid, or there was a problem in the batcher
					that rejected the proof, please submit it again.
				</p>
				<div className="flex flex-col gap-2">
					<p>Prover: {provingSystem}</p>
					<p>Game: {gameName}</p>
					<p>Level reached: {parsedPublicInputs?.level}</p>
				</div>
			</div>
		);
	}

	const gameData = getGameData(gameName);

	return (
		<div className="flex flex-col gap-6 justify-between h-full">
			<div className="w-full flex flex-col gap-4">
				<div className="flex flex-col overflow-x-auto p-2 max-w-[150px]">
					<div className="w-full">
						<img
							src={gameData?.cover}
							alt={gameData?.name}
							className="w-auto h-[100px] rounded border-2"
						/>
					</div>
					<div className="text-center">{gameData?.name}</div>
				</div>
				<div>
					{proofToSubmitData ? (
						<div>
							<p className="text-xl mb-2">Proof data:</p>
							<p className="mb-1">
								Proof size: {proofToSubmitData.proof.length}{" "}
								bytes
							</p>
							<p>
								Public Input size:{" "}
								{proofToSubmitData.publicInput?.length} bytes
							</p>
						</div>
					) : (
						<div>
							<div className="mb-2">
								<p>Proof file</p>
								<p className="text-sm text-text-200">
									Submit the solution of the file
								</p>
							</div>

							<div className="flex flex-col gap-6">
								<FormInput
									name="proof-data"
									id="proof-data"
									type="file"
									onChange={handleCombinedProofFile}
								/>
							</div>
						</div>
					)}
				</div>
				<div className="flex flex-col gap-2">
					{provingSystem && <p>Prover: {provingSystem}</p>}
					{parsedPublicInputs?.level && (
						<p>Level reached: {parsedPublicInputs?.level}</p>
					)}
					{!!maxFee && (
						<p>
							Cost:{" "}
							{(
								Number(formatEther(maxFee)) * (ethPrice || 0)
							).toLocaleString(undefined, {
								maximumFractionDigits: 4,
							})}{" "}
							USD{" "}
							<span className="text-sm text-text-200">
								~={" "}
								{Number(formatEther(maxFee)).toLocaleString(
									undefined,
									{
										maximumFractionDigits: 10,
									}
								)}{" "}
								ETH
							</span>
						</p>
					)}
					{invalidGameConfig && (
						<p className="text-red">
							This game is no longer valid a new game is available
							to play.
						</p>
					)}

					{levelAlreadyReached && (
						<p className="text-red">
							You have already submitted a proof with a higher level
							for this game. If you uploaded the proof recently,
							you'll have to wait 6 hours to submit it again.
						</p>
					)}
					{(balance.data || 0) < maxFee && (
						<p className="text-red">
							You don't have enough balance to pay for the proof
							verification
						</p>
					)}
				</div>
			</div>

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
				<input type="hidden" name="_csrf_token" value={csrfToken} />
				<input type="hidden" name="game" value={gameData?.name} />
				<input type="hidden" name="game_idx" value={Number(gameIdx)} />
			</form>
			<Button
				variant="text"
				className="font-normal text-start flex items-center gap-2"
				onClick={() => setStep("deposit")}
			>
				<span className="hero-chevron-left"></span>
				Go Back
			</Button>

			{submissionIsLoading && (
				<div className="max-w-[300px] w-full flex items-center justify-center mx-auto">
					<ProgressBar
						shouldAnimate={submissionIsLoading}
						timeToPassMs={10 * 1000}
					/>
				</div>
			)}

			<div className="self-end">
				<Button
					variant="text"
					className="mr-10"
					onClick={() => setOpen(false)}
				>
					Cancel
				</Button>
				{!proofToSubmitData ? (
					<Button
						variant="accent-fill"
						disabled={
							!proof ||
							!proofId ||
							!publicInputs ||
							(balance.data || 0) < maxFee ||
							nonceLoading ||
							previousMaxFeeLoading ||
							nonce == null ||
							levelAlreadyReached
						}
						isLoading={submissionIsLoading}
						onClick={handleSubmission}
					>
						Confirm
					</Button>
				) : (
					<Button
						variant="accent-fill"
						disabled={
							(balance.data || 0) < maxFee ||
							nonceLoading ||
							previousMaxFeeLoading ||
							nonce == null ||
							levelAlreadyReached
						}
						isLoading={submissionIsLoading}
						onClick={() => handleSend(proofToSubmitData)}
					>
						Confirm
					</Button>
				)}
			</div>
		</div>
	);
};
