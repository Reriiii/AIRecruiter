import chromadb
import uuid
from typing import Dict, List, Optional
from datetime import datetime

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
            # Tạo client persistent (lưu xuống ổ cứng)
            self.client = chromadb.PersistentClient(path=db_path)
            
            # Tạo hoặc lấy collection
            self.collection = self.client.get_or_create_collection(
                name="candidates",
                metadata={"hnsw:space": "cosine"}  # Sử dụng cosine similarity
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
        try:
            # Tạo ID duy nhất
            doc_id = str(uuid.uuid4())
            
            # Chuẩn hóa metadata (ChromaDB yêu cầu flat dict)
            metadata = self._prepare_metadata(cv_data, file_name)
            
            # Lưu vào collection
            self.collection.add(
                ids=[doc_id],
                embeddings=[embedding],
                metadatas=[metadata],
                documents=[cv_text]  # Lưu raw text để có thể RAG sau này
            )
            
            print(f"✅ Đã lưu ứng viên: {metadata.get('full_name')} (ID: {doc_id[:8]}...)")
            
            return doc_id
            
        except Exception as e:
            raise Exception(f"Lỗi khi lưu ứng viên: {e}")

    def _prepare_metadata(self, cv_data: Dict, file_name: str = "") -> Dict:
        """
        Chuẩn bị metadata theo format của ChromaDB (flat dict, no nested)
        
        Args:
            cv_data: Dữ liệu CV
            file_name: Tên file
            
        Returns:
            Dict: Metadata đã chuẩn hóa
        """
        # Chuyển list skills thành string
        skills_list = cv_data.get("skills", [])
        skills_str = ", ".join(skills_list) if isinstance(skills_list, list) else str(skills_list)
        
        metadata = {
            "full_name": str(cv_data.get("full_name", "N/A")),
            "email": str(cv_data.get("email", "N/A")),
            "role": str(cv_data.get("role", "N/A")),
            "years_exp": int(cv_data.get("years_exp", 0)),
            "skills_list": skills_str,
            "education": str(cv_data.get("education", "N/A")),
            "file_source": file_name,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return metadata

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
            # Xây dựng filter query
            where_clause = {"years_exp": {"$gte": min_exp}}
            
            # Note: ChromaDB không hỗ trợ filter array tốt
            # Nên việc filter skills sẽ làm ở post-processing
            
            # Thực hiện tìm kiếm
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_clause,
                include=["embeddings", "metadatas", "documents", "distances"]
            )
            
            # Post-process: filter theo skills nếu có
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
            
            # Kiểm tra xem có đủ skills không
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

    def get_all_candidates(self, limit: int = 100) -> Dict:
        """
        Lấy danh sách tất cả ứng viên
        
        Args:
            limit: Số lượng tối đa
            
        Returns:
            Dict: Danh sách ứng viên
        """
        try:
            results = self.collection.get(
                limit=limit,
                include=["metadatas"]
            )
            return results
        except Exception as e:
            raise Exception(f"Lỗi khi lấy danh sách ứng viên: {e}")

    def delete_candidate(self, candidate_id: str) -> bool:
        """
        Xóa ứng viên khỏi database
        
        Args:
            candidate_id: ID của ứng viên
            
        Returns:
            bool: True nếu thành công
        """
        try:
            self.collection.delete(ids=[candidate_id])
            print(f"🗑️ Đã xóa ứng viên ID: {candidate_id[:8]}...")
            return True
        except Exception as e:
            print(f"⚠️ Lỗi khi xóa ứng viên: {e}")
            return False

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