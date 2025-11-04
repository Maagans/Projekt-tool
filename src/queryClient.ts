import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { notifyUnauthorizedLogout } from './hooks/projectManager/authEvents';

type MaybeHttpError = {
  status?: number;
};

const isUnauthorizedError = (error: unknown): error is MaybeHttpError =>
  Boolean(error && typeof error === 'object' && 'status' in error && (error as MaybeHttpError).status === 401);

const createErrorHandler = () => (error: unknown) => {
  if (isUnauthorizedError(error)) {
    notifyUnauthorizedLogout();
  }
};

export const createAppQueryClient = () => {
  const handleError = createErrorHandler();

  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({
      onError: handleError,
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 60 * 1000,
      },
    },
  });
};
