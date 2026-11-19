import asyncio

from flask import Flask, jsonify

app = Flask(__name__)


async def async_db_query():
    """Stand-in for an async driver call: awaits instead of blocking a worker."""
    await asyncio.sleep(0.05)
    return {"message": "Hello from an async query - LabEx", "rows": 1}


@app.route("/")
def index():
    return "<h1>Async lab</h1><p><a href='/get-data'>/get-data</a> awaits its query.</p>"


@app.route("/get-data")
async def get_data():
    result = await async_db_query()
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
