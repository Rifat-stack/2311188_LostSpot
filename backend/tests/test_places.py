"""The location must be a place on the 5th-floor map, and the map and the server must agree on the names."""

import re
from datetime import date
from pathlib import Path

from app.items.places import PLACES
from tests.conftest import new_account

MAP_FILE = Path(__file__).resolve().parents[2] / "frontend" / "src" / "floorPlan.ts"


def test_map_and_server_have_the_same_places():
    names_on_map = re.findall(r'name: "([^"]+)"', MAP_FILE.read_text())
    assert sorted(names_on_map) == sorted(PLACES)
    assert len(set(PLACES)) == len(PLACES)  # no place twice


def test_only_places_on_the_map_are_accepted(client):
    user = new_account()
    item = {"kind": "found", "item_name": "Umbrella", "date_happened": str(date.today())}

    answer = client.post("/api/items", json={**item, "location": "Somewhere on campus"}, headers=user["headers"])
    assert answer.status_code == 422

    answer = client.post("/api/items", json={**item, "location": "Computer Lab 3 (6017)"}, headers=user["headers"])
    assert answer.status_code == 201
    assert answer.json()["location"] == "Computer Lab 3 (6017)"
