from typing import Literal, TypedDict, cast

CityCode = Literal["MYS", "BLR"]


class CityConfig(TypedDict):
    supports_food: bool
    supports_condiments: bool


DEFAULT_CITY: CityCode = "MYS"

CITY_CONFIG: dict[CityCode, CityConfig] = {
    "MYS": {
        "supports_food": True,
        "supports_condiments": True,
    },
    "BLR": {
        "supports_food": False,  # toggle when Bangalore gets full menus
        "supports_condiments": True,
    },
}


def normalize_city_code(value: str | None) -> CityCode:
    if not value:
        return DEFAULT_CITY
    upper = value.strip().upper()
    if upper in CITY_CONFIG:
        return cast(CityCode, upper)
    return DEFAULT_CITY


def city_supports_food(city_code: CityCode) -> bool:
    return CITY_CONFIG[city_code]["supports_food"]


def city_supports_condiments(city_code: CityCode) -> bool:
    return CITY_CONFIG[city_code]["supports_condiments"]


def test_formatting(x,y,z):
    return x+y+z
