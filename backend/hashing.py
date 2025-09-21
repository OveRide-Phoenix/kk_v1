import bcrypt

pwd = b"#Jun03123"
h = b"$2b$12$togjzHD04OtMRDgvKa2DR.k49xb8r5gy0gFHlQpprpVWabyeCYYDe"

print("pwd bytes:", repr(pwd), "len:", len(pwd))
print("hash len:", len(h))            # should be 60
print("matches?", bcrypt.checkpw(pwd, h))
