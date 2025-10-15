import React, { useEffect, useState } from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { getNftMetadata, NftMetadata, useNftContract } from "../../hooks/useNftContract";
import { Modal } from "../../components";

type Props = {
    network: string;
    user_address: Address;
    nft_contract_address: Address;
    is_eligible: string;
};

const NFTView = ({
    nft_metadata,
    openNFTModal,
    setOpenNFTModal
}: {
    nft_metadata?: NftMetadata;
    openNFTModal: boolean;
    setOpenNFTModal: any; // TODO: Use the right type
}) => {

    return (
        <>
            <Modal
                open={openNFTModal}
                setOpen={setOpenNFTModal}
                maxWidth={1000}
            >
                <div className="bg-contrast-100 w-full p-10 rounded flex flex-col gap-8 max-h-[90vh]">
                    <img
                        src={nft_metadata?.image}
                        alt={nft_metadata?.name || "NFT"}
                        title={nft_metadata?.name}
                        style={{ maxWidth: "30px" }}
                    />
                </div>
            </Modal>
        </>
    );
}

const NFTList = ({
	is_eligible,
	nft_contract_address,
	user_address,
}: Omit<Props, "network">) => {
    const { balance, tokenURIs, } = useNftContract({
        contractAddress: nft_contract_address,
        userAddress: user_address,
    });

    const [nftMetadataList, setNftMetadataList] = useState<NftMetadata[]>([]);

    const [openNFTModal, setOpenNFTModal] = useState<boolean>(false);

    useEffect(() => {
        const fetchNftMetadata = async () => {
            if (tokenURIs.length === 0) return;

            const metadataList = await Promise.all(
                tokenURIs.map(async (uri) => {
                    try {
                        return await getNftMetadata(uri);
                    } catch (error) {
                        console.error(`Error fetching metadata for ${uri}:`, error);
                        return null;
                    }
                })
            );

            setNftMetadataList(metadataList.filter((metadata): metadata is NftMetadata => metadata !== null));
        };

        fetchNftMetadata();
    }, [tokenURIs]);

    if (is_eligible === "false") {
        return (
            <>
                <div className="border rounded border-yellow bg-yellow/20 p-3 text-yellow">
                    You are not eligible...
                </div>
            </>
        )
    }
    
    return (
        <>
			{balance.data != undefined && balance.data > 0n && (
				<div className="flex flex-col items-start gap-2">
					{nftMetadataList.length > 0 && (
						<div className="flex flex-col gap-2">
							{nftMetadataList.map((metadata, index) => (
						        <div key={index} className="flex flex-col gap-1 border rounded">
									<img
										src={metadata.image}
										alt={metadata.name || "NFT"}
										title={metadata.name}
										style={{ maxWidth: "200px" }}
										onClick={() => setOpenNFTModal(true)}
										className="hover:cursor-pointer m-8"
									/>
								</div>
							))}
						</div>
					)}
				</div>
			)}

            <NFTView
                nft_metadata={nftMetadataList.at(0)} // TODO: add an onclick that opens the modal with the right metadata
                openNFTModal={openNFTModal}
                setOpenNFTModal={setOpenNFTModal}
            />
        </>
    )
}

export default ({
	network,
	user_address,
	nft_contract_address,
	is_eligible,
}: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<NFTList
					user_address={user_address}
					nft_contract_address={nft_contract_address}
					is_eligible={is_eligible}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
