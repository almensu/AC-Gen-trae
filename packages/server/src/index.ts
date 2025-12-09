import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from storage
app.use('/storage', express.static(path.join(__dirname, '../../../storage')));

app.get('/', (req, res) => {
  res.send('AC-Gen Server is running');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
