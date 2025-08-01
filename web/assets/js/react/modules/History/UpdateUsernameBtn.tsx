import React, { useRef } from "react";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { FormInput } from "../../components/Form";
import { useCSRFToken } from "../../hooks/useCSRFToken";
import { Button } from "../../components/Button";

type Props = {
	network: string;
	username: string;
};

const UpdateUsernameBtn = ({ username }: Omit<Props, "network">) => {
	const [newUsername, setUsername] = React.useState(username);
	const { csrfToken } = useCSRFToken();

	const formRef = useRef<HTMLFormElement>(null);

	const handleSubmission = (e: React.FormEvent) => {
		e.preventDefault();
		if (newUsername.trim() === "") {
			alert("Username cannot be empty");
			return;
		}

		window.setTimeout(() => {
			formRef.current?.submit();
		}, 100);
	};

	return (
		<>
			<div className="flex items-center">
				<div>
					<FormInput
						type="text"
						value={newUsername}
						onChange={e => setUsername(e.target.value)}
						className="border border-contrast-100 bg-black rounded text-text-100 placeholder:text-white -mb-0.5"
						label=""
						maxLength={20}
					/>
				</div>

				{newUsername !== username && (
					<Button
						variant="text-accent"
						onClick={handleSubmission}
						className="ml-8"
					>
						Submit
					</Button>
				)}

				<form
					ref={formRef}
					action="/wallet/username/"
					method="post"
					className="hidden"
				>
					<input
						type="hidden"
						name="new_username"
						value={newUsername}
					/>
					<input type="hidden" name="_csrf_token" value={csrfToken} />
					<input type="hidden" name="game" value={"Beast"} />
				</form>
			</div>
		</>
	);
};

export default ({ network, username }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<UpdateUsernameBtn username={username} />
			</ToastsProvider>
		</Web3EthProvider>
	);
};
