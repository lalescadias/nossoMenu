import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";
export function useAction() {
  const [error, setError] = useState<unknown>(),
    [pending, setPending] = useState(false);
  const query = useQueryClient();
  async function run<T>(action: () => Promise<T>, done?: (value: T) => void) {
    setPending(true);
    setError(null);
    try {
      const result = await action();
      await query.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== "me",
      });
      done?.(result);
      return result;
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && e.status === 401) {
        query.setQueryData(["me"], null);
      }
      if (e instanceof ApiError && e.status === 409)
        await query.invalidateQueries();
    } finally {
      setPending(false);
    }
  }
  return { run, error, pending, setError };
}
