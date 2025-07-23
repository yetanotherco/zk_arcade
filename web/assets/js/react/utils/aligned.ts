import { Keccak } from "sha3";
import { provingSystemNameToByte, VerificationData } from "../types/aligned";

export const computeVerificationDataCommitment = (
	verificationData: VerificationData
) => {
	const hasher = new Keccak(256);
	hasher.update(Buffer.from(verificationData.proof));
	const proofCommitment = hasher.digest();
	hasher.reset();

	let pubInputCommitment = Buffer.from(new Uint8Array(32).fill(0));
	const publicInput = verificationData.publicInput;
	if (publicInput) {
		pubInputCommitment = hasher.update(Buffer.from(publicInput)).digest();
	}
	hasher.reset();

	let provingSystemAuxDataCommitment: Buffer = Buffer.from(
		new Uint8Array(32).fill(0)
	);
	const provingSystemByte = Buffer.from([
		provingSystemNameToByte[verificationData.provingSystem],
	]);
	if (verificationData.verificationKey) {
		hasher.update(Buffer.from(verificationData.verificationKey));
		hasher.update(provingSystemByte);
		provingSystemAuxDataCommitment = hasher.digest();
	} else if (verificationData.vmProgramCode) {
		hasher.update(Buffer.from(verificationData.vmProgramCode));
		hasher.update(Buffer.from(provingSystemByte));
		provingSystemAuxDataCommitment = hasher.digest();
	}

	const proofGeneratorAddress = Buffer.from(
		hexStringToBytes(verificationData.proofGeneratorAddress)
	);

	hasher.reset();
	hasher.update(proofCommitment);
	hasher.update(pubInputCommitment);
	hasher.update(provingSystemAuxDataCommitment);
	hasher.update(proofGeneratorAddress);
	const commitmentDigest = hasher.digest();
	hasher.reset();

	return {
		commitmentDigest,
		proofCommitment,
		pubInputCommitment,
		provingSystemAuxDataCommitment,
	};
};

function hexStringToBytes(hex: string): Uint8Array {
	if (hex.startsWith("0x")) hex = hex.slice(2);
	if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}
