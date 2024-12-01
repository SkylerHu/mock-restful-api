import winston from "winston";

export const logger = winston.createLogger({
  level: "debug",
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

export const isNull = value => value === undefined || value === null;

export const isEmpty = value => isNull(value) || value === "";

export const isArray = value => value instanceof Array;

export const isDict = value => typeof value === "object";

export const isBooleanTrue = value => ["true", "True", "1", 1, true].includes(value);

export const isBooleanFalse = value => ["false", "False", "0", 0, false].includes(value);

export const isAbsBoolean = value => typeof value === "boolean";

export const isBoolean = value => isBooleanTrue(value) || isBooleanFalse(value);

export const isString = value => typeof value === "string";

// 是绝对数字
export const isAbsNumber = value => typeof value === "number";

// 可能是数字、字符串类型的数值
export const isNumber = value => !Number.isNaN(Number(value));
// 允许进行对比的类型
export const allowCompareRange = value => isEmpty(value) && (isString(value) || isNumber(value));

export const formatJsonToStr = data => JSON.stringify(data, null, " ");
