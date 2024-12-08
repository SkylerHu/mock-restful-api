import { program } from "commander";

import logger from "./logger.js";
import initApp from "./app.js";
import { initJsonFiles } from "./loadFile.js";

// 定义输入参数
program.option("-p, --port <number>", "mock服务端口，mock service port number", 3001)
  .option("--path <string>", "mock数据文件的路径，mock json file path", "fixtures")
  .option("--prefix <string>", "接口path的前缀，api path prefix", "/");
program.parse();

const option = program.opts();

console.log("start app options:", option);

const { path: filePath, port, prefix } = option;

initJsonFiles(filePath);

const app = initApp({ prefix });

app.listen(port, () => {
  logger.info(`mock-restful-api app listening on port ${port}`);
});
