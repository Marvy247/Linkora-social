export type DeepLinkRoute =
  | {
      type: "post";
      path: `/post/${string}`;
    }
  | {
      type: "profile";
      path: `/profile/${string}`;
    }
  | {
      type: "pool";
      path: `/pool/${string}`;
    };

const LINKORA_SCHEME = "linkora:";
const LINKORA_PREFIX = "linkora://";
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function getDeepLinkSegments(value: string): Array<string | null> | null {
  if (!value.startsWith(LINKORA_PREFIX)) {
    return null;
  }

  const withoutScheme = value.slice(LINKORA_PREFIX.length);
  const pathEndIndex = withoutScheme.search(/[?#]/);
  const rawPath = pathEndIndex === -1 ? withoutScheme : withoutScheme.slice(0, pathEndIndex);
  const path = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
  const segments = path.split("/");

  if (segments.length !== 2) {
    return null;
  }

  return segments.map(safeDecode);
}

function isValidId(value: string): boolean {
  return ID_PATTERN.test(value);
}

function isValidProfileAddress(value: string): boolean {
  return STELLAR_PUBLIC_KEY_PATTERN.test(value);
}

export function parseDeepLink(value: string): DeepLinkRoute | null {
  if (!value.startsWith(LINKORA_SCHEME)) {
    return null;
  }

  const segments = getDeepLinkSegments(value);

  if (!segments || segments.some((segment) => !segment)) {
    return null;
  }

  const [resource, rawId] = segments as [string, string];

  switch (resource) {
    case "post":
      return isValidId(rawId) ? { type: "post", path: `/post/${rawId}` } : null;
    case "profile":
      return isValidProfileAddress(rawId) ? { type: "profile", path: `/profile/${rawId}` } : null;
    case "pool":
      return isValidId(rawId) ? { type: "pool", path: `/pool/${rawId}` } : null;
    default:
      return null;
  }
}

export function isValidDeepLink(value: string): boolean {
  return parseDeepLink(value) !== null;
}
