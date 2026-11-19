import { z } from 'zod';

/** Every piece of bilingual content is `{ id, en }`, both non-empty. */
export const Bi = z.object({ id: z.string().min(1), en: z.string().min(1) }).strict();
export type Bi = z.infer<typeof Bi>;

export const BiList = z.array(Bi);
