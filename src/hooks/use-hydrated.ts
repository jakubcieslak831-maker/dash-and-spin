import { useEffect, useState } from "react";

/** True once the client has mounted — gates localStorage-backed UI to avoid hydration mismatch. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
