# HTrainEcho / 听见火车

**下一列火车，什么时候来？** 中文、手机优先的火车观测与经过时间预测 MVP。首页直接进入“即将经过”，可通过车站下拉或地图选择查询未来三小时到发。另有完全虚构的演示预测和本机手动数据。项目不展示真实列车位置。

## Windows 本地启动

需要 Node.js 24+ 与 npm。双击项目根目录中的 `start-htraineoco.cmd` 即可启动；脚本会在首次运行时安装依赖、创建本地环境文件、执行数据库迁移，并在服务就绪后打开浏览器。关闭脚本窗口或按 `Ctrl+C` 可停止服务。

也可以在 PowerShell 中手动执行：

```powershell
cd <项目目录>
npm install
Copy-Item .env.example .env.local
npm run db:migrate
npm run dev
```

浏览器打开 `http://127.0.0.1:43160`。启动脚本仅监听本机回环地址。生产构建：`npm run build`，随后 `npm run start`。关键测试：`npm test`。数据库默认在 `data/htraineoco.sqlite`；`DATABASE_PATH` 可指定其他本地路径。不要将真实数据库或 `.env.local` 提交到仓库。

## 已完成

- 车站到发、铁路区段、观察点三种选择；有限拓扑示意、附近候选确认、方向和列车类型筛选。
- 计划事件和站外预计经过分开，显示时间窗口、方法、锚点、来源、更新时间与路径依据。
- 已确认路径或唯一拓扑路径的确定性预测；平行线路与缺失路径不生成区段确定预测。
- 现场记录的新增、编辑、删除；按观察点、方向、车型建议稳健偏移，样本足够时可应用或撤销。
- SQLite 持久化与 `migrations/001_init.sql`；JSON/CSV 导入预览、字段/重复 ID 检查、来源条件确认、脱敏导出。
- 明确隔离的演示与手动作用域；本地列表在无底图时仍可用。
- RailGo 车站到发查询：无密钥、非商业本机展示；按所选车站查询未来三小时单一到站或发车时刻，5 分钟内存缓存，请求串行执行，拒绝或限流后暂停请求。查询结果不导入预测数据库。
- 本机河南铁路地图：来自 OSM/Geofabrik 河南快照，默认显示地市级命名站，可切换县级及以上站点；各命名线路固定颜色、17 个地市边界及地市定位。原始地图数据与派生文件均被 Git 忽略，不提供公开地图或导出。
- 河南“即将经过”真实车站模式：地图选站或下拉选站后查询 RailGo 车站大屏，只显示未来三小时的单一到站/发车时刻。接口仍标为测试中，页面不把它解释成实时位置；真实站外观察点因缺少可核验的车次径路与相邻站时刻映射而保持关闭。

## 数据准备

河南地图需将 Geofabrik 河南 `henan-latest.osm.pbf`、`henan.poly` 和 `henan-latest-free.shp.zip` 保存到本机 `data/`，分别命名为 `henan-source.osm.pbf`、`henan.poly`、`henan-free.shp.zip`。从 zip 解压 `gis_osm_adminareas_a_free_1.*` 到 `data/henan-shp/`。安装 Python 包 `osmium`、`pyshp` 后执行 `python scripts/build_henan_map.py`。派生地图只纳入名称能对应地市或县级行政单位的站点；它不代表官方车站等级或完整客运站目录。

下载 `public/templates/` 中的 JSON 或 CSV 模板。JSON 顶层可包含 `nodes`、`segments`、`points`、`trains`、`observations`。车次的 `originDate` 是始发日期；经停的 `arrivalDay/departureDay` 表示从始发日起的天数。`path` 按相邻经停站对填写区段 ID；不能只凭两个停站认定使用某条铁路。先在“数据与配置”预览，再填写来源、授权依据和用途并确认。重复 ID 默认跳过；错误会列出字段路径。导出是脱敏视图，不是完整数据库备份。

## 当前限制

RailGo 数据服务明确开放非商业 API 使用，但其上游数据为自动采集，来源许可链仍需进一步核验，尤其在公开上线前。站到站查询只覆盖所选两站，不等于全站到发或所有通过列车；它不提供真实铁路路径，因此真实结果不用于站外经过预测。12306 页面、CNRail 与极速数据没有自动调用。河南地图仅本机展示 OSM 快照的概略线路和站点，覆盖并非全量；没有瓦片、实时位置、站场细节或公开导出。国内公开地图条件尚待核验。现场观测只在合法公共区域进行。

更多细节见 [数据源核验](data-sources.md)、[参考项目](references.md)、[预测模型](prediction-model.md) 与 [风险说明](risk-notes.md)。
