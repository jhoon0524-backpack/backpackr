class_name BattleRules
extends RefCounted

## 전투 계산 규칙 모음.
## 노드에 붙이지 않고 static 함수로만 호출한다.


## 크라우드펀딩 카테고리가 속성 역할을 한다.
## @export_enum 으로 쓰는 정수값과 순서가 같아야 한다.
enum Element { GAME, TECH, DESIGN, COMIC }

## 상성 순환: 게임 → 테크 → 디자인 → 만화 → 게임
const STRONG_AGAINST := {
	Element.GAME: Element.TECH,
	Element.TECH: Element.DESIGN,
	Element.DESIGN: Element.COMIC,
	Element.COMIC: Element.GAME,
}

const SUPER_EFFECTIVE := 2.0
const NEUTRAL := 1.0

## 데미지 난수 하한. 같은 기술이라도 매번 조금씩 달라진다.
const ROLL_MIN := 0.85

## 영입 성공률의 하한(풀 HP)과 상한(빈사).
const CATCH_MIN := 0.1
const CATCH_MAX := 0.9


## 공격 속성이 방어 속성에게 주는 데미지 배율.
## 불리 상성 페널티는 두지 않는다. 전투가 길어져 톤과 맞지 않는다.
static func element_multiplier(attacker: Element, defender: Element) -> float:
	if STRONG_AGAINST[attacker] == defender:
		return SUPER_EFFECTIVE
	return NEUTRAL


## 한 번의 기술 사용으로 들어가는 데미지. 최소 1을 보장한다.
## roll 을 넘기지 않으면 ROLL_MIN~1.0 사이 난수를 쓴다.
static func calculate_damage(attack: int, defense: int, power: int, multiplier: float, roll: float = -1.0) -> int:
	if roll < 0.0:
		roll = randf_range(ROLL_MIN, 1.0)
	var base := float(attack) * float(power) / float(maxi(1, defense)) / 5.0 + 2.0
	return maxi(1, int(base * multiplier * roll))


## 후원 카드 영입 성공률. HP 비율이 낮을수록 높아진다.
## 풀 HP 10% / 절반 50% / 빈사 90%
static func capture_chance(current_hp: int, max_hp: int) -> float:
	var ratio := clampf(float(current_hp) / float(maxi(1, max_hp)), 0.0, 1.0)
	return CATCH_MIN + (1.0 - ratio) * (CATCH_MAX - CATCH_MIN)
