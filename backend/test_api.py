import requests
login_res = requests.post("http://localhost:8080/api/v1/auth/login", data={
    "username": "admin@grampanchayat.in",
    "password": "admin123"
})
print("Login:", login_res.json())
token = login_res.json()["access_token"]
complaint_data = {
    "title": "Broken Streetlight in Ward 4",
    "description": "The streetlight near the main square has been broken for 3 days. It is completely dark at night.",
    "category": "electricity",
    "priority": "high",
    "latitude": 21.1458,
    "longitude": 79.0882
}
headers = {"Authorization": f"Bearer {token}"}
comp_res = requests.post("http://localhost:8080/api/v1/complaints/", json=complaint_data, headers=headers)
print("Create complaint:", comp_res.json())