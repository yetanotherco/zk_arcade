import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useNftContract } from "../../../hooks/useNftContract";
import { Address } from "../../../types/blockchain";
import { Button } from "../../Button";
import { fetchNftClaimEligibility } from "../../../utils/aligned";

type Props = {
	nft_contract_address: Address;
	user_address: Address;
	updateState: () => void;
	setOpen: (open: boolean) => void;
};

type Status =
	| "idle"
	| "checking"
	| "eligible"
	| "ineligible"
	| "claiming"
	| "claimed"
	| "error";

export const ClaimNft: React.FC<Props> = ({
	nft_contract_address,
	user_address,
	setOpen,
	updateState,
}) => {
	const { claimNft, receipt } = useNftContract({
		contractAddress: nft_contract_address,
		userAddress: user_address,
	});

	const [status, setStatus] = useState<Status>("idle");
	const [message, setMessage] = useState<string | null>(null);
	const didMountRef = useRef(false);

	const isBusy = status === "checking" || status === "claiming";
	const isClaimDisabled = status !== "eligible";

	const checkEligibility = useCallback(async () => {
		setMessage(null);
		setStatus("checking");
		try {
			const data = await fetchNftClaimEligibility(user_address);
			if (!data) {
				throw new Error("Unexpected response from eligibility check");
			}
			if (data.eligible) {
				setStatus("eligible");
			} else {
				setStatus("ineligible");
				setMessage("Your wallet isn't eligible to claim this NFT.");
			}
		} catch (err: any) {
			setStatus("error");
			setMessage(err?.message ?? "Failed to check eligibility.");
		}
	}, [user_address]);

	useEffect(() => {
		if (didMountRef.current) return;
		didMountRef.current = true;
		checkEligibility();
	}, [checkEligibility, nft_contract_address, user_address]);

	const onClaim = useCallback(async () => {
		if (status !== "eligible") return;
		try {
			setMessage(null);
			setStatus("claiming");
			await claimNft();
		} catch (err: any) {
			setStatus("error");
			setMessage(err?.message ?? "Failed to submit claim transaction.");
		}
	}, [status, claimNft]);

	const { isLoading: txLoading, isSuccess, error } = receipt;

	useEffect(() => {
		if (txLoading) setStatus("claiming");
	}, [txLoading]);

	useEffect(() => {
		if (isSuccess) {
			setStatus("claimed");
			setMessage("Your NFT was claimed successfully.");
			updateState();
		}
	}, [isSuccess, updateState]);

	useEffect(() => {
		if (error) {
			setStatus("error");
			const text =
				typeof error === "string" ? error : (error as any)?.message;
			setMessage(text ?? "Transaction failed.");
		}
	}, [error]);

	const ctaLabel = useMemo(() => {
		switch (status) {
			case "idle":
			case "checking":
				return "Checking eligibility…";
			case "eligible":
				return "Claim NFT";
			case "ineligible":
				return "Not eligible";
			case "claiming":
				return "Claiming…";
			case "claimed":
				return "Claimed";
			case "error":
				return "Retry check";
			default:
				return "Claim NFT";
		}
	}, [status]);

	return (
		<div className="flex flex-col gap-4 justify-between h-full">
			<p className="bg-blue/20 rounded p-2 text-blue">
				To participate in the game and submit your proofs, you need to
				be eligible and mint your NFT. This NFT acts as your access
				pass.
			</p>

			{(status === "eligible" || status === "claiming") && (
				<p className="bg-accent-100/20 rounded p-2 text-accent-100">
					Your wallet is eligible to claim this NFT and participate.
				</p>
			)}
			{status === "ineligible" && (
				<p className="bg-red/20 rounded p-2 text-red">
					Your wallet isn't eligible to claim this NFT.
				</p>
			)}
			{status === "error" && (
				<p className="bg-red/20 rounded p-2 text-red">
					{message ?? "Something went wrong. Please try again."}
				</p>
			)}

			<div className="self-end flex gap-5 mt-5">
				<Button
					variant="text"
					onClick={() => setOpen(false)}
					disabled={isBusy}
				>
					Cancel
				</Button>
				<Button
					variant="accent-fill"
					isLoading={isBusy}
					disabled={isBusy || isClaimDisabled}
					onClick={onClaim}
				>
					{ctaLabel}
				</Button>
			</div>
		</div>
	);
};
