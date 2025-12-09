import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import assetsRouter from './routes/assets';
import projectsRouter from './routes/projects';
import batchRouter from './routes/batch';
import instancesRouter from './routes/instances';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from storage
app.use('/storage', express.static(path.join(__dirname, '../../../storage')));

// API Routes
app.use('/api', assetsRouter);
app.use('/api', projectsRouter);
app.use('/api', batchRouter);
app.use('/api', instancesRouter);

app.get('/', (req, res) => {
  res.send('AC-Gen Server is running');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
