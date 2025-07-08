import React, { useRef, useEffect, useState } from "react";
import { useConfig, useAccount, useSignTypedData, usePublicClient, useEstimateFeesPerGas } from "wagmi";
import * as CBOR from 'cbor2';
import { toHex, numberToBytes, parseSignature, recoverTypedDataAddress, ByteArray } from 'viem'

// TO-DO: Find a way to remove this node.js dependency 0xd21fe5c3188cebf9df7d396ff1ebad9a18dee8b3 0x50b54cb5A09B7D80a9Faa48AE4044DddA3e8CD1E
import { Keccak } from "sha3";

function SubmitProofToBatcher() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const publicClient = usePublicClient();
  const estimatedFees = useEstimateFeesPerGas();

  const [proof, setProof] = useState<Uint8Array | null>(null);
  const [vk, setVk] = useState<Uint8Array | null>(null);
  const [pub, setPub] = useState<Uint8Array | null>(null);

  const [formData, setFormData] = useState<{
    verificationData: any;
    address: string;
    signature: any;
  } | null>(null);

  const domain = {
    name: "Aligned" as string,
    version: "1" as string,
    chainId: 31337,
    verifyingContract: "0x7969c5eD335650692Bc04293B07F5BF2e7A673C0" as `0x${string}`
  };

  const types = {
    Message: [
      { name: 'verification_data_hash', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      { name: 'max_fee', type: 'uint256' },
    ]
  };

  const handleSign = async (message: any) => {
    try {
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: 'Message',
        message: message,
      });
      
      if (!signature) {
        throw new Error("Failure obtaining the sign");
      }
      
      const { r, s, v } = parseSignature(signature);
      
      if (!v) {
        throw new Error("Failure obtaining the sign, v is undefined");
      }
      return { r, s, v };
    } catch (error) {
      console.error("Failure in handleSign:", error);
      throw new Error("Failure obtaining sign: " + error.message);
    }
  }

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "proof" | "vk" | "pub"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    console.log("Data is ", data);

    if (type === "proof") setProof(data);
    else if (type === "vk") setVk(data);
    else if (type === "pub") setPub(data);
  };

  const getNonce = async () => {
    if (!address) {
      alert("Address was undefined");
      throw new Error("Address undefined");
    }

    const nonce = await publicClient?.getTransactionCount({
      address,
    });

    if (nonce === undefined) {
      throw new Error("Could not get nonce");
    }

    return nonce;
  };

  const getMaxFeePerGas = async () => {
    const maxFeePerGas = estimatedFees.data?.maxFeePerGas;

    if (!maxFeePerGas) {
      alert("Max fee per gas was undefined");
      throw new Error("Max fee per gas undefined");
    }

    return maxFeePerGas;
  };

  const handleSubmit = async () => {
    if (!proof || !vk || !pub || !address) {
      alert("Files or address missing");
      return;
    }

    try {
      const groth16Data: VerificationData = {
        provingSystem: ProvingSystemId.Groth16Bn254,
        proof,
        publicInput: Option.from(pub),
        verificationKey: Option.from(vk),
        vmProgramCode: Option.None,
        proofGeneratorAddress: address,
      };

      const result = await GetSubmitProofMessage(
        groth16Data,
        getNonce,
        getMaxFeePerGas,
        handleSign
      );
      console.log("Result:", result);

      setFormData({
        verificationData: result.SubmitProof.verification_data,
        address,
        signature: result.SubmitProof.signature,
      });
    } catch (error) {
      console.error("Failure sending the proof: ", error);
      alert("Failure sending the proof: " + error.message);
    }
  };


  return (
    <div>
      <h2>Upload the required files for the groth16 proof:</h2>

      <div style={{padding: "8px 16px"}}>
        <label style={{marginRight:10}}>.proof file:</label>
        <input type="file" onChange={(e) => handleFile(e, "proof")} />
      </div>

      <div style={{padding: "8px 16px"}}>
        <label style={{marginRight:10}}>.vk file:</label>
        <input type="file" onChange={(e) => handleFile(e, "vk")} />
      </div>

      <div style={{padding: "8px 16px"}}>
        <label style={{marginRight:10}}>.pub file:</label>
        <input type="file" onChange={(e) => handleFile(e, "pub")} />        
      </div>

      <button
        onClick={handleSubmit}
        style={{ border: "2px solid black", padding: "8px 16px", cursor: "pointer", marginLeft:20, marginTop:10 }}
      >
        Send to batcher
      </button>

      {formData && (
      <SubmitProofForm
        verificationData={formData.verificationData}
        address={formData.address}
        signature={formData.signature}
      />
    )}
    </div>
  );
}

function SubmitProofForm({ verificationData, address, signature }: {
  verificationData: any;
  address: string;
  signature: any;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const metaTag = document.head.querySelector("[name~=csrf-token][content]") as HTMLMetaElement | null;
    if (!metaTag) {
      throw new Error("CSRF token meta tag not found");
    }
  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <form ref={formRef} method="POST" action="/submit-proof">
      <input
        type="hidden"
        name="verification_data"
        value={JSON.stringify(verificationData)}
      />
      <input
        type="hidden"
        name="address"
        value={address}
      />
      <input
        type="hidden"
        name="signature"
        value={JSON.stringify(signature, bigintReplacer)}
      />
      <input
        type="hidden"
        name="_csrf_token"
        value={metaTag.content}
      />
    </form>
  );
}

