import {
	createQuery as tanstackCreateQuery,
	createMutation as tanstackCreateMutation,
	useQueryClient
} from '@tanstack/svelte-query';
import type { QueryFunctionContext } from '@tanstack/svelte-query';
import type { OperationsDefinition, LogoutOptions, Client } from '@wundergraph/sdk/client';
// import { serialize } from '@wundergraph/sdk/internal';
import type {
	CreateMutation,
	CreateQuery,
	GetUser,
	MutationFetcher,
	QueryFetcher,
	QueryKey
} from './types';

export const userQueryKey = 'wg_user';

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

	const mutationFetcher: MutationFetcher<Operations> = async (mutation) => {
		const result = await client.mutate(mutation);

		if (result.error) {
			throw result.error;
		}

		return result.data;
	};

	/**
	 * Execute a WunderGraph query.
	 *
	 * @usage
	 * ```ts
	 * const { data, error, isLoading } = createQuery({
	 *   operationName: 'Weather',
	 * })
	 * ```
	 *
	 * All queries support liveQuery by default, enabling this will set up a realtime subscription.
	 * ```ts
	 * const { data, error, isLoading, isSubscribed } = useQuery({
	 *   operationName: 'Weather',
	 *   liveQuery: true,
	 * })
	 * ```
	 */
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

	/**
	 * Execute a WunderGraph mutation.
	 *
	 * @usage
	 * ```ts
	 * const { mutate, data, error, isLoading } = createMutation({
	 *   operationName: 'SetName'
	 * })
	 *
	 * mutate({
	 *   name: 'John Doe'
	 * })
	 * ```
	 */
	const createMutation: CreateMutation<Operations> = (options) => {
		const { operationName, ...mutationOptions } = options;

		return tanstackCreateMutation({
			mutationKey: [operationName],
			mutationFn: (input) => mutationFetcher({ operationName, input }),
			...mutationOptions
		});
	};

	const getAuth = () => {
		const queryClient = useQueryClient();

		return {
			login: (authProviderID: Operations['authProvider'], redirectURI?: string | undefined) =>
				client.login(authProviderID, redirectURI),
			logout: async (options?: LogoutOptions | undefined) => {
				const result = await client.logout(options);
				// reset user in the cache and don't trigger a refetch
				queryClient.setQueryData([userQueryKey], null);
				return result;
			}
		};
	};

	/**
	 * Return the logged in user.
	 *
	 * @usage
	 * ```ts
	 * const { user, error, isLoading } = useUser()
	 * ```
	 */
	const getUser: GetUser<Operations> = (options) => {
		const { revalidate, ...queryOptions } = options || {};
		return tanstackCreateQuery(
			[userQueryKey],
			({ signal }) =>
				client.fetchUser({
					revalidate,
					abortSignal: signal
				}),
			queryOptions
		);
	};

	return { createQuery, createMutation, getAuth, getUser };
}
