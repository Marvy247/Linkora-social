import { BridgeError, assertPermission } from "../permissions";

describe("mini app permissions", () => {
  it("rejects undeclared bridge methods", () => {
    expect(() => assertPermission(["wallet.getAddress"], "profile.get")).toThrow(BridgeError);

    try {
      assertPermission(["wallet.getAddress"], "profile.get");
    } catch (err) {
      expect(err).toBeInstanceOf(BridgeError);
      expect((err as BridgeError).code).toBe("PermissionDenied");
    }
  });
});
