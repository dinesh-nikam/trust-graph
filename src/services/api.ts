const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  username?: string;
  walletAddress?: string;
  createdAt: string;
}

export interface WorkSubmissionResponse {
  _id: string;
  workId?: string;
  ownerUserId: string;
  subjectAddress: string;
  workType: string;
  title: string;
  description: string;
  evidenceUrl: string;
  evidenceManifest: string;
  evidenceHash: string;
  metadataUri?: string;
  transactionHash?: string;
  attestationId?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REVOKED';
  statusReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensures HTTP-only cookie is sent and received
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  auth: {
    async register(payload: { name: string; email: string; password: string; username?: string }): Promise<{ success: boolean; user: UserResponse }> {
      return request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async login(payload: { email: string; password: string }): Promise<{ success: boolean; user: UserResponse }> {
      return request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async logout(): Promise<{ success: boolean; message: string }> {
      return request('/api/auth/logout', {
        method: 'POST',
      });
    },

    async getMe(): Promise<{ success: boolean; user: UserResponse }> {
      return request('/api/auth/me', {
        method: 'GET',
      });
    },

    async getWalletNonce(): Promise<{ success: boolean; nonce: string; messageToSign: string }> {
      return request('/api/auth/wallet-nonce', {
        method: 'GET',
      });
    },

    async linkWallet(payload: { address: string; signature: string }): Promise<{ success: boolean; user: UserResponse }> {
      return request('/api/auth/link-wallet', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  submissions: {
    async create(payload: {
      workType: string;
      title: string;
      description: string;
      evidenceUrl: string;
      evidenceManifest: string;
      evidenceHash: string;
      metadataUri?: string;
      workId?: string;
      subjectAddress?: string;
      transactionHash?: string;
    }): Promise<{ success: boolean; submission: WorkSubmissionResponse }> {
      return request('/api/submissions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async getMy(): Promise<{ success: boolean; submissions: WorkSubmissionResponse[] }> {
      return request('/api/submissions/my', {
        method: 'GET',
      });
    },

    async getPublic(params: { address?: string; status?: string; workType?: string } = {}): Promise<{ success: boolean; count: number; submissions: WorkSubmissionResponse[] }> {
      const query = new URLSearchParams();
      if (params.address) query.set('address', params.address);
      if (params.status) query.set('status', params.status);
      if (params.workType) query.set('workType', params.workType);

      const qs = query.toString();
      return request(`/api/submissions${qs ? `?${qs}` : ''}`, {
        method: 'GET',
      });
    },

    async getById(id: string): Promise<{ success: boolean; submission: WorkSubmissionResponse }> {
      return request(`/api/submissions/detail/${id}`, {
        method: 'GET',
      });
    },

    async updateTx(id: string, payload: { transactionHash?: string; workId?: string; attestationId?: string }): Promise<{ success: boolean; submission: WorkSubmissionResponse }> {
      return request(`/api/submissions/${id}/tx`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    async review(id: string, payload: {
      status: 'VERIFIED' | 'REJECTED' | 'REVOKED';
      statusReason?: string;
      transactionHash?: string;
      attestationId?: string;
      reviewerAddress?: string;
    }): Promise<{ success: boolean; submission: WorkSubmissionResponse }> {
      return request(`/api/submissions/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
  },
};
