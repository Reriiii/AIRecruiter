from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# =======================
# EDUCATION ITEM (✅ SAFE)
# =======================
class EducationItem(BaseModel):
    school: Optional[str] = None
    degree: Optional[str] = None
    major: Optional[str] = None
    gpa: Optional[float] = None
    time: Optional[str] = None


# =======================
# PROJECT ITEM (✅ SAFE)
# =======================
class ProjectItem(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    score: Optional[float] = None


# =======================
# CORE CANDIDATE DATA ✅ KHÔNG BAO GIỜ 500
# =======================
class CandidateData(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    years_exp: Optional[int] = 0

    education: List[EducationItem] = []
    skills: List[str] = []
    projects: List[ProjectItem] = []

    gpa: Optional[float] = 0
    project_score: Optional[float] = 0


# =======================
# UPLOAD RESPONSE (✅ SAFE)
# =======================
class UploadResponse(BaseModel):
    status: str
    id: str
    data: CandidateData
    message: Optional[str] = None


# =======================
# SEARCH REQUEST (✅ GIỮ NGUYÊN)
# =======================
class SearchRequest(BaseModel):
    jd_text: str = Field(..., min_length=10)
    min_exp: int = Field(default=0, ge=0)
    top_k: int = Field(default=10, ge=1, le=50)
    required_skills: Optional[List[str]] = None


# =======================
# MATCHED CANDIDATE ✅ ĐỒNG BỘ FRONTEND
# =======================
class CandidateMatch(BaseModel):
    id: str
    score: float = Field(default=0.0, ge=0, le=1)

    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    years_exp: Optional[int] = None

    skills: List[str] = []

    education: List[EducationItem] = []
    projects: List[ProjectItem] = []

    file_source: Optional[str] = None
    created_at: Optional[str] = None


# =======================
# SEARCH RESPONSE
# =======================
class SearchResponse(BaseModel):
    total: int
    matches: List[CandidateMatch]
    query_info: dict


# =======================
# STATS
# =======================
class StatsResponse(BaseModel):
    total_candidates: int
    collection_name: str


# =======================
# ERROR RESPONSE
# =======================
class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
