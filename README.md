# 家政上门服务平台

微信小程序全栈项目，基于 **腾讯云开发 (CloudBase)**，覆盖用户端、师傅端、管理端完整业务流程。

## 功能概览

| 模块 | 用户端 | 师傅端 | 管理端 |
|------|--------|--------|--------|
| 首页 | 定位城市、服务分类、热门推荐、附近师傅 | - | - |
| 服务 | 服务详情、图片展示 | 师傅主页、可选服务 | - |
| 下单 | 选择地址、优惠券、提交订单 | - | - |
| 支付 | 确认支付、支付状态同步 | - | - |
| 订单 | 查看/取消/评价订单 | 接单/拒单/开始服务/完成 | 全部订单监督 |
| 个人 | 地址管理、优惠券、收藏 | 今日统计、收入 | 平台数据总览 |
| 角色 | 一键切换用户/师傅/管理 | ← 同上 | ← 同上 |
| 定位 | GPS获取、逆地理编码、距离排序 | - | - |

## 技术栈

- **前端**：微信小程序原生框架 (glass-easel)
- **后端**：腾讯云开发 CloudBase (Node.js 云函数)
- **数据库**：CloudBase MySQL 8.0
- **定位**：腾讯地图 WebService API (逆地理编码)
- **距离计算**：Haversine 公式 (球面距离)

## 项目结构

```
├── app.js / app.json / app.wxss   # 小程序入口
├── pages/                         # 12 个页面
│   ├── index/                     # 首页（定位/分类/推荐/师傅）
│   ├── category/                  # 服务分类列表
│   ├── search/                    # 搜索
│   ├── service-detail/            # 服务/师傅详情
│   ├── order-create/              # 下单
│   ├── order-detail/              # 订单详情
│   ├── order-list/                # 订单中心（角色感知）
│   ├── address-list/              # 地址列表
│   ├── address-edit/              # 地址编辑（GPS填充）
│   ├── review/                    # 评价
│   ├── coupons/                   # 优惠券
│   ├── favorites/                 # 收藏
│   └── mine/                      # 个人中心（角色切换）
├── cloudfunctions/                # 8 个云函数
│   ├── userLogin/                 # 用户登录
│   ├── orderCreate/               # 订单创建（含距离匹配）
│   ├── orderCancel/               # 订单取消
│   ├── orderStateManager/         # 订单状态流转
│   ├── dbQuery/                   # 数据库查询
│   ├── dbExecute/                 # 数据库写操作
│   └── adminApi/                  # 管理端API
├── custom-tab-bar/                # 自定义TabBar
├── utils/                         # 工具函数
├── assets/                        # 图标资源
└── admin/                         # 管理员后台HTML
```

## 订单状态流转

```
pending ──支付──→ accepted ──开始服务──→ serving ──确认完成──→ completed ──评价──→ finished
   │                  │                      │
   └──取消──→          └──拒单──→             └──取消──→
  cancelled         (重新分配)            cancelled
```

## 快速开始

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入项目目录
3. 填写 `project.config.json` 中的 `appid`
4. 如需使用云开发，替换 `app.js` 中的 `env` 为你的云环境ID
5. 在微信公众平台添加服务器域名白名单：`https://apis.map.qq.com`

## 角色切换

在「我的」页面点击角色标签，可在三个角色间切换：

- **客户端**：浏览服务、下单支付、查看订单
- **师傅端**：查看分配给自己的订单、接单/拒单/履约
- **管理端**：查看全平台数据统计和订单

## License

MIT
