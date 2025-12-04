from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from fastapi.openapi.utils import get_openapi
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from openai_search import subset_search_batch,generate_input
from crud import(
    get_user,get_user_by_name,
    create_user,filter_course_ids, read_db,
    get_matching_kougi_ids,insert_user_kougi,
    delete_user_kougi,calendar_list,get_user_kougi,
    create_calendar,update_calendar,delete_calendar,get_calendar,
    update_user_def_calendar,insert_chat,get_kougi_summary,
    duplicate_calendar
)
from models import User, RequiredCourse
from schemas import User, UserCreate,SearchRequest,UserCalendarModel
from database import SessionLocal, engine, Base
import sys
import uvicorn
import bcrypt
import asyncio
import redis
import uuid
from fastapi.exceptions import RequestValidationError
from error_handlers import (
    http_exception_handler,
    integrity_error_handler,
    operational_error_handler,
    unhandled_exception_handler,
)
from sqlalchemy.exc import IntegrityError, OperationalError
import csv
import os
from db_config import create_db_connection
from fastapi import APIRouter
import io

# 文字コード設定
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# テーブル作成
Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------
# 起動時に必修科目を自動登録する関数
# ---------------------------------------------------------
def initialize_required_courses_on_startup():
    """起動時に必修科目がDBになければCSVから登録する関数"""
    db = SessionLocal()
    try:
        # 既にデータがあるか確認（データがあれば何もしない）
        if db.query(RequiredCourse).first():
            print("✅ 必修科目データは既に存在するため、スキップします。")
            return

        print("🔄 必修科目データの初期化を開始します...")
        
        # CSVファイルのパス (このファイルと同じディレクトリにあると仮定)
        CSV_PATH = os.path.join(os.path.dirname(__file__), "required_courses.csv")

        if not os.path.exists(CSV_PATH):
            print(f"⚠️ {CSV_PATH} が見つかりません。")
            return

        with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            courses = []
            for row in reader:
                course = RequiredCourse(
                    department=row["department"],
                    grade=int(row["grade"]),
                    kougi_id=int(row["kougi_id"]),
                    campus=row.get("campus", None)
                )
                courses.append(course)
            
            # まとめて登録
            db.add_all(courses)
            db.commit()
            print(f"✅ {len(courses)} 件の必修科目データを登録しました。")

    except Exception as e:
        print(f"❌ 必修科目データの初期化中にエラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()

# 初期化処理を実行
initialize_required_courses_on_startup()

# ---------------------------------------------------------
# FastAPI アプリケーション設定
# ---------------------------------------------------------

app = FastAPI()

origins = [
    "https://agu-syllabus.ddo.jp",
    "http://localhost:3000",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 必修科目の手動初期化エンドポイント（念のため残しています）
@app.post("/required_courses/init")
def init_required_courses():
    try:
        # CSV の絶対パス
        CSV_PATH = os.path.join(os.path.dirname(__file__), "required_courses.csv")

        # DB 接続
        connection = create_db_connection()
        cursor = connection.cursor()

        with open(CSV_PATH, "r", encoding="utf-8-sig") as f:

            reader = csv.DictReader(f)
            for row in reader:
                cursor.execute("""
                    INSERT INTO required_courses (department, grade, kougi_id, campus)
                    VALUES (%s, %s, %s, %s)
                """, (row["department"], row["grade"], row["kougi_id"], row.get("campus", None)))

        connection.commit()
        connection.close()

        return {"message": "✅ 必修科目データを登録しました。"}

    except Exception as e:
        return {"error": str(e)}


app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, operational_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    # パスワードをハッシュ化
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed_pw.decode('utf-8')

def verify_password(stored_hash: str, password: str) -> bool:
    # 入力されたパスワードとハッシュ化されたパスワードを照合
    return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))

# Redisクライアントの初期化
redis_client = redis.StrictRedis(host='redis', port=6379, db=0)


# セッションをRedisに保存する関数
def store_session(session_id: str, user_id: int):
    redis_client.setex(session_id, 86400, str(user_id))  # セッション有効期限を1日（86400秒）に設定

