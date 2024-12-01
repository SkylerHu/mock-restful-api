import fs from "fs";
import path from "path";
import urlJoin from "url-join";

import { logger } from "./utils.js";

global.jsonConfig = {
  // 格式示例
  // filePath: {
  //   config: {},
  //   routes: [],
  // }
};

/**
 * 递归获取目录下所有json文件
 * @param {string} filePath 可以是目录也可以是文件
 */
const getJsonFileList = filePath => {
  let allFilePaths = [];
  const stats = fs.lstatSync(filePath);
  if (stats.isFile()) {
    if (filePath.endsWith(".json")) {
      logger.debug(`find file: ${filePath}`);
      allFilePaths.push(filePath);
    } else {
      logger.warn(`ignore file: ${filePath} , because not endswith .json`);
    }
  } else if (stats.isDirectory()) {
    const files = fs.readdirSync(filePath);
    files.forEach(fileName => {
      // fileName 是文件名称（不包含文件路径）
      const childPath = path.join(filePath, fileName);
      allFilePaths = allFilePaths.concat(getJsonFileList(childPath));
    });
  }
  return allFilePaths;
};

/**
 * 读取配置文件转化为json数据
 * @param {string} filePath 必须是文件路径
 * @returns
 */
const loadFileContent = filePath => {
  let config;
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      logger.warn(`The filePath is directory: ${filePath}`);
      return;
    }
    if (!stats.isFile()) {
      logger.warn(`The file does not exist or has been deleted: ${filePath}`);
      return;
    }
    const content = fs.readFileSync(filePath, "utf8");
    config = JSON.parse(content);
    // logger.debug(`load file success: ${filePath}`);
    config["file_path"] = filePath;
  } catch (err) {
    logger.error(err);
    logger.error(`load file fail: ${filePath}`);
  }
  return config;
};

/**
 * 校验路由配置数据
 * @param {Object} route
 */
const validateRoute = route => {
  const { restful, method, path } = route;
  if (!restful) {
    if (!method) {
      throw Error(`"method" cannot be empty`);
    }
    if (!path) {
      throw Error(`"path" cannot be empty`);
    }
  }
  const filePaths = Object.keys(global.jsonConfig);
  for (let i = 0; i <= filePaths.length; i++) {
    const filePath = filePaths[i];
    const { config, routes } = global.jsonConfig[filePath] || {};
    if (restful && restful === config?.restful) {
      // restful接口重复
      throw Error(`The restful interface already exists in ${filePath}: restful=${restful}`);
    }
    for (let j = 0; j < routes?.length; j++) {
      const _route = routes[j];
      if (method.toLowerCase() === _route.method.toLowerCase() && path === _route.path) {
        // 其他接口重复
        throw Error(`The current path already exists in ${filePath}: method=${method} path=${path}`);
      }
    }
  }
};

/**
 * 将 filePath 中 配置的 route 加入到全局变量中
 * @param {string} filePath
 * @param {Object} route
 */
const appendRoute = (filePath, route) => {
  try {
    validateRoute(route);
    global.jsonConfig[filePath].routes.push(route);
    logger.debug(`config add route  ${route.method.padEnd(8, " ")}${route.path}`);
  } catch (err) {
    logger.error(err);
    logger.error(`append route fail: ${filePath} method=${route.method} path=${route.path}`);
  }
};

/**
 * 加载配置文件
 * @param {string} filePath
 * @returns
 */
export const loadFileToConfig = filePath => {
  if (global.jsonConfig[filePath]) {
    // 删除旧的peizhi
    logger.debug(`delete old config: ${filePath}`);
    delete global.jsonConfig[filePath];
  }
  const config = loadFileContent(filePath);
  if (!config) {
    logger.error(`load config fail: ${filePath}`);
    return;
  }
  logger.info(`loading config: ${filePath}`);
  // 重置该文件配置
  global.jsonConfig[filePath] = {
    // config: {}, // config值暂不添加，避免影响 validateRoute 中的校验
    routes: [],
  };

  const { restful, actions, apis } = config;
  if (restful) {
    // 判断是否要添加斜线后缀
    const appendSlash = restful.endsWith("/") ? "/" : "";
    // pk_field 不仅仅是递增的数字，可能使用其他的例如uuid
    const detailUrl = urlJoin(restful, "([\\w-]+)", appendSlash);
    // 添加restful接口操作
    const baseRoute = { restful };
    const initRoutes = [
      { ...baseRoute, method: "GET", path: restful }, // 列表
      { ...baseRoute, method: "POST", path: restful }, // 创建
      { ...baseRoute, method: "GET", path: detailUrl }, // 详情
      { ...baseRoute, method: "PATCH", path: detailUrl }, // 部分字段修改
      { ...baseRoute, method: "PUT", path: detailUrl }, // 修改
      { ...baseRoute, method: "DELETE", path: detailUrl }, // 删除
    ];
    initRoutes.forEach(item => appendRoute(filePath, item));
    // 额外操作
    (actions || []).forEach(action => {
      const item = {
        method: action.method.toLowerCase(),
        path: urlJoin(action.detail ? detailUrl : restful, action.url_path),
        response: action.response,
      };
      appendRoute(filePath, item);
    });
  }
  (apis || []).forEach(item => appendRoute(filePath, item));

  // 最后添加相关配置
  global.jsonConfig[filePath]["config"] = { rows: [], pk_field: "id", page_size: 20, ...config };
};

/**
 * 初始化并加载目录中的所有配置文件
 * @param {string} filePath 可以是目录也可以是文件
 * @returns
 */
export const initJsonFiles = filePath => {
  let routes = [];
  const files = getJsonFileList(filePath);
  for (let i = 0; i < files.length; i++) {
    const jsonFile = files[i];
    loadFileToConfig(jsonFile);
  }
  return routes;
};
