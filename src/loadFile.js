import fs from "fs";
import path from "path";
import { join as pathJoin } from "node:path/posix";
import * as utils from "./utils.js";
import logger from "./logger.js";
import { validateConfig } from "./validator.js";

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
export const getJsonFileList = filePath => {
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
export const loadFileContent = filePath => {
  let config;
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      logger.warn(`The filePath is not a file or has been deleted: ${filePath}`);
      return;
    }
    const content = fs.readFileSync(filePath, "utf8");
    config = JSON.parse(content);
    // logger.debug(`load file success: ${filePath}`);
    config["file_path"] = filePath;
  } catch (err) {
    logger.error(`load file fail: ${filePath} ${err}`);
  }
  return config;
};

export const validateConfigV2 = config => {
  if (!utils.isDict(config)) {
    throw Error("The api json file content must be a dict");
  }
  const { page_size, filter_fields, search_fields, ordering_fields, ordering, pk_field, rules, rows, actions, apis } = config;
  if (page_size !== undefined) {
    if (!Number.isInteger(page_size) || page_size <= 0) {
      throw Error(`The "page_size" must be a int and greater than 0, "${page_size}" illegal.`);
    }
  }
  if (filter_fields !== undefined) {
    if (!utils.isDict(filter_fields)) {
      throw Error(`The "filter_fields" must be a dict.`);
    }
    for (let key in filter_fields) {
      const lookups = filter_fields[key];
      if (!utils.isArray(lookups)) {
        throw Error(`The "filter_fields" values can only be set arrays. eg: {"${key}": ["exact", "in"]}`);
      }
    }
  }
  if (search_fields !== undefined) {
    if (!utils.isArray(search_fields)) {
      throw Error(`The "search_fields" must be a array. eg: ["name", "desc"]`);
    }
  }
  if (ordering_fields !== undefined) {
    if (!utils.isArray(ordering_fields)) {
      throw Error(`The "ordering_fields" must be a array. eg: ["name", "desc"]`);
    }
  }
  if (ordering !== undefined) {
    if (!utils.isArray(ordering)) {
      throw Error(`The "ordering" must be a array. eg: ["-id", "+name"]`);
    }
  }
  if (pk_field !== undefined) {
    if (!utils.isString(pk_field)) {
      throw Error(`The "pk_field" must be a string, "${pk_field}" illegal.`);
    }
  }
  if (rules !== undefined) {
    if (!utils.isDict(rules)) {
      throw Error(`The "rules" must be a dict.`);
    }
    for (let key in rules) {
      const rule = rules[key];
      if (!utils.isDict(rule)) {
        throw Error(`The "rules" values can only be set dict. eg: {"${key}": {"type": "string"}}`);
      }
      if (utils.isEmpty(rule.type)) {
        throw Error(`The rules configuration item value must have a "type".`);
      }
    }
  }
  if (rows !== undefined) {
    if (!utils.isArray(rows)) {
      throw Error(`The "rows" must be a array.`);
    }
    for (let row of rows) {
      if (!utils.isDict(row)) {
        throw Error(`The "rows" configuration item value must be a dict.`);
      }
    }
  }
  if (actions !== undefined) {
    if (!utils.isArray(actions)) {
      throw Error(`The "actions" must be a array.`);
    }
    for (let action of actions) {
      if (!utils.isDict(action)) {
        throw Error(`The "actions" configuration item value must be a dict.`);
      }
      if (utils.isNull(action.method)) {
        throw Error(`The "actions" item value must have a "method".`);
      }
      if (utils.isNull(action.url_path)) {
        throw Error(`The "actions" item value must have a "url_path".`);
      }
    }
  }
  if (apis !== undefined) {
    if (!utils.isArray(apis)) {
      throw Error(`The "apis" must be a array.`);
    }
    for (let api of apis) {
      if (!utils.isDict(api)) {
        throw Error(`The "apis" configuration item value must be a dict.`);
      }
      if (utils.isNull(api.method)) {
        throw Error(`The "apis" item value must have a "method".`);
      }
      if (utils.isNull(api.path)) {
        throw Error(`The "apis" item value must have a "path".`);
      }
    }
  }
};

