import express from 'express';
import dotenv from 'dotenv';
import createRouter from './router.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/', createRouter(process.env.AFFILIATE_URL));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});