"""
RBAC tests: roles, ownership, group permissions and the admin safety rules.
"""

from datetime import date

from tests.conftest import new_account

ITEM = {"kind": "lost", "item_name": "Blue bottle", "location": "Room 6013", "date_happened": str(date.today())}


def test_normal_user_cannot_open_the_admin_dashboard(client):
    user = new_account()
    assert client.get("/api/admin/stats", headers=user["headers"]).status_code == 403
    assert client.get("/api/admin/users", headers=user["headers"]).status_code == 403


def test_admin_can_open_the_admin_dashboard(client):
    admin = new_account("admin")
    assert client.get("/api/admin/stats", headers=admin["headers"]).status_code == 200


def test_user_cannot_edit_or_delete_someone_elses_item(client):
    owner, stranger = new_account(), new_account()
    item = client.post("/api/items", json=ITEM, headers=owner["headers"]).json()

    edit = {**ITEM, "item_name": "Mine now", "is_returned": False}
    assert client.put(f"/api/items/{item['id']}", json=edit, headers=stranger["headers"]).status_code == 403
    assert client.delete(f"/api/items/{item['id']}", headers=stranger["headers"]).status_code == 403
    assert client.delete(f"/api/items/{item['id']}", headers=owner["headers"]).status_code == 200


def test_guest_cannot_post(client):
    assert client.post("/api/items", json=ITEM).status_code == 401


def test_group_member_permissions(client):
    owner, editor, poster, outsider = new_account(), new_account(), new_account(), new_account()
    group = client.post("/api/groups", json={"name": "Desk"}, headers=owner["headers"]).json()
    members_url = f"/api/groups/{group['id']}/members"
    client.post(members_url, json={"email": editor["email"], "can_create": True, "can_update": True}, headers=owner["headers"])
    client.post(members_url, json={"email": poster["email"], "can_create": True, "can_update": False}, headers=owner["headers"])

    # Members with "create" can post in the group, outsiders can't
    item = client.post("/api/items", json={**ITEM, "group_id": group["id"]}, headers=poster["headers"])
    assert item.status_code == 201
    assert client.post("/api/items", json={**ITEM, "group_id": group["id"]}, headers=outsider["headers"]).status_code == 403

    # Only members with "update" can edit someone else's group item
    item_id = item.json()["id"]
    edit = {**ITEM, "item_name": "Edited", "is_returned": True}
    assert client.put(f"/api/items/{item_id}", json=edit, headers=editor["headers"]).status_code == 200
    assert client.put(f"/api/items/{item_id}", json=edit, headers=outsider["headers"]).status_code == 403

    # Only the owner can manage members, rename or delete the group
    assert client.post(members_url, json={"email": outsider["email"]}, headers=editor["headers"]).status_code == 403
    assert client.patch(f"/api/groups/{group['id']}", json={"name": "Mine"}, headers=editor["headers"]).status_code == 403
    assert client.delete(f"/api/groups/{group['id']}", headers=editor["headers"]).status_code == 403
    assert client.get(f"/api/groups/{group['id']}", headers=outsider["headers"]).status_code == 403
    assert client.delete(f"/api/groups/{group['id']}", headers=owner["headers"]).status_code == 200


def test_admin_cannot_change_own_role_or_ban_an_admin(client):
    admin, other_admin = new_account("admin"), new_account("admin")
    assert client.put(f"/api/admin/users/{admin['id']}/role", json={"role": "user"}, headers=admin["headers"]).status_code == 403
    assert client.post(f"/api/admin/users/{other_admin['id']}/ban", json={"reason": "test"}, headers=admin["headers"]).status_code == 403


def test_banned_user_is_rejected_on_the_next_request(client):
    admin, user = new_account("admin"), new_account()
    assert client.get("/api/users/me", headers=user["headers"]).status_code == 200

    assert client.post(f"/api/admin/users/{user['id']}/ban", json={"reason": "Spam"}, headers=admin["headers"]).status_code == 200
    assert client.get("/api/users/me", headers=user["headers"]).status_code == 403
    assert client.post("/api/auth/login", json={"email": user["email"], "password": "secret123"}).status_code == 403
