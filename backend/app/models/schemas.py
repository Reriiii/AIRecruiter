from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class CandidateData(BaseModel):
    full_name: str = Field(default="N/A", description="Họ tên đầy đủ")
    email: str = Field(default="N/A", description="Email liên hệ")
    role: str = Field(default="N/A", description="Vị trí công việc")
    years_exp: int = Field(default=0, ge=0, description="Số năm kinh nghiệm")
    skills: List[str] = Field(default_factory=list, description="Danh sách kỹ năng")
    education: str = Field(default="N/A", description="Trình độ học vấn")

class UploadResponse(BaseModel):
    status: str
    id: str
    data: CandidateData
    message: Optional[str] = None

class SearchRequest(BaseModel):
    jd_text: str = Field(..., min_length=10, description="Mô tả công việc (JD)")
    min_exp: int = Field(default=0, ge=0, description="Số năm kinh nghiệm tối thiểu")
    top_k: int = Field(default=10, ge=1, le=50, description="Số lượng kết quả trả về")
    required_skills: Optional[List[str]] = Field(default=None, description="Kỹ năng bắt buộc")

class CandidateMatch(BaseModel):
    id: str
    score: float = Field(..., ge=0, le=1, description="Điểm tương đồng (0-1)")
    full_name: str
    email: str
    role: str
    years_exp: int
    skills_list: str
    education: str
    file_source: str
    created_at: str

class SearchResponse(BaseModel):
    total: int
    matches: List[CandidateMatch]
    query_info: dict

class StatsResponse(BaseModel):
    total_candidates: int
    collection_name: str

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None