# セッションをRedisから取得する関数
def get_session(session_id: str):
    if session_id is None:
        return None
    user_id = redis_client.get(session_id)
    return int(user_id) if user_id else None

def delete_session(session_id: str):
    redis_client.delete(session_id)

def get_userid(request: Request):
    session_id = request.cookies.get("session_id")
    if not get_session(session_id):
        return 0  
    else:
        return int(get_session(session_id))

@app.post("/users/register", response_model=User)
def create_user_endpoint(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user_by_name(db, name=user.name)
    if db_user:
        raise HTTPException(status_code=400, detail="Name already registered")
    
    hashed_password = hash_password(user.password)
    user.password = hashed_password
    
    return create_user(db=db, user=user)

@app.post("/users/login", response_model=User)
def read_user(
    response: Response,
    name: str,
    password: str,
    db: Session = Depends(get_db)
):
    user = get_user_by_name(db, name=name)
    if not user or not verify_password(user.password, password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # セッションIDをクッキーに保存
    session_id = str(uuid.uuid4())
    
    # セッションIDとユーザーIDをRedisに保存
    store_session(session_id, user.id)
    
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        max_age=86400,  # クッキーの有効期限（1日）
        samesite="None",
        secure=True,
    )
    return user

#ユーザー情報（ページ遷移後に毎回実行）
@app.get("/users/info")
def get_current_user(
    request: Request, 
    db: Session = Depends(get_db)
):
    print(request.headers)
    print(request.cookies)
    # クッキーからセッションIDを取得
    session_id = request.cookies.get("session_id")
    if not session_id:
        print(session_id)
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = get_session(session_id)
    
    # データベースからユーザー情報を取得
    user = get_user(db,user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    calendar = calendar_list(user_id,db)
    
    return {
        "user_info": {
            "id": user.id,
            "name": user.name,
            "def_calendar": user.def_calendar
        },
        "calendar_info": calendar
    }

#ログアウト
@app.post("/users/logout")
def logout_user(request: Request, response: Response):
    session_id = request.cookies.get("session_id")
    
    if session_id:
        delete_session(session_id)  # セッションをRedisから削除

    # セッションIDをクッキーから削除
    response.delete_cookie("session_id")
    return {"detail": "Logged out successfully"}

#チャット検索
@app.post("/answer/{text}")
async def get_answer(request: Request,text: str,searchrequest: SearchRequest, calendar_id:int, db: Session = Depends(get_db)):
    id_list = filter_course_ids(db, searchrequest)
    question = generate_input(text)
    answer = subset_search_batch(id_list,question)
    
    user_id = get_userid(request)
    print(user_id)
    
    owner_id = get_calendar(calendar_id,db).user_id
    print(owner_id)
    
    print(owner_id == user_id)
    if not owner_id == user_id:
        calendar_id = 0
    print(calendar_id)
    
    insert_chat(user_id,text,question,answer,db)
    kougi_summary = get_kougi_summary(answer,db)
    results = read_db(db, answer, calendar_id)
    print(results)
    return {"generated_input":question,"results": results,"kougi_summary":kougi_summary}


#講義要約文章確認
#おそらくフロントエンドでは使わない
@app.post("/kougi/summary")
def api_get_kougi_summary(kougi_ids: list[int], db: Session = Depends(get_db)):
    results = get_kougi_summary(kougi_ids,db)
    return {"results":results}


# シラバス検索
@app.post("/search")
async def search_courses(request: Request,searchrequest: SearchRequest, calendar_id:int, db: Session = Depends(get_db)):
    id_list = filter_course_ids(db, searchrequest)
    
    user_id = get_userid(request)
    
    owner_id = get_calendar(calendar_id,db).user_id
    if not owner_id == user_id:
        calendar_id = 0
    
    results = read_db(db,id_list,calendar_id)
    print(sys.getrefcount(results)) 
    print(results)
    return {"results": results}


#カレンダー作成・更新
@app.post("/calendar/c-u/{mode}")
def calendar_action_cu(request: Request, mode: str, calendar_data: UserCalendarModel, db: Session = Depends(get_db)):
    user_id = get_userid(request)
    try:
        if mode == "c":
            if not calendar_data.user_id == user_id:
                return {"detail":"not login"}
            calendar = create_calendar(calendar_data,db)
            
        elif mode == "u":
            owner_id = get_calendar(calendar_data.id,db).user_id
            if not owner_id == user_id:
                return {"detail":"not login"}
            calendar = update_calendar(calendar_data,db)
            
        else:
            raise HTTPException(status_code=400, detail="Invalid mode")
        #printを消すとreturnが空になる。消さないこと。
        print(calendar)
        update_user_def_calendar(user_id,calendar.id, db)
        print(calendar)
        return {"calendar":calendar}
    
    except Exception as e:
        db.rollback()  # 例外発生時にロールバック
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")        

#カレンダー参照・削除
@app.post("/calendar/r-d/{mode}")
def calendar_action_rd(request: Request, mode: str, user_id:int, calendar_id: int, db: Session = Depends(get_db)):
    user_id = get_userid(request)
    try:
        if mode == "r":
            calendar = get_calendar(calendar_id, db)
        elif mode == "d":
            owner_id = get_calendar(calendar_id,db).user_id
            if not owner_id == user_id:
                return {"detail":"not login"}
            calendar = delete_calendar(calendar_id, db)
            calendar_id = None
        else:
            raise HTTPException(status_code=400, detail="Invalid mode")
        #printを消すとreturnが空になる。消さないこと。
        print(calendar)
        update_user_def_calendar(user_id,calendar_id, db)
        print(calendar_id)
        return {"calendar":calendar}
        
    except Exception as e:
        db.rollback()  # 例外発生時にロールバック
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")    
    
    
#講義登録
@app.post("/kougi/insert")
def api_check_user_kougi(
    request: Request,
    kougi_ids: list[int],
    calendar_id: int,
    db: Session = Depends(get_db)  
):
    print("Request Headers:", request.headers)
    print("Request Cookies:", request.cookies)
    success = []
    failures = []
    errors = []
    user_id = get_userid(request)
    
    owner_id = get_calendar(calendar_id,db).user_id
    if not owner_id == user_id:
        return {"detail":"not login"}
            
    for kougi_id in kougi_ids:
        try:
            id_list = get_matching_kougi_ids(db, kougi_id, calendar_id)
            
            if id_list == []:
                insert_user_kougi(db, kougi_id, calendar_id) 
                success.append({"kougi_id": kougi_id})
            
            elif id_list:
                obstacles = read_db(db, id_list,calendar_id)
                print(failures)
                failures.append({"kougi_id": kougi_id, "obstacles": obstacles})
                print(failures)
        except Exception as e:
            errors.append({"kougi_id": kougi_id, "error": str(e)})
            
    return {"success": success, "failures": failures,"errors":errors}

    
#講義削除
@app.delete("/kougi/delete")
def api_delete_user_kougi(
    request: Request,
    kougi_ids: list[int],
    calendar_id: int,
    db: Session = Depends(get_db)
):
    print("Request Headers:", request.headers)
    print("Request Cookies:", request.cookies)
    user_id = get_userid(request)
    
    owner_id = get_calendar(calendar_id,db).user_id
    if not owner_id == user_id:
        return {"detail":"not login"}
            
    for kougi_id in kougi_ids:
        delete_user_kougi(db, kougi_id, calendar_id)
        
    return {"message": "Data deleted successfully"}

#登録済み講義取得
@app.post("/kougi/get/{calendar_id}")
def set_default_calendar(calendar_id: int, db: Session = Depends(get_db)):
    registered_user_kougi = get_user_kougi(calendar_id, db)
    
    id_list = [item.kougi_id for item in registered_user_kougi]
    
    results = read_db(db,id_list,calendar_id)
    
    return {"registered_user_kougi": registered_user_kougi,"results":results}


#ここより下はフロントエンドで実装してもよさそう
# 学部リストと学期リスト
DEPARTMENTS = [
    "指定なし","青山スタンダード科目", "文学部共通", "文学部外国語科目", "英米文学科", "フランス文学科",
    "比較芸術学科", "教育人間　外国語科目", "教育人間　教育学科", "教育人間　心理学科", "経済学部",
    "法学部", "経営学部", "教職課程科目", "国際政治経済学部", "総合文化政策学部", "日本文学科",
    "史学科", "理工学部共通", "物理科学", "数理サイエンス", "物理・数理", "電気電子工学科",
    "機械創造", "経営システム", "情報テクノロジ－", "社会情報学部", "地球社会共生学部", "コミュニティ人間科学部",
    "化学・生命"
]

SEMESTERS = [
    "指定なし","前期", "通年", "後期", "後期前半", "後期後半", "通年隔１", "前期前半", "前期後半",
    "通年隔２", "前期集中", "夏休集中", "集中", "春休集中", "後期集中", "前期隔２", "前期隔１",
    "後期隔２", "後期隔１", "通年集中"
]


# 学部リストの取得
@app.get("/departments")
async def get_departments():
    return {"departments": DEPARTMENTS}

# 学期リストの取得
@app.get("/semesters")
async def get_semesters():
    return {"semesters": SEMESTERS}

# 公開されているカレンダー一覧を取得（後輩閲覧用）
@app.get("/calendar/public")
def get_public_calendars(db: Session = Depends(get_db)):
    calendars = db.query(user_calendar).filter(user_calendar.is_public == True).all()
    return {"public_calendars": calendars}

# 公開カレンダー詳細取得
@app.get("/calendar/public/{calendar_id}")
def get_public_calendar_detail(calendar_id: int, db: Session = Depends(get_db)):
    """
    公開されたカレンダーの詳細情報と登録講義を取得するAPI
    """
    from models import user_calendar, user_kougi, aoyama_kougi

    # カレンダーを取得
    calendar = db.query(user_calendar).filter(user_calendar.id == calendar_id).first()
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")

    if not calendar.is_public:
        raise HTTPException(status_code=403, detail="This calendar is not public")

    # 講義を取得
    registered = db.query(user_kougi).filter(user_kougi.calendar_id == calendar_id).all()

    # 講義の詳細情報をまとめる
    lecture_data = []
    for item in registered:
        kougi = db.query(aoyama_kougi).filter(aoyama_kougi.id == item.kougi_id).first()
        if kougi:
            lecture_data.append({
                "period": item.period,
                "subject": kougi.科目,
                "teacher": kougi.教員,
                "semester": kougi.開講,
                "url": kougi.url,
            })

    return {
        "calendar_id": calendar.id,
        "calendar_name": calendar.calendar_name,
        "campus": calendar.campus,
        "department": calendar.department,
        "semester": calendar.semester,
        "sat_flag": calendar.sat_flag,
        "sixth_period_flag": calendar.sixth_period_flag,
        "lectures": lecture_data
    }


# ======== 時間割の公開設定API ========

from models import user_calendar  # ← 既に import されていなければ追加してください

@app.put("/calendar/{calendar_id}/public")
def update_calendar_public(
    request: Request,
    calendar_id: int,
    is_public: bool,
    db: Session = Depends(get_db)
):
    """
    時間割（user_calendar）の公開設定を変更するAPI
    - 認証済みユーザーのみ
    - 自分のカレンダーだけ変更可能
    """
    user_id = get_userid(request)  # 現在のログインユーザーのIDを取得

    # カレンダーを取得
    calendar = get_calendar(calendar_id, db)
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")

    # 自分のカレンダーでなければ拒否
    if calendar.user_id != user_id:
        raise HTTPException(status_code=403, detail="You are not the owner of this calendar")

    # 公開設定を更新
    calendar.is_public = is_public
    db.commit()
    db.refresh(calendar)

    return {
        "calendar_id": calendar.id,
        "is_public": calendar.is_public,
        "detail": "公開設定を更新しました"
    }

# カレンダーのインポート（コピー）機能
@app.post("/calendar/import/{source_calendar_id}")
def import_calendar(
    request: Request,
    source_calendar_id: int,
    db: Session = Depends(get_db)
):
    # ログイン中のユーザーIDを取得
    user_id = get_userid(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        # コピー処理を実行
        new_calendar = duplicate_calendar(db, user_id, source_calendar_id)
        
        # コピーしたカレンダーをデフォルトに設定（任意：すぐ使えるようにするならアリ）
        update_user_def_calendar(user_id, new_calendar.id, db)
        
        return {"message": "Calendar imported successfully", "new_calendar_id": new_calendar.id}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

# 必修科目の一括登録API (新規追加)
@app.post("/kougi/register_required")
def api_register_required_courses(
    request: Request,
    calendar_id: int,
    grade: int,  # 学年を指定 (例: 1)
    db: Session = Depends(get_db)
):
    user_id = get_userid(request)
    
    # カレンダーの所有権確認
    calendar = get_calendar(calendar_id, db)
    if calendar.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # カレンダーに設定されている学部を取得 (リストの1つ目を使用すると仮定)
    if not calendar.department or len(calendar.department) == 0:
        raise HTTPException(status_code=400, detail="学部が設定されていません")
    
    target_dept = calendar.department[0] # 例: "社会情報学部"
    
    # "学部" という文字を削除して検索 ("社会情報学部" -> "社会情報" でヒットさせるため)
    search_dept = target_dept.replace("学部", "")

    # 必修科目テーブルから講義IDを取得
    required_courses = db.query(RequiredCourse).filter(
        RequiredCourse.department.like(f"%{search_dept}%"),
        RequiredCourse.grade == grade
    ).all()

    if not required_courses:
        return {"message": "該当する必修科目が見つかりませんでした。", "count": 0}

    registered_count = 0
    skipped_count = 0
    errors = []

    # 講義登録処理 (既存の /kougi/insert のロジックを流用)
    for course in required_courses:
        try:
            kougi_id = course.kougi_id
            
            # 重複チェック (同じ時限に既に授業があるか)
            id_list = get_matching_kougi_ids(db, kougi_id, calendar_id)
            
            if id_list == []:
                # 重複がなければ登録
                insert_user_kougi(db, kougi_id, calendar_id)
                registered_count += 1
            else:
                # 重複がある場合はスキップ (既に登録済みの場合も含む)
                skipped_count += 1
                
        except Exception as e:
            errors.append({"kougi_id": kougi_id, "error": str(e)})

    return {
        "message": "処理完了",
        "registered": registered_count,
        "skipped": skipped_count,
        "errors": errors
    }


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="agu-syllabus",
        version="1.0.0",
        description="agu-syllabus.ddo.jpのapi",
        routes=app.routes,
    )
    # OpenAPIバージョンを明示的に設定
    openapi_schema["openapi"] = "3.0.0"
    openapi_schema["servers"] = [
        {"url": "https://agu-syllabus.ddo.jp/api"},
        {"url":"http://localhost:8000"}
    ]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

# デフォルトのOpenAPI生成を上書き
app.openapi = custom_openapi

@app.get("/", response_class=HTMLResponse)
async def get_swagger_ui():
    # openapi_urlを取得
    openapi_url = "https://agu-syllabus.ddo.jp/api/openapi.json"

    if not openapi_url:
        return HTMLResponse(content="OpenAPI URL is not available", status_code=500)

    # HTMLテンプレート
    html_template = """
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css" />
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {{
            SwaggerUIBundle({{
                url: "{openapi_url}",
                dom_id: '#swagger-ui',
                presets: [
                  SwaggerUIBundle.presets.apis
                ],
                layout: "BaseLayout"
            }});
        }};
    </script>
</body>
</html>
"""
    # format()を使用してopenapi_urlを挿入
    html_content = html_template.format(openapi_url=openapi_url)

    return HTMLResponse(content=html_content)


async def start_uvicorn():
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, reload=True)
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    try:
        asyncio.run(start_uvicorn())
    except KeyboardInterrupt:
        print("Server stopped gracefully.")