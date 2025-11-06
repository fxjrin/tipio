import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from 'declarations/backend';

// Get canister ID from environment or declarations
const BACKEND_CANISTER_ID = process.env.CANISTER_ID_BACKEND ||
  import.meta.env.VITE_BACKEND_CANISTER_ID ||
  'uxrrr-q7777-77774-qaaaq-cai'; // fallback to local

/**
 * Create backend actor with authenticated agent
 * @param {HttpAgent} agent - Authenticated agent from OISY wallet
 * @returns Backend actor instance
 */
export function createAuthenticatedBackend(agent) {
  return Actor.createActor(idlFactory, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  });
}

/**
 * Create anonymous backend actor (for public queries)
 * @returns Backend actor instance
 */
export async function createAnonymousBackend() {
  // Check if backend is on local replica or mainnet
  const isLocalBackend = BACKEND_CANISTER_ID.includes('aaaaa-aa') ||
                         BACKEND_CANISTER_ID.length < 20; // Local canister IDs are shorter

  const host = isLocalBackend ? 'http://127.0.0.1:4943' : 'https://icp0.io';
  const agent = new HttpAgent({ host });

  // Fetch root key for local backend only
  if (isLocalBackend) {
    await agent.fetchRootKey();
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  });
}
