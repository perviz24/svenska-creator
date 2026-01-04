"""
Research Service - Web Scraping and Topic Research
"""
import os
import httpx
from typing import Optional, List
from pydantic import BaseModel
from bs4 import BeautifulSoup
import re

# ============================================================================
# Models
# ============================================================================

class ScrapeResult(BaseModel):
    url: str
    success: bool
    title: Optional[str] = None
    content: Optional[str] = None
    word_count: int = 0
    error: Optional[str] = None

class ScrapeResponse(BaseModel):
    success: bool
    results: List[ScrapeResult]
    combined_content: str

# ============================================================================
# Web Scraping
# ============================================================================

async def scrape_url(url: str) -> ScrapeResult:
    """Scrape content from a single URL"""
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            )
            response.raise_for_status()
            html = response.text
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remove script and style elements
        for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            element.decompose()
        
        # Get title
        title = soup.title.string if soup.title else ""
        
        # Get main content
        # Try to find main content area
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile(r'content|article|post'))
        if main_content:
            text = main_content.get_text(separator='\n', strip=True)
        else:
            text = soup.body.get_text(separator='\n', strip=True) if soup.body else ""
        
        # Clean up text
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        content = '\n'.join(lines)
        
        # Convert to markdown-like format
        markdown_content = f"# {title}\n\n{content}" if title else content
        
        return ScrapeResult(
            url=url,
            success=True,
            title=title,
            content=markdown_content,
            word_count=len(content.split())
        )
    except Exception as e:
        return ScrapeResult(
            url=url,
            success=False,
            error=str(e)
        )

async def scrape_urls(urls: List[str]) -> ScrapeResponse:
    """Scrape content from multiple URLs"""
    results = []
    combined_parts = []
    
    for url in urls:
        result = await scrape_url(url)
        results.append(result)
        if result.success and result.content:
            combined_parts.append(f"## {result.title or url}\nKälla: {url}\n\n{result.content}")
    
    return ScrapeResponse(
        success=any(r.success for r in results),
        results=results,
        combined_content="\n\n---\n\n".join(combined_parts)
    )

# ============================================================================
# AI-Powered Research (uses Gemini via Emergent)
# ============================================================================

async def research_topic(
    topic: str,
    context: Optional[str] = None,
    language: str = "sv",
    depth: str = "standard"
) -> dict:
    """Research a topic using AI"""
    from emergentintegrations.llm.chat import chat, LlmMessage
    
    emergent_key = os.environ.get('EMERGENT_LLM_KEY', '')
    if not emergent_key:
        raise ValueError("Emergent LLM key not configured")
    
    depth_instructions = {
        "quick": "Provide a brief 2-3 paragraph summary.",
        "standard": "Provide a comprehensive overview with key points and examples.",
        "deep": "Provide an in-depth analysis with multiple perspectives, evidence, and detailed explanations."
    }
    
    system_prompt = f"""You are a research assistant helping create educational content.
Language: {language}
Research depth: {depth_instructions.get(depth, depth_instructions["standard"])}

Provide well-structured, factual information with:
- Clear headings and sections
- Key facts and statistics
- Practical examples
- Citations where applicable

Format your response in Markdown."""

    user_prompt = f"""Research topic: {topic}
{f'Context: {context}' if context else ''}

Please provide comprehensive research on this topic."""

    messages = [
        LlmMessage(role="system", content=system_prompt),
        LlmMessage(role="user", content=user_prompt)
    ]
    
    response = await chat(
        api_key=emergent_key,
        messages=messages,
        model="gemini-2.5-flash"
    )
    
    return {
        "topic": topic,
        "content": response.content,
        "language": language,
        "depth": depth
    }
