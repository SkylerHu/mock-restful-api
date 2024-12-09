#!/usr/bin/env node

const fs = require("fs");
const { join:  pathJoin } = require("node:path/posix");
const { spawn } = require("child_process");
const { program } = require("commander");

const logger = require("./logger.js");

// 定义输入参数
program
  .option("-p, --port <number>", "mock服务端口，mock service's port number", 3001)
  .option("--host <string>", "mock服务监听的IP地址，mock service's ip", "0.0.0.0")
  .option("--path <string>", "mock数据文件的路径/目录，mock json file path", "fixtures")
  .option("--prefix <string>", "接口path的前缀，api path prefix", "/")
  .option("--ignore_watch", "忽略监听path参数目录下文件变动而重启服务，ignore watch path for reload app", false)
  .option("-l --level <string>", "日志级别: debug/info/notice/warn/error", "debug");
program.parse();

const { path: filePath, ignore_watch: ignoreWatch, port, prefix, level, host } = program.opts();

const env = { ...process.env, path: filePath, port, prefix, level, host };

let child;

const runAppInChild = () => {
  child = spawn("node", [pathJoin(__dirname, "index.js")], { env });

  child.stdout.on("data", data => {
    process.stdout.write(`${data}`);
  });
  child.stderr.on("data", err => {
    process.stderr.write(`${err}`);
  });
};

fs.stat(filePath, (err) => {
  if (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    logger.error(`The file or directory does not exist: ${filePath}, Please reset the "--path"`);
  } else {
    // 文件存在
    if (ignoreWatch) {
      logger.warn("ignore watch mock file change.");
    } else {
      let timer;
      fs.watch(filePath, (eventType, filename) => {
        logger.warn(`File ${eventType}: ${filename} ...`);
        clearTimeout(timer);
        timer = setTimeout(() => {
          // eslint-disable-next-line no-console
          console.log("\n---------------- reloading app --------------------------------\n");
          child.kill(); // 杀掉旧的进程
          runAppInChild();
        }, 1000);
      });
    }

    runAppInChild();
  }
});

