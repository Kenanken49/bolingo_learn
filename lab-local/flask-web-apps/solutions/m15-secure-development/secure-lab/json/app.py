from flask import Flask, jsonify, request

app = Flask(__name__)


@app.route("/echo", methods=["POST"])
def echo():
    """Flask 3 parses JSON through its own provider: no mime-sniffing tricks."""
    data = request.get_json(silent=True)
    if data is None:
        return "expected a JSON body", 400
    return jsonify({"received": data})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
