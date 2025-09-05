import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || 3001;

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    message: 'System is healthy'
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Lightlist API Server'
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});