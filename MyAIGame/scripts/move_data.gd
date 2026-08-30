class_name MoveData
extends Resource

## 아이디가 쓰는 기술 하나의 정의.


@export var display_name: String = ""

## BattleRules.Element 와 순서가 같다.
@export_enum("게임", "테크", "디자인", "만화") var element: int = 0

@export var power: int = 40
