"""
Document Service - Parse uploaded documents
"""
import os
import io
import re
from typing import Optional
from pydantic import BaseModel

# ============================================================================
# Models
# ============================================================================

class ParseDocumentRequest(BaseModel):
    content: str  # Base64 encoded file content
    filename: str
    file_type: str  # pdf, docx, txt, md

class ParseDocumentResponse(BaseModel):
    success: bool
    content: str
    title: Optional[str] = None
    word_count: int = 0
    error: Optional[str] = None

# ============================================================================
# Document Parsing
# ============================================================================

async def parse_document(request: ParseDocumentRequest) -> ParseDocumentResponse:
    """Parse document content from various formats"""
    import base64
    
    try:
        # Decode base64 content
        file_bytes = base64.b64decode(request.content)
        
        if request.file_type in ['txt', 'md']:
            # Plain text
            content = file_bytes.decode('utf-8')
            
        elif request.file_type == 'pdf':
            try:
                import PyPDF2
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                content = ""
                for page in pdf_reader.pages:
                    content += page.extract_text() + "\n"
            except ImportError:
                # Fallback: return error message
                return ParseDocumentResponse(
                    success=False,
                    content="",
                    error="PDF parsing not available. Please copy-paste the content instead."
                )
                
        elif request.file_type == 'docx':
            try:
                from docx import Document
                doc = Document(io.BytesIO(file_bytes))
                content = "\n".join([para.text for para in doc.paragraphs])
            except ImportError:
                return ParseDocumentResponse(
                    success=False,
                    content="",
                    error="DOCX parsing not available. Please copy-paste the content instead."
                )
        else:
            # Try as plain text
            try:
                content = file_bytes.decode('utf-8')
            except:
                return ParseDocumentResponse(
                    success=False,
                    content="",
                    error=f"Unsupported file type: {request.file_type}"
                )
        
        # Extract title (first non-empty line or heading)
        lines = content.strip().split('\n')
        title = None
        for line in lines:
            line = line.strip()
            if line:
                # Remove markdown heading markers
                title = re.sub(r'^#+\s*', '', line)
                break
        
        # Clean up content
        content = content.strip()
        word_count = len(content.split())
        
        return ParseDocumentResponse(
            success=True,
            content=content,
            title=title,
            word_count=word_count
        )
        
    except Exception as e:
        return ParseDocumentResponse(
            success=False,
            content="",
            error=str(e)
        )

async def parse_text_content(text: str) -> ParseDocumentResponse:
    """Parse plain text content"""
    lines = text.strip().split('\n')
    title = None
    for line in lines:
        line = line.strip()
        if line:
            title = re.sub(r'^#+\s*', '', line)
            break
    
    return ParseDocumentResponse(
        success=True,
        content=text.strip(),
        title=title,
        word_count=len(text.split())
    )
