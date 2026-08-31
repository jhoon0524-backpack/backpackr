/**
 * 휴대폰 번호 정리.
 *
 * 사람들은 하이픈을 넣기도 빼기도 하고 공백을 섞기도 한다. 저장은 한 가지 꼴로만 한다.
 * `place_bid` 의 입찰 차단이 `phone is not null` 이라, 빈 문자열이 저장되면 구멍이 된다.
 * 그래서 형식에 맞지 않으면 null 을 돌려주고 저장하지 않는다 (DB 제약도 같은 형식을 건다).
 */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/[^0-9]/g, '')
  if (!/^01[016789]\d{7,8}$/.test(d)) return null
  return d.length === 11
    ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
    : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
}
