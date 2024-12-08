const logger = require("./logger.js");
const initApp = require("./app.js");
const { initJsonFiles } = require("./loadFile.js");

const { path: filePath, port, prefix } = process.env;

initJsonFiles(filePath);

const app = initApp({ prefix });

app.listen(port, () => {
  logger.info(`mock-restful-api app listening on port ${port}`);
});
