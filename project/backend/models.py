from sqlalchemy import Boolean, Column, Integer, String,Float,Text, ForeignKey, PrimaryKeyConstraint,JSON,DateTime
from database import Base

class User(Base):
    __tablename__="users"

    id = Column(Integer,primary_key=True,index=True)
    name = Column(String(255),unique=True,index=True)
    password = Column(String(255))
    def_calendar = Column(Integer,nullable=True)
    is_active = Column(Boolean,default=True)

class aoyama_kougi(Base):
    __tablename__ = "aoyama_kougi"  # テーブル名とクラス名を統一

    id = Column(Integer, primary_key=True, autoincrement=True)
    時限 = Column(String(255))
    科目 = Column(String(255))
    教員 = Column(String(255))
    単位 = Column(String(255))
    開講 = Column(String(255))
    学年 = Column(String(255))
    メッセージ = Column(Text)
    url = Column(Text)
    
class chat_log(Base):
    __tablename__ = "chat_log"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer)
    input = Column(Text)
    generated_input = Column(Text)
    generated_idlist = Column(JSON)
    timestamp = Column(DateTime)
    
class aoyama_openai_emb(Base):
    __tablename__ = "aoyama_openai_emb"
    
    aoyama_kougi_id = Column(Integer, primary_key=True, autoincrement=True)
    audi_text = Column(Text)
    openai_emb = Column(JSON)
    
class user_calendar(Base):
    __tablename__ = "user_calendar"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer)
    calendar_name = Column(String(255))
    campus = Column(JSON)
    department = Column(JSON)
    semester = Column(JSON)
    sat_flag = Column(Boolean,default=True)
    sixth_period_flag = Column(Boolean,default=True)
    is_public = Column(Boolean, default=False)
    
    def __repr__(self):
        return f"<user_calendar(id={self.id})>"
    

  
class user_kougi(Base):
    __tablename__ = "user_kougi"
    
    calendar_id = Column(Integer)
    kougi_id = Column(Integer)
    period = Column(String(50))
    
    __table_args__ = (
        PrimaryKeyConstraint('calendar_id','kougi_id','period'),      
    )

class RequiredCourse(Base):
    __tablename__ = "required_courses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    department = Column(String(255), nullable=False)
    grade = Column(Integer, nullable=False)
    kougi_id = Column(Integer, nullable=False)
    campus = Column(String(255), nullable=True)
