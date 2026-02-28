import express from 'express';
import commentsRouter from './routes/comments';

const app = express();
const PORT = parseInt(process.env.PORT || '3019');

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'comment-intel' }));
app.use('/api/comments', commentsRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Comment Intel API running on port ${PORT}`);
});
