import React, { useEffect, useState } from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { Modal } from "../../components";
import { NftMetadata, getNftMetadata, useNftContract } from "../../hooks/useNftContract";

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
    nft_metadata: NftMetadata | null;
    openNFTModal: boolean;
    setOpenNFTModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    if (!nft_metadata) return null;

    return (
        <>
            <Modal
                open={openNFTModal}
                setOpen={setOpenNFTModal}
                maxWidth={1000}
            >
                <div className="bg-contrast-100 w-full p-10 rounded flex flex-col gap-8 max-h-[90vh]">
                    <div className="flex justify-between gap-8">
                        <img
                            src={nft_metadata?.image}
                            alt={nft_metadata?.name || "NFT"}
                            title={nft_metadata?.name}
                            style={{ maxWidth: "300px" }}
                        />

                        <hr className="my-4 border-t border-white/300" />

                        <div>
                            <h1 className="text-lg font-bold mt-4 mb-6">{nft_metadata.name}</h1>

                            <p className="mb-28" style={{color:"#898d94"}}>{nft_metadata.description}</p>

                            <p className="mb-6"><strong>Token ID:</strong> {Number(nft_metadata.tokenId || 0n)}</p>

                            <p className="mb-6">
                                {/* TODO: Also support mainnet explorer link */}
                                Contract Address: <a className="hover:underline" href={`https://etherscan.io/address/${nft_metadata.address}`} target="_blank" rel="noopener noreferrer">{nft_metadata.address}</a>
                            </p>
                        </div>
                    </div>
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
    const [selectedMetadata, setSelectedMetadata] = useState<NftMetadata | null>(null);

    useEffect(() => {
        const fetchNftMetadata = async () => {
            if (tokenURIs.length === 0) return;

            const metadataList = await Promise.all(
                tokenURIs.map(async (uri) => {
                    try {
                        return await getNftMetadata(uri, nft_contract_address);
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
										onClick={() => 
                                            {
                                                setSelectedMetadata(metadata)
                                                setOpenNFTModal(true)
                                            }
                                        }
										className="hover:cursor-pointer m-8"
									/>
								</div>
							))}
						</div>
					)}
				</div>
			)}

            <NFTView
                nft_metadata={selectedMetadata}
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
