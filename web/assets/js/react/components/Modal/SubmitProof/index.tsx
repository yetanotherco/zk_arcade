import React from "react";
import { Modal, ModalProps } from "../Modal";
import { Address } from "viem";
import { ProofSubmission } from "../../../types/aligned";

type Props = {
	modal: Omit<ModalProps, "maxWidth">;
	payment_service_address: Address;
	user_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
	proof?: ProofSubmission;
};

export const SubmitProofModal = ({ modal }: Props) => {
	return (
		<Modal maxWidth={1200} {...modal}>
			<div className="min-w-[1200px]">
				<h1>Hello There!</h1>
			</div>
		</Modal>
	);
};
