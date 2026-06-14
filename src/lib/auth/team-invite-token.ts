function generateInviteToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function ensureInviteToken(existing?: string) {
  return existing || generateInviteToken();
}
