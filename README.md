# 🏠 家政上门服务平台

全栈家政服务微信小程序 — 覆盖**用户端 · 师傅端 · 管理端**完整业务闭环。

[![平台](https://img.shields.io/badge/平台-微信小程序-07C160?logo=wechat)](https://github.com/KUN903/dome)
[![框架](https://img.shields.io/badge/框架-原生WXML/WXSS/JS-07C160)](https://developers.weixin.qq.com/miniprogram/dev/framework/)
[![后端](https://img.shields.io/badge/后端-CloudBase云开发-0052D9?logo=tencentcloud)](https://cloud.tencent.com/product/tcb)
[![数据库](https://img.shields.io/badge/数据库-CloudBase%20MySQL%208.0-4479A1?logo=mysql)](https://cloud.tencent.com/product/tcb)
[![许可证](https://img.shields.io/badge/许可证-MIT-green)](./LICENSE)

---

## 目录

- [功能矩阵](#功能矩阵)
- [技术架构](#技术架构)
- [项目结构](#项目结构)
- [订单生命周期](#订单生命周期)
- [角色与数据隔离](#角色与数据隔离)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [核心设计决策](#核心设计决策)

---

## 功能矩阵

### 🧑 用户端 (Customer)

| 模块 | 功能 |
|------|------|
| 首页 | 城市定位、服务分类入口、热门推荐、附近师傅、搜索 |
| 服务 | 服务详情/图片、师傅主页/可选服务、规格与价格 |
| 下单 | 选择地址、优惠券、规格参数、确认下单 |
| 支付 | 确认支付 → 更新 pay_status → 订单推送师傅端 |
| 订单 | 全部/待支付/待接单/服务中/待评价/已完成/已取消 |
| 评价 | 五星评分 + 文字评价 → 写入 reviews 表 → 订单流转 finished |
| 我的 | 地址管理(增删改+GPS填充)、优惠券、收藏、联系客服 |

### 👷 师傅端 (Worker)

| 模块 | 功能 |
|------|------|
| 今日工单 | 待接单红点、接单/联系客户、完工凭证上传、下拉刷新 |
| 全部工单 | 按状态筛选(待接单/服务中/已完成/已取消) + 日期筛选 |
| 收入明细 | 累计总收入、今日收入/接单/完成、佣金/提现流水 tab + 月度切换 |
| 出勤设置 | 上下班打卡(GPS)、自定义接单时段、请假提交、一键开/关接单、历史打卡/请假 |
| 使用帮助 | 搜索框、4 分类图文教程、折叠式 FAQ、联系客服入口 |
| 设置 | 修改密码、换绑手机、消息通知、隐私权限、版本检测、切换账号/退出登录 |

### 🛡️ 管理端 (Admin)

| 模块 | 功能 |
|------|------|
| 我的页面 | 全平台数据统计(用户数/今日订单/待接单/师傅数/营收) |
| 全部订单 | 查看所有订单，订单状态全链路监督 |

---

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                  微信小程序 (原生)                  │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐    │
│  │ 登录  │ 首页  │ 分类  │ 订单  │ 我的  │ 工单  │    │
│  └──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬───┘    │
│     │      │      │      │      │      │         │
│  ┌──┴──────┴──────┴──────┴──────┴──────┴────┐    │
│  │         utils/request.js                  │    │
│  │   ┌─────────────────────────────────┐     │    │
│  │   │ 自动拼token · workerId · 401拦截 │     │    │
│  │   └─────────────────────────────────┘     │    │
│  └─────────────────┬───────────────────────-─┘    │
│                    │                               │
│     ┌──────────────┼──────────────┐                │
│     ▼              ▼              ▼                │
│  CloudBase     REST API     腾讯地图API            │
│  云函数          (自建后端)     (逆地理编码/距离)     │
│     │              │              │                │
│     └──────────────┼──────────────┘                │
│                    ▼                               │
│     ┌────────────────────────────┐                 │
│     │  CloudBase MySQL 8.0       │                 │
│     │  ┌──────┬──────┬────────┐ │                 │
│     │  │orders│users │workers │ │                 │
│     │  ├──────┼──────┼────────┤ │                 │
│     │  │...   │...   │...     │ │                 │
│     │  └──────┴──────┴────────┘ │                 │
│     └────────────────────────────┘                 │
└────────────────────────────────────────────────────┘
```

| 层级 | 技术选型 |
|------|---------|
| 视图层 | 原生 WXML + WXSS (`glass-easel` 组件框架) |
| 逻辑层 | 原生 JS (ES6+) |
| 网络层 | `utils/request.js` 统一封装 + `wx.cloud.callFunction()` |
| 服务端 | 腾讯 CloudBase 云函数 (Node.js 18) |
| 数据库 | CloudBase MySQL 8.0 (`@cloudbase/node-sdk` `$runSQLRaw`) |
| 定位 | 腾讯地图 WebService API (逆地理编码) + Haversine 公式 (距离排序) |
| 存储 | `wx.setStorageSync` (token/workerId/role 持久化) |

---

## 项目结构

```
mode/
│
├── app.js                          # 全局入口：云开发初始化、定位、登录、角色恢复
├── app.json                        # 路由配置：23个页面 + 自定义TabBar
├── app.wxss                        # 全局样式：绿色主题、通用组件
│
├── pages/                          # ── 页面层 (23个) ──
│   │
│   ├── login/                      # 登录页（首位）
│   │   ├── login.js                #   角色选择 + 客户微信登录 + 师傅手机号密码登录
│   │   ├── login.wxml              #   绿色渐变品牌区 + 角色双色按钮 + 登录卡片
│   │   └── login.wxss              #   40vh绿色区 + 负margin跨分界 + 安全区适配
│   │
│   ├── index/                      # 首页
│   │   ├── index.js                #   城市定位、热门服务、附近师傅、搜索跳转
│   │   ├── index.wxml              #   Swiper轮播、服务分类网格、师傅卡片
│   │   └── index.wxss              #   渐变banner、服务卡样式
│   │
│   ├── category/                   # 服务分类
│   │   ├── category.js             #   左侧类目 + 右侧服务列表 (含图片)
│   │   ├── category.wxml           #   双栏布局
│   │   └── category.wxss
│   │
│   ├── service-detail/             # 服务/师傅详情（双模式）
│   │   ├── service-detail.js       #   服务模式 (id) / 师傅模式 (workerId)
│   │   ├── service-detail.wxml     #   封面图、服务列表、预约按钮
│   │   └── service-detail.wxss     #   蓝色师傅头部、四维统计卡
│   │
│   ├── order-create/               # 下单
│   │   ├── order-create.js         #   地址选择、优惠券、规格参数、支付确认
│   │   ├── order-create.wxml       #   下单表单 + 支付弹窗
│   │   └── order-create.wxss
│   │
│   ├── order-detail/               # 订单详情
│   │   ├── order-detail.js         #   状态流转: 支付/取消/接单/开始/完成/评价
│   │   ├── order-detail.wxml       #   状态流程条、信息卡、操作按钮
│   │   └── order-detail.wxss
│   │
│   ├── order-list/                 # 订单中心（角色感知）
│   │   ├── order-list.js           #   user→WHERE user_id=X, worker→WHERE worker_id=X
│   │   ├── order-list.wxml         #   状态Tab: 全部/待支付/待接单/服务中/已完成
│   │   └── order-list.wxss
│   │
│   ├── review/                     # 评价
│   ├── search/                     # 搜索
│   ├── coupons/                    # 优惠券
│   ├── favorites/                  # 收藏
│   ├── address-list/               # 地址列表
│   ├── address-edit/               # 地址编辑（GPS一键填充省市区）
│   │
│   ├── mine/                       # 个人中心（角色感知）
│   │   ├── mine.js                 #   三端统计: user/worker/admin 独立数据源
│   │   ├── mine.wxml               #   绿色头部 + 四宫格 + 三栏收入 + 服务菜单
│   │   └── mine.wxss
│   │
│   ├── today-orders/               # 师傅今日工单
│   │   ├── today-orders.js         #   仅当日工单、接单/完工、红点提醒、下拉刷新
│   │   ├── today-orders.wxml
│   │   └── today-orders.wxss
│   │
│   ├── all-orders/                 # 师傅全部工单
│   │   ├── all-orders.js           #   状态筛选 + 日期筛选 + 上拉加载
│   │   ├── all-orders.wxml
│   │   └── all-orders.wxss
│   │
│   ├── income/                     # 师傅收入明细
│   │   ├── income.js               #   收入总览、佣金/提现tab、月份切换
│   │   ├── income.wxml             #   绿色总览卡 + 流水列表
│   │   └── income.wxss
│   │
│   ├── attendance/                 # 师傅出勤设置
│   │   ├── attendance.js           #   打卡、接单时段、请假、接单开关、历史记录
│   │   ├── attendance.wxml
│   │   └── attendance.wxss
│   │
│   ├── help/                       # 使用帮助
│   │   ├── help.js                 #   搜索、4分类教程、折叠FAQ、联系客服
│   │   ├── help.wxml
│   │   └── help.wxss
│   │
│   ├── settings/                   # 设置
│   │   ├── settings.js             #   修改密码、换绑手机、通知、隐私、版本、切换/退出
│   │   ├── settings.wxml           #   列表项 + 底部全宽按钮
│   │   └── settings.wxss
│   │
│   ├── change-password/            # 修改密码
│   ├── change-phone/               # 换绑手机
│   └── logs/                       # 调试日志
│
├── cloudfunctions/                 # ── 云函数层 (7个) ──
│   ├── userLogin/                  # 微信 openid 登录
│   ├── orderCreate/                # 下单 + 同区近距师傅匹配 (Haversine)
│   ├── orderCancel/                # 取消订单
│   ├── orderStateManager/          # 状态流转 (接单/开始/完成/评价)
│   ├── dbQuery/                    # MySQL 只读查询
│   ├── dbExecute/                  # MySQL 写操作 (INSERT/UPDATE/DELETE)
│   └── adminApi/                   # 管理端 API
│
├── custom-tab-bar/                 # ── 自定义TabBar ──
│   ├── index.js                    #   角色感知 + 登录页隐藏 + updateTabs路由检测
│   ├── index.wxml                  #   用户4Tab / 师傅2Tab 切换
│   └── index.wxss
│
├── utils/
│   ├── request.js                  # REST接口封装 (token+workerId+401拦截)
│   └── api.js                      # 云函数调用封装
│
├── assets/                         # 静态资源
├── admin/                          # 管理后台 HTML
├── project.config.json             # 微信工具配置
├── .gitignore
└── README.md
```

---

## 订单生命周期

```
   ┌─────────┐
   │  pending │ ◀── 下单成功，未支付
   └────┬────┘
        │ [支付]          ┌────── 取消 ──────┐
   ┌────▼────┐           ▼                  ▼
   │ accepted │     ┌──────────┐      ┌──────────┐
   │已支付待接单│     │ cancelled│      │ expired  │
   └────┬────┘     │  已取消   │      │ 超时自动  │
        │          └──────────┘      └──────────┘
        │ [师傅接单]          [师傅拒单 → 重新分配]
   ┌────▼────┐
   │ serving  │ ◀── 服务进行中
   └────┬────┘
        │ [确认完成]
   ┌────▼────┐
   │completed │ ◀── 待评价
   └────┬────┘
        │ [用户评价]
   ┌────▼────┐
   │ finished │ ◀── 订单完结
   └─────────┘
```

| 状态 | 值 | 用户端操作 | 师傅端操作 |
|------|----|-----------|-----------|
| `pending` | 0 | 去支付 / 取消 | 不可见 |
| `accepted` | 1 | 查看 / 联系师傅 / 取消 | 接单 / 拒单 / 查看 |
| `serving` | 2 | 联系师傅 | 确认完成 |
| `completed` | 3 | 去评价 ⭐ | 已完成（不可操作） |
| `finished` | 4 | 联系客服 / 再来一单 | 已完成 |
| `cancelled` | 5 | 联系客服 | 已取消 |

### 接单规则

| 规则 | 配置 |
|------|------|
| 接单时效 | 30 分钟内接单，超时自动转派 |
| 拒单限制 | 每日最多拒单 3 次，超限当日不再推送新单 |
| 匹配优先级 | 同区 > 同服务类别 > 距离近（Haversine 公式计算） |

---

## 角色与数据隔离

```
┌─────────────────────────────────────────────────┐
│                    登录页                         │
│         ┌─────┐              ┌──────┐           │
│         │客户  │              │师傅   │           │
│         └──┬──┘              └──┬───┘           │
│            │                    │                │
│     ┌──────▼──────┐     ┌──────▼──────┐         │
│     │ 微信一键登录  │     │手机号+密码登录│         │
│     └──────┬──────┘     └──────┬──────┘         │
│            │                    │                │
│     storage:              storage:               │
│     app_role='user'       app_role='worker'      │
│     (无workerId)          token + workerId       │
│            │                    │                │
│     ┌──────▼──────┐     ┌──────▼──────┐         │
│     │ 4 Tab首页    │     │ 2 Tab工单   │         │
│     │ user_id=1   │     │ worker_id=3 │         │
│     └─────────────┘     └─────────────┘         │
└─────────────────────────────────────────────────┘

数据查询自动携带身份标识：
  用户端: WHERE user_id = {当前用户ID}
  师傅端: WHERE worker_id = {当前师傅ID}  +  Authorization: Bearer {token}
  管理端: 无过滤条件，全量数据

Token失效处理:
  HTTP 401 / 业务码 401 → 清空storage → wx.reLaunch('/pages/login/login')
```

---

## 快速开始

### 前置条件

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 最新稳定版
- 微信小程序 AppID（测试可用测试号）
- 腾讯云 CloudBase 环境（可选，如果只跑 UI 不需要）

### 本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/KUN903/dome.git
cd dome

# 2. 微信开发者工具 → 导入项目
#    目录选: dome
#    AppID 填你的（或点"测试号"）

# 3. 刷新模拟器即可预览
```

### 配置云开发

如果你有自己的 CloudBase 环境，修改以下两处：

1. **`app.js` 第 7 行** — 替换 `env` 为你的云环境 ID：
```js
wx.cloud.init({
  env: '你的云环境ID',  // ← 改这里
  traceUser: true
});
```

2. **`project.config.json`** — `appid` 改为你的小程序 AppID。

### 服务器域名白名单

在微信公众平台 → 开发管理 → 服务器域名 → request 合法域名添加：

```
https://apis.map.qq.com
```

（用于定位功能的逆地理编码）

---

## 环境配置

| 配置项 | 位置 | 说明 |
|--------|------|------|
| 云环境 ID | `app.js:7` | CloudBase 环境标识 |
| AppID | `project.config.json:39` | 微信小程序唯一标识 |
| API 基础路径 | `app.globalData.baseUrl` | REST 后端地址 (默认空) |
| 地图 API | `app.js` `getUserLocation()` | 腾讯地图 WebService Key |

---

## 核心设计决策

### 1. 为什么用 `glass-easel` 组件框架
微信小程序新基础库默认启用 `glass-easel`（`app.json` `componentFramework`），其对 WXML 模板语法更严格：
- swiper 的 `autoplay` 必须写成 `autoplay="{{true}}"`
- 不能在模板中调用 JS 方法（如 `.toFixed()`、`.substring()`），需在 JS 层预格式化数据

### 2. 为什么用 `$runSQLRaw` 而非 `db.callSql()`
`wx-server-sdk` 老版本有 `db.callSql()` API，新版本已移除。改用 `@cloudbase/node-sdk` 的 `models.$runSQLRaw()`，返回格式为 `{ data: { executeResultList } }`，解析路径为 `res.data.executeResultList || res.data`。

### 3. 师傅 workerId 三级降级查询
不同师傅账号的 `users` 表和 `workers` 表 ID 不同，通过三级策略查找：
1. 优先通过手机号匹配 `workers` 表
2. 降级：从已有订单反查 `orders.worker_id`
3. 兜底：取 `workers` 表第一个记录

### 4. TabBar 登录页隐藏
自定义 TabBar 组件通过 `getCurrentPages()` 检测当前路由，匹配 `pages/login/login` 时设置 `showTabBar=false`，避免登录页出现导航栏。

---

## 数据库表（核心字段）

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `users` | 用户（客户） | id, openid, nickname, phone, avatar |
| `workers` | 师傅 | id, phone, name, service_category_ids, city, district, lat, lng |
| `service_products` | 服务项目 | id, name, category_id, price, cover_image, status |
| `orders` | 订单 | id, order_no, user_id, worker_id, service_id, status, pay_status, scheduled_time |
| `order_logs` | 订单日志 | id, order_id, action, detail, created_at |
| `reviews` | 评价 | id, order_id, user_id, rating, content |
| `addresses` | 收货地址 | id, user_id, name, phone, province, city, district, detail |
| `coupons` | 优惠券 | id, user_id, amount, min_amount, expire_at |
| `favorites` | 收藏 | id, user_id, service_id |

---

## License

[MIT](./LICENSE)
