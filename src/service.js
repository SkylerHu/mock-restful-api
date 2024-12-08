import fs from "fs";
import { join as pathJoin } from "node:path/posix";
import { spawn } from "child_process";
import { program } from "commander";

import { fileURLToPath } from "url";
import { dirname } from "path";

import logger from "./logger.js";

// ES Module 不支持 __dirname，自定义一个
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 定义输入参数
program.option("--path <string>", "mock数据文件的路径，mock json file path", "fixtures");
program.parse();

const { path: filePath } = program.opts();

let child;

const runAppInChild = () => {
  child = spawn("node", [pathJoin(__dirname, "index.js"), ...process.argv.slice(2)]);

  child.stdout.on("data", data => {
    process.stdout.write(`${data}`);
  });
  child.stderr.on("data", err => {
    process.stderr.write(`${err}`);
  });
};

let timer;
fs.watch(filePath, (eventType, filename) => {
  logger.warn(`File ${eventType}: ${filename} ...`);
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log("\n---------------- restarting app --------------------------------\n");
    child.kill(); // 杀掉旧的进程
    runAppInChild();
  }, 1000);
});

runAppInChild();
