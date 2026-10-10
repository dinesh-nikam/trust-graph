export const TrustGraphRegistryABI = [
  // --- Read Methods ---
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'authorizedIssuers',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isIssuer',
    stateMutability: 'view',
    inputs: [{ name: 'issuer', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getAttestation',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'issuer', type: 'address' },
          { name: 'subject', type: 'address' },
          { name: 'claimType', type: 'bytes32' },
          { name: 'evidenceHash', type: 'bytes32' },
          { name: 'evidenceUri', type: 'string' },
          { name: 'issuedAt', type: 'uint256' },
          { name: 'expiry', type: 'uint256' },
          { name: 'revoked', type: 'bool' },
          { name: 'revocationReason', type: 'string' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'isValid',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getValidityStatus',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: 'status', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'getAttestationsBySubject',
    stateMutability: 'view',
    inputs: [{ name: 'subject', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getAttestationsByIssuer',
    stateMutability: 'view',
    inputs: [{ name: 'issuer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getTotalAttestations',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getAllAttestationIds',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }],
  },

  // --- Write Methods ---
  {
    type: 'function',
    name: 'approveIssuer',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'issuer', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'removeIssuer',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'issuer', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'issueAttestation',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'subject', type: 'address' },
      { name: 'claimType', type: 'bytes32' },
      { name: 'evidenceHash', type: 'bytes32' },
      { name: 'evidenceUri', type: 'string' },
      { name: 'expiry', type: 'uint256' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'revokeAttestation',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'transferOwnership',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
  },

  // --- Events ---
  {
    type: 'event',
    name: 'IssuerApproved',
    inputs: [{ name: 'issuer', type: 'address', indexed: true }],
  },
  {
    type: 'event',
    name: 'IssuerRemoved',
    inputs: [{ name: 'issuer', type: 'address', indexed: true }],
  },
  {
    type: 'event',
    name: 'AttestationIssued',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'issuer', type: 'address', indexed: true },
      { name: 'subject', type: 'address', indexed: true },
      { name: 'claimType', type: 'bytes32', indexed: true },
      { name: 'evidenceHash', type: 'bytes32', indexed: false },
      { name: 'expiry', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AttestationRevoked',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'issuer', type: 'address', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      { name: 'previousOwner', type: 'address', indexed: true },
      { name: 'newOwner', type: 'address', indexed: true },
    ],
  },
] as const;

// Legacy alias for backwards compatibility
export const ProofOfWorkRegistryABI = TrustGraphRegistryABI;
