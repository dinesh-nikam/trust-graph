import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { privateKeyToAccount } from 'viem/accounts';
import { app } from '../src/app.ts';
import { User } from '../src/models/User.ts';
import { WorkSubmission } from '../src/models/WorkSubmission.ts';

describe('TrustGraph Backend & MongoDB Test Suite', function () {
  this.timeout(45000);

  let mongod: MongoMemoryServer;

  before(async function () {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  });

  after(async function () {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async function () {
    await User.deleteMany({});
    await WorkSubmission.deleteMany({});
  });

  describe('Health Endpoint', function () {
    it('returns status ok with MongoDB connected state', async function () {
      const res = await request(app).get('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ok');
      assert.strictEqual(res.body.database, 'connected');
      assert.strictEqual(res.body.blockchain.chainId, 10143);
    });
  });

  describe('User Registration (POST /api/auth/register)', function () {
    it('registers a user successfully and sets HTTP-only cookie', async function () {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Developer Alice',
          email: 'Alice@Monad.xyz',
          password: 'securePassword123!',
          username: 'alice_monad',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.user.name, 'Developer Alice');
      assert.strictEqual(res.body.user.email, 'alice@monad.xyz');
      assert.strictEqual(res.body.user.username, 'alice_monad');
      assert.strictEqual(res.body.user.passwordHash, undefined, 'passwordHash must never be returned');

      // Verify cookie
      const rawCookies = res.headers['set-cookie'];
      assert.ok(rawCookies, 'set-cookie header should be present');
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
      assert.ok(cookies.some((c) => String(c).includes('trustgraph_jwt')), 'trustgraph_jwt cookie must be set');
      assert.ok(cookies.some((c) => String(c).includes('HttpOnly')), 'Cookie must be HttpOnly');

      // Verify database record
      const dbUser = await User.findOne({ email: 'alice@monad.xyz' });
      assert.ok(dbUser);
      assert.notStrictEqual(dbUser.passwordHash, 'securePassword123!', 'Password must be hashed with bcrypt');
    });

    it('rejects duplicate email registration with 409 Conflict', async function () {
      await request(app).post('/api/auth/register').send({
        name: 'First User',
        email: 'duplicate@test.com',
        password: 'password123!',
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Second User',
        email: 'DUPLICATE@TEST.COM', // Tests case-insensitivity
        password: 'password456!',
      });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.includes('already exists'));
    });

    it('rejects invalid email and short password with 400 Bad Request', async function () {
      const resBadEmail = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123!',
      });
      assert.strictEqual(resBadEmail.status, 400);

      const resShortPass = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'valid@email.com',
        password: 'short',
      });
      assert.strictEqual(resShortPass.status, 400);
      assert.ok(resShortPass.body.error.includes('at least 8 characters'));
    });
  });

  describe('User Login & Session (POST /api/auth/login)', function () {
    beforeEach(async function () {
      await request(app).post('/api/auth/register').send({
        name: 'Login User',
        email: 'login@test.com',
        password: 'myPassword888!',
      });
    });

    it('logs in successfully with valid credentials and returns session cookie', async function () {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@test.com',
        password: 'myPassword888!',
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.user.email, 'login@test.com');
      const rawCookies = res.headers['set-cookie'];
      assert.ok(rawCookies);
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
      assert.ok(cookies.some((c) => String(c).includes('trustgraph_jwt')));
    });

    it('rejects invalid password with 401 Unauthorized', async function () {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@test.com',
        password: 'wrongPassword!',
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('rejects nonexistent email with 401 Unauthorized', async function () {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@test.com',
        password: 'myPassword888!',
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('Protected Session Restoration & Logout (GET /api/auth/me, POST /api/auth/logout)', function () {
    let authCookie: string;

    beforeEach(async function () {
      const reg = await request(app).post('/api/auth/register').send({
        name: 'Session Tester',
        email: 'session@test.com',
        password: 'sessionPassword123!',
      });
      const cookieHeader = reg.headers['set-cookie'];
      authCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader || '');
    });

    it('returns 401 for /api/auth/me when unauthenticated', async function () {
      const res = await request(app).get('/api/auth/me');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('restores authenticated session using HTTP-only cookie', async function () {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.user.email, 'session@test.com');
    });

    it('logs out and clears the session cookie', async function () {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookie);

      assert.strictEqual(res.status, 200);
      const rawCookies = res.headers['set-cookie'];
      assert.ok(rawCookies);
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
      assert.ok(cookies.some((c) => String(c).includes('trustgraph_jwt=;')));
    });
  });

  describe('Cryptographic Wallet Association', function () {
    let authCookie: string;
    const testAccount = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');

    beforeEach(async function () {
      const reg = await request(app).post('/api/auth/register').send({
        name: 'Wallet Linker',
        email: 'wallet@test.com',
        password: 'walletPassword123!',
      });
      const cookieHeader = reg.headers['set-cookie'];
      authCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader || '');
    });

    it('generates a one-time server nonce and verifies EIP-191 signature', async function () {
      // 1. Get nonce
      const nonceRes = await request(app)
        .get('/api/auth/wallet-nonce')
        .set('Cookie', authCookie);

      assert.strictEqual(nonceRes.status, 200);
      assert.strictEqual(nonceRes.body.success, true);
      assert.ok(nonceRes.body.nonce);
      assert.ok(nonceRes.body.messageToSign);

      // 2. Sign message using test wallet
      const signature = await testAccount.signMessage({
        message: nonceRes.body.messageToSign,
      });

      // 3. Link wallet
      const linkRes = await request(app)
        .post('/api/auth/link-wallet')
        .set('Cookie', authCookie)
        .send({
          address: testAccount.address,
          signature,
        });

      assert.strictEqual(linkRes.status, 200);
      assert.strictEqual(linkRes.body.success, true);
      assert.strictEqual(linkRes.body.user.walletAddress, testAccount.address.toLowerCase());

      // 4. Verify nonce was consumed
      const dbUser = await User.findOne({ email: 'wallet@test.com' });
      assert.strictEqual(dbUser?.walletNonce, undefined, 'Nonce must be consumed once');
    });

    it('rejects forged or tampered signatures', async function () {
      // Get nonce
      const nonceRes = await request(app)
        .get('/api/auth/wallet-nonce')
        .set('Cookie', authCookie);

      // Sign with a different message
      const wrongSignature = await testAccount.signMessage({
        message: 'Forged message text',
      });

      const res = await request(app)
        .post('/api/auth/link-wallet')
        .set('Cookie', authCookie)
        .send({
          address: testAccount.address,
          signature: wrongSignature,
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.includes('signature verification failed'));
    });
  });

  describe('Work Submissions Lifecycle & Persistence', function () {
    let authCookie: string;
    let userId: string;
    const testWallet = '0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1';

    beforeEach(async function () {
      const reg = await request(app).post('/api/auth/register').send({
        name: 'Worker Bob',
        email: 'bob@test.com',
        password: 'bobPassword123!',
      });
      userId = reg.body.user.id;
      const cookieHeader = reg.headers['set-cookie'];
      authCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader || '');
    });

    it('creates a work submission and persists in MongoDB', async function () {
      const payload = {
        workType: 'SMART_CONTRACT',
        title: 'Monad Parallel DEX Router',
        description: 'High throughput router optimized for Monad EVM parallel transactions',
        evidenceUrl: 'https://github.com/test/dex-router',
        evidenceManifest: 'Repo: https://github.com/test/dex-router\nCompiler: 0.8.20',
        evidenceHash: '0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        subjectAddress: testWallet,
      };

      const res = await request(app)
        .post('/api/submissions')
        .set('Cookie', authCookie)
        .send(payload);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.submission.title, payload.title);
      assert.strictEqual(res.body.submission.status, 'PENDING');
      assert.strictEqual(res.body.submission.subjectAddress, testWallet.toLowerCase());

      // Verify in MongoDB
      const found = await WorkSubmission.findById(res.body.submission._id);
      assert.ok(found);
      assert.strictEqual(found.ownerUserId.toString(), userId);
      assert.strictEqual(found.status, 'PENDING');
    });

    it('retrieves user submissions and public submissions independently', async function () {
      // Create two submissions
      await request(app)
        .post('/api/submissions')
        .set('Cookie', authCookie)
        .send({
          workType: 'SMART_CONTRACT',
          title: 'Work One',
          description: 'First work description',
          evidenceUrl: 'https://github.com/test/one',
          evidenceManifest: 'Manifest 1',
          evidenceHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
          subjectAddress: testWallet,
        });

      // User's own submissions (authenticated)
      const myRes = await request(app)
        .get('/api/submissions/my')
        .set('Cookie', authCookie);
      assert.strictEqual(myRes.status, 200);
      assert.strictEqual(myRes.body.submissions.length, 1);

      // Public passport query (unauthenticated)
      const pubRes = await request(app)
        .get(`/api/submissions?address=${testWallet}`);
      assert.strictEqual(pubRes.status, 200);
      assert.strictEqual(pubRes.body.submissions.length, 1);
      assert.strictEqual(pubRes.body.submissions[0].title, 'Work One');
    });

    it('updates transaction hash upon on-chain broadcast', async function () {
      const created = await request(app)
        .post('/api/submissions')
        .set('Cookie', authCookie)
        .send({
          workType: 'GITHUB_CONTRIBUTION',
          title: 'Monad Core Contribution',
          description: 'Core contribution description',
          evidenceUrl: 'https://github.com/monad/pull/1',
          evidenceManifest: 'PR #1',
          evidenceHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
          subjectAddress: testWallet,
        });

      const subId = created.body.submission._id;
      const realTxHash = '0x3333333333333333333333333333333333333333333333333333333333333333';

      const updateRes = await request(app)
        .patch(`/api/submissions/${subId}/tx`)
        .set('Cookie', authCookie)
        .send({
          transactionHash: realTxHash,
          workId: '0x4444444444444444444444444444444444444444444444444444444444444444',
        });

      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.body.submission.transactionHash, realTxHash);

      const dbCheck = await WorkSubmission.findById(subId);
      assert.strictEqual(dbCheck?.transactionHash, realTxHash);
    });

    it('allows reviewers to record on-chain attestation and state transitions', async function () {
      const created = await request(app)
        .post('/api/submissions')
        .set('Cookie', authCookie)
        .send({
          workType: 'HACKATHON_PROJECT',
          title: 'Benchmark Winner',
          description: 'Benchmark description',
          evidenceUrl: 'https://devpost.com/software/benchmark',
          evidenceManifest: 'Bench 10k',
          evidenceHash: '0x5555555555555555555555555555555555555555555555555555555555555555',
          subjectAddress: testWallet,
        });

      const subId = created.body.submission._id;

      // Reviewer verifies work
      const reviewRes = await request(app)
        .patch(`/api/submissions/${subId}/review`)
        .set('Cookie', authCookie)
        .send({
          status: 'VERIFIED',
          statusReason: 'Evidence manifest verified against Monad Testnet benchmark.',
          attestationId: '42',
          transactionHash: '0x6666666666666666666666666666666666666666666666666666666666666666',
          reviewerAddress: '0x92Fa656bE0656D1F08a6eD7D284976d8b948F721',
        });

      assert.strictEqual(reviewRes.status, 200);
      assert.strictEqual(reviewRes.body.submission.status, 'VERIFIED');
      assert.strictEqual(reviewRes.body.submission.attestationId, '42');

      // Verify in DB
      const dbCheck = await WorkSubmission.findById(subId);
      assert.strictEqual(dbCheck?.status, 'VERIFIED');
      assert.strictEqual(dbCheck?.attestationId, '42');
    });
  });
});
