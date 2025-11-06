import { useState, useCallback, useMemo } from 'react';
import { HttpAgent, Actor } from '@dfinity/agent';
import { IcrcLedgerCanister, decodeIcrcAccount } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { idlFactory } from 'declarations/backend';
import { Signer } from '@slide-computer/signer';
import { PostMessageTransport } from '@slide-computer/signer-web';
import { SignerAgent } from '@slide-computer/signer-agent';
import { ICP_LEDGER_ID, CKUSDC_LEDGER_ID, CKBTC_LEDGER_ID } from '@/libs/constants';

const BACKEND_CANISTER_ID = 'vtsa7-6qaaa-aaaah-arlkq-cai';

/**
 * Hook for wallet connections (OISY or Plug)
 * This handles crypto transactions only (not user identity)
 */
export function useWalletConnection() {
  const [walletType, setWalletType] = useState(null); // 'oisy' | 'plug' | null
  const [walletPrincipal, setWalletPrincipal] = useState(null);
  const [walletAgent, setWalletAgent] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Create OISY signer instance - EXACT PATTERN from ICP Ninja
  // NOT memoized - recreate on every render like ICP Ninja does
  // detectNonClickEstablishment: false allows us to handle complex async flows
  // See: https://github.com/slide-computer/signer-js/blob/main/packages/signer-web/README.md
  const oisyTransport = new PostMessageTransport({
    url: 'https://oisy.com/sign',
    windowOpenerFeatures: 'toolbar=0,location=0,menubar=0,width=600,height=800,left=200,top=100',
    detectNonClickEstablishment: false, // Disable detection to allow our async flow
  });
  const oisySigner = new Signer({ transport: oisyTransport });

  /**
   * Connect OISY Wallet
   */
  const connectOisy = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      // Get accounts (this will open the popup - oisySigner already created)
      // NO async operations before this to stay in click context!
      // Note: Sometimes first call fails with "not established connection" - retry once is normal
      let accounts;
      try {
        accounts = await oisySigner.accounts();
      } catch (firstError) {
        if (firstError.message?.includes('not established a connection')) {
          accounts = await oisySigner.accounts(); // Retry once
        } else {
          throw firstError;
        }
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in OISY wallet');
      }

      // Decode ICRC account to get principal
      const icrcAccount = decodeIcrcAccount(accounts[0].owner.toString());
      const principal = icrcAccount.owner;

      // Create default agent
      // Check if backend is on local replica by canister ID pattern
      const isLocalBackend = BACKEND_CANISTER_ID.includes('aaaaa-aa') ||
                             BACKEND_CANISTER_ID.length < 20;

      const defaultAgent = new HttpAgent({
        host: isLocalBackend ? 'http://localhost:4943' : 'https://icp0.io',
      });

      // Fetch root key for local backend only
      if (isLocalBackend) {
        await defaultAgent.fetchRootKey();
      }

      // Create signer agent with account parameter
      const signerAgent = await SignerAgent.create({
        agent: defaultAgent,
        signer: oisySigner,
        account: principal,
      });

      setWalletType('oisy');
      setWalletPrincipal(principal);
      setWalletAgent(signerAgent);
      setIsConnected(true);
      return { principal, agent: signerAgent };
    } catch (err) {
      console.error('OISY connection error:', err);
      setError(err.message || 'Failed to connect OISY wallet');
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [oisySigner]);

  /**
   * Connect Plug Wallet
   */
  const connectPlug = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      // Check if Plug is installed
      if (!window?.ic?.plug) {
        throw new Error('Plug wallet is not installed. Please install from https://plugwallet.ooo');
      }

      const whitelist = [
        BACKEND_CANISTER_ID,
        ICP_LEDGER_ID,
        CKUSDC_LEDGER_ID,
      ];

      // Check if backend is on local replica or mainnet
      const isLocalBackend = BACKEND_CANISTER_ID.includes('aaaaa-aa') ||
                             BACKEND_CANISTER_ID.length < 20;

      const host = isLocalBackend ? 'http://localhost:4943' : 'https://icp0.io';

      // Request connection
      await window.ic.plug.requestConnect({
        whitelist,
        host,
        timeout: 50000,
      });

      // Get principal
      const principal = await window.ic.plug.agent.getPrincipal();

      // Plug provides its own agent
      const agent = window.ic.plug.agent;

      setWalletType('plug');
      setWalletPrincipal(principal);
      setWalletAgent(agent);
      setIsConnected(true);

      return { principal, agent };
    } catch (err) {
      console.error('Plug connection error:', err);
      setError(err.message || 'Failed to connect Plug wallet');
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  /**
   * Generic connect function - picks the right wallet
   */
  const connect = useCallback(async (type) => {
    if (type === 'oisy') {
      return await connectOisy();
    } else if (type === 'plug') {
      return await connectPlug();
    } else {
      throw new Error(`Unknown wallet type: ${type}`);
    }
  }, [connectOisy, connectPlug]);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    setWalletType(null);
    setWalletPrincipal(null);
    setWalletAgent(null);
    setIsConnected(false);
    setError(null);
  }, []);

  /**
   * Create backend actor with wallet agent
   * @param {Object} options - Optional agent to use instead of state (avoids race condition)
   */
  const createWalletActor = useCallback(async (options = {}) => {
    const agentToUse = options.agent || walletAgent;
    const typeToUse = options.type || walletType;

    if (!agentToUse) {
      throw new Error('Wallet not connected');
    }

    try {
      if (typeToUse === 'plug') {
        // Plug requires requestConnect before createActor (refresh session)
        const connected = await window.ic.plug.requestConnect({
          whitelist: [BACKEND_CANISTER_ID],
        });

        if (!connected) {
          throw new Error('Plug wallet connection failed');
        }

        // Plug has its own createActor method
        const actor = await window.ic.plug.createActor({
          canisterId: BACKEND_CANISTER_ID,
          interfaceFactory: idlFactory,
        });
        return actor;
      } else {
        // OISY uses standard Actor creation
        const actor = Actor.createActor(idlFactory, {
          agent: agentToUse,
          canisterId: BACKEND_CANISTER_ID,
        });
        return actor;
      }
    } catch (err) {
      console.error('Error creating wallet actor:', err);
      throw err;
    }
  }, [walletAgent, walletType]);

  /**
   * Get ledger canister for transfers
   * Now accepts canisterId directly to support ANY ICRC-1 token!
   */
  const getLedgerCanister = useCallback((canisterIdOrSymbol) => {
    if (!walletAgent) {
      throw new Error('Wallet not connected');
    }

    let ledgerId;

    // Support both canister ID (new) and symbol (legacy for backwards compatibility)
    if (canisterIdOrSymbol.includes('-')) {
      // It's a canister ID (e.g., "mxzaz-hqaaa-aaaar-qaada-cai")
      ledgerId = canisterIdOrSymbol;
    } else {
      // Legacy: It's a symbol (e.g., "ICP", "ckBTC")
      if (canisterIdOrSymbol === 'ICP') {
        ledgerId = ICP_LEDGER_ID;
      } else if (canisterIdOrSymbol === 'ckBTC') {
        ledgerId = CKBTC_LEDGER_ID;
      } else if (canisterIdOrSymbol === 'ckUSDC') {
        ledgerId = CKUSDC_LEDGER_ID;
      } else {
        throw new Error(`Unsupported token symbol: ${canisterIdOrSymbol}`);
      }
    }

    return IcrcLedgerCanister.create({
      agent: walletAgent,
      canisterId: Principal.fromText(ledgerId),
    });
  }, [walletAgent]);

  /**
   * Check wallet availability
   */
  const checkWalletAvailability = useCallback(() => {
    return {
      oisy: !!window?.ic?.oisyWallet,
      plug: !!window?.ic?.plug,
    };
  }, []);

  return {
    // State
    walletType,
    walletPrincipal,
    walletAgent,
    isConnected,
    connecting,
    error,

    // OISY-specific: expose oisySigner for direct access in click handlers
    oisySigner,

    // Methods
    connect,
    connectOisy,
    connectPlug,
    disconnect,
    createWalletActor,
    getLedgerCanister,
    checkWalletAvailability,

    // OISY-specific: refresh signer channel (must be called in click handler!)
    refreshOisyChannel: useCallback(async () => {
      if (walletType !== 'oisy' || !oisySigner) {
        return;
      }

      try {
        // Call accounts() to re-establish channel - must be in click handler!
        await oisySigner.accounts();
      } catch (err) {
        console.error('Failed to refresh OISY channel:', err);
        throw err;
      }
    }, [walletType, oisySigner]),
  };
}
