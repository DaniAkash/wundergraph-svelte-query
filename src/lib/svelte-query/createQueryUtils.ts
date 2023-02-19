import {
	createQuery as tanstackCreateQuery,
	createMutation as tanstackCreateMutation,
	useQueryClient
} from '@tanstack/svelte-query';
import { writable } from 'svelte/store';
import { onMount, onDestroy } from 'svelte';
import type { QueryFunctionContext } from '@tanstack/svelte-query';
import type { OperationsDefinition, LogoutOptions, Client } from '@wundergraph/sdk/client';
import { serialize } from '@wundergraph/sdk/internal';
import type {
	CreateFileUpload,
	CreateMutation,
	CreateQuery,
	CreateSubscribeToProps,
	CreateSubscription,
	GetUser,
	MutationFetcher,
	QueryFetcher,
	QueryKey,
	SubscribeToOptions
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

		// TODO: Learn about how to build subscription utility in svelte
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
	 * const { user, error, isLoading } = getUser()
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

	/**
	 * Upload a file to S3 compatible storage.
	 *
	 * @usage
	 * ```ts
	 * const { upload, data, error } = createFileUpload()
	 *
	 * const uploadFile = (file: File) => {
	 *  upload(file)
	 * }
	 * ```
	 */
	const createFileUpload: CreateFileUpload<Operations> = (options) => {
		const { mutate, mutateAsync, ...mutation } = tanstackCreateMutation(
			['uploadFiles'],
			async (input) => {
				const resp = await client.uploadFiles(input);
				return resp.fileKeys;
			},
			options
		) as any;

		return {
			upload: mutate,
			uploadAsync: mutateAsync,
			...mutation
		};
	};

	// Set up a subscription that can be aborted.
	const subscribeTo = (options: SubscribeToOptions) => {
		const abort = new AbortController();

		const { onSuccess, onError, onResult, onAbort, ...subscription } = options;

		subscription.abortSignal = abort.signal;

		client.subscribe(subscription, onResult).catch(onError);

		return () => {
			onAbort?.();
			abort.abort();
		};
	};

	// Helper function used in createQuery and createSubscription
	const createSubscribeTo = (props: CreateSubscribeToProps) => {
		const client = useQueryClient();
		const {
			operationName,
			input,
			enabled,
			liveQuery,
			subscribeOnce,
			resetOnMount,
			onSuccess,
			onError
		} = props;

		let startedAtRef: number | null = null;
		let unsubscribe: ReturnType<typeof subscribeTo>;

		const state = writable({
			isLoading: false,
			isSubscribed: false
		});

		onMount(() => {
			if (!startedAtRef && resetOnMount) {
				client.removeQueries([operationName, input]);
			}
		});

		if (enabled) {
			state.set({ isLoading: true, isSubscribed: false });
			unsubscribe = subscribeTo({
				operationName,
				input,
				liveQuery,
				subscribeOnce,
				onError(error) {
					state.set({ isLoading: false, isSubscribed: false });
					onError?.(error);
					startedAtRef = null;
				},
				onResult(result) {
					if (!startedAtRef) {
						state.set({ isLoading: false, isSubscribed: true });
						onSuccess?.(result);
						startedAtRef = new Date().getTime();
					}

					// Promise is not handled because we are not interested in the result
					// Errors are handled by React Query internally
					client.setQueryData([operationName, input], () => {
						if (result.error) {
							throw result.error;
						}

						return result.data;
					});
				},
				onAbort() {
					state.set({ isLoading: false, isSubscribed: false });
					startedAtRef = null;
				}
			});
		}

		onDestroy(() => {
			unsubscribe?.();
		});

		return state;
	};

	/**
	 * createSubscription
	 *
	 * Subscribe to subscription operations.
	 *
	 * @usage
	 * ```ts
	 * const { data, error, isLoading, isSubscribed } = useSubscription({
	 *   operationName: 'Countdown',
	 * })
	 */
	const createSubscription: CreateSubscription<Operations> = (options) => {
		const { enabled = true, operationName, input, subscribeOnce, onSuccess, onError } = options;
		const queryHash = serialize([operationName, input]);

		const subscription = tanstackCreateQuery<any, any, any, any>({
			queryKey: [operationName, input],
			enabled: false // we update the cache async
		});

		const subscriptionState = createSubscribeTo({
			queryHash,
			operationName,
			input,
			subscribeOnce,
			enabled,
			onSuccess,
			onError
		});

		const isSubscribed = subscriptionState

		return {
			...subscription,
			// TODO: set actual value
			isSubscribed: false
		};
	};

	return {
		createQuery,
		createMutation,
		getAuth,
		getUser,
		createFileUpload,
		queryKey,
		createSubscription
	};
}
