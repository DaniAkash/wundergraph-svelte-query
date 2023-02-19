import createQueryUtils from '$lib/svelte-query/createQueryUtils';
import { createClient } from '../generated/client';
import type { Operations } from '../generated/client';
const client = createClient(); // Typesafe WunderGraph client

export const {
	createQuery,
	createFileUpload,
	createMutation,
	createSubscription,
	getAuth,
	getUser,
	queryKey
} = createQueryUtils<Operations>(client);
