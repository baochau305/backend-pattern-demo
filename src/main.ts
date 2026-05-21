import 'reflect-metadata';
import { createApp } from './shared/app.js';

const app = await createApp();
const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
