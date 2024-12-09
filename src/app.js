const { join: pathJoin } = require("node:path/posix");
const morgan = require("morgan");
const express = require("express");

const logger = require("./logger.js");
const { initRestfulResponse } = require("./handler.js");

const initApp = option => {
  const { prefix = "/" } = option || {};

  const app = express();

  app.use(express.json()); // for parsing application/json
  app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
  app.use(morgan("dev")); // 配置输入日志格式

  // app.get("/web/users/:pk([\\w-]+)/", (req, res) => {
  //   res.status(200).json({ data: req.params.pk });
  // });

  // 若是有多个相同的 method+path，后面的无效
  // 遍历所有配置初始化app的路由
  for (let filePath in global.jsonConfig) {
    const { routes } = global.jsonConfig[filePath];
    for (let route of routes) {
      const { method, path: reqPath, restful, response } = route;
      // 判断method是否支持
      const _method = method.toLowerCase();
      // 添加路由到app上
      const _path = pathJoin("/", prefix, reqPath);

      logger.debug(`app add route  ${_method.padEnd(8, " ")} ${_path}`);
      app[_method](_path, (req, res) => {
        let respConf = response || {};
        if (restful) {
          // 处理restful接口
          respConf = initRestfulResponse(req, filePath, route);
        }
        const { code = 200, headers, json, file, text = null } = respConf;
        // 处理 headers
        for (let key in headers) {
          res.set(key, headers[key]);
        }
        // 处理不同返回格式
        if (json) {
          // 注意 code=204时，json无法返回给client；是遵循的HTTP标准
          res.status(code).send(json);
        } else if (file) {
          let _path = file;
          if (!_path.startsWith("/")) {
            // 相对路径，相对于服务的root path
            _path = pathJoin(process.cwd(), _path);
          }
          logger.debug(`download filePath is ${_path}`);
          res.status(code).sendFile(_path);
        } else {
          res.status(code).send(text);
        }
      });
    }
  }

  return app;
};

module.exports = initApp;