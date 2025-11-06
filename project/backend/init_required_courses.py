import csv
from db_config import create_db_connection

connection = create_db_connection()
cursor = connection.cursor()

with open("required_courses.csv", "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        cursor.execute("""
            INSERT INTO required_courses (department, grade, kougi_id, campus)
            VALUES (%s, %s, %s, %s)
        """, (row["department"], row["grade"], row["kougi_id"], row.get("campus", None)))

connection.commit()
connection.close()
print("✅ 必修科目データを登録しました。")
