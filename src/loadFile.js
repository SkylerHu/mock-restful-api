const fs = require("fs");
const { join: pathJoin } = require("node:path/posix");
const logger = require("./logger.js");
const { MethodEnum } = require("./enums.js");
const { validateConfig } = require("./validator.js");

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
      const childPath = pathJoin(filePath, fileName);
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

/**
 * 加载配置文件生成路由routes
 * @param {string} filePath
 * @returns
 */
const genConfigToRoutes = filePath => {
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
    const detailUrl = pathJoin(restful, ":pk([\\w-]+)", appendSlash);
    // 添加restful接口操作
    const baseRoute = { restful };
    routes = [
      { ...baseRoute, method: MethodEnum.GET, path: restful }, // 列表
      { ...baseRoute, method: MethodEnum.POST, path: restful }, // 创建
      { ...baseRoute, method: MethodEnum.GET, path: detailUrl, detail: true }, // 详情
      { ...baseRoute, method: MethodEnum.PATCH, path: detailUrl, detail: true }, // 部分字段修改
      { ...baseRoute, method: MethodEnum.PUT, path: detailUrl, detail: true }, // 修改
      { ...baseRoute, method: MethodEnum.DELETE, path: detailUrl, detail: true }, // 删除
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
const validateRoute = (route, allData) => {
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

const loadFileToConfig = filePath => {
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
const initJsonFiles = filePath => {
  const files = getJsonFileList(filePath);
  for (let jsonFile of files) {
    loadFileToConfig(jsonFile);
  }
};

module.exports = {
  getJsonFileList,
  loadFileContent,
  genConfigToRoutes,
  validateRoute,
  loadFileToConfig,
  initJsonFiles,
};
