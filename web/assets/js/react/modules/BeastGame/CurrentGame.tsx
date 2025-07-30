import React from "react";
import { Address } from "../../types/blockchain";

type Props = {
	leaderboard_address: Address;
	user_address: Address;
};

export const CurrentBeastGame = ({}: Props) => {
	return (
		<div>
			<h1>Current beast game</h1>
		</div>
	);
};
