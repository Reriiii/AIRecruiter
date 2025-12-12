from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from typing import Optional, List
from datetime import datetime
import shutil
import os
import re

from app.services.pdf_parser import parse_pdf
from app.services.ai_engine import AIEngine
from app.services.vector_store import VectorStore

from app.models.schemas import (
    UploadResponse, SearchRequest, SearchResponse,
    CandidateMatch, StatsResponse, ErrorResponse,
    CandidateData
)

# ====================================================================
# APPLICATION SETUP
# ====================================================================

app = FastAPI(
    title="AIRecruiter",
    description="API for AI-powered Applicant Tracking System",
    version="2.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================================================================
# GLOBAL SERVICES (Singleton)
# ====================================================================

ai_engine: Optional[AIEngine] = None
vector_store: Optional[VectorStore] = None


@app.on_event("startup")
async def startup_event():
    """
    Khởi động hệ thống và load các service chung.
    """
    global ai_engine, vector_store

    print("=" * 60)
    print("🚀 LOCAL SMART ATS - BACKEND STARTING...")
    print("=" * 60)

    os.makedirs("./data/chroma_db", exist_ok=True)
    os.makedirs("./data/uploaded_cvs", exist_ok=True)
    os.makedirs("./models_cache", exist_ok=True)

    try:
        ai_engine = AIEngine(config_path="./app/services/config.yaml")
        vector_store = VectorStore(db_path="./data/chroma_db")

        print("=" * 60)
        print("ALL SERVICES READY!")
        print("=" * 60)

    except Exception as e:
        print(f"❌ Lỗi khi khởi động services: {e}")
        raise


# ====================================================================
# ENDPOINTS
# ====================================================================

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Local Smart ATS API",
        "version": "2.0",
        "timestamp": datetime.now().isoformat()
    }


# =======================
# GET STATS
# =======================
@app.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    try:
        stats = vector_store.get_stats()
        return stats

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi lấy thống kê: {str(e)}"
        )


# =======================
# UPLOAD CV
# =======================
@app.post("/api/candidates")
async def upload_cv(
    file: UploadFile = File(...),
    model: Optional[str] = Form(None)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Chỉ chấp nhận file PDF"
        )

    # Check if requested model is available
    if model:
        is_available, error_msg = ai_engine.is_model_available(model)
        if not is_available:
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )

    try:
        # STEP 1 — Đọc PDF
        print(f"📄 Đang xử lý file: {file.filename}")
        raw_text = await parse_pdf(file)

        if not raw_text or len(raw_text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Không thể đọc nội dung từ PDF hoặc nội dung quá ngắn"
            )

        # STEP 2 — AI trích xuất dữ liệu
        print("🤖 Đang trích xuất thông tin...")
        extracted_data = ai_engine.extract_json_from_cv(raw_text, model=model)

        # Lưu thông tin model đã dùng
        if model:
            extracted_data["llm_model_used"] = model

        # Validate CV structure
        try:
            is_valid, reasons = ai_engine.validate_resume(extracted_data, raw_text)
        except Exception:
            is_valid, reasons = True, []

        if not is_valid:
            msg = "; ".join(reasons)
            raise HTTPException(
                status_code=400,
                detail=f"File không có cấu trúc CV hợp lệ: {msg}"
            )

        # Thông tin file
        extracted_data["file_name"] = file.filename

        # Cleaning email
        email_val = extracted_data.get("email")
        if not email_val or not re.search(
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
            str(email_val)
        ):
            extracted_data["email"] = None

        # Safe conversions
        try:
            extracted_data["years_exp"] = int(extracted_data.get("years_exp") or 0)
        except Exception:
            extracted_data["years_exp"] = 0

        if not isinstance(extracted_data.get("skills"), list):
            extracted_data["skills"] = list(extracted_data.get("skills") or [])

        if not isinstance(extracted_data.get("education"), list):
            extracted_data["education"] = extracted_data.get("education") or []

        if not isinstance(extracted_data.get("projects"), list):
            extracted_data["projects"] = extracted_data.get("projects") or []

        # STEP 3 — EMBEDDING
        print("🔢 Đang tạo vector embedding...")
        semantic_text = ai_engine.create_semantic_text(extracted_data)
        vector = ai_engine.create_embedding(semantic_text, model=model)

        # STEP 4 — SAVE DB
        print("💾 Đang lưu vào database...")
        doc_id = vector_store.save_candidate(
            cv_text=raw_text,
            cv_data=extracted_data,
            embedding=vector,
            file_name=file.filename
        )

        # Lưu file gốc
        storage_path = f"./data/uploaded_cvs/{doc_id}_{file.filename}"
        await file.seek(0)
        with open(storage_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"✅ Hoàn thành xử lý CV: {file.filename}")

        # Chuẩn hóa output theo schema
        try:
            candidate_model = CandidateData(**extracted_data)
        except Exception as e:
            print("❌ Lỗi mapping CandidateData:", e)
            raise HTTPException(
                status_code=500,
                detail=f"Lỗi format dữ liệu trả về: {str(e)}"
            )

        return UploadResponse(
            status="success",
            id=doc_id,
            data=candidate_model,
            message=f"Đã xử lý thành công CV của {candidate_model.full_name}"
        )

    except HTTPException:
        raise

    except Exception as e:
        print(f"❌ Lỗi khi xử lý CV: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi xử lý CV: {str(e)}"
        )


