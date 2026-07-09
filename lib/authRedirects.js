const DEFAULT_AUTH_CALLBACK_PATH = "/collection";

function pathWithSearch(url) {
  return `${url.pathname}${url.search}`;
}

function getSafeAuthCallbackPath(value, fallback = DEFAULT_AUTH_CALLBACK_PATH) {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;

  try {
    const parsed = new URL(trimmed, "https://vinylos.local");
    if (parsed.origin !== "https://vinylos.local") return fallback;
    return pathWithSearch(parsed) || fallback;
  } catch {
    return fallback;
  }
}

function buildLoginRedirectUrl(requestUrl) {
  const loginUrl = new URL("/login", requestUrl);
  loginUrl.searchParams.set("next", getSafeAuthCallbackPath(pathWithSearch(requestUrl)));
  return loginUrl;
}

module.exports = {
  DEFAULT_AUTH_CALLBACK_PATH,
  buildLoginRedirectUrl,
  getSafeAuthCallbackPath,
};
