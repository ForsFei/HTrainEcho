# 参考项目核验记录

核验日期：2026-10-08。版本指当日查看的默认分支提交；这些项目仅作为功能与架构参考，本项目没有复制其代码、地图图层或数据。仓库代码许可证不等于其所调用数据/API 的授权。

| 项目 / 查看版本 | 可借鉴内容 | 代码许可 | 外部依赖与验证结果 | 本项目决定 |
|---|---|---|---|---|
| [中国列车地图](https://github.com/soberAct/cn-train-map_Chinese-Train-Map/tree/647e3d60102eab719ceb59744e687d9a4f600e52) `647e3d6` | 车次与经停展示、跨日 `t/t+1` 标记、地图交互 | GitHub 未识别许可证，仓库首页未列 LICENSE；按未获复用许可处理 | README 声明使用 `cnrail.geogv.org` 的查询接口、车站坐标，且有 12306 回退。项目声明“公开查询”并非数据再利用、自动访问或再发布授权；CNRail 使用条件未找到明确可核验依据。 | 不复制代码、数据或地图；CNRail 自动接入关闭。本站明确区分始发日期与本站日期。 |
| [铁路工具箱](https://github.com/leaf2006/nonebot-plugin-railwaytools/tree/3354ef0de835c6f31013e145950afd68208b0027) `3354ef0` | 时刻、正晚点、当前到站的分层展示 | MIT | Python/NoneBot/httpx；源码的列车详情调用 12306 微信小程序接口，车站大屏调用 `https://www.12036.com:8095/station/{站名}`，README 仅称其为“第三方 API”。“实时”状态由时刻和晚点字段判断，未证明连续 GPS 定位。12036 对三门峡实测可返回数据，但站点未公布 API 授权、调用额度、缓存或再发布条款。MIT 只覆盖插件代码。 | 不复制代码；不自动调用 12306 内部接口。12036 因使用条件不明保持关闭，只记录为待取得许可的技术候选。 |
| [trian_position](https://github.com/zsn6034/trian_position/tree/c8e7929dea49d561271fd19b1500b5b7900efe58) `c8e7929` | 从时刻表、经停、日期推算展示的基本流程 | 未见 LICENSE，按未获复用许可处理 | README 使用 12306 网页资源和百度地图 API；将经停站按顺序直线连接，再按时间计算位置。网页内部资源不等于开放 API；直线连线不是真实铁路路径。 | 不复制代码、不使用这些内部接口；不绘制/宣称实际列车位置。 |
| [OpenRailwayMap](https://github.com/OpenRailwayMap/OpenRailwayMap/tree/3d36317b80cf4bd909090fd106b9a0903dab1150) `3d36317` | 线路拓扑、铁路图层与验证规则的概念 | 主仓库 GPL-3.0；部分内容另有独立许可 | 基于 OSM 数据；瓦片样式与 API 后端为独立仓库。代码 GPL、OSM 数据 ODbL、瓦片服务使用条款及境内公开地图要求必须分别核验；瓦片服务条款本轮未能确认。 | 不复制样式/代码/瓦片，不请求 OSM/ORM 瓦片。河南本机地图直接从 Geofabrik 的 OSM 快照独立提取并保留 ODbL 署名；公开真实图层保持关闭。 |
| [TrackRat](https://github.com/trackrat-dev/TrackRat/tree/81c2e8fa359d92f52a3f9f2dd12039a572fbf777) `81c2e8f` | 分来源 Provider、运行状态来源标签、禁用单个来源的架构 | GPL-3.0 | FastAPI/PostgreSQL 与美国 NJ Transit、Amtrak、MTA GTFS-RT 等来源；README 明确各来源覆盖和刷新方式。这些国外来源不适用于中国铁路。 | 独立实现来源能力声明和禁用状态；不复制实现或数据。 |

## 地图与授权边界

当前包含两套隔离地图：演示/手动预测仍使用虚构拓扑；河南浏览页使用本机 OSM/Geofabrik 快照的概略铁路、客运站点和地市界。两者都没有第三方瓦片或真实列车轨迹，河南真实线位不进入预测拓扑。境内公开地图还涉及底图审图号、来源署名、新增铁路图层校对、坐标和导出等分别核验事项；在明确使用条件和适用要求前，真实图层只允许本机访问且不提供导出。[地图管理条例](https://www.gov.cn/zhengce/zhengceku/2015-12/14/content_10403.htm)规定公开展示、互联网地图与审图号等要求；具体上线方案需按届时服务和展示范围核对。

## 已核验来源

- [中国列车地图 README](https://github.com/soberAct/cn-train-map_Chinese-Train-Map)：列出 CNRail 请求路径与免责声明，但未给出数据/API 授权条款。
- [铁路工具箱 README](https://github.com/leaf2006/nonebot-plugin-railwaytools)：功能和示例来源说明，不构成对所调用接口的使用授权。
- [铁路工具箱 `api.py`](https://github.com/leaf2006/nonebot-plugin-railwaytools/blob/3354ef0de835c6f31013e145950afd68208b0027/nonebot_plugin_railwaytools/api.py) 与 [`station_screen.py`](https://github.com/leaf2006/nonebot-plugin-railwaytools/blob/3354ef0de835c6f31013e145950afd68208b0027/nonebot_plugin_railwaytools/station_screen.py)：确认其大屏地址和直接请求方式；代码中没有该第三方服务的授权条款。
- [trian_position README](https://github.com/zsn6034/trian_position)：描述站点直连与时刻推算步骤。
- [OpenRailwayMap README](https://github.com/OpenRailwayMap/OpenRailwayMap)：GPL 许可及独立的瓦片样式、API 仓库。
- [TrackRat README](https://github.com/trackrat-dev/TrackRat)：国外多来源覆盖和按来源禁用方式。

本记录不声称“零风险”或获得任何官方认可。