# =======================
# SEARCH
# =======================
@app.post("/api/search", response_model=SearchResponse)
async def search_candidates(
    jd_text: str = Form(..., min_length=10),
    min_exp: int = Form(0),
    top_k: int = Form(10),
    required_skills: Optional[str] = Form(None),
    model: Optional[str] = Form(None)
):
    try:
        # Check if requested model is available
        if model:
            is_available, error_msg = ai_engine.is_model_available(model)
            if not is_available:
                raise HTTPException(
                    status_code=400,
                    detail=error_msg
                )

        # Parse skills
        skills_list = None
        if required_skills:
            skills_list = [
                s.strip() for s in required_skills.split(",") if s.strip()
            ]

        print(f"🔍 Đang tìm kiếm với JD: {jd_text[:100]}...")

        query_vector = ai_engine.create_embedding(jd_text, model=model)

        results = vector_store.search_candidates(
            query_embedding=query_vector,
            n_results=top_k,
            min_exp=min_exp,
            required_skills=skills_list
        )

        candidates = []
        if results["ids"] and len(results["ids"][0]) > 0:
            for i in range(len(results["ids"][0])):
                similarity_score = 1 - results["distances"][0][i]
                meta = results["metadatas"][0][i]

                candidates.append(
                    CandidateMatch(
                        id=results["ids"][0][i],
                        score=round(similarity_score, 4),
                        full_name=meta.get("full_name", "N/A"),
                        email=meta.get("email", "N/A"),
                        role=meta.get("role", "N/A"),
                        years_exp=meta.get("years_exp", 0),
                        skills=meta.get("skills_list", "").split(", ")
                        if meta.get("skills_list")
                        else [],
                        education=[],
                        projects=[],
                        file_source=meta.get("file_source", ""),
                        created_at=meta.get("created_at", "")
                    )
                )

        print(f"✅ Tìm thấy {len(candidates)} ứng viên")

        return SearchResponse(
            total=len(candidates),
            matches=candidates,
            query_info={
                "jd_length": len(jd_text),
                "min_exp": min_exp,
                "top_k": top_k,
                "required_skills": skills_list,
                "model": model
            }
        )

    except Exception as e:
        print(f"❌ Lỗi khi tìm kiếm: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi tìm kiếm: {str(e)}"
        )


# =======================
# LIST ALL CANDIDATES
# =======================
@app.get("/api/candidates")
async def list_candidates(limit: int = 100):
    try:
        results = vector_store.get_all_candidates(limit=limit)
        return {
            "total": len(results),
            "candidates": results
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi lấy danh sách: {str(e)}"
        )


# =======================
# DELETE CANDIDATE
# =======================
@app.delete("/api/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str):
    try:
        success = vector_store.delete_candidate(candidate_id)

        if success:
            return {
                "status": "success",
                "message": "Đã xóa ứng viên"
            }

        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy ứng viên"
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi xóa: {str(e)}"
        )


# ====================================================================
# ERROR HANDLER
# ====================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal Server Error",
            detail=str(exc)
        ).dict()
    )


# ====================================================================
# MAIN (DEV)
# ====================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )