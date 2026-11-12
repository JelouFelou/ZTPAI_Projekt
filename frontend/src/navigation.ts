export function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

export function currentRoute() {
  return window.location.pathname + window.location.search;
}

export function navigate(to: string) {
  if (to !== currentRoute()) {
    window.history.pushState(null, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}
