const logger = require("./logger.js");
const initApp = require("./app.js");
const { initJsonFiles } = require("./loadFile.js");

const { path: filePath, port, prefix, host } = process.env;

initJsonFiles(filePath);

const app = initApp({ prefix });

app.listen(port, host, () => {
  logger.info(`mock app listening on port ${host}:${port}`);
});
