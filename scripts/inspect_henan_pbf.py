"""Print aggregate tag coverage from the local Geofabrik Henan extract."""
from collections import Counter
import osmium

ways = Counter()
stations = Counter()
relations = Counter()
station_tags=Counter()
station_code_keys=Counter()
station_modes=Counter()

class Inspector(osmium.SimpleHandler):
    def way(self, way):
        if way.tags.get('railway') == 'rail':
            ways[(way.tags.get('highspeed', ''), way.tags.get('usage', ''), way.tags.get('service', ''), way.tags.get('name', '') != '')] += 1
        if way.tags.get('railway') in ('station', 'halt'):
            stations[('way', way.tags.get('railway'), way.tags.get('passenger', ''))] += 1

    def node(self, node):
        if node.tags.get('railway') in ('station', 'halt'):
            stations[('node', node.tags.get('railway'), node.tags.get('passenger', ''))] += 1
            station_tags[(node.tags.get('train', ''),node.tags.get('usage', ''),node.tags.get('name', '') != '',node.tags.get('access', ''))]+=1
            station_code_keys.update(k for k in node.tags if 'code' in k or 'ref' in k)
            station_modes[(node.tags.get('station',''),node.tags.get('subway',''),node.tags.get('light_rail',''),node.tags.get('historic',''))]+=1

    def relation(self, relation):
        if relation.tags.get('route') in ('railway', 'tracks', 'train'):
            relations[(relation.tags.get('route'), relation.tags.get('name', '') != '')] += 1

Inspector().apply_file('data/henan-source.osm.pbf')
print('rail ways:', sum(ways.values()))
print('rail tags:', ways.most_common(25))
print('stations:', stations)
print('route relations:', relations)
print('station tags:', station_tags.most_common(20))
print('station code keys:', station_code_keys)
print('station modes:', station_modes.most_common(20))
