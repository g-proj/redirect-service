import express from 'express';
import {
  getOrCreateMapping,
  getMappingByOurParam,
  refreshMapping
} from './mappingService.js';

export default function createRouter(AFFILIATE_URL) {
  const router = express.Router();

  const apiAuth = (req, res, next) => {
    const providedKey = req.headers['x-api-key'];
    if (!providedKey || providedKey !== process.env.API_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

  router.get('/', (req, res) => {
    const { keyword, src, creative } = req.query;
    if (!keyword || !src || !creative) {
      return res.status(400).send('Missing keyword, src, or creative');
    }
    const our_param = getOrCreateMapping({ keyword, src, creative });
    return res.redirect(`${AFFILIATE_URL}?our_param=${our_param}`);
  });

  router.get('/retrieve_original', (req, res) => {
    const { our_param } = req.query;

    if (our_param) {
      const mapping = getMappingByOurParam(our_param);
      if (!mapping) return res.status(404).send('Mapping not found');
      return res.json(mapping);
    } else {
      const mostRecent = getMostRecentMapping();
      if (!mostRecent) return res.status(404).send('No mappings found');
      return res.json({
        warning: 'No our_param provided. Returning most recent mapping.',
        ...mostRecent
      });
    }
  });

  router.post('/refresh', apiAuth, (req, res) => {
    const { keyword, src, creative } = req.query;
    if (!keyword || !src || !creative) {
      return res.status(400).send('Missing keyword, src, or creative');
    }
    const result = refreshMapping({ keyword, src, creative });
    return res.json(result);
  });

  return router;
}