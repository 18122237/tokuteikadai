from sqlalchemy.orm import Session
from sqlalchemy import or_,text,and_
from models import User,aoyama_kougi,user_kougi,user_calendar,chat_log,aoyama_openai_emb
from schemas import UserCreate,UserCalendarModel
from fastapi import HTTPException
from datetime import datetime
import numpy as np

def get_users(db:Session):
    return db.query(User).all()

def get_user(db:Session,user_id:int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_name(db:Session,name:str):
    return db.query(User).filter(User.name == name).first()

def get_user_by_name_by_password(db:Session,name:str,password:str):
    return (db.query(User)
            .filter(User.name == name)
            .filter(User.password == password)
            .first()
    )
    

def create_user(db:Session,user:UserCreate):
    db_user = User(name=user.name,password=user.password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# `aoyama_kougi` テーブルに対する検索条件を適用し、IDのみをリストで返す関数
def filter_course_ids(db, request):
    # ベースクエリで `id` カラムのみを選択
    query = db.query(aoyama_kougi.id)

    # キャンパス条件
    if request.campuses:
        campus_conditions = [aoyama_kougi.時限.like(f"%{campus}%") for campus in request.campuses]
        query = query.filter(or_(*campus_conditions))

    # 曜日と時限の条件
    if request.dayPeriodCombinations:
        day_period_conditions = [aoyama_kougi.時限.like(f"%{combo}%") for combo in request.dayPeriodCombinations]
        query = query.filter(or_(*day_period_conditions))

    # 学部条件
    if request.departments and request.departments != ["指定なし"]:
        department_conditions = [aoyama_kougi.開講 == department for department in request.departments]
        query = query.filter(or_(*department_conditions))

    # 学期条件
    if request.semesters and request.semesters != ["指定なし"]:
        semester_conditions = [aoyama_kougi.時限.like(f"%{semester}%") for semester in request.semesters]
        query = query.filter(or_(*semester_conditions))

    # 講義名条件
    if request.courseName:
        query = query.filter(aoyama_kougi.科目.like(f"%{request.courseName}%"))

    # 教員名条件
    if request.instructorName:
        query = query.filter(aoyama_kougi.教員.like(f"%{request.instructorName}%"))

    # 結果からIDのみをリストで返す
    result = query.all()
    return [r[0] for r in result]  # `result` はタプルのリストになるため、各タプルの最初の要素 (ID) を抽出


def read_db(db, id_list, calendar_id):
    if not id_list:
        return []

    # aoyama_kougi を取得
    query = db.query(aoyama_kougi).filter(aoyama_kougi.id.in_(id_list))
    result = query.all()

    # 結果に `is_registered` を動的に追加
    for kougi in result:
        is_registered = db.query(user_kougi).filter(
            user_kougi.kougi_id == kougi.id,
            user_kougi.calendar_id == calendar_id
        ).first() is not None
        setattr(kougi, "is_registered", is_registered)  # 動的プロパティを追加

    return result



def get_matching_kougi_ids(db: Session, kougi_id: int, calendar_id: int):
    # 有効な時限のパターン
    valid_periods = {f"{day}{period}" for day in "月火水木金土" for period in "１２３４５６"}
        
    # aoyama_kougiテーブルから時限カラムを取得
    kougi = db.query(aoyama_kougi.時限).filter(aoyama_kougi.id == kougi_id).first()

    # kougiが見つからない、またはkougi.時限がない場合、エラーを投げる
    if not kougi or not kougi.時限:
        raise ValueError(f"kougi_id {kougi_id} に対応する kougi が見つからない、または 時限 が設定されていません。")

    # 時限カラムの文字列全体を解析し、（の前2文字を抽出して有効な時限のみ保持
    kougi_period = [
        kougi.時限[i-2:i]
        for i in range(len(kougi.時限))
        if kougi.時限[i] == "（" and kougi.時限[i-2:i] in valid_periods
    ]

    if not kougi_period:
        return []

    # user_kougiテーブルから条件に一致する行を取得し、kougi_idを抽出
    matching_kougi_ids = (
        db.query(user_kougi.kougi_id)
        .filter(
            and_(
                user_kougi.calendar_id == calendar_id,
                user_kougi.period.in_(kougi_period)
            )
        )
        .all()
    )

    # 結果をリスト形式で返す
    return [row.kougi_id for row in matching_kougi_ids]


def insert_user_kougi(db: Session, kougi_id: int, calendar_id: int):
    """
    user_kougi テーブルにデータを挿入する。
    
    Args:
        db (Session): データベースセッション。
        kougi_id (int): 挿入対象の講義ID。
        calendar_id (int): 挿入対象のカレンダーID。
    """
    # `aoyama_kougi` テーブルから該当する `時限` データを取得
    kougi = db.query(aoyama_kougi).filter(aoyama_kougi.id == kougi_id).one()  # 必ず1件だけ取得できると仮定

    # 時限データのリストを抽出
    periods = [ 
        kougi.時限[i-2:i]
        for i in range(2,len(kougi.時限))
        if kougi.時限[i] == "（"
    ]

    # `user_kougi` にデータを挿入
    for period in periods:
        new_entry = user_kougi(
            calendar_id=calendar_id,
            kougi_id=kougi_id,
            period=period
        )
        db.add(new_entry)

    # 変更をコミット
    db.commit()

def delete_user_kougi(db: Session, kougi_id: int, calendar_id: int):
    """
    user_kougi テーブルからデータを削除する。
    
    Args:
        db (Session): データベースセッション。
        kougi_id (int): 削除対象の講義ID。
        calendar_id (int): 削除対象のカレンダーID。
    """
    # 指定された `calendar_id` と `kougi_id` に一致する行を削除
    db.query(user_kougi).filter(
        user_kougi.kougi_id == kougi_id,
        user_kougi.calendar_id == calendar_id
    ).delete(synchronize_session=False)

    # 変更をコミット
    db.commit()

def get_user_kougi(calendar_id: int, db: Session):
    # `user_kougi`から指定されたIDのカレンダーを取得
    registered_user_kougi = db.query(user_kougi).filter(user_kougi.calendar_id == calendar_id).all()

    # カレンダーが見つからない場合はエラー
    if not registered_user_kougi:
        raise HTTPException(status_code=404, detail="Calendar not found")
    

    # 取得したカレンダーのみを返す
    return registered_user_kougi


def create_calendar(calendar_data: UserCalendarModel, db: Session):
    """カレンダーの新規作成処理"""
    
    new_calendar = user_calendar(
        user_id=calendar_data.user_id,
        calendar_name=calendar_data.calendar_name,
        campus=calendar_data.campus,              # JSON
        department=calendar_data.department,      # JSON
        semester=calendar_data.semester,          # JSON
        grade=calendar_data.grade,                # ★ここが今回超重要！！
        sat_flag=calendar_data.sat_flag,
        sixth_period_flag=calendar_data.sixth_period_flag,
    )
    db.add(new_calendar)  # 新しいレコードを追加    
    db.commit()  # 変更をコミット
    db.refresh(new_calendar)  # 挿入されたデータを更新
    
    return new_calendar


def update_calendar(calendar_data: UserCalendarModel, db: Session):
    """カレンダーの更新処理"""
    # 指定されたIDのカレンダーを検索
    calendar = db.query(user_calendar).filter(user_calendar.id == calendar_data.id).first()
    
    # カレンダーが見つからない場合
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    # ★ ここが重要：DB に存在するフィールドだけ個別に更新する
    calendar.calendar_name = calendar_data.calendar_name
    calendar.campus = calendar_data.campus
    calendar.department = calendar_data.department
    calendar.semester = calendar_data.semester
    calendar.grade = calendar_data.grade  # ←★これが今回の主役！！
    calendar.sat_flag = calendar_data.sat_flag
    calendar.sixth_period_flag = calendar_data.sixth_period_flag
    
    db.commit()  # 変更をコミット
    db.refresh(calendar)  # 更新されたデータを取得
    return calendar


def delete_calendar(calendar_id: int, db: Session):
    """カレンダーの削除処理"""
    # 指定されたIDのカレンダーを検索
    calendar = db.query(user_calendar).filter(user_calendar.id == calendar_id).first()

    # カレンダーが見つからない場合
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    db.delete(calendar)  # カレンダー削除
    db.commit()  # 変更をコミット

def get_calendar(calendar_id: int, db: Session):
    # `user_calendar`から指定されたIDのカレンダーを取得
    calendar = db.query(user_calendar).filter(user_calendar.id == calendar_id).first()

    # カレンダーが見つからない場合はエラー
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    #return calendar
    return UserCalendarModel.model_validate(calendar)

# ユーザーのdef_calendarを更新する関数
def update_user_def_calendar(user_id: int,calendar_id: int, db: Session):

    # ユーザーを取得して、def_calendarを更新
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        print("not update def_calendar")
        return None

    # def_calendarを更新
    user.def_calendar = calendar_id
    db.commit()
    db.refresh(user)  # ユーザーの最新データを反映
    return {"message": "def_calendar updated successfully"}

# user_idで関連するカレンダー情報を取得する関数
def calendar_list(user_id: int, db: Session):
    # user_calendarテーブルからuser_idに一致するidとcalendar_nameを取得
    calendar = db.query(user_calendar).filter(user_calendar.user_id == user_id).all()
    
    return calendar

def insert_chat(user_id, user_input, generated_input, id_list,db):
    """
    chat_log テーブルに新規レコードを挿入する処理。

    Parameters:
        user_id (int): ユーザーID。
        input (str): ユーザーからの入力。
        generated_input (str): 生成された入力。
        id_list (list): 生成されたIDのリスト (JSON形式)。
        timestamp (datetime): ログのタイムスタンプ。
        db (Session): SQLAlchemy セッション。

    Returns:
        chat_log: 挿入されたデータ。
    """
    
    id_list = [int(i) if isinstance(i, np.int64) else i for i in id_list]

    
    # chat_log テーブル用の新しいレコードを作成
    new_chat = chat_log(
        user_id=user_id,
        input=user_input,
        generated_input=generated_input,
        generated_idlist=id_list,
        timestamp=datetime.now(),
    )
    db.add(new_chat)  # 新しいレコードを追加
    db.commit()  # コミットして保存
    db.refresh(new_chat)  # 挿入されたデータを取得
    return new_chat
    
def get_kougi_summary(id_list,db):
    if not id_list:
        return []

    # aoyama_kougi を取得
    query = db.query(aoyama_openai_emb.aoyama_kougi_id,aoyama_openai_emb.audi_text).filter(aoyama_openai_emb.aoyama_kougi_id.in_(id_list))
    results = query.all()
    results_dict = [row._asdict() for row in results]
    return results_dict