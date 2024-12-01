import urlJoin from "url-join";
import express from "express";
import morgan from "morgan";

import { logger, isNull } from "./utils.js";
import { initRestfulResponse } from "./handler.js";

const initApp = option => {
  const { pathPrefix = "/" } = option || {};

  logger.info(`init app config: ${JSON.stringify(option)}`);

  const app = express();

  app.use(express.json()); // for parsing application/json
  app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
  app.use(morgan("dev")); // 配置输入日志格式

  // 若是有多个相同的 method+path，后面的无效
  // 遍历所有配置初始化app的路由
  const filePaths = Object.keys(global.jsonConfig);
  for (let i = 0; i <= filePaths.length; i++) {
    const filePath = filePaths[i];
    const { routes } = global.jsonConfig[filePath] || {};
    for (let j = 0; j < routes?.length; j++) {
      const route = routes[j];
      const { method, path: reqPath, restful, response } = route;
      // 判断method是否支持
      const _method = method.toLowerCase();
      const func = app[_method];
      if (isNull(func)) {
        logger.error(`The method value is invalid: method=${method} in file ${filePath}`);
        continue;
      }
      // 添加路由到app上
      const _path = urlJoin(pathPrefix, reqPath);
      logger.debug(`app add route  ${_method.padEnd(8, " ")} ${_path}`);
      app[_method](_path, (req, res) => {
        logger.info(`${req.method} ${req.path}\nquery: ${JSON.stringify(req.query, null, " ")}\nbody: ${JSON.stringify(req.body)}`);
        let respConf = response || {};
        if (restful) {
          // 处理restful接口
          // respConf = initRestfulResponse(req, filePath, route);
        }
        const { code = 200, headers, json, file, text = null } = respConf;
        // 处理 headers
        Object.keys(headers || {}).forEach(key => res.set(key, headers[key]));
        // 处理不同返回格式
        if (json) {
          res.status(code).json(json);
        } else if (file) {
          res.status(code).sendFile(file);
        } else {
          res.status(code).send(text);
        }
      });
    }
  }

  return app;
};

export default initApp;
