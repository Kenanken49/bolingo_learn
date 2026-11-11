-- Sample rows for the test suite. tests/conftest.py runs this file against a
-- temporary database after the schema is created, so every test starts here.
INSERT INTO user (id, username, password)
VALUES
  (1, 'test-author',
   'pbkdf2:sha256:600000$abcdefghij123456$7dabc97f25ee9dcefdeebb62c7e01f2b1b62649bf0d4d683afee7aadcc8c18c4');

INSERT INTO post (id, title, body, author_id, created)
VALUES
  (1, 'First post', 'Written before the tests ran.', 1, '2024-01-01 09:00:00'),
  (2, 'Second post', 'Also seeded by data.sql.', 1, '2024-01-02 10:30:00');
