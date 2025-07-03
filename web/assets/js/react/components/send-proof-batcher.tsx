import React, { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

// TO-DO: Find a way to remove this node.js dependency
import { Keccak } from "sha3";

function SubmitProofToBatcher() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [proof, setProof] = useState<Uint8Array | null>(null);
  const [vk, setVk] = useState<Uint8Array | null>(null);
  const [pub, setPub] = useState<Uint8Array | null>(null);
  const [alignedData, setAlignedData] = useState<AlignedVerificationData[] | null>(null);

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "proof" | "vk" | "pub"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    if (type === "proof") setProof(data);
    else if (type === "vk") setVk(data);
    else if (type === "pub") setPub(data);
  };

  const signer = async (data: VerificationData) => {
    return await signMessageAsync({
      message: JSON.stringify(data),
    });
  };

  const handleSubmit = async () => {
    if (!proof || !vk || !pub || !address) {
      alert("Faltan archivos o dirección");
      return;
    }

    const groth16Data: VerificationData = {
      provingSystem: ProvingSystemId.Groth16Bn254,
      proof,
      publicInput: Option.from(pub),
      verificationKey: Option.from(vk),
      vmProgramCode: Option.None,
      proofGeneratorAddress: address,
    };

    const result = await SubmitMultiple([groth16Data, groth16Data], signer);
    console.log("Resultado:", result);
    setAlignedData(result);
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

      <p>
        {alignedData
          ? <pre>{JSON.stringify(alignedData, null, 2)}</pre>
          : ""}
      </p>
    </div>
  );
}

const SubmitMultiple = async (
  verificationData: VerificationData[],
  signer: (data: VerificationData) => Promise<string>
): Promise<AlignedVerificationData[]> => {
  const instance = "ws://localhost:8080"; // This is the batcher web socket address
  const ws = await openWebSocket(instance);

  let sentVerificationData: VerificationData[] = [];

  const preparedData = await Promise.all(
    verificationData.map(async (data) => {
      sentVerificationData.push(data);

      const sig = await signer(data);
      return sig;
    })
  );

  let reverseCommitments = sentVerificationData
    .slice()
    .reverse()
    .map((data) => VerificationDataCommitment.fromData(data));

  const receivePromise = receiveResponse(reverseCommitments.length, ws);

  // send data
  preparedData.forEach((data) => ws.send(data));

  const receivedData = await receivePromise;

  const alignedVerificationData: AlignedVerificationData[] = [];

  receivedData.forEach((data) => {
    const commitment = reverseCommitments.pop()!;
    if (
      verifyMerklePath(
        data.batchInclusionProof.merkle_path,
        data.batchMerkleRoot,
        data.indexInBatch,
        commitment
      )
    ) {
      alignedVerificationData.push(
        AlignedVerificationData.from(commitment, data)
      );
    }
  });

  ws.close();
  return alignedVerificationData;
};

const verifyMerklePath = (
  path: Array<Uint8Array>,
  root: Uint8Array,
  index: number,
  data: VerificationDataCommitment
) => {
  const Hash = new Keccak(256);
  let commitment = VerificationDataCommitment.hashData(data);

  path.forEach((node) => {
    if (index % 2 === 0) {
      commitment = Hash.update(commitment).update(node).digest();
    } else {
      commitment = Hash.update(node).update(commitment).digest();
    }
    Hash.reset();
    index >>= 1;
  });

  return uint8ArraysEqual(root, commitment);
};


const receiveResponse = async (
  n: number,
  ws: WebSocket
): Promise<Array<BatchInclusionData>> => {
  return new Promise((resolve, reject) => {
    let includedData: Array<BatchInclusionData> = [];
    let i = 0;
    ws.addEventListener('message', event => {
      const data = new Uint8Array(event.data);
      includedData.push(BatchInclusionData.fromBuffer(data));
      i++;
      if (i === n) resolve(includedData);
    });
    ws.addEventListener('close', event => {
      reject("Connection was closed because all data was received");
    });
  });
};

const openWebSocket = (address: string): Promise<WebSocket> => {
  return new Promise(function (resolve, reject) {
    const ws = new WebSocket(address);

  ws.addEventListener("open", () => {
    console.log("Conexión WebSocket abierta");
  });

  ws.addEventListener("message", (event: MessageEvent<ArrayBuffer>) => {
    const buffer = new Uint8Array(event.data);

    const expectedProtocolVersion = ProtocolVersion.fromBytesBuffer(buffer);

    if (0 !== expectedProtocolVersion) {
      throw new Error(
        `Unsupported Protocol version. Expected ${0} but got ${expectedProtocolVersion}`
      );
    }

    resolve(ws); // resolvemos solo si el protocolo es compatible
  });

    ws.addEventListener('error',  error => {
      reject(
        `Cannot connect to ${address}, received error: ${error}`
      );
    });

    ws.addEventListener('close', event => {
      console.error("Closed", event.reason);
    });
  });
};

