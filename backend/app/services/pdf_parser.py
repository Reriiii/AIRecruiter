import io
import re
import pdfplumber
from fastapi import UploadFile

async def parse_pdf(file: UploadFile) -> str:
    """
    Đọc và trích xuất văn bản từ file PDF
    
    Args:
        file: UploadFile object từ FastAPI
        
    Returns:
        str: Văn bản đã được làm sạch
    """
    try:
        content = await file.read()
        
        text_content = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)
        
        raw_text = "\n".join(text_content)

        cleaned_text = clean_text(raw_text)
        
        return cleaned_text
        
    except Exception as e:
        raise Exception(f"Lỗi khi đọc PDF: {str(e)}")


def clean_text(text: str) -> str:
    """
    Làm sạch văn bản: loại bỏ ký tự đặc biệt, khoảng trắng thừa
    
    Args:
        text: Văn bản gốc
        
    Returns:
        str: Văn bản đã được làm sạch
    """
    text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    text = text.strip()
    
    return text