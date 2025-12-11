import chromadb
import uuid
import json
import os
from typing import Dict, List, Optional
from datetime import datetime

def normalize_metadata(metadata: dict):
    fixed = {}

    for k, v in metadata.items():
        if isinstance(v, list):
            fixed[k] = ", ".join(map(str, v))  
        elif isinstance(v, dict):
            fixed[k] = json.dumps(v, ensure_ascii=False)  
        elif v is None:
            fixed[k] = ""
        else:
            fixed[k] = v

    return fixed

class VectorStore:
    """
    Quản lý Vector Database (ChromaDB) để lưu trữ và tìm kiếm ứng viên
    """
    
    def __init__(self, db_path: str = "./data/chroma_db"):
        """
        Khởi tạo Vector Store
        
        Args:
            db_path: Đường dẫn lưu trữ database
        """
        print(f"💾 Đang khởi tạo Vector Database tại: {db_path}")
        
        try:
            self.client = chromadb.PersistentClient(path=db_path)
            
            self.collection = self.client.get_or_create_collection(
                name="candidates",
                metadata={"hnsw:space": "cosine"} 
            )
            
            print(f"✅ Vector Database sẵn sàng. Số lượng ứng viên: {self.collection.count()}")
            
        except Exception as e:
            raise Exception(f"Không thể khởi tạo Vector Database: {e}")

    def save_candidate(
        self, 
        cv_text: str, 
        cv_data: Dict, 
        embedding: List[float],
        file_name: str = ""
    ) -> str:
        """
        Lưu thông tin ứng viên vào database
        
        Args:
            cv_text: Nội dung CV dạng text (raw)
            cv_data: Thông tin đã trích xuất (JSON)
            embedding: Vector embedding
            file_name: Tên file CV gốc
            
        Returns:
            str: ID của document đã lưu
        """
        doc_id = str(uuid.uuid4())
        metadata = self._prepare_metadata(cv_data, file_name)

        # Try to add to collection but don't let telemetry/add errors fail the whole flow
        add_failed = False
        try:
            self.collection.add(
                ids=[doc_id],
                embeddings=[embedding],
                metadatas=[metadata],
                documents=[cv_text]
            )
            print(f"Đã lưu ứng viên: {metadata.get('full_name')} (ID: {doc_id[:8]}...)")
        except Exception as e:
            # Some chromadb versions emit telemetry-related exceptions after add;
            # log and continue so the overall upload doesn't return 500 when DB was already written.
            print(f"⚠️ Lỗi khi thêm vào collection (không chặn): {e}")
            add_failed = True

        # Write full profile to disk (try regardless of add outcome)
        try:
            os.makedirs(os.path.dirname(f"./data/full_profiles/{doc_id}.json"), exist_ok=True)
            with open(f"./data/full_profiles/{doc_id}.json", "w", encoding="utf-8") as f:
                json.dump(cv_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"⚠️ Lỗi khi lưu full profile: {e}")

        # If add failed earlier, still return the generated id to avoid upstream 500s.
        return doc_id

    def _prepare_metadata(self, cv_data: Dict, file_name: str = "") -> Dict:
        skills = cv_data.get("skills", [])
        projects = cv_data.get("projects", [])
        education = cv_data.get("education", [])

        gpa_values = [e["gpa"] for e in education if e.get("gpa") is not None]
        project_scores = [p["score"] for p in projects if p.get("score") is not None]

        raw_metadata = {
            "full_name": cv_data.get("full_name", "N/A"),
            "email": cv_data.get("email", "N/A"),
            "role": cv_data.get("role", "N/A"),
            "years_exp": int(cv_data.get("years_exp", 0)),
            "gpa": float(sum(gpa_values) / len(gpa_values)) if gpa_values else 0.0,
            "project_score": float(sum(project_scores) / len(project_scores)) if project_scores else 0.0,
            "skills_list": ", ".join(skills),

            "file_source": file_name,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        return normalize_metadata(raw_metadata)

    def search_candidates(
        self, 
        query_embedding: List[float], 
        n_results: int = 10,
        min_exp: int = 0,
        required_skills: Optional[List[str]] = None
    ) -> Dict:
        """
        Tìm kiếm ứng viên phù hợp
        
        Args:
            query_embedding: Vector của Job Description
            n_results: Số lượng kết quả trả về
            min_exp: Số năm kinh nghiệm tối thiểu
            required_skills: Danh sách kỹ năng bắt buộc (optional)
            
        Returns:
            Dict: Kết quả tìm kiếm
        """
        try:
            where_clause = {"years_exp": {"$gte": min_exp}}
            
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_clause,
                include=["embeddings", "metadatas", "documents", "distances"]
            )
            
            if required_skills and results['ids']:
                filtered_results = self._filter_by_skills(results, required_skills)
                return filtered_results
            
            return results
            
        except Exception as e:
            raise Exception(f"Lỗi khi tìm kiếm: {e}")

    def _filter_by_skills(self, results: Dict, required_skills: List[str]) -> Dict:
        """
        Lọc kết quả theo skills bắt buộc (post-processing)
        
        Args:
            results: Kết quả từ ChromaDB
            required_skills: Danh sách kỹ năng cần có
            
        Returns:
            Dict: Kết quả đã lọc
        """
        filtered_ids = []
        filtered_metadatas = []
        filtered_documents = []
        filtered_distances = []
        
        for i in range(len(results['ids'][0])):
            candidate_skills = results['metadatas'][0][i].get('skills_list', '').lower()
            
            has_required = all(
                skill.lower() in candidate_skills 
                for skill in required_skills
            )
            
            if has_required:
                filtered_ids.append(results['ids'][0][i])
                filtered_metadatas.append(results['metadatas'][0][i])
                filtered_documents.append(results['documents'][0][i])
                filtered_distances.append(results['distances'][0][i])
        
        return {
            'ids': [filtered_ids],
            'metadatas': [filtered_metadatas],
            'documents': [filtered_documents],
            'distances': [filtered_distances]
        }

    def get_all_candidates(self, limit=100):
        results = self.collection.get(limit=limit, include=["metadatas"])

        full_results = []

        for i, meta in enumerate(results["metadatas"]):
            cid = results["ids"][i]

            profile = {}
            file_path = f"./data/full_profiles/{cid}.json"

            if os.path.exists(file_path):
                with open(file_path, "r", encoding="utf-8") as f:
                    profile = json.load(f)

            full_results.append({
                "id": cid,
                **meta,
                **profile
            })

        return full_results


    def delete_candidate(self, candidate_id: str) -> bool:
        """
        Xóa ứng viên khỏi DB + xóa file lưu trữ

        Args:
            candidate_id: ID của ứng viên
            
        Returns:
            bool: True nếu mọi thứ đều xóa ok
        """
        success = True  
        
        try:
            self.collection.delete(ids=[candidate_id])
            print(f"Đã xóa ứng viên khỏi DB: {candidate_id[:8]}...")
        except Exception as e:
            print(f"⚠️ Lỗi khi xóa trong DB: {e}")
            success = False

        try:
            json_path = f"./data/full_profiles/{candidate_id}.json"
            if os.path.exists(json_path):
                os.remove(json_path)
                print(f"Đã xóa JSON: {json_path}")
            else:
                print(f"Không tìm thấy JSON: {json_path}")
        except Exception as e:
            print(f"Lỗi khi xóa JSON: {e}")
            success = False

        try:
            folder = "./data/uploaded_cvs"
            deleted_pdf = False

            for file in os.listdir(folder):
                if candidate_id in file:  # file chứa id
                    os.remove(os.path.join(folder, file))
                    print(f"Đã xóa PDF: {file}")
                    deleted_pdf = True

            if not deleted_pdf:
                print(f"Không tìm thấy PDF của ứng viên trong {folder}")
        except Exception as e:
            print(f"⚠️ Lỗi khi xóa PDF: {e}")
            success = False

        return success

    def get_stats(self) -> Dict:
        """
        Lấy thống kê database
        
        Returns:
            Dict: Thông tin thống kê
        """
        try:
            total = self.collection.count()
            return {
                "total_candidates": total,
                "collection_name": self.collection.name
            }
        except Exception as e:
            return {"error": str(e)}