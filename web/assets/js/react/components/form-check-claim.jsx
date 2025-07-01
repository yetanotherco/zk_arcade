import React, { useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { ConnectKitButton } from "connectkit";

const FormCheckClaim = () => {
  const formRef = useRef();
  const { address } = useAccount();
  const [signature, setSignature] = useState("");

  const csrfToken = document.head.querySelector("[name~=csrf-token][content]").content;

  const { signMessageAsync } = useSignMessage();

  const handleSubmit = async () => {
    try {
      const sig = await signMessageAsync({
        message: "Aguante Rust!",
      });
      setSignature(sig);
      setTimeout(() => {
        formRef.current.submit();
      }, 0);
    } catch (err) {
      console.error("Error signing:", err);
    }
  };

  return (
    <>
      <h3 className="pb-2">1. Connect your claimable Ethereum wallet</h3>
      <div className="pb-6">
        <ConnectKitButton />
      </div>
      <form ref={formRef} action="/claim" method="post">
        <input type="hidden" name="_csrf_token" value={csrfToken} />
        <input type="hidden" name="address" value={address || ""} />
        <input type="hidden" name="signature" value={signature} />
      </form>
      {address && (
        <>
          <h3 className="pb-2">2. Check if you have a pending claim</h3>
          <button onClick={handleSubmit} className="default-btn" disabled={!address}>
            Check Claim
          </button>
        </>
      )}
    </>
  );
};

export default FormCheckClaim;
