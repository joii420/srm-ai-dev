import { Router, Request, Response } from 'express';
import type { Store } from 'redux';

export function createStateRoutes(store: Store): Router {
  const router = Router();

  // GET /state — full state snapshot
  router.get('/state', (_req: Request, res: Response) => {
    res.json(store.getState());
  });

  // GET /state/:slice — specific top-level slice
  router.get('/state/:slice', (req: Request, res: Response) => {
    const state = store.getState();
    const slice = (state as any)[req.params.slice];
    if (slice === undefined) {
      res.status(404).json({ error: `Slice "${req.params.slice}" not found` });
      return;
    }
    res.json(slice);
  });

  // GET /state/:slice/:sub — nested sub-slice
  router.get('/state/:slice/:sub', (req: Request, res: Response) => {
    const state = store.getState();
    const slice = (state as any)[req.params.slice];
    if (!slice) {
      res.status(404).json({ error: `Slice "${req.params.slice}" not found` });
      return;
    }
    const sub = slice[req.params.sub];
    if (sub === undefined) {
      res.status(404).json({ error: `Sub-slice "${req.params.sub}" not found in "${req.params.slice}"` });
      return;
    }
    res.json(sub);
  });

  // POST /dispatch — dispatch a single action
  router.post('/dispatch', (req: Request, res: Response) => {
    const action = req.body;
    if (!action || !action.type) {
      res.status(400).json({ error: 'Action must have a "type" field' });
      return;
    }
    store.dispatch(action);
    res.json({ success: true, state: store.getState() });
  });

  // POST /dispatch-batch — dispatch multiple actions
  router.post('/dispatch-batch', (req: Request, res: Response) => {
    const { actions } = req.body;
    if (!Array.isArray(actions)) {
      res.status(400).json({ error: 'Body must have an "actions" array' });
      return;
    }
    for (const action of actions) {
      if (!action || !action.type) {
        res.status(400).json({ error: 'Each action must have a "type" field' });
        return;
      }
      store.dispatch(action);
    }
    res.json({ success: true, dispatched: actions.length });
  });

  return router;
}
