class_name IdiData
extends Resource

## 아이디(아이디어 생명체) 한 종의 정의.


@export var display_name: String = ""

## BattleRules.Element 와 순서가 같다.
@export_enum("게임", "테크", "디자인", "만화") var element: int = 0

@export var max_hp: int = 40
@export var attack: int = 12
@export var defense: int = 10
@export var speed: int = 10

## 누적 후원금이 이 금액에 도달하면 진화한다.
@export var funding_goal: int = 3000000

## 진화 후 모습. 최종 진화형이면 비워 둔다.
@export var evolves_into: IdiData

@export var moves: Array[MoveData] = []