/**
 * 加载配置文件生成路由routes
 * @param {string} filePath
 * @returns
 */
export const genConfigToRoutes = filePath => {
  const config = loadFileContent(filePath);
  if (!config) {
    return;
  }
  try {
    validateConfig(config);
  } catch (err) {
    logger.error(`The file content is illegal: ${filePath} ${err}`);
    return;
  }
  // 重置该文件配置
  let routes = [];

  const { restful, actions, apis } = config;
  if (restful) {
    // 判断是否要添加斜线后缀
    const appendSlash = restful.endsWith("/") ? "/" : "";
    // pk_field 不仅仅是递增的数字，可能使用其他的例如uuid
    const detailUrl = pathJoin(restful, "([\\w-]+)", appendSlash);
    // 添加restful接口操作
    const baseRoute = { restful };
    routes = [
      { ...baseRoute, method: "GET", path: restful }, // 列表
      { ...baseRoute, method: "POST", path: restful }, // 创建
      { ...baseRoute, method: "GET", path: detailUrl, detail: true }, // 详情
      { ...baseRoute, method: "PATCH", path: detailUrl, detail: true }, // 部分字段修改
      { ...baseRoute, method: "PUT", path: detailUrl, detail: true }, // 修改
      { ...baseRoute, method: "DELETE", path: detailUrl, detail: true }, // 删除
    ];
    // 额外操作
    (actions || []).forEach(action => {
      const item = {
        method: action.method.toLowerCase(),
        path: pathJoin(action.detail ? detailUrl : restful, action.url_path),
        response: action.response,
      };
      routes.push(item);
    });
  }
  if (apis) {
    routes = routes.concat(apis);
  }
  // 最后添加相关配置
  return { routes, config: { rows: [], pk_field: "id", page_size: 20, ...config } };
};

/**
 * 校验路由配置数据
 * @param {Object} route
 */
export const validateRoute = (route, allData) => {
  const { restful, method, path } = route;
  if (!restful) {
    if (!method) {
      throw Error(`"method" cannot be empty`);
    }
    if (!path) {
      throw Error(`"path" cannot be empty`);
    }
  }
  for (let filePath in allData) {
    const { config, routes } = allData[filePath];
    if (restful && restful === config?.restful) {
      // restful接口重复
      throw Error(`The restful interface already exists in ${filePath}: restful=${restful}`);
    }
    for (let item of routes) {
      if (method.toLowerCase() === item.method.toLowerCase() && path === item.path) {
        // 其他接口重复
        throw Error(`The current method+path already exists in ${filePath}: method=${method} path=${path}`);
      }
    }
  }
};

export const loadFileToConfig = filePath => {
  if (global.jsonConfig[filePath]) {
    // 删除旧的peizhi
    logger.debug(`delete old config: ${filePath}`);
    delete global.jsonConfig[filePath];
  }
  const data = genConfigToRoutes(filePath);
  if (!data) {
    logger.error(`load config fail: ${filePath}`);
    return;
  }
  logger.info(`loading config: ${filePath}`);
  const { routes, config } = data;

  const fileConfig = { config, routes: [] };
  for (let route of routes) {
    const { path: urlPath } = route;
    try {
      validateRoute(route, global.jsonConfig);
      fileConfig.routes.push(route);
      logger.debug(`config add route  ${route.method.padEnd(8, " ")}${urlPath}`);
    } catch (err) {
      logger.error(`append route fail: ${filePath} ${err}`);
    }
  }
  global.jsonConfig[filePath] = fileConfig;
};

/**
 * 初始化并加载目录中的所有配置文件
 * @param {string} filePath 可以是目录也可以是文件
 * @returns
 */
export const initJsonFiles = filePath => {
  const files = getJsonFileList(filePath);
  for (let jsonFile of files) {
    loadFileToConfig(jsonFile);
  }
};
