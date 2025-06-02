# mock-restful-api

[![NPM Version](https://img.shields.io/npm/v/mock-restful-api)](https://github.com/SkylerHu/mock-restful-api)
[![GitHub Actions Workflow Status](https://github.com/SkylerHu/mock-restful-api/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/SkylerHu/mock-restful-api)
[![Coveralls](https://img.shields.io/coverallsCoverage/github/SkylerHu/mock-restful-api)](https://github.com/SkylerHu/mock-restful-api)
[![GitHub License](https://img.shields.io/github/license/SkylerHu/mock-restful-api)](https://github.com/SkylerHu/mock-restful-api)

依赖 express 框架实现的接口 mock 服务，参照 django-rest-framework 实现。支持列表刷选、模糊搜索、排序，增删改查等操作。

The interface mock service is implemented by the express framework, and is implemented with reference to django-rest-framework. It supports list selection, fuzzy search, sorting, addition, deletion, modification, and other operations.

可查看版本变更记录[ChangeLog](./docs/CHANGELOG-1.x.md)

## 1. 安装

### 安装

    npm install mock-restful-api --save-dev

启动 mock 服务执行 `npx mock-restful-api --path <fixtures dir>`

### 全局安装

    npm install -g mock-restful-api

启动 mock 服务执行 `mock-restful-api --path <fixtures dir>`

### 命令行参数支持

`mock-restful-api -h` 可查看支持的参数：

```shell
Usage: mock-restful-api [options]

Options:
  -p, --port <number>  mock服务端口，mock service's port number (default: 3001)
  --host <string>      mock服务监听的IP地址，mock service's ip (default: "0.0.0.0")
  --path <string>      mock数据文件的路径/目录，mock json file path (default: "fixtures")
  --prefix <string>    接口path的前缀，api path prefix (default: "/")
  --ignore_watch       忽略监听path参数目录下文件变动而重启服务，ignore watch path for reload app (default: false)
  --delay <number>     延迟响应时间(ms)，在[0,delay]之间随机延迟，mock service's delay time (default: 0)
  -l --level <string>  日志级别: debug/info/notice/warn/error (default: "debug")
  -h, --help           display help for command
```

> 其中 `--path` 参数定义的目录必须存在，且会自动监听目录下文件变化进而重启 mock 服务。

## 2. fixtures 配置文件说明

> mcok 数据配置示例：[users.json](./fixtures/users.json)

注： `+` 代表数据格式深度。

| 字段            | 类型    | 说明                                 | 举例                                             |
| --------------- | ------- | ------------------------------------ | ------------------------------------------------ |
| restful         | string  | restful 接口 path 定义               | "web/users/"                                     |
| page_size       | integer | list 接口默认分页大小，默认值：20    | 20                                               |
| filter_fields   | object  | 定义可以刷选的字段                   | {"username": ["exact", "startswith"]}            |
| search_fields   | array   | 定义用于模糊搜索的字段               | ["username"]                                     |
| ordering_fields | array   | 定义用于排序的字段                   | ["id"]                                           |
| ordering        | array   | 定义默认排序，`+`递增(默认); `-`递减 | ["id"]                                           |
| pk_field        | string  | 定义数据记录的主键，默认`id`         | "id"                                             |
| rules           | object  | 定义 POST 提交数据校验要求           | { "username": { "type":"string" } }              |
| rows            | array   | 定义 mock 数据初始列表数据           | [{...}, {...}]                                   |
| actions         | array   | 基于 restful 定义的其他操作          |                                                  |
| +method         | string  | 请求方法, GET/POST 等                |                                                  |
| +url_path       | string  | action 路径                          | eg: "cancel"，则 path 为 /web/users/cancel/      |
| +detail         | bool    | 是否是详情 action，默认 false        | 为 true 时 path 为 /web/users/:pk/cancel/        |
| +response       | object  | 定义返回值                           | { "code": 200,"json": { "message": "success" } } |
| apis            | array   | 定义其他普通接口                     |                                                  |
| +path           | string  | 定义接口 path                        |
| +method         | string  | 请求方法, GET/POST 等                |                                                  |
| +response       | object  | 定义返回值                           |

以下按照单个字段配置举例说明.

#### restful

例如配置 `web/users/` 后，基础列表数据用 `rows` 定义， 服务将支持以下接口：(依赖命令行参数 `--prefix="/"`)

- `GET /web/users/` `200` 获取列表数据
  - 允许刷选字段由 `filter_fields` 定义
  - 模糊搜索，接口使用参数 `search`，允许模糊搜索的字段由 `search_fields` 定义
  - 排序接口传递参数 `ordering`，允许排序的字段由 `ordering_fields` 定义
- `POST /web/users/` `201` 新建记录, 若配置了 `rules` ，将会按照 rules 定义对数据进行校验
- `GET /web/users/:pk([\\w-]+)/` `200` 按照 `pk_field` 定义主键，根据键值 `pk` 获取详情
- `PATCH /web/users/:pk([\\w-]+)/` `200` 更新部分数据
- `UPDATE /web/users/:pk([\\w-]+)/` `200` 提交完整数据以更新记录
- `DELETE /web/users/:pk([\\w-]+)/` `204` 根据主键删除记录

需要注意的是：

- 刷选条件对 详情接口的操作也都生效，先根据 query 参数进行刷选，然后再寻找 pk 的记录
- 新增、修改、删除数据，会实际对 `rows` 数据操作生效，mock 服务重启后数据重置；
- 若是启动 mock 服务的参数 `--prefix=openapi` 则生成接口示例为 `GET /openapi/web/users/`

#### filter_fields

对列表数据刷选，能够筛选的字段必须在该字段中明确定义，示例如下：

```json
{
  "filter_fields": {
    "id": ["exact", "in"],
    "username": ["exact", "in", "contains", "startswith", "endswith", "regex"],
    "age": ["exact", "range", "lt", "lte", "gt", "gte", "isnull"],
    "created_at": ["range"],
    "city__name": ["exact", "in"]
  }
}
```

其中 `field` 作为配置数据的键, `lookup` 作为值，定义筛选的字段。

- 基本的查找关键字参数采用形式 `field__lookup=value` （使用双下划线）
  - `exact` 完全匹配，实现的是 `==` 运算；eg: `username=skyler` 等价于 `username__exact=skyler`
  - `isnull` 刷选数据是否为空的记录
    - `age__isnull=1` 筛选数据为 `undefined`/`null` 的数据，值为 `""` 不符合条件
    - `age__isnull=0` 熟宣数据不为空的数据
  - `in` 参数是列表值，可用英文逗号 `,` 隔开；eg: `id__in=1,2,3`，返回 username 值在 `[1,2,3]` 内的数据
  - `startswith` 前缀匹配，eg: `username__startswith=sky`
  - `endswith` 后缀匹配，eg: `username__endswith=ler`
  - `contains` 字符串包含，eg: `username__contains=ky`
  - `regex` 字符串正则, eg: `username__regex=sk.*ler`
  - `range` 区间范围，用于日期、数字甚至字符，传递 2 个值时使用逗号 `,` 隔开
    - `age__range=1,100` 刷选 age 值在 [1,100] 内的记录，即 `0 <= age <= 100`
    - `age__range=1` 筛选 `age >= 1` 的记录，等价于 `age__gte=100`
    - `age__range=,100` 筛选 `age <= 100` 的记录，等价于 `age__lte=100`
  - `lt` 小于， eg: `age__lt=100` 刷选 `age < 100` 的记录
  - `lte` 小于等于， eg: `age__lte=100` 刷选 `age <= 100` 的记录
  - `gt` 大于， eg: `age__gt=1` 刷选 `age > 1` 的记录
  - `gte` 大于等于， eg: `age__gte=1` 刷选 `age >= 1` 的记录
- 若是 query 参数中对应值为空字符串，则查询条件不生效；例如 `username=&search=` 这两个条件都是无效刷选；
- 可用 `__` （使用双下划线）定义多级深度的数据查找; eg: `city__name__in="beijing"` 可帅选出以下数据

```json
[
  {
    "id": 1,
    "username": "admin",
    "city": {
      "name": "beijing"
    }
  }
]
```

#### search_fields

定义模糊搜索的字段，示例：

```json
{
  "search_fields": ["username", "nickname", "city__name"]
}
```

通过 query 传递参数 `search=sky` 从 `rows` 记录中按照字段 username / nickname / city.name 判断是否包含 `sky` 的记录，其中任意一个字段匹配成功即符合条件。

#### ordering_fields

定义可以用于排序的字段，示例:

```json
{
  "ordering_fields": ["id", "name"],
  "ordering": ["id"]
}
```

通过 query 传递参数 `ordering=-id,+name` ，表示返回的列表数据 按照 `id` `降序` 且 `name` `升序` 的顺序返回。

若 query 没有传递 `ordering` 参数，则按照默认的配置 `"ordering": ["id"]` 对 `id` `升序` 返回数据，无符号 `+`/`-`时默认为 `+`升序。

#### pk_field

定义 `rows` 列表数据的主键，默认为 `id`。详情接口中 `pk` 值与该字段值匹配。

请求 `GET /web/users/1/` 则是返回 `rows` 中数据 `id=1` 的记录。

#### rules

定义 新增/修改 数据的校验规则，示例：

```json
{
  "rules": {
    "username": { "type": "string", "pattern": "\\w+", "required": true },
    "is_active": { "type": "boolean" },
    "age": { "type": "number", "integer": true, "min": 0, "max": 100 },
    "gender": { "type": "string", "valid": ["male", "female"] }
  }
}
```

- `username` 字符串正则，且是必须的字段
- `is_active` 定义 bool 类型
- `age` 数值定义取值范围
- `gender` 字符串，valid 定义枚举值范围

校验规则通过 `joi` 实现，将 json 配置转成成 Joi 的校验类。具体支持的类型和方法参照 [https://joi.dev/api/](https://joi.dev/api/)

#### actions

actions 是对 restful 的扩展，依赖 `restful` 的定义，示例：

```json
{
  "actions": [
    {
      "method": "POST",
      "url_path": "create/",
      "response": {}
    },
    {
      "method": "get",
      "url_path": "releated/",
      "detail": true,
      "response": {}
    }
  ]
}
```

以上配置根据拼接规则 `{restful}/{url_path}` 会生成以下接口：

- `POST /web/users/create/`
- `GET /web/users/:pk([\\w-]+)/releated/` 因为定义了 `detail=true`，所以路由支持传递 `pk`
  - 需要注意的是，`pk` 只要符合正则定义，无论何值，返回结果都按照 `response` 定义返回
  - 即 `GET /web/users/1/releated/` 和 `/web/users/2/releated/` 返回值一样

> 注意：生成的接口 path 是否 `/` 结尾，取决于 `restful` 的配置是否 `/` 结尾。

#### apis

定义其他扩展的接口，不依赖 restful ，可单独存在，示例：

```json
{
  "apis": [
    {
      "method": "get",
      "path": "web/enums/",
      "response": {
        "code": 200,
        "text": "text"
      }
    }
  ]
}
```

#### response 返回值配置

`actions` 和 `apis` 中的配置格式一样，接口都按照配置的数据返回结果。

| 字段    | 类型    | 说明                                         | 举例                                                |
| ------- | ------- | -------------------------------------------- | --------------------------------------------------- |
| code    | intrger | 定义返回状态码                               | 默认值 200                                          |
| headers | object  | 定义返回 Header 键值对                       | {"Content-Type": "image/png"}                       |
| json    | any     | 定义返回的 json 数据                         |                                                     |
| text    | string  | 定义返回的文本数据                           |                                                     |
| file    | string  | 定义实现下载文件                             | 配置文件相对(当前运行路径)/绝对路径, eg: ./test.jpg |
| delay   | int     | 支持单个接口写死一个 delay 延迟返回，单位 ms |                                                     |

## 3. 接口请求示例

#### 列表接口

```shell
curl "http://0.0.0.0:3001/web/users/?is_active=1&ordering=-id&city__name=anhui&search=sky"
```

返回状态码为 `200`：

```json
{
  "count": 1,
  "results": [
    {
      "id": 2,
      "username": "skyler",
      "nickname": "Skyler",
      "is_active": true,
      "age": 18,
      "gender": "male",
      "score": 99.9,
      "created_at": "2024-08-19 21:33:26",
      "groups": [
        {
          "id": "2",
          "name": "dev"
        }
      ],
      "city": {
        "id": 2,
        "name": "anhui"
      }
    }
  ]
}
```

#### 创建记录

```shell
curl -XPOST "http://0.0.0.0:3001/web/users/" -H "Content-Type: application/json" -d '{"username":"test"}'
```

返回状态码为 `201`：

```json
{
  "id": 6,
  "username": "test"
}
```

#### 修改接口

```shell
curl -XPATCH "http://0.0.0.0:3001/web/users/6/" -H "Content-Type: application/json" -d '{"username":"test2"}'
```

返回状态码为 `200`：

```json
{
  "id": 6,
  "username": "test2"
}
```

#### 详情接口

```shell
curl "http://0.0.0.0:3001/web/users/6/"
```

返回状态码为 `200`：

```json
{
  "id": 6,
  "username": "test2"
}
```

#### 删除接口

```shell
curl -XDELETE "http://0.0.0.0:3001/web/users/6/"
```

返回状态码为 `204`，无返回值。

## 4. 项目中配置接口 Proxy

以 React 项目为例，在 `src/setupProxy.js` 文件中增加如下配置：

```javascript
const createProxyMiddleware = require("http-proxy-middleware");

module.exports = function (app) {
  if (process.env.NODE_ENV !== "production") {
    app.use(
      createProxyMiddleware("/web/users", {
        target: "http://0.0.0.0:3001",
        changeOrigin: true,
        logLevel: "debug",
      })
    );
  }
};
```

proxy 更多配置参考 [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)
