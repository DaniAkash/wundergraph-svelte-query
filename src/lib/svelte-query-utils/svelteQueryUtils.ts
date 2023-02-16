import createQueryUtils from '$lib/svelte-query/createQueryUtils';
import { createClient } from '../generated/client';
import type { Operations } from '../generated/client';
const client = createClient(); // Typesafe WunderGraph client

export const { createQuery } = createQueryUtils<Operations>(client);
