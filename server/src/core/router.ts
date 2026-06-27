import { Router } from 'express';

/**
 * A self-contained module exposes one of these. `mount` wires the module's
 * routes onto the root router. Keeping the mount point here (rather than
 * exporting a raw Router) means a module can mount multiple routers or apply
 * per-route middleware without changing how `compose` consumes it.
 */
export interface Mountable {
  mount(router: Router): void;
}

/** Build one root router from many modules. This is what `routes/api.ts` calls. */
export function compose(modules: Mountable[]): Router {
  const root = Router();
  for (const m of modules) m.mount(root);
  return root;
}
