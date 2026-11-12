from flask import Flask

app = Flask(__name__)


@app.after_request
def set_security_headers(response):
    """One hook covers every response, so no route can forget a header."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'self'"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.route("/")
def index():
    return "<h1>Headers lab</h1><p>Inspect the response with curl -I.</p>"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