export default SubmitProofToBatcher;

function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function hexStringToBytes(hex: string): Uint8Array {
  if (hex.startsWith("0x")) hex = hex.slice(2);
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

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
  toString: (id: number) => {
    switch (id) {
      case 0:
        return "GnarkPlonkBls12_381";
      case 1:
        return "GnarkPlonkBn254";
      case 2:
        return "Groth16Bn254";
      case 3:
        return "SP1";
      case 4:
        return "Halo2IPA";
      case 5:
        return "Halo2KZG";
      case 6:
        return "Risc0";
      default:
        throw Error("Unsupported proof system ID");
    }
  },
};

type VerificationData = {
  provingSystem: ProvingSystemId;
  proof: Uint8Array;
  publicInput: Option<Uint8Array>;
  verificationKey: Option<Uint8Array>;
  vmProgramCode: Option<Uint8Array>;
  proofGeneratorAddress: string;
};

type VerificationDataCommitment = {
  proofCommitment: Uint8Array;
  publicInputCommitment: Uint8Array;
  provingSystemAuxDataCommitment: Uint8Array;
  proofGeneratorAddr: Uint8Array;
};
const VerificationDataCommitment = {
  fromData(data: VerificationData): VerificationDataCommitment {
    const Hash = new Keccak(256);

    // proof commitment
    let proofCommitment = Hash.update(data.proof).digest();
    Hash.reset();
    // compute public input commitment
    let publicInputCommitment = new Uint8Array(32).fill(0);
    publicInputCommitment = data.publicInput.isSome
      ? Hash.update(data.publicInput.data!).digest()
      : publicInputCommitment;
    Hash.reset();
    // aux commitment
    let provingSystemAuxDataCommitment = new Uint8Array(32).fill(0);
    if (data.vmProgramCode.isSome) {
      provingSystemAuxDataCommitment = Hash.update(
        data.vmProgramCode.data!
      ).digest();
      Hash.reset();
    } else if (data.verificationKey.isSome) {
      provingSystemAuxDataCommitment = Hash.update(
        data.verificationKey.data!
      ).digest();
      Hash.reset();
    }

    let proofGeneratorAddr = hexStringToBytes(data.proofGeneratorAddress);
    return {
      proofCommitment,
      publicInputCommitment,
      provingSystemAuxDataCommitment,
      proofGeneratorAddr,
    };
  },
  hashData(data: VerificationDataCommitment) {
    const Hash = new Keccak(256);
    Hash.update(data.proofCommitment);
    Hash.update(data.publicInputCommitment);
    Hash.update(data.provingSystemAuxDataCommitment);
    Hash.update(data.proofGeneratorAddr);
    return Hash.digest();
  },
};

type AlignedVerificationData = {
  verificationDataCommitment: VerificationDataCommitment;
  batchMerkleRoot: Uint8Array;
  batchInclusionProof: InclusionProof;
  indexInBatch: number;
};
const AlignedVerificationData = {
  from(
    verificationDataCommitment: VerificationDataCommitment,
    data: BatchInclusionData
  ): AlignedVerificationData {
    return {
      verificationDataCommitment,
      ...data,
    };
  },
};

type InclusionProof = {
  merkle_path: Array<Uint8Array>;
};
type BatchInclusionData = {
  batchMerkleRoot: Uint8Array;
  batchInclusionProof: InclusionProof;
  indexInBatch: number;
};
const BatchInclusionData = {
  fromBuffer(data: Uint8Array) {
    const json = JSON.parse(new TextDecoder().decode(data));
    return {
      batchMerkleRoot: new Uint8Array(json.batch_merkle_root),
      batchInclusionProof: {
        merkle_path: json.batch_inclusion_proof.merkle_path.map((x: number[]) => new Uint8Array(x)),
      },
      indexInBatch: Number(json.index_in_batch),
    };
  },
};

type ProtocolVersion = number;
const ProtocolVersion = {
  fromBytesBuffer: (bytes: Uint8Array): ProtocolVersion => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getInt16(0, false);
  },
};

