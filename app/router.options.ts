import type { RouterConfig } from "@nuxt/schema";

// Hash-based routing so the built app can be opened directly from disk
// (file://) and refreshed on any route without a server rewriting
// history-mode paths to index.html.
export default <RouterConfig>{
  hashMode: true,
};
