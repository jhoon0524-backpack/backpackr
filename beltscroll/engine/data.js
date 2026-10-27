// data/ 아래 JSON을 자동으로 읽어 id로 찾을 수 있게 한다.
const load = (modules) => {
  const map = {};
  for (const m of Object.values(modules)) map[m.id] = m;
  return map;
};

export const DATA = {
  characters: load(import.meta.glob('../data/characters/*.json', { eager: true, import: 'default' })),
  effects: load(import.meta.glob('../data/effects/*.json', { eager: true, import: 'default' })),
  feel: load(import.meta.glob('../data/feel/*.json', { eager: true, import: 'default' })),
  stages: load(import.meta.glob('../data/stages/*.json', { eager: true, import: 'default' })),
  scenes: load(import.meta.glob('../data/scenes/*.json', { eager: true, import: 'default' })),
};

export function get(kind, id) {
  const item = DATA[kind][id];
  if (!item) throw new Error(`data/${kind}에 id "${id}"가 없습니다`);
  return item;
}
