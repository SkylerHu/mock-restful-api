const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.level || "debug",
  format: winston.format.combine(
    winston.format.errors({ stack: true }), // 自动捕获堆栈信息
    winston.format.colorize(),
    // winston.format.simple(),
    winston.format.printf((info) => {
      let message = `${info.level}: ${info.message}`;
      if (info.stack) {
        // 添加换行符处理以确保堆栈信息正确换行
        message += `\n${info.stack}`;
      }
      return message;
    }),
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
