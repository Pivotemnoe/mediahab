INSERT INTO phase01_markers (key, value)
VALUES ('foundation', 'phase01')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
