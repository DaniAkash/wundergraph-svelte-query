import { createQuery as tanstackCreateQuery } from '@tanstack/svelte-query';
import type { QueryFunctionContext } from '@tanstack/svelte-query';
import type { OperationsDefinition, Client } from '@wundergraph/sdk/client';
// import { serialize } from '@wundergraph/sdk/internal';
import type { CreateQuery, QueryFetcher, QueryKey } from './types';

export default function createQueryUtils<Operations extends OperationsDefinition>(client: Client) {
	const queryFetcher: QueryFetcher<Operations> = async (query) => {
		const result = await client.query(query);

		if (result.error) {
			throw result.error;
		}

		return result.data;
	};

	const queryKey: QueryKey<Operations> = ({ operationName, input }) => {
		return [operationName, input];
	};

	const createQuery: CreateQuery<Operations> = (options) => {
		const { operationName, liveQuery, input, enabled, refetchOnWindowFocus, ...queryOptions } =
			options;

		// TODO: will be needed for subscriptions
		// const queryHash = serialize([operationName, input]);

		const result = tanstackCreateQuery({
			queryKey: queryKey({ operationName, input }),
			queryFn: ({ signal }: QueryFunctionContext) =>
				queryFetcher({ operationName, input, abortSignal: signal }),
			...queryOptions,
			enabled: liveQuery ? false : enabled,
			refetchOnWindowFocus: liveQuery ? false : refetchOnWindowFocus
		});

		// TODO: Learn about how subscription works
		// const { isSubscribed } = useSubscribeTo({
		// 	queryHash,
		// 	operationName,
		// 	input,
		// 	liveQuery,
		// 	enabled: options.enabled !== false && liveQuery,
		// 	onSuccess: options.onSuccess,
		// 	onError: options.onError
		// });

		if (liveQuery) {
			return {
				...result
				// TODO: Subscription not ready yet
				// isSubscribed
			};
		}
		return result;
	};

	return { createQuery };
}
