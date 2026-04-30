import { createApp } from "./main/app";

const app = createApp();
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Aisle Shopper API listening on http://localhost:${port}`);
});
