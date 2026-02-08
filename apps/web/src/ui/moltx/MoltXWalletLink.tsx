import React, { useState, useEffect } from "react";
import type { MoltXApi } from "@moltpostor/api";

type Step = "connect" | "input" | "sign" | "done" | "error";

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isRabby?: boolean;
      isCoinbaseWallet?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

function getWalletName(): string | null {
  if (!window.ethereum) return null;
  if (window.ethereum.isRabby) return "Rabby";
  if (window.ethereum.isCoinbaseWallet) return "Coinbase Wallet";
  if (window.ethereum.isMetaMask) return "MetaMask";
  return "Wallet";
}

function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null) {
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.reason === "string") return obj.reason;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.error === "object" && obj.error !== null) {
      const inner = obj.error as Record<string, unknown>;
      if (typeof inner.message === "string") return inner.message;
    }
  }
  if (typeof e === "string") return e;
  return "An unknown error occurred";
}

export function MoltXWalletLink(props: {
  api: MoltXApi;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [step, setStep] = useState<Step>("connect");
  const [address, setAddress] = useState("");
  const [chainId] = useState(8453); // Base
  const [nonce, setNonce] = useState("");
  const [typedData, setTypedData] = useState<string>("");
  const [typedDataObj, setTypedDataObj] = useState<Record<string, unknown> | null>(null);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [useManual, setUseManual] = useState(false);

  useEffect(() => {
    setWalletName(getWalletName());
  }, []);

  const switchToBase = async () => {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }], // 8453 in hex
      });
      return true;
    } catch (switchError: unknown) {
      const err = switchError as { code?: number };
      // Chain not added, try to add it
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x2105",
              chainName: "Base",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://mainnet.base.org"],
              blockExplorerUrls: ["https://basescan.org"],
            }],
          });
          return true;
        } catch {
          return false;
        }
      }
      // User rejected or other error
      return false;
    }
  };

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      setUseManual(true);
      setStep("input");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      if (accounts && accounts.length > 0 && accounts[0]) {
        const addr = accounts[0];
        setAddress(addr);
        await handleGetChallengeWithAddress(addr);
      } else {
        throw new Error("No accounts returned");
      }
    } catch (e: unknown) {
      const msg = extractErrorMessage(e);
      if (msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("User denied")) {
        setError("Connection rejected. You can try again or use manual entry.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGetChallengeWithAddress = async (addr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await props.api.getEvmChallenge(addr, chainId);
      const data = res.data;
      if (!data?.nonce || !data?.typed_data) {
        throw new Error("Invalid challenge response");
      }
      setNonce(data.nonce);
      setTypedData(JSON.stringify(data.typed_data, null, 2));
      setTypedDataObj(data.typed_data as Record<string, unknown>);
      setStep("sign");
      
      // Auto-sign if wallet is connected
      if (window.ethereum && !useManual) {
        await handleAutoSign(addr, data.typed_data as Record<string, unknown>, data.nonce);
      }
    } catch (e: unknown) {
      setError(extractErrorMessage(e));
      setLoading(false);
    }
  };

  const handleGetChallenge = async () => {
    if (!address.trim()) return;
    await handleGetChallengeWithAddress(address.trim());
  };

  const handleAutoSign = async (addr: string, td: Record<string, unknown>, challengeNonce: string) => {
    if (!window.ethereum) return;
    setLoading(true);
    setError(null);
    try {
      // Switch to Base network first
      const switched = await switchToBase();
      if (!switched) {
        setError("Please switch to Base network in your wallet to continue.");
        setLoading(false);
        return;
      }

      const sig = await window.ethereum.request({
        method: "eth_signTypedData_v4",
        params: [addr, JSON.stringify(td)],
      }) as string;
      
      if (sig) {
        setSignature(sig);
        await handleVerifyWithSignature(sig, challengeNonce);
      }
    } catch (e: unknown) {
      const msg = extractErrorMessage(e);
      if (msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("User denied")) {
        setError("Signature rejected. You can try again or enter manually below.");
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  const handleManualSign = async () => {
    if (!window.ethereum || !typedDataObj) return;
    setLoading(true);
    setError(null);
    try {
      // Switch to Base network first
      const switched = await switchToBase();
      if (!switched) {
        setError("Please switch to Base network in your wallet to continue.");
        setLoading(false);
        return;
      }

      const sig = await window.ethereum.request({
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(typedDataObj)],
      }) as string;
      
      if (sig) {
        setSignature(sig);
        await handleVerifyWithSignature(sig, nonce);
      }
    } catch (e: unknown) {
      const msg = extractErrorMessage(e);
      if (msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("User denied")) {
        setError("Signature rejected.");
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  const handleVerifyWithSignature = async (sig: string, challengeNonce: string) => {
    try {
      const verifyRes = await props.api.verifyEvmSignature(challengeNonce, sig);
      if (verifyRes.success !== false) {
        setStep("done");
        props.onLinked();
      } else {
        throw new Error("Verification failed");
      }
    } catch (e: unknown) {
      setError(extractErrorMessage(e));
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!signature.trim()) return;
    setLoading(true);
    setError(null);
    await handleVerifyWithSignature(signature.trim(), nonce);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
    >
      <div
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          padding: 24,
          maxWidth: 500,
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Link EVM Wallet</h3>
          <button onClick={props.onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>
            &times;
          </button>
        </div>

        {error && (
          <div style={{ color: "crimson", marginBottom: 12, padding: 8, background: "var(--color-bg-accent)", borderRadius: 4, fontSize: 13 }}>
            {error}
          </div>
        )}

        {step === "connect" && (
          <>
            <p style={{ marginBottom: 16, opacity: 0.8 }}>
              MoltX requires a linked EVM wallet to like, follow, and post. This is a one-time setup with no gas fees.
            </p>
            
            {walletName && !useManual ? (
              <>
                <button
                  onClick={handleConnectWallet}
                  disabled={loading}
                  style={{ 
                    width: "100%", 
                    padding: "12px", 
                    fontWeight: 600, 
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {loading ? "Connecting..." : `Connect with ${walletName}`}
                </button>
                <button
                  onClick={() => { setUseManual(true); setStep("input"); }}
                  disabled={loading}
                  style={{ width: "100%", padding: "10px", opacity: 0.7 }}
                >
                  Enter address manually
                </button>
              </>
            ) : (
              <>
                <div style={{ 
                  padding: 12, 
                  marginBottom: 16, 
                  background: "var(--color-bg-accent)", 
                  borderRadius: 6,
                  fontSize: 13,
                }}>
                  No browser wallet detected. Install MetaMask, Rabby, or Coinbase Wallet, or enter your address manually.
                </div>
                <button
                  onClick={() => { setUseManual(true); setStep("input"); }}
                  style={{ width: "100%", padding: "12px", fontWeight: 600 }}
                >
                  Enter address manually
                </button>
              </>
            )}
          </>
        )}

        {step === "input" && (
          <>
            <p style={{ marginBottom: 16, opacity: 0.8 }}>
              Enter your EVM wallet address to get a signing challenge.
            </p>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Wallet Address</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                style={{ width: "100%", padding: "8px", borderRadius: 4, boxSizing: "border-box" }}
                disabled={loading}
              />
            </label>
            <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 16 }}>
              Chain: Base (8453). You can use any EVM wallet address.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setStep("connect"); setUseManual(false); }}
                disabled={loading}
                style={{ flex: 1, padding: "10px" }}
              >
                Back
              </button>
              <button
                onClick={handleGetChallenge}
                disabled={!address.trim() || loading}
                style={{ flex: 1, padding: "10px", fontWeight: 600 }}
              >
                {loading ? "Loading..." : "Get Challenge"}
              </button>
            </div>
          </>
        )}

        {step === "sign" && (
          <>
            <p style={{ marginBottom: 12, opacity: 0.8 }}>
              {walletName && !useManual 
                ? `Sign the message in ${walletName} to verify ownership.`
                : "Sign the typed data below using your wallet."}
            </p>
            
            {walletName && !useManual && (
              <button
                onClick={handleManualSign}
                disabled={loading}
                style={{ width: "100%", padding: "12px", fontWeight: 600, marginBottom: 16 }}
              >
                {loading ? "Waiting for signature..." : `Sign with ${walletName}`}
              </button>
            )}

            <details open={useManual || !walletName}>
              <summary style={{ cursor: "pointer", fontSize: 13, marginBottom: 12 }}>
                {walletName && !useManual ? "Manual signature (advanced)" : "Manual signing instructions"}
              </summary>
              <div>
                <div style={{ 
                  padding: 10, 
                  marginBottom: 12, 
                  background: "var(--color-bg-accent)", 
                  borderRadius: 6,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}>
                  <strong>How to sign manually:</strong>
                  <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                    <li><strong>Network:</strong> Switch your wallet to <strong>Base</strong> network (Chain ID: 8453, hex: 0x2105)</li>
                    <li><strong>Copy:</strong> Click "Copy Typed Data" below to copy the JSON message</li>
                    <li><strong>Sign:</strong> Use your wallet's "Sign Typed Data" feature:
                      <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                        <li>MetaMask: Settings → Advanced → Sign Typed Data v4</li>
                        <li>Rabby: Click account → Sign → Typed Data</li>
                        <li>Or use browser console: <code style={{ fontSize: 10 }}>ethereum.request(&#123;method: "eth_signTypedData_v4", params: [address, typedData]&#125;)</code></li>
                      </ul>
                    </li>
                    <li><strong>Paste:</strong> Copy the resulting signature (starts with 0x) and paste below</li>
                  </ol>
                  <p style={{ margin: "8px 0 0", opacity: 0.8 }}>
                    This is an EIP-712 typed data signature. No gas fees or transactions are involved.
                  </p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Typed Data to Sign</span>
                  <textarea
                    readOnly
                    value={typedData}
                    style={{ width: "100%", height: 120, fontSize: 11, fontFamily: "monospace", boxSizing: "border-box" }}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <button
                    onClick={() => navigator.clipboard?.writeText(typedData)}
                    style={{ fontSize: 11, marginTop: 4 }}
                  >
                    Copy Typed Data
                  </button>
                </div>
                <label style={{ display: "block", marginBottom: 12 }}>
                  <span style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Signature</span>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="0x..."
                    style={{ width: "100%", padding: "8px", borderRadius: 4, boxSizing: "border-box" }}
                    disabled={loading}
                  />
                </label>
                <button
                  onClick={handleVerify}
                  disabled={!signature.trim() || loading}
                  style={{ width: "100%", padding: "10px", fontWeight: 600 }}
                >
                  {loading ? "Verifying..." : "Verify Signature"}
                </button>
              </div>
            </details>

            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => { setStep("connect"); setError(null); }}
                disabled={loading}
                style={{ width: "100%", padding: "10px", opacity: 0.7 }}
              >
                Start Over
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Wallet Linked!</div>
            <p style={{ opacity: 0.7, marginBottom: 16 }}>
              You can now like, follow, and post on MoltX.
            </p>
            <button onClick={props.onClose} style={{ padding: "10px 24px" }}>
              Close
            </button>
          </div>
        )}

        {step === "error" && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✗</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Linking Failed</div>
            <p style={{ opacity: 0.7, marginBottom: 16 }}>
              {error || "An error occurred while linking your wallet."}
            </p>
            <button onClick={() => { setStep("connect"); setError(null); }} style={{ padding: "10px 24px" }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
