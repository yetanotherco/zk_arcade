import React, { useRef } from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { FormInput } from "../../components/Form";
import { useCSRFToken } from "../../hooks/useCSRFToken";

type Props = {
    payment_service_address: Address;
    user_address: Address;
    network: string;
    username: string
};

const UpdateUsernameBtn = ({
	payment_service_address,
	user_address,
    username,
}: Omit<Props, "network">) => {
    const [newUsername, setUsername] = React.useState("");
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
                        placeholder={username}
                        type="text"
                        value={newUsername}
                        onChange={e => setUsername(e.target.value)}
                        className="border border-contrast-100 bg-black rounded text-text-100 placeholder:text-white -mb-0.5"
                        label=""
                    />
                </div>

                {newUsername && (
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                        onClick={handleSubmission}
                    >
                        Update Username
                    </button>
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
			    	<input
			    		type="hidden"
			    		name="_csrf_token"
			    		value={csrfToken}
			    	/>
			    	<input type="hidden" name="game" value={"Beast"} />
			    </form>
            </div>

        </>
    );
}


export default ({ network, payment_service_address, user_address, username }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<UpdateUsernameBtn
					payment_service_address={payment_service_address}
					user_address={user_address}
					username={username}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};

