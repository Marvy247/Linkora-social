export type BridgePermission =
  | "wallet.getAddress"
  | "wallet.sign"
  | "wallet.signTransaction"
  | "profile.get";

export type BridgeErrorCode = "PermissionDenied" | "UserRejected" | "MethodUnavailable";

export class BridgeError extends Error {
  code: BridgeErrorCode;

  constructor(code: BridgeErrorCode, message: string) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
  }
}

export function assertPermission(
  permissions: BridgePermission[],
  method: string
): asserts method is BridgePermission {
  if (!permissions.includes(method as BridgePermission)) {
    throw new BridgeError("PermissionDenied", `Mini app has not declared ${method}`);
  }
}
