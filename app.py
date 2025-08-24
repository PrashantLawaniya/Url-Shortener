from flask import Flask, request, jsonify, redirect, render_template
from urllib.parse import urlparse
import sqlite3, string, time, os, random
from flask import Flask, request, jsonify, redirect, render_template, session, url_for
from werkzeug.security import generate_password_hash, check_password_hash


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data.db")

app = Flask(__name__, static_folder="static", template_folder="templates")

# === Utilities ===
ALPHABET = string.digits + string.ascii_letters  # 0-9 + a-z + A-Z

def valid_url(u: str) -> bool:
    """Check if URL looks valid"""
    try:
        p = urlparse(u)
        return p.scheme in ("http", "https") and bool(p.netloc)
    except Exception:
        return False

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route("/signup", methods=["GET"])
def signup_page():
    return render_template("signup.html")

@app.route("/login", methods=["GET"])
def login_page():
    return render_template("login.html")


# === AUTH APIs ===
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"ok": False, "error": "Username and password required"}), 400

    conn = get_db()
    try:
        hashed = generate_password_hash(password)
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, hashed)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({"ok": False, "error": "Username already exists"}), 400
    finally:
        conn.close()

    return jsonify({"ok": True, "message": "User created successfully"})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    conn = get_db()
    cur = conn.execute("SELECT id, password_hash FROM users WHERE username = ?", (username,))
    row = cur.fetchone()
    conn.close()

    if row and check_password_hash(row["password_hash"], password):
        session["user_id"] = row["id"]
        session["username"] = username
        return jsonify({"ok": True, "message": "Login successful"})
    return jsonify({"ok": False, "error": "Invalid username or password"}), 401


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            original TEXT NOT NULL,
            created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def base62(n: int) -> str:
    """Convert integer to base62 string"""
    if n == 0:
        return ALPHABET[0]
    s = []
    base = len(ALPHABET)
    while n:
        n, r = divmod(n, base)
        s.append(ALPHABET[r])
    return ''.join(reversed(s))

def new_code(conn) -> str:
    """Generate a unique short code"""
    seed = int(time.time() * 1000) ^ random.getrandbits(32)
    for _ in range(5):
        code = base62(seed)[-7:]  # 7-char code
        cur = conn.execute("SELECT 1 FROM links WHERE code = ?", (code,))
        if not cur.fetchone():
            return code
        seed = seed + random.randint(1, 100000)
    return base62(int(time.time())) + base62(random.getrandbits(20))

# === Routes ===
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/shorten", methods=["POST"])
def shorten():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"ok": False, "error_code": 1, "error": "No URL provided"}), 400
    if not valid_url(url):
        return jsonify({"ok": False, "error_code": 2, "error": "Invalid URL"}), 400

    conn = get_db()
    try:
        # Check if already exists
        cur = conn.execute("SELECT code FROM links WHERE original = ?", (url,))
        row = cur.fetchone()
        if row:
            code = row["code"]
        else:
            code = new_code(conn)
            conn.execute("INSERT INTO links (code, original) VALUES (?, ?)", (code, url))
            conn.commit()
    finally:
        conn.close()

    short_link = request.host_url.rstrip("/") + "/" + code
    return jsonify({
        "ok": True,
        "result": {
            "original_link": url,
            "full_short_link": short_link
        }
    })

@app.route("/<code>")
def resolve(code):
    conn = get_db()
    try:
        cur = conn.execute("SELECT original FROM links WHERE code = ?", (code,))
        row = cur.fetchone()
    finally:
        conn.close()

    if row:
        return redirect(row["original"], code=302)
    return jsonify({"ok": False, "error": "Short code not found"}), 404

if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
