export function isViewMode() {
  const pathname = window.location.pathname;
  if (/^\/app\/[^\/]+\/[^\/]+\/edit\b/.test(pathname)) {
    return false;
  }

  return pathname.startsWith("/app/");
}
