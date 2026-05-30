import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api-error";
import { toastError } from "@/hooks/use-toast";

export function createQueryClient(fallbackErrorMessage = "Something went wrong") {
  const showErrorToast = (error: unknown) => {
    if (isUnauthorizedError(error)) return;

    toastError(getApiErrorMessage(error, fallbackErrorMessage));
  };

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.silentError) return;
        showErrorToast(error);
      },
    }),
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.silentError) return;
        showErrorToast(error);
      },
    }),
  });
}
