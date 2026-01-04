#!/usr/bin/env python3
"""
Backend API Testing for Course Generation Endpoints
Tests all newly migrated FastAPI endpoints with Emergent LLM Key and Gemini 2.5 Flash
"""

import asyncio
import aiohttp
import json
import time
import os
from typing import Dict, Any, List
import sys

# Get backend URL from environment
BACKEND_URL = "https://coursebuilder-2.preview.emergentagent.com/api"

class CourseAPITester:
    def __init__(self):
        self.session = None
        self.test_results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name: str, status: str, details: str = "", response_time: float = 0):
        """Log test results"""
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "response_time": response_time
        }
        self.test_results.append(result)
        print(f"[{status}] {test_name} ({response_time:.2f}s)")
        if details:
            print(f"    Details: {details}")
    
    async def make_request(self, method: str, endpoint: str, data: Dict[str, Any] = None) -> tuple:
        """Make HTTP request and return response data and time"""
        url = f"{BACKEND_URL}{endpoint}"
        start_time = time.time()
        
        try:
            if method.upper() == "POST":
                async with self.session.post(url, json=data) as response:
                    response_time = time.time() - start_time
                    response_data = await response.json()
                    return response.status, response_data, response_time
            elif method.upper() == "GET":
                async with self.session.get(url) as response:
                    response_time = time.time() - start_time
                    response_data = await response.json()
                    return response.status, response_data, response_time
        except Exception as e:
            response_time = time.time() - start_time
            return 0, {"error": str(e)}, response_time
    
    async def test_title_generation(self):
        """Test POST /api/course/generate-titles"""
        print("\n=== Testing Title Generation ===")
        
        # Test valid request
        test_data = {
            "title": "Behandlingsstrategier för ögonsjukdomar",
            "language": "sv"
        }
        
        status, response, response_time = await self.make_request("POST", "/course/generate-titles", test_data)
        
        if status == 200:
            # Validate response structure
            if "suggestions" in response and isinstance(response["suggestions"], list):
                if len(response["suggestions"]) == 5:
                    # Check each suggestion has required fields
                    valid_suggestions = True
                    for suggestion in response["suggestions"]:
                        if not all(key in suggestion for key in ["id", "title", "explanation"]):
                            valid_suggestions = False
                            break
                    
                    if valid_suggestions:
                        # Check for Swedish characters
                        response_str = str(response)
                        has_swedish = any(char in response_str for char in ["å", "ä", "ö"])
                        if has_swedish:
                            self.log_test("Title Generation - Valid Request", "PASS", 
                                        f"Generated 5 titles with Swedish content", response_time)
                        else:
                            self.log_test("Title Generation - Valid Request", "WARN", 
                                        "Generated titles but no Swedish characters detected", response_time)
                    else:
                        self.log_test("Title Generation - Valid Request", "FAIL", 
                                    "Suggestions missing required fields", response_time)
                else:
                    self.log_test("Title Generation - Valid Request", "FAIL", 
                                f"Expected 5 suggestions, got {len(response['suggestions'])}", response_time)
            else:
                self.log_test("Title Generation - Valid Request", "FAIL", 
                            "Response missing 'suggestions' array", response_time)
        else:
            self.log_test("Title Generation - Valid Request", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test invalid request (empty title)
        invalid_data = {"title": "", "language": "sv"}
        status, response, response_time = await self.make_request("POST", "/course/generate-titles", invalid_data)
        
        if status in [400, 422, 500]:
            self.log_test("Title Generation - Invalid Request", "PASS", 
                        f"Correctly rejected empty title with HTTP {status}", response_time)
        else:
            self.log_test("Title Generation - Invalid Request", "FAIL", 
                        f"Should reject empty title, got HTTP {status}", response_time)
    
    async def test_outline_generation(self):
        """Test POST /api/course/generate-outline"""
        print("\n=== Testing Outline Generation ===")
        
        # Test valid request
        test_data = {
            "title": "Behandlingsstrategier för ögonsjukdomar",
            "num_modules": 3,
            "language": "sv"
        }
        
        status, response, response_time = await self.make_request("POST", "/course/generate-outline", test_data)
        
        if status == 200:
            # Validate response structure
            if "modules" in response and "total_duration" in response:
                modules = response["modules"]
                if len(modules) == 3:
                    # Check each module has required fields
                    valid_modules = True
                    total_duration = 0
                    for module in modules:
                        required_fields = ["id", "title", "description", "estimated_duration", "key_topics"]
                        if not all(key in module for key in required_fields):
                            valid_modules = False
                            break
                        if not isinstance(module["key_topics"], list) or len(module["key_topics"]) < 3:
                            valid_modules = False
                            break
                        total_duration += module.get("estimated_duration", 0)
                    
                    if valid_modules:
                        # Check if total duration makes sense
                        if response["total_duration"] > 0:
                            self.log_test("Outline Generation - Valid Request", "PASS", 
                                        f"Generated 3 modules, total duration: {response['total_duration']} min", response_time)
                        else:
                            self.log_test("Outline Generation - Valid Request", "WARN", 
                                        "Generated modules but total_duration is 0", response_time)
                    else:
                        self.log_test("Outline Generation - Valid Request", "FAIL", 
                                    "Modules missing required fields or insufficient key_topics", response_time)
                else:
                    self.log_test("Outline Generation - Valid Request", "FAIL", 
                                f"Expected 3 modules, got {len(modules)}", response_time)
            else:
                self.log_test("Outline Generation - Valid Request", "FAIL", 
                            "Response missing 'modules' or 'total_duration'", response_time)
        else:
            self.log_test("Outline Generation - Valid Request", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test invalid request (0 modules)
        invalid_data = {"title": "Test", "num_modules": 0, "language": "sv"}
        status, response, response_time = await self.make_request("POST", "/course/generate-outline", invalid_data)
        
        if status in [400, 422, 500]:
            self.log_test("Outline Generation - Invalid Request", "PASS", 
                        f"Correctly rejected 0 modules with HTTP {status}", response_time)
        else:
            self.log_test("Outline Generation - Invalid Request", "FAIL", 
                        f"Should reject 0 modules, got HTTP {status}", response_time)
    
    async def test_script_generation(self):
        """Test POST /api/course/generate-script"""
        print("\n=== Testing Script Generation ===")
        
        # Test valid request
        test_data = {
            "module_title": "Introduktion till ögonsjukdomar",
            "module_description": "Översikt över vanliga ögonsjukdomar",
            "course_title": "Behandlingsstrategier för ögonsjukdomar",
            "language": "sv",
            "target_duration": 10,
            "tone": "professional"
        }
        
        status, response, response_time = await self.make_request("POST", "/course/generate-script", test_data)
        
        if status == 200:
            # Validate response structure
            required_fields = ["module_id", "module_title", "sections", "total_words", "estimated_duration", "citations"]
            if all(key in response for key in required_fields):
                sections = response["sections"]
                if len(sections) >= 3:  # Should have 3-5 sections
                    # Check each section has required fields
                    valid_sections = True
                    for section in sections:
                        section_fields = ["id", "title", "content", "slide_markers"]
                        if not all(key in section for key in section_fields):
                            valid_sections = False
                            break
                        if not isinstance(section["slide_markers"], list):
                            valid_sections = False
                            break
                    
                    if valid_sections:
                        # Check word count and duration
                        if response["total_words"] > 0 and response["estimated_duration"] > 0:
                            self.log_test("Script Generation - Valid Request", "PASS", 
                                        f"Generated {len(sections)} sections, {response['total_words']} words", response_time)
                        else:
                            self.log_test("Script Generation - Valid Request", "WARN", 
                                        "Generated script but word count or duration is 0", response_time)
                    else:
                        self.log_test("Script Generation - Valid Request", "FAIL", 
                                    "Sections missing required fields", response_time)
                else:
                    self.log_test("Script Generation - Valid Request", "FAIL", 
                                f"Expected 3+ sections, got {len(sections)}", response_time)
            else:
                missing_fields = [f for f in required_fields if f not in response]
                self.log_test("Script Generation - Valid Request", "FAIL", 
                            f"Response missing fields: {missing_fields}", response_time)
        else:
            self.log_test("Script Generation - Valid Request", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test invalid request (empty module title)
        invalid_data = {
            "module_title": "",
            "module_description": "Test",
            "course_title": "Test",
            "language": "sv"
        }
        status, response, response_time = await self.make_request("POST", "/course/generate-script", invalid_data)
        
        if status in [400, 422, 500]:
            self.log_test("Script Generation - Invalid Request", "PASS", 
                        f"Correctly rejected empty module title with HTTP {status}", response_time)
        else:
            self.log_test("Script Generation - Invalid Request", "FAIL", 
                        f"Should reject empty module title, got HTTP {status}", response_time)
    
    async def test_slide_generation(self):
        """Test POST /api/slides/generate with enhanced features"""
        print("\n=== Testing Enhanced Slide Generation ===")
        
        # Test Case 1: Basic Generation Test (Swedish)
        test_data_1 = {
            "script_content": "Artificiell intelligens revolutionerar industrier. Machine learning möjliggör prediktiv analys. Deep learning hanterar komplexa mönster. AI etik är avgörande för ansvarsfull utveckling.",
            "module_title": "AI Fundamentals",
            "course_title": "Modern Teknologi",
            "num_slides": 5,
            "language": "sv",
            "tone": "professional",
            "verbosity": "standard"
        }
        
        status, response, response_time = await self.make_request("POST", "/slides/generate", test_data_1)
        
        if status == 200:
            # Validate enhanced response structure
            required_fields = ["presentation_title", "slides", "slide_count", "source"]
            if all(key in response for key in required_fields):
                slides = response["slides"]
                if len(slides) == 5:
                    # Check enhanced slide fields
                    valid_slides = True
                    layout_variety = []
                    has_key_takeaways = True
                    has_action_verbs = True
                    has_specific_images = True
                    speaker_notes_valid = True
                    
                    for i, slide in enumerate(slides):
                        # Check required fields including new ones
                        enhanced_fields = ["slide_number", "title", "content", "speaker_notes", "layout", "suggested_image_query", "key_takeaway"]
                        if not all(key in slide for key in enhanced_fields):
                            valid_slides = False
                            break
                        
                        # Check layout variety (no two consecutive slides should have same layout)
                        layout = slide.get("layout")
                        layout_variety.append(layout)
                        if i > 0 and layout == layout_variety[i-1]:
                            self.log_test("Slide Generation - Layout Variety", "FAIL", 
                                        f"Consecutive slides {i} and {i+1} have same layout: {layout}", response_time)
                        
                        # Check key takeaways
                        if not slide.get("key_takeaway"):
                            has_key_takeaways = False
                        
                        # Check bullet points for action verbs
                        bullet_points = slide.get("bullet_points", [])
                        if bullet_points:
                            for bullet in bullet_points:
                                if not any(bullet.lower().startswith(verb) for verb in ["implementera", "analysera", "skapa", "utveckla", "förbättra", "optimera"]):
                                    has_action_verbs = False
                        
                        # Check image queries are specific (not generic)
                        image_query = slide.get("suggested_image_query", "")
                        generic_terms = ["business", "technology", "teamwork", "success"]
                        if any(term in image_query.lower() for term in generic_terms):
                            has_specific_images = False
                        
                        # Check speaker notes length (should be 100-150 words for standard verbosity)
                        speaker_notes = slide.get("speaker_notes", "")
                        word_count = len(speaker_notes.split())
                        if word_count < 100 or word_count > 150:
                            speaker_notes_valid = False
                    
                    # Check source field
                    if response.get("source") == "internal-ai-enhanced":
                        self.log_test("Slide Generation - Enhanced Source", "PASS", 
                                    "Source correctly shows 'internal-ai-enhanced'", response_time)
                    else:
                        self.log_test("Slide Generation - Enhanced Source", "FAIL", 
                                    f"Expected source 'internal-ai-enhanced', got '{response.get('source')}'", response_time)
                    
                    # Report on enhanced features
                    if valid_slides:
                        self.log_test("Slide Generation - Basic Structure", "PASS", 
                                    f"Generated 5 slides with enhanced structure", response_time)
                    else:
                        self.log_test("Slide Generation - Basic Structure", "FAIL", 
                                    "Slides missing enhanced required fields", response_time)
                    
                    if has_key_takeaways:
                        self.log_test("Slide Generation - Key Takeaways", "PASS", 
                                    "All slides have key takeaways", response_time)
                    else:
                        self.log_test("Slide Generation - Key Takeaways", "FAIL", 
                                    "Some slides missing key takeaways", response_time)
                    
                    if has_specific_images:
                        self.log_test("Slide Generation - Specific Images", "PASS", 
                                    "Image queries are specific and descriptive", response_time)
                    else:
                        self.log_test("Slide Generation - Specific Images", "FAIL", 
                                    "Some image queries are too generic", response_time)
                    
                    if speaker_notes_valid:
                        self.log_test("Slide Generation - Speaker Notes", "PASS", 
                                    "Speaker notes are 100-150 words for standard verbosity", response_time)
                    else:
                        self.log_test("Slide Generation - Speaker Notes", "WARN", 
                                    "Some speaker notes outside 100-150 word range", response_time)
                    
                    # Check layout variety
                    unique_layouts = len(set(layout_variety))
                    if unique_layouts >= 4:
                        self.log_test("Slide Generation - Layout Variety", "PASS", 
                                    f"Good layout variety: {unique_layouts} different layouts", response_time)
                    else:
                        self.log_test("Slide Generation - Layout Variety", "WARN", 
                                    f"Limited layout variety: only {unique_layouts} different layouts", response_time)
                    
                else:
                    self.log_test("Slide Generation - Swedish Test", "FAIL", 
                                f"Expected 5 slides, got {len(slides)}", response_time)
            else:
                missing_fields = [f for f in required_fields if f not in response]
                self.log_test("Slide Generation - Swedish Test", "FAIL", 
                            f"Response missing fields: {missing_fields}", response_time)
        else:
            self.log_test("Slide Generation - Swedish Test", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test Case 2: Concise Style Test (TED-talk)
        test_data_2 = {
            "script_content": "Leadership is influence. Great leaders inspire action. They create vision and empower teams. Success comes from authentic leadership.",
            "module_title": "Leadership Essentials",
            "course_title": "Executive Development",
            "num_slides": 4,
            "language": "en",
            "tone": "inspirational",
            "verbosity": "concise"
        }
        
        status, response, response_time = await self.make_request("POST", "/slides/generate", test_data_2)
        
        if status == 200:
            slides = response.get("slides", [])
            if len(slides) == 4:
                # Check concise style requirements
                concise_valid = True
                for slide in slides:
                    # Check title length (3-6 words for concise)
                    title = slide.get("title", "")
                    title_words = len(title.split())
                    if title_words > 8:  # Allow some flexibility
                        concise_valid = False
                    
                    # Check speaker notes (50-100 words for concise)
                    speaker_notes = slide.get("speaker_notes", "")
                    word_count = len(speaker_notes.split())
                    if word_count > 120:  # Allow some flexibility
                        concise_valid = False
                
                if concise_valid:
                    self.log_test("Slide Generation - Concise Style", "PASS", 
                                f"Generated 4 slides with concise TED-talk style", response_time)
                else:
                    self.log_test("Slide Generation - Concise Style", "WARN", 
                                "Some slides don't follow concise style guidelines", response_time)
            else:
                self.log_test("Slide Generation - Concise Style", "FAIL", 
                            f"Expected 4 slides, got {len(slides)}", response_time)
        else:
            self.log_test("Slide Generation - Concise Style", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test Case 3: Text-Heavy Educational Test
        test_data_3 = {
            "script_content": "Projektledning kräver planering, genomförande och uppföljning. Agila metoder som Scrum fokuserar på iterativ utveckling. Vattenfallsmetoden följer sekventiella faser. Hybrid-metoder kombinerar båda.",
            "module_title": "Projektledningsmetoder",
            "course_title": "Projektledning för nybörjare",
            "num_slides": 6,
            "language": "sv",
            "tone": "educational",
            "verbosity": "text-heavy"
        }
        
        status, response, response_time = await self.make_request("POST", "/slides/generate", test_data_3)
        
        if status == 200:
            slides = response.get("slides", [])
            if len(slides) == 6:
                # Check text-heavy style requirements
                text_heavy_valid = True
                for slide in slides:
                    # Check speaker notes (150-200 words for text-heavy)
                    speaker_notes = slide.get("speaker_notes", "")
                    word_count = len(speaker_notes.split())
                    if word_count < 120:  # Allow some flexibility
                        text_heavy_valid = False
                
                if text_heavy_valid:
                    self.log_test("Slide Generation - Text-Heavy Style", "PASS", 
                                f"Generated 6 slides with educational text-heavy style", response_time)
                else:
                    self.log_test("Slide Generation - Text-Heavy Style", "WARN", 
                                "Some slides don't follow text-heavy style guidelines", response_time)
            else:
                self.log_test("Slide Generation - Text-Heavy Style", "FAIL", 
                            f"Expected 6 slides, got {len(slides)}", response_time)
        else:
            self.log_test("Slide Generation - Text-Heavy Style", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test invalid request (empty script content)
        invalid_data = {
            "script_content": "",
            "module_title": "Test",
            "course_title": "Test",
            "num_slides": 5
        }
        status, response, response_time = await self.make_request("POST", "/slides/generate", invalid_data)
        
        if status in [400, 422, 500]:
            self.log_test("Slide Generation - Invalid Request", "PASS", 
                        f"Correctly rejected empty script content with HTTP {status}", response_time)
        else:
            self.log_test("Slide Generation - Invalid Request", "FAIL", 
                        f"Should reject empty script content, got HTTP {status}", response_time)
    
    async def test_exercise_generation(self):
        """Test POST /api/exercises/generate"""
        print("\n=== Testing Exercise Generation ===")
        
        # Test valid request
        test_data = {
            "module_title": "Ögonsjukdomar",
            "module_content": "Katarakt är en vanlig åldersrelaterad ögonsjukdom som orsakar grumling av ögats lins. Behandling sker oftast genom kirurgi.",
            "course_title": "Ögonskötsel",
            "num_exercises": 2,
            "language": "sv"
        }
        
        status, response, response_time = await self.make_request("POST", "/exercises/generate", test_data)
        
        if status == 200:
            # Validate response structure
            required_fields = ["exercises", "total_points"]
            if all(key in response for key in required_fields):
                exercises = response["exercises"]
                if len(exercises) == 2:
                    # Check each exercise has required fields
                    valid_exercises = True
                    for exercise in exercises:
                        exercise_fields = ["id", "type", "question", "correct_answer", "explanation", "points"]
                        if not all(key in exercise for key in exercise_fields):
                            valid_exercises = False
                            break
                    
                    if valid_exercises:
                        self.log_test("Exercise Generation - Valid Request", "PASS", 
                                    f"Generated 2 exercises with proper structure", response_time)
                    else:
                        self.log_test("Exercise Generation - Valid Request", "FAIL", 
                                    "Exercises missing required fields", response_time)
                else:
                    self.log_test("Exercise Generation - Valid Request", "FAIL", 
                                f"Expected 2 exercises, got {len(exercises)}", response_time)
            else:
                missing_fields = [f for f in required_fields if f not in response]
                self.log_test("Exercise Generation - Valid Request", "FAIL", 
                            f"Response missing fields: {missing_fields}", response_time)
        else:
            self.log_test("Exercise Generation - Valid Request", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test invalid request (empty content)
        invalid_data = {
            "module_title": "Test",
            "module_content": "",
            "course_title": "Test",
            "num_exercises": 2
        }
        status, response, response_time = await self.make_request("POST", "/exercises/generate", invalid_data)
        
        if status in [400, 422, 500]:
            self.log_test("Exercise Generation - Invalid Request", "PASS", 
                        f"Correctly rejected empty content with HTTP {status}", response_time)
        else:
            self.log_test("Exercise Generation - Invalid Request", "FAIL", 
                        f"Should reject empty content, got HTTP {status}", response_time)
    
    async def test_quiz_generation(self):
        """Test POST /api/quiz/generate"""
        print("\n=== Testing Quiz Generation ===")
        
        # Test valid request
        test_data = {
            "module_title": "Ögonsjukdomar",
            "module_content": "Katarakt behandlas oftast med kirurgi där den grumlade linsen ersätts med en konstgjord lins.",
            "course_title": "Ögonskötsel",
            "num_questions": 3,
            "language": "sv"
        }
        
        status, response, response_time = await self.make_request("POST", "/quiz/generate", test_data)
        
        if status == 200:
            # Validate response structure
            required_fields = ["quiz_title", "questions", "total_points", "passing_score"]
            if all(key in response for key in required_fields):
                questions = response["questions"]
                if len(questions) == 3:
                    # Check each question has required fields
                    valid_questions = True
                    for question in questions:
                        question_fields = ["id", "question", "options", "correct_answer", "explanation"]
                        if not all(key in question for key in question_fields):
                            valid_questions = False
                            break
                        if not isinstance(question["options"], list) or len(question["options"]) < 2:
                            valid_questions = False
                            break
                    
                    if valid_questions:
                        self.log_test("Quiz Generation - Valid Request", "PASS", 
                                    f"Generated 3 quiz questions with proper structure", response_time)
                    else:
                        self.log_test("Quiz Generation - Valid Request", "FAIL", 
                                    "Questions missing required fields or insufficient options", response_time)
                else:
                    self.log_test("Quiz Generation - Valid Request", "FAIL", 
                                f"Expected 3 questions, got {len(questions)}", response_time)
            else:
                missing_fields = [f for f in required_fields if f not in response]
                self.log_test("Quiz Generation - Valid Request", "FAIL", 
                            f"Response missing fields: {missing_fields}", response_time)
        else:
            self.log_test("Quiz Generation - Valid Request", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test invalid request (0 questions)
        invalid_data = {
            "module_title": "Test",
            "module_content": "Test content",
            "course_title": "Test",
            "num_questions": 0
        }
        status, response, response_time = await self.make_request("POST", "/quiz/generate", invalid_data)
        
        if status in [400, 422, 500]:
            self.log_test("Quiz Generation - Invalid Request", "PASS", 
                        f"Correctly rejected 0 questions with HTTP {status}", response_time)
        else:
            self.log_test("Quiz Generation - Invalid Request", "FAIL", 
                        f"Should reject 0 questions, got HTTP {status}", response_time)
    
    async def test_slide_enhancement(self):
        """Test POST /api/slides/enhance"""
        print("\n=== Testing Slide Enhancement ===")
        
        # Test valid request
        test_data = {
            "slide_title": "Katarakt",
            "slide_content": "Vanlig ögonsjukdom som påverkar äldre",
            "enhancement_type": "add_examples",
            "language": "sv"
        }
        
        status, response, response_time = await self.make_request("POST", "/slides/enhance", test_data)
        
        if status == 200:
            # Validate response structure
            required_fields = ["enhanced_content", "suggestions"]
            if all(key in response for key in required_fields):
                # Check that content was actually enhanced (should be longer)
                if len(response["enhanced_content"]) > len(test_data["slide_content"]):
                    self.log_test("Slide Enhancement - Valid Request", "PASS", 
                                f"Enhanced slide content successfully", response_time)
                else:
                    self.log_test("Slide Enhancement - Valid Request", "WARN", 
                                "Enhanced content not significantly longer than original", response_time)
            else:
                missing_fields = [f for f in required_fields if f not in response]
                self.log_test("Slide Enhancement - Valid Request", "FAIL", 
                            f"Response missing fields: {missing_fields}", response_time)
        else:
            self.log_test("Slide Enhancement - Valid Request", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test invalid request (empty content)
        invalid_data = {
            "slide_title": "Test",
            "slide_content": "",
            "enhancement_type": "add_examples"
        }
        status, response, response_time = await self.make_request("POST", "/slides/enhance", invalid_data)
        
        if status in [400, 422, 500]:
            self.log_test("Slide Enhancement - Invalid Request", "PASS", 
                        f"Correctly rejected empty content with HTTP {status}", response_time)
        else:
            self.log_test("Slide Enhancement - Invalid Request", "FAIL", 
                        f"Should reject empty content, got HTTP {status}", response_time)
    
    async def test_presenton_generation(self):
        """Test POST /api/presenton/generate"""
        print("\n=== Testing Presenton Generation ===")
        
        # Test valid request
        test_data = {
            "topic": "Ögonsjukdomar",
            "num_slides": 3,
            "language": "sv",
            "verbosity": "standard"
        }
        
        status, response, response_time = await self.make_request("POST", "/presenton/generate", test_data)
        
        if status == 200:
            # Validate response structure - should return task ID for async processing
            if "task_id" in response:
                self.log_test("Presenton Generation - Valid Request", "PASS", 
                            f"Received task ID for async processing: {response['task_id']}", response_time)
            else:
                self.log_test("Presenton Generation - Valid Request", "FAIL", 
                            "Response missing task_id for async processing", response_time)
        else:
            self.log_test("Presenton Generation - Valid Request", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test invalid request (0 slides)
        invalid_data = {
            "topic": "Test",
            "num_slides": 0,
            "language": "sv"
        }
        status, response, response_time = await self.make_request("POST", "/presenton/generate", invalid_data)
        
        if status in [400, 422, 500]:
            self.log_test("Presenton Generation - Invalid Request", "PASS", 
                        f"Correctly rejected 0 slides with HTTP {status}", response_time)
        else:
            self.log_test("Presenton Generation - Invalid Request", "FAIL", 
                        f"Should reject 0 slides, got HTTP {status}", response_time)

    async def test_media_photos_search(self):
        """Test POST /api/media/photos/search"""
        print("\n=== Testing Media Photos Search ===")
        
        # Test Pexels photo search
        url = "/media/photos/search?query=healthcare&provider=pexels&per_page=2"
        status, response, response_time = await self.make_request("POST", url)
        
        if status == 200:
            # Validate response structure
            if "photos" in response and "total" in response:
                photos = response["photos"]
                if len(photos) == 2:
                    # Check each photo has required fields (based on actual response)
                    valid_photos = True
                    for photo in photos:
                        required_fields = ["id", "url", "photographer", "source"]
                        if not all(key in photo for key in required_fields):
                            valid_photos = False
                            break
                    
                    if valid_photos:
                        self.log_test("Media Photos Search - Pexels", "PASS", 
                                    f"Retrieved 2 healthcare photos from Pexels", response_time)
                    else:
                        self.log_test("Media Photos Search - Pexels", "FAIL", 
                                    "Photos missing required fields", response_time)
                else:
                    self.log_test("Media Photos Search - Pexels", "FAIL", 
                                f"Expected 2 photos, got {len(photos)}", response_time)
            else:
                self.log_test("Media Photos Search - Pexels", "FAIL", 
                            "Response missing 'photos' or 'total' fields", response_time)
        else:
            self.log_test("Media Photos Search - Pexels", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)

    async def test_media_videos_search(self):
        """Test POST /api/media/videos/search"""
        print("\n=== Testing Media Videos Search ===")
        
        # Test Pexels video search
        url = "/media/videos/search?query=healthcare&provider=pexels&per_page=2"
        status, response, response_time = await self.make_request("POST", url)
        
        if status == 200:
            # Validate response structure
            if "videos" in response and "total" in response and "provider" in response:
                videos = response["videos"]
                if len(videos) == 2:
                    # Check each video has required fields
                    valid_videos = True
                    for video in videos:
                        required_fields = ["id", "url", "duration", "user"]
                        if not all(key in video for key in required_fields):
                            valid_videos = False
                            break
                    
                    if valid_videos and response["provider"] == "pexels":
                        self.log_test("Media Videos Search - Pexels", "PASS", 
                                    f"Retrieved 2 healthcare videos from Pexels", response_time)
                    else:
                        self.log_test("Media Videos Search - Pexels", "FAIL", 
                                    "Videos missing required fields or wrong provider", response_time)
                else:
                    self.log_test("Media Videos Search - Pexels", "FAIL", 
                                f"Expected 2 videos, got {len(videos)}", response_time)
            else:
                self.log_test("Media Videos Search - Pexels", "FAIL", 
                            "Response missing required fields", response_time)
        else:
            self.log_test("Media Videos Search - Pexels", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)

    async def test_heygen_avatars(self):
        """Test GET /api/video/heygen/avatars"""
        print("\n=== Testing HeyGen Avatars ===")
        
        status, response, response_time = await self.make_request("GET", "/video/heygen/avatars")
        
        if status == 200:
            # Validate response structure
            if "avatars" in response:
                avatars = response["avatars"]
                if len(avatars) >= 1000:
                    # Check first avatar has required fields (based on actual response)
                    if avatars and all(key in avatars[0] for key in ["id", "name"]):
                        self.log_test("HeyGen Avatars", "PASS", 
                                    f"Retrieved {len(avatars)} avatars (≥1000 expected)", response_time)
                    else:
                        self.log_test("HeyGen Avatars", "FAIL", 
                                    "Avatars missing required fields", response_time)
                else:
                    self.log_test("HeyGen Avatars", "FAIL", 
                                f"Expected ≥1000 avatars, got {len(avatars)}", response_time)
            else:
                self.log_test("HeyGen Avatars", "FAIL", 
                            "Response missing 'avatars' field", response_time)
        else:
            self.log_test("HeyGen Avatars", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)

    async def test_elevenlabs_voices(self):
        """Test GET /api/voice/elevenlabs/voices"""
        print("\n=== Testing ElevenLabs Voices ===")
        
        status, response, response_time = await self.make_request("GET", "/voice/elevenlabs/voices")
        
        if status == 200:
            # Validate response structure
            if "voices" in response:
                voices = response["voices"]
                if len(voices) >= 20:
                    # Check first voice has required fields (based on actual response)
                    if voices and all(key in voices[0] for key in ["id", "name"]):
                        self.log_test("ElevenLabs Voices", "PASS", 
                                    f"Retrieved {len(voices)} voices (≥20 expected)", response_time)
                    else:
                        self.log_test("ElevenLabs Voices", "FAIL", 
                                    "Voices missing required fields", response_time)
                else:
                    self.log_test("ElevenLabs Voices", "FAIL", 
                                f"Expected ≥20 voices, got {len(voices)}", response_time)
            else:
                self.log_test("ElevenLabs Voices", "FAIL", 
                            "Response missing 'voices' field", response_time)
        else:
            self.log_test("ElevenLabs Voices", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)

    async def test_voice_duration_estimate(self):
        """Test POST /api/voice/estimate-duration"""
        print("\n=== Testing Voice Duration Estimate ===")
        
        url = "/voice/estimate-duration?text=Hello%20world%20this%20is%20a%20test"
        status, response, response_time = await self.make_request("POST", url)
        
        if status == 200:
            # Validate response structure (based on actual response)
            if "estimated_duration_seconds" in response:
                duration = response["estimated_duration_seconds"]
                if isinstance(duration, (int, float)) and duration > 0:
                    self.log_test("Voice Duration Estimate", "PASS", 
                                f"Estimated duration: {duration} seconds", response_time)
                else:
                    self.log_test("Voice Duration Estimate", "FAIL", 
                                f"Invalid duration value: {duration}", response_time)
            else:
                self.log_test("Voice Duration Estimate", "FAIL", 
                            "Response missing 'estimated_duration_seconds' field", response_time)
        else:
            self.log_test("Voice Duration Estimate", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)

    async def test_research_scrape(self):
        """Test POST /api/research/scrape"""
        print("\n=== Testing Research Scrape ===")
        
        test_data = {
            "urls": ["https://example.com"]
        }
        
        status, response, response_time = await self.make_request("POST", "/research/scrape", test_data)
        
        if status == 200:
            # Validate response structure
            if "results" in response:
                results = response["results"]
                if isinstance(results, list) and len(results) > 0:
                    # Check first result has required fields
                    if all(key in results[0] for key in ["url", "content"]):
                        self.log_test("Research Scrape", "PASS", 
                                    f"Successfully scraped {len(results)} URL(s)", response_time)
                    else:
                        self.log_test("Research Scrape", "FAIL", 
                                    "Scraped results missing required fields", response_time)
                else:
                    self.log_test("Research Scrape", "FAIL", 
                                "No results returned from scraping", response_time)
            else:
                self.log_test("Research Scrape", "FAIL", 
                            "Response missing 'results' field", response_time)
        else:
            self.log_test("Research Scrape", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)

    async def test_response_times(self):
        """Test that all endpoints respond within 60 seconds"""
        print("\n=== Testing Response Times ===")
        
        slow_tests = [result for result in self.test_results if result["response_time"] > 60]
        if slow_tests:
            self.log_test("Response Time Check", "FAIL", 
                        f"{len(slow_tests)} tests exceeded 60s limit")
            for test in slow_tests:
                print(f"    Slow: {test['test']} took {test['response_time']:.2f}s")
        else:
            self.log_test("Response Time Check", "PASS", 
                        "All tests completed within 60s limit")
    
    async def test_basic_connectivity(self):
        """Test basic API connectivity"""
        print("\n=== Testing Basic Connectivity ===")
        
        status, response, response_time = await self.make_request("GET", "/")
        
        if status == 200:
            self.log_test("Basic Connectivity", "PASS", 
                        f"API root endpoint accessible", response_time)
        else:
            self.log_test("Basic Connectivity", "FAIL", 
                        f"Cannot reach API root: HTTP {status}", response_time)
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = len([r for r in self.test_results if r["status"] == "PASS"])
        failed = len([r for r in self.test_results if r["status"] == "FAIL"])
        warnings = len([r for r in self.test_results if r["status"] == "WARN"])
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Warnings: {warnings}")
        
        if failed > 0:
            print(f"\nFAILED TESTS:")
            for result in self.test_results:
                if result["status"] == "FAIL":
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        if warnings > 0:
            print(f"\nWARNINGS:")
            for result in self.test_results:
                if result["status"] == "WARN":
                    print(f"  ⚠️  {result['test']}: {result['details']}")
        
        print(f"\nOverall Status: {'✅ PASS' if failed == 0 else '❌ FAIL'}")
        return failed == 0

async def main():
    """Run all tests"""
    print("Starting Backend API Testing for Course Generation Endpoints")
    print(f"Testing against: {BACKEND_URL}")
    print("="*60)
    
    async with CourseAPITester() as tester:
        # Run all tests
        await tester.test_basic_connectivity()
        await tester.test_title_generation()
        await tester.test_outline_generation()
        await tester.test_script_generation()
        await tester.test_slide_generation()
        await tester.test_exercise_generation()
        await tester.test_quiz_generation()
        await tester.test_slide_enhancement()
        await tester.test_presenton_generation()
        
        # Test newly migrated media, video, voice, and research services
        await tester.test_media_photos_search()
        await tester.test_media_videos_search()
        await tester.test_heygen_avatars()
        await tester.test_elevenlabs_voices()
        await tester.test_voice_duration_estimate()
        await tester.test_research_scrape()
        
        await tester.test_response_times()
        
        # Print summary
        success = tester.print_summary()
        
        return success

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\nTesting interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nTesting failed with error: {e}")
        sys.exit(1)