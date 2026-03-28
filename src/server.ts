import { env } from './config';
import app from './app';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});
