import type {
	OperationRequestOptions,
	OperationsDefinition,
	WithInput,
	ClientResponseError
} from '@wundergraph/sdk/client';

import type {
	CreateQueryOptions as TanstackCreateQueryOptions,
	CreateQueryResult
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
