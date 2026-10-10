"""Build a local, generalized Henan rail map from a Geofabrik OSM extract.

Requires: python -m pip install osmium
Input files stay in data/ and are ignored by Git. The generated file also stays local.
Only ordinary railway corridors and named stations are retained. Yard, siding,
industrial, military, freight-only and private features are excluded.
"""
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import osmium
import shapefile

ROOT = Path(__file__).resolve().parents[1]
PBF = ROOT / 'data' / 'henan-source.osm.pbf'
POLY = ROOT / 'data' / 'henan.poly'
OUT = ROOT / 'data' / 'henan-rail-map.json'
ADMIN = ROOT / 'data' / 'henan-shp' / 'gis_osm_adminareas_a_free_1.shp'
DENY_USAGE = {'military', 'industrial', 'test', 'science', 'tourism', 'leisure'}
DENY_SERVICE = {'yard', 'siding', 'spur', 'crossover'}
DENY_NAME = ('专用铁路', '专用线', '货运线', '矿区铁路', '煤运线')


def read_poly(path):
    rings, current = [], None
    for raw in path.read_text(encoding='utf-8').splitlines()[1:]:
        line = raw.strip()
        if line == 'END':
            if current is None:
                break
            if len(current) >= 3:
                rings.append(current)
            current = None
        elif current is None:
            current = []
        else:
            pair = line.split()
            if len(pair) == 2:
                current.append((float(pair[0]), float(pair[1])))
    return rings


def in_ring(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i, (xi, yi) in enumerate(ring):
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj-xi) * (y-yi) / (yj-yi) + xi:
            inside = not inside
        j = i
    return inside


def in_province(x, y, rings):
    return sum(in_ring(x, y, ring) for ring in rings) % 2 == 1


def simplify(points):
    # ~100 m precision for corridor display; detailed station layouts are omitted.
    result = []
    for x, y in points:
        pt = [round(x, 3), round(y, 3)]
        if not result or result[-1] != pt:
            result.append(pt)
    return result


def station_level(name, cities, counties):
    """Conservative name match: omit stops whose administrative level is unclear."""
    suffixes = {'', '站', '东', '西', '南', '北', '东站', '西站', '南站', '北站',
                '东南', '东北', '西南', '西北', '高铁', '机场'}
    for level, names in (('city', cities), ('county', counties)):
        for admin_name in names:
            stem = admin_name.removesuffix('市').removesuffix('县').removesuffix('区')
            if name.startswith(stem) and name[len(stem):] in suffixes:
                return level
    return None


def admin_areas():
    if not ADMIN.exists():
        raise SystemExit('缺少 Geofabrik 河南行政区 shapefile；见 data-sources.md')
    reader = shapefile.Reader(str(ADMIN), encoding='utf-8')
    cities, counties, shapes = set(), set(), []
    for item in reader:
        level, name = item.record['fclass'], item.record['name']
        if level == 'admin_level5' and name.endswith('市'):
            cities.add(name)
            rings = []
            shape = item.shape
            ends = list(shape.parts[1:]) + [len(shape.points)]
            for start, end in zip(shape.parts, ends):
                ring = simplify(shape.points[start:end])
                if len(ring) >= 3:
                    rings.append(ring)
            shapes.append({'id': item.record['osm_id'], 'name': name,
                           'label': [round((shape.bbox[0]+shape.bbox[2])/2, 3),
                                     round((shape.bbox[1]+shape.bbox[3])/2, 3)],
                           'rings': rings})
        elif level == 'admin_level6':
            counties.add(name)
    return cities, counties, shapes


def allowed(tags):
    return (tags.get('railway') == 'rail'
            and tags.get('service', '') not in DENY_SERVICE
            and tags.get('usage', '') not in DENY_USAGE
            and tags.get('railway:traffic_mode') != 'freight'
            and tags.get('access') not in ('private', 'no')
            and tags.get('construction') is None
            and tags.get('disused') is None)


def highspeed_class(tags, relation_names):
    if tags.get('highspeed') == 'yes':
        return 'highspeed'
    if tags.get('highspeed') == 'no':
        return 'ordinary'
    names = ' '.join([tags.get('name', ''), *relation_names])
    if any(term in names for term in ('高速铁路', '客运专线', '高铁')):
        return 'highspeed'
    if any(term in names for term in ('铁路', '铁道', '城际')):
        return 'ordinary'
    return 'unclassified'


