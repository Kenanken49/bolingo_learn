"""Benchmark POST /api/lessons/{id}/attempt over HTTP against a running server.

Usage: python bench_attempt.py [base_url]   (default http://localhost:8005)
"""
import statistics
import sys
import time

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8005"
PASSWORD = "correct horse battery"
TEXT = (
    "The solar system has eight planets that orbit the Sun. "
    "Mercury is the closest planet to the Sun and the smallest of them all. "
    "Venus is covered by thick clouds of sulfuric acid that trap heat. "
    "Earth is the only planet known to support life, with liquid water oceans. "
    "Mars has the largest volcano in the solar system, called Olympus Mons. "
    "Jupiter is a gas giant with a famous storm known as the Great Red Spot."
)

client = httpx.Client(base_url=BASE, timeout=30)

email = f"bench-{time.time_ns()}@bolingo.app"
signup = client.post("/api/auth/signup", json={"email": email, "password": PASSWORD})
assert signup.status_code == 201, signup.text
headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

upload = client.post(
    "/api/materials",
    headers=headers,
    files={"file": ("bench.txt", TEXT.encode("utf-8"), "text/plain")},
    data={"language": "es"},
)
assert upload.status_code == 201, upload.text
material_id = upload.json()["id"]

client.post(f"/api/materials/{material_id}/lessons", headers=headers)
deadline = time.monotonic() + 60
while time.monotonic() < deadline:
    status = client.get(f"/api/materials/{material_id}", headers=headers).json()
    if status["status"] in ("ready", "failed"):
        break
    time.sleep(0.1)
assert status["status"] == "ready", status.get("error")

lesson_ids = client.post(
    f"/api/materials/{material_id}/lessons", headers=headers
).json()["lesson_ids"]
lesson_id = lesson_ids[0]
items = client.get(f"/api/lessons/{lesson_id}", headers=headers).json()["items"]
# GET strips answers; /check returns each item's correct answer over HTTP.
answers = []
for index in range(len(items)):
    check = client.post(
        f"/api/lessons/{lesson_id}/check",
        headers=headers,
        json={"index": index, "answer": ""},
    )
    assert check.status_code == 200, check.text
    answers.append(check.json()["correct_answer"])

times = []
for _ in range(200):
    start = time.perf_counter()
    response = client.post(
        f"/api/lessons/{lesson_id}/attempt",
        headers=headers,
        json={"answers": answers},
    )
    times.append((time.perf_counter() - start) * 1000)
    assert response.status_code == 200, response.text

times.sort()
p99 = times[max(int(len(times) * 0.99) - 1, 0)]
print(
    f"n={len(times)} p50={statistics.median(times):.2f}ms "
    f"p99={p99:.2f}ms max={times[-1]:.2f}ms"
)
