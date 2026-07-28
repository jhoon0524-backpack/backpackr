/** 없으면 부팅이 아니라 첫 호출에서 터진다. 어느 변수가 빈지 이름으로 알려준다. */
export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경 변수 ${name} 가 비어 있다`);
  return value;
}
