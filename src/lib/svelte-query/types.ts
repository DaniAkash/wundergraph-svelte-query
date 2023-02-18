import type {
	OperationRequestOptions,
	FetchUserRequestOptions,
	OperationsDefinition,
	WithInput,
	ClientResponseError
} from '@wundergraph/sdk/client';

import type {
	CreateQueryOptions as TanstackCreateQueryOptions,
	CreateQueryResult,
	CreateMutationOptions as UseTanstackMutationOptions,
	CreateMutationResult
} from '@tanstack/svelte-query';

export type QueryFetcher<Operations extends OperationsDefinition> = {
	<
		OperationName extends Extract<keyof Operations['queries'], string>,
		Data extends Operations['queries'][OperationName]['data'] = Operations['queries'][OperationName]['data'],
		RequestOptions extends OperationRequestOptions<
			Extract<keyof Operations['queries'], string>,
			Operations['queries'][OperationName]['input']
		> = OperationRequestOptions<
			Extract<keyof Operations['queries'], string>,
			Operations['queries'][OperationName]['input']
		>
	>(
		query: RequestOptions
	): Promise<Data>;
};

export type MutationFetcher<Operations extends OperationsDefinition> = {
	<
		OperationName extends Extract<keyof Operations['mutations'], string>,
		Data extends Operations['mutations'][OperationName]['data'] = Operations['mutations'][OperationName]['data'],
		RequestOptions extends OperationRequestOptions<
			Extract<keyof Operations['mutations'], string>,
			Operations['mutations'][OperationName]['input']
		> = OperationRequestOptions<
			Extract<keyof Operations['mutations'], string>,
			Operations['mutations'][OperationName]['input']
		>
	>(
		mutation: RequestOptions
	): Promise<Data>;
};

export type QueryKey<Operations extends OperationsDefinition> = {
	<
		OperationName extends Extract<keyof Operations['queries'], string>,
		Input extends Operations['queries'][OperationName]['input'] = Operations['queries'][OperationName]['input']
	>(query: {
		operationName: OperationName;
		input?: Input;
	}): (OperationName | Input | undefined)[];
};

export type CreateQueryOptions<
	Data,
	Error,
	Input extends object | undefined,
	OperationName extends string,
	LiveQuery
> = Omit<
	TanstackCreateQueryOptions<Data, Error, Data, (OperationName | Input | undefined)[]>,
	'queryKey' | 'queryFn'
> &
	WithInput<
		Input,
		{
			operationName: OperationName;
			liveQuery?: LiveQuery;
			input?: Input;
		}
	>;

export type CreateQuery<
	Operations extends OperationsDefinition,
	ExtraOptions extends object = {}
> = {
	<
		OperationName extends Extract<keyof Operations['queries'], string>,
		Input extends Operations['queries'][OperationName]['input'] = Operations['queries'][OperationName]['input'],
		Data extends Operations['queries'][OperationName]['data'] = Operations['queries'][OperationName]['data'],
		LiveQuery extends Operations['queries'][OperationName]['liveQuery'] = Operations['queries'][OperationName]['liveQuery']
	>(
		options: CreateQueryOptions<Data, ClientResponseError, Input, OperationName, LiveQuery> &
			ExtraOptions
	): CreateQueryResult<Data, ClientResponseError> & { isSubscribed?: boolean };
};

export type UseMutationOptions<Data, Error, Input, OperationName extends string> = Omit<
	UseTanstackMutationOptions<Data, Error, Input, (OperationName | Input | undefined)[]>,
	'mutationKey' | 'mutationFn'
> & {
	operationName: OperationName;
};

export type CreateMutation<
	Operations extends OperationsDefinition,
	ExtraOptions extends object = {}
> = {
	<
		OperationName extends Extract<keyof Operations['mutations'], string>,
		Input extends Operations['mutations'][OperationName]['input'] = Operations['mutations'][OperationName]['input'],
		Data extends Operations['mutations'][OperationName]['data'] = Operations['mutations'][OperationName]['data']
	>(
		options: UseMutationOptions<Data, ClientResponseError, Input, OperationName> & ExtraOptions
	): CreateMutationResult<Data, ClientResponseError, Input>;
};

export interface UseUserOptions<User>
	extends FetchUserRequestOptions,
		TanstackCreateQueryOptions<User, ClientResponseError, User, [string]> {
	enabled?: boolean;
}

export type GetUser<Operations extends OperationsDefinition> = {
	(options?: UseUserOptions<Operations['user']>): CreateQueryResult<
		Operations['user'],
		ClientResponseError
	>;
};
