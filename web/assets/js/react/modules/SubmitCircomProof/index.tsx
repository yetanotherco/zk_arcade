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
import * as snarkjs from "snarkjs";

const toBytesFromJSON = (obj: unknown) =>
  new TextEncoder().encode(JSON.stringify(obj));

const fetchTextAsBytes = async (url: string) =>
  new TextEncoder().encode(await (await fetch(url)).text());

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
    const [verificationKey, setVerificationKey] = useState<Uint8Array>();
    const [publicInputs, setPublicInputs] = useState<Uint8Array>();
    const [submitProofMessage, setSubmitProofMessage] = useState("");
    const [submissionIsLoading, setSubmissionIsLoading] = useState(false);
    const [maxFee, setMaxFee] = useState(BigInt(0));
    const { nonce, isLoading: nonceLoading } = useBatcherNonce(batcher_url, user_address);

    const [generating, setGenerating] = useState(false);

    const { addToast } = useToast();


    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const message = params.get("message");
        if (message == "proof-failed") {
            addToast({ title: "Proof failed", desc: "The proof was sent but the verification failed", type: "error" });
        }
        if (message == "proof-sent") {
            addToast({ title: "Proof sent", desc: "The proof was sent and it will be verified soon", type: "success" });
        }
        if (message) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
        }
    }, [addToast]);

    const chainId = useChainId();
    const { estimateMaxFeeForBatchOfProofs, signVerificationData } =
        useAligned();
    const {
        balance
    } = useBatcherPaymentService({
        contractAddress: payment_service_address,
        userAddress: user_address,
    });

    const generateFibonacciProof = useCallback(async () => {
        try {
            setGenerating(true);

            // (1) Define the proof inputs (a0, a1)
            const input = { a0: "0", a1: "1" };

            // (2) Paths to the static artifacts
            const wasmPath = "/artifacts/fibonacci.wasm";
            const zkeyPath = "/artifacts/fib_final.zkey";
            const vkeyPath = "/artifacts/verification_key.json";

            // (3) Generate the proof and the public signals
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

            // (4) Serialize to bytes
            const proofBytes = toBytesFromJSON(proof);
            const publicInputsBytes = toBytesFromJSON(publicSignals);
            const vKeyBytes = await fetchTextAsBytes(vkeyPath);

            setProof(proofBytes);
            setPublicInputs(publicInputsBytes);
            setVerificationKey(vKeyBytes);

            addToast({
                title: "Fibonacci proof generated",
                desc: "Proof + public inputs + verification key are ready to submit.",
                type: "success",
            });
        } catch (err: any) {
            console.error(err);
            addToast({
                title: "Generation failed",
                desc: err?.message || "Could not generate the proof in the browser.",
                type: "error",
            });
        } finally {
            setGenerating(false);
        }
    }, [addToast]);

	const handleSubmission = useCallback(async () => {
		if (!proof || !verificationKey || !publicInputs || !user_address) {
            alert("You need to generate the proof first.");
			return;
		}

		const maxFee = await estimateMaxFeeForBatchOfProofs(16);
		if (!maxFee) {
			alert("Could not estimate max fee");
			return;
		}

		if (nonce == null || nonceLoading) {
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
        proof,
        verificationKey,
        publicInputs,
        user_address,
        estimateMaxFeeForBatchOfProofs,
        nonce,
        nonceLoading,
        chainId,
        payment_service_address,
        signVerificationData,
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

                        <div className="w-full">
                            <Button variant="text-accent" isLoading={generating} onClick={generateFibonacciProof}>
                                {generating ? "Generating..." : "Generate Fibonacci proof in browser"}
                            </Button>

                            <div className="mt-4 text-xs text-text-100 space-y-1">
                                <p>Proof bytes: {proof?.length ?? 0}</p>
                                <p>Public inputs bytes: {publicInputs?.length ?? 0}</p>
                                <p>Verification key bytes: {verificationKey?.length ?? 0}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm mb-2">
                                Current aligned balance:{" "}
                                {Number(
                                    formatEther(balance.data || BigInt(0))
                                ).toLocaleString(undefined, {
                                    maximumFractionDigits: 10,
                                })}
                                ETH
                            </p>
                            <p className={`text-sm ${(balance.data || 0) < maxFee ? "text-red" : "text-text-100"}`}>
                                {(balance.data || 0) > maxFee ? "This will cost you" : "You need at least"} ~
                                {Number(formatEther(maxFee)).toLocaleString(undefined, { maximumFractionDigits: 10 })} ETH in your aligned balance
                            </p>
                        </div>

                        <div>
                            <Button variant="text" className="mr-10" onClick={toggleOpen}>
                                Cancel
                            </Button>
                            <Button variant="accent-fill" isLoading={submissionIsLoading} onClick={handleSubmission}>
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