function bigintReplacer(_key: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

const GetSubmitProofMessage = async (
  verificationData: VerificationData,
  getNonce: () => Promise<number>,
  getMaxFeePerGas: () => Promise<bigint>,
  handleSign: (message: any) => Promise<{
    r: `0x${string}`;
    s: `0x${string}`;
    v: bigint;
  }>
): Promise<submitProofMessage> => {  
  await new Promise(resolve => setTimeout(resolve, 100));

  const nonce = await getNonce();
  const maxFeePerGas = await getMaxFeePerGas();

  const hasher = new Keccak(256);
  hasher.update(verificationData.proof.toString());
  const proofCommitment = hasher.digest();

  hasher.reset()

  hasher.update(verificationData.publicInput.data?.toString());
  const publicInputCommitment = hasher.digest();
  hasher.reset()

  hasher.update(verificationData.verificationKey.data?.toString());
  hasher.update(verificationData.provingSystem.toString())
  const provingSystemAuxDataCommitment = hasher.digest();
  hasher.reset()


  const commitment = {
    proof_commitment: proofCommitment,
    pub_input_commitment: publicInputCommitment,
    proving_system_aux_data_commitment: provingSystemAuxDataCommitment,
    proof_generator_addr: verificationData.proofGeneratorAddress,
  }

  // Beware of endianess problems
  const nonceBytes = numberToUint8Array32BytesBE(nonce)
  const maxFeeBytes = numberToUint8Array32BytesBE(maxFeePerGas)
  
  hasher.update(commitment.proof_commitment);
  hasher.update(commitment.pub_input_commitment);
  hasher.update(commitment.proving_system_aux_data_commitment);
  hasher.update(commitment.proof_generator_addr);

  const commitmentDigest = hasher.digest()  

  console.log("COMMITMENT DIGEST ", commitmentDigest)
  hasher.reset()

  const messageToHash = {
    verification_data_hash: toHex(commitmentDigest, {size:32}),
    nonce: toHex(nonceBytes, {size: 32}),                                         
    max_fee: toHex(maxFeeBytes, {size: 32})                                 
  };

  const message = {
    verification_data: {
      proving_system: "GnarkGroth16Bn254",
      proof: verificationData.proof,
      pub_input: verificationData.publicInput.data!,
      verification_key: verificationData.verificationKey.data!,
      vm_program_code: null,
      proof_generator_addr: verificationData.proofGeneratorAddress,
    },
    nonce: nonce.toString(16),
    max_fee: maxFeePerGas.toString(16),
    chain_id: "0x7A69",
    payment_service_addr: "0x7969c5ed335650692bc04293b07f5bf2e7a673c0",
  };

  const sig = await handleSign(messageToHash);
  
  console.log("SIGNATURE", sig);

  const types = {
    Message: [
      { name: 'verification_data_hash', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      { name: 'max_fee', type: 'uint256' },
    ]
  };
 const recovered =  await recoverTypedDataAddress({message: messageToHash, primaryType: "Message", types, signature: sig });
 console.log("RECIVERED", recovered)

  const submitProofMessage = {
    SubmitProof: {
      verification_data: message,
      signature: {
        r: sig.r,
        s: sig.s,
        v: sig.v
      }
    }
  };

  console.log("Message to send:", submitProofMessage);

  return submitProofMessage;
};

function numberToUint8Array32BytesBE(num: number | bigint): Uint8Array {
  // Convert to BigInt for consistency
  let bigNum = BigInt(num);
  if (bigNum < 0n || bigNum > (1n << 256n) - 1n) {
    throw new RangeError("Number must be between 0 and 2^256 - 1");
  }
  const bytes = new Uint8Array(32); // 32 bytes = 256 bits
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(bigNum & 0xffn);
    bigNum >>= 8n;
  }
  return bytes;
}

export default SubmitProofToBatcher;

type Option<T> = {
  isSome: boolean;
  data: T | undefined;
};
const Option = {
  from<T>(data: T): Option<T> {
    return {
      isSome: true,
      data,
    };
  },
  None: {
    isSome: false,
    data: undefined,
  },
};

type ProvingSystemId = number;
const ProvingSystemId = {
  GnarkPlonkBls12_381: 0,
  GnarkPlonkBn254: 1,
  Groth16Bn254: 2,
  SP1: 3,
  Halo2KZG: 4,
  Halo2IPA: 5,
  Risc0: 6,
};

type VerificationData = {
  provingSystem: ProvingSystemId;
  proof: Uint8Array;
  publicInput: Option<Uint8Array>;
  verificationKey: Option<Uint8Array>;
  vmProgramCode: Option<Uint8Array>;
  proofGeneratorAddress: string;
};

type submitProofMessage = {
  SubmitProof: {
    verification_data: {
      verification_data: {
        proving_system: string;
        proof: Uint8Array<ArrayBufferLike>;
        pub_input: Uint8Array<ArrayBufferLike>;
        verification_key: Uint8Array<ArrayBufferLike>;
        vm_program_code: null;
        proof_generator_addr: string;
      };
      nonce: string;
      max_fee: string;
      chain_id: string;
      payment_service_addr: string;
    },
    signature: {
      r: `0x${string}`;
      s: `0x${string}`;
      v: bigint;
    }
  }
}
