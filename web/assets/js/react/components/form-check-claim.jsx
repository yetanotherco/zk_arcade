import React, { useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { ConnectKitButton } from "connectkit";

const FormCheckClaim = () => {
  const formRef = useRef();
  const { address } = useAccount();

  const csrfToken = document.head.querySelector("[name~=csrf-token][content]").content;

  const handleSubmit = async () => {
    formRef.current.submit();
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
      </form>
      {address && <>
        <h3 className="pb-2">2. Check if you have a pending claim</h3>
        <button onClick={handleSubmit} className="default-btn" disabled={!address}>
          Check Claim
        </button> </>}
    </>
  );
};

export default FormCheckClaim;
