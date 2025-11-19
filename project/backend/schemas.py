from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    name:str = ""

class UserCreate(UserBase):
    password:str = ""

class User(UserBase):
    id:int
    is_active:bool
    class Config:
        from_attributes = True
  
class AoyamaKougiBase(BaseModel):
    id: int
    時限: str
    科目: str
    教員: str
    単位: str
    開講: str
    学年: str
    メッセージ: str
    url: str
    is_registered: bool
    
    class Config:
        from_attributes = True  
        
class SearchRequest(BaseModel):
    campuses: list[str] = []
    dayPeriodCombinations: list[str] = []
    departments: list[str] = []
    semesters: list[str] = []
    courseName: str = ""
    instructorName: str = ""
    
class UserCalendarModel(BaseModel):
    id: Optional[int]
    user_id: int
    calendar_name: str = ""
    campus: list[str] = []
    department: list[str] = []
    semester: list[str] = []
    sat_flag: bool = True
    sixth_period_flag: bool = True
    is_public: bool = False  # ← 追加
    
    class Config:
        from_attributes = True 