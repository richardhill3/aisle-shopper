import { createAppContainer } from "./main/container";
import { createApiRouter } from "./presentation/http/routes";

export const apiRouter = createApiRouter(createAppContainer().controllers);
