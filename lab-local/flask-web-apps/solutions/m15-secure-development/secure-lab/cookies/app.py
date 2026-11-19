from flask import Flask, make_response

app = Flask(__name__)

# the session cookie itself carries the same attributes
app.config.update(
    SECRET_KEY="dev",
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)


@app.route("/")
def index():
    """Set a cookie the browser only sends over HTTPS, never to JavaScript."""
    response = make_response(
        "<h1>Cookies lab</h1><p>Check <code>curl -I</code> for the Set-Cookie header.</p>"
    )
    response.set_cookie(
        "lab_pref",
        "dark",
        secure=True,
        httponly=True,
        samesite="Lax",
        max_age=60 * 60 * 24,
    )
    return response


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
