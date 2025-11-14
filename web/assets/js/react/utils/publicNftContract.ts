import { Address } from "viem";

/**
 * Checks if the public NFT contract is enabled/deployed.
 * Returns true if the contract address is not "0x0".
 */
export function isPublicNftContractEnabled(contractAddress: Address): boolean {
  return contractAddress !== "0x0";
}
