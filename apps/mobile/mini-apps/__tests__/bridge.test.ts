import { createMiniAppBridge } from "../bridge";
import { BridgeError } from "../permissions";

describe("mini app bridge sandbox", () => {
  it("returns PermissionDenied when a call lacks a declared permission", async () => {
    const bridge = createMiniAppBridge({
      permissions: ["wallet.getAddress"],
      handlers: {
        "wallet.signTransaction": async () => ({ signedTxXdr: "signed" }),
      },
    });

    await expect(
      bridge.call("wallet.signTransaction", { txXdr: "unsigned" })
    ).rejects.toMatchObject({ code: "PermissionDenied" });
  });

  it("returns UserRejected when wallet.sign is not approved", async () => {
    const bridge = createMiniAppBridge({
      permissions: ["wallet.sign"],
      requestUserApproval: async () => false,
      handlers: {
        "wallet.sign": async () => ({ signature: "signed" }),
      },
    });

    await expect(bridge.call("wallet.sign", "payload")).rejects.toMatchObject({
      code: "UserRejected",
    });
  });

  it("prevents a mini app from calling undeclared bridge methods", async () => {
    const bridge = createMiniAppBridge({
      permissions: ["wallet.getAddress"],
      handlers: {
        "wallet.getAddress": async () => "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
        "profile.get": async () => ({ username: "maya" }),
      },
    });

    await expect(bridge.call("profile.get")).rejects.toBeInstanceOf(BridgeError);
    await expect(bridge.call("profile.get")).rejects.toMatchObject({
      code: "PermissionDenied",
    });
  });
});
