import { LinkoraClient } from "../client";
import { Keypair, Networks } from "@stellar/stellar-sdk";

describe("SDK E2E Tests against Stellar Testnet", () => {
  let client: LinkoraClient;
  let testKeypair: Keypair;
  let testAddress: string;

  beforeAll(() => {
    // Initialize client with Testnet configuration
    client = new LinkoraClient({
      contractId: process.env.LINKORA_CONTRACT_ID || "CDLDVFKHEZ2RVB3NG4UQA4VPD3TSHV6XMHXMHP2BSGCJ2IIWVTOHGDSG",
      rpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: Networks.TESTNET,
    });

    // Create test keypair from secret or generate new one
    if (process.env.TESTNET_SECRET_KEY) {
      testKeypair = Keypair.fromSecret(process.env.TESTNET_SECRET_KEY);
    } else {
      testKeypair = Keypair.random();
    }
    testAddress = testKeypair.publicKey();
  });

  describe("Profile Management", () => {
    test("setProfile → getProfile round-trip", async () => {
      const username = `testuser_${Date.now()}`;
      const creatorToken = Keypair.random().publicKey(); // Mock creator token address

      // Set profile
      await client.setProfile(testKeypair, testAddress, {
        user: testAddress,
        username,
        creator_token: creatorToken,
      });

      // Get profile and verify
      const profile = await client.getProfile(testAddress);
      
      expect(profile).toBeDefined();
      expect(profile?.username).toBe(username);
      expect(profile?.address).toBe(testAddress);
      expect(profile?.creator_token).toBe(creatorToken);
    }, 30000); // 30 second timeout for blockchain operations
  });

  describe("Post Management", () => {
    test("createPost → getPost round-trip", async () => {
      const content = `Test post from e2e suite - ${Date.now()}`;

      // Create post
      const result = await client.createPost(testKeypair, testAddress, {
        author: testAddress,
        content,
      });

      expect(result.postId).toBeDefined();
      expect(result.txHash).toBeDefined();

      // Get post and verify
      const post = await client.getPost(result.postId);
      
      expect(post).toBeDefined();
      expect(post?.content).toBe(content);
      expect(post?.author).toBe(testAddress);
      expect(post?.id).toBe(result.postId);
      expect(post?.tip_total).toBe(0);
      expect(post?.like_count).toBe(0);
      expect(post?.timestamp).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for blockchain operations
  });

  describe("Contract State", () => {
    test("getPostCount returns valid count", async () => {
      const count = await client.getPostCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("getProfile returns null for non-existent user", async () => {
      const randomAddress = Keypair.random().publicKey();
      const profile = await client.getProfile(randomAddress);
      expect(profile).toBeNull();
    });

    test("getPost returns null for non-existent post", async () => {
      const post = await client.getPost(999999999);
      expect(post).toBeNull();
    });
  });
});