import { logger } from "./utils.js";
import initApp from "./app.js";
import { initJsonFiles } from "./loadFile.js";

const port = 3000;


const { filePath = "fixtures" } = {};

initJsonFiles(filePath);

const app = initApp();

app.listen(port, () => {
  logger.info(`Example app listening on port ${port}`);
});