class Routes(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.names = {}

    def relation(self, relation):
        if relation.tags.get('route') != 'railway':
            return
        name = relation.tags.get('name:zh') or relation.tags.get('name')
        if not name:
            return
        for member in relation.members:
            if member.type == 'w':
                self.names.setdefault(member.ref, set()).add(name)


class Extract(osmium.SimpleHandler):
    def __init__(self, rings, route_names):
        super().__init__()
        self.rings = rings
        self.route_names = route_names
        self.lines = []
        self.stations = []
        self.skipped = Counter()

    def station(self, obj, x, y):
        tags = obj.tags
        name = tags.get('name:zh') or tags.get('name')
        if (not name or tags.get('train') == 'no' or tags.get('access') in ('private', 'no')
                or tags.get('usage') in DENY_USAGE or tags.get('railway:traffic_mode') == 'freight'
                or tags.get('station') == 'subway' or tags.get('subway') == 'yes'
                or tags.get('light_rail') == 'yes' or any(term in name for term in ('遗址', '站房遗存'))):
            return
        if in_province(x, y, self.rings):
            self.stations.append({'id': f'{obj.type_str()}{obj.id}', 'name': name, 'lng': round(x, 5), 'lat': round(y, 5), 'kind': tags.get('railway'), 'train': tags.get('train')})

    def node(self, node):
        if node.tags.get('railway') in ('station', 'halt') and node.location.valid():
            self.station(node, node.location.lon, node.location.lat)

    def way(self, way):
        if way.tags.get('railway') in ('station', 'halt'):
            coords = [(n.lon, n.lat) for n in way.nodes if n.location.valid()]
            if coords:
                self.station(way, sum(p[0] for p in coords)/len(coords), sum(p[1] for p in coords)/len(coords))
            return
        if not allowed(way.tags):
            return
        coords = [(n.lon, n.lat) for n in way.nodes if n.location.valid()]
        names = sorted(self.route_names.get(way.id, []))
        own_name = way.tags.get('name:zh') or way.tags.get('name')
        name = own_name or (names[0] if len(names) == 1 else '名称待核验')
        if any(term in ' '.join([name, *names]) for term in DENY_NAME):
            return
        category = highspeed_class(way.tags, names)
        runs, run = [], []
        for point in coords:
            if in_province(point[0], point[1], self.rings):
                run.append(point)
            elif run:
                runs.append(run)
                run = []
        if run:
            runs.append(run)
        for i, part in enumerate(runs):
            points = simplify(part)
            if len(points) >= 2:
                self.lines.append({'id': f'w{way.id}-{i}', 'name': name, 'category': category, 'points': points})


def main():
    if not PBF.exists() or not POLY.exists():
        raise SystemExit('先将 Geofabrik henan-latest.osm.pbf 和 henan.poly 保存到 data/；见 data-sources.md')
    rings = read_poly(POLY)
    if not rings:
        raise SystemExit('河南边界文件无有效多边形')
    routes = Routes()
    cities, counties, city_shapes = admin_areas()
    routes.apply_file(str(PBF))
    extract = Extract(rings, routes.names)
    extract.apply_file(str(PBF), locations=True)
    # Retain stations close to a retained railway corridor, or explicitly tagged train=yes.
    grid = {}
    for line in extract.lines:
        for x, y in line['points']:
            grid.setdefault((int(x/0.02), int(y/0.02)), []).append((x,y))
    near_stations = []
    for station in extract.stations:
        x,y=station['lng'],station['lat']; cx,cy=int(x/0.02),int(y/0.02)
        nearby = (point for gx in range(cx-1,cx+2) for gy in range(cy-1,cy+2) for point in grid.get((gx,gy),[]))
        if any((px-x)**2+(py-y)**2 <= 0.02**2 for px,py in nearby):
            near_stations.append(station)
    seen = set()
    stations = []
    for station in sorted(near_stations, key=lambda s: (s['kind'] != 'station', s['id'][0] == 'w', s['train'] != 'yes')):
        station['level'] = station_level(station['name'], cities, counties)
        if station['level'] is None or station['train'] != 'yes':
            continue
        key = station['name'].removesuffix('站')
        if key in seen:
            continue
        seen.add(key)
        station.pop('train', None)
        stations.append(station)
    boundary = [simplify(ring) for ring in rings]
    data = {'format': 'HTrainEoco-Henan-OSM-v1', 'source': 'Geofabrik / OpenStreetMap',
            'sourceUrl': 'https://download.geofabrik.de/asia/china/henan.html',
            'license': 'ODbL 1.0', 'builtAt': datetime.now(timezone.utc).isoformat(),
            'precision': '线路走廊约 0.001°，车站点约 0.00001°；来源精度未核验，均不可用于现场安全判断',
            'boundary': boundary, 'cities': city_shapes, 'lines': extract.lines, 'stations': stations}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(json.dumps({'output': str(OUT), 'bytes': OUT.stat().st_size,
                      'lines': len(extract.lines), 'categories': dict(Counter(line['category'] for line in extract.lines)),
                      'stations': len(stations), 'stationLevels': dict(Counter(s['level'] for s in stations)),
                      'cities': len(city_shapes), 'boundaryRings': len(boundary)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
