#!/usr/bin/env python3
"""
Focused Slide Generation Testing for Enhanced Features
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

class SlideAPITester:
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
    
    async def test_enhanced_slide_generation(self):
        """Test enhanced slide generation with specific test cases"""
        print("\n=== Testing Enhanced Slide Generation ===")
        
        # Test Case 1: Basic Generation Test (Swedish)
        print("\n--- Test Case 1: Swedish Professional Style ---")
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
            self.analyze_enhanced_response(response, response_time, "Swedish Professional", 5, "standard")
        else:
            self.log_test("Enhanced Slides - Swedish Test", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test Case 2: Concise Style Test (TED-talk)
        print("\n--- Test Case 2: English Concise TED-talk Style ---")
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
            self.analyze_enhanced_response(response, response_time, "English Concise", 4, "concise")
        else:
            self.log_test("Enhanced Slides - Concise Test", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
        
        # Test Case 3: Text-Heavy Educational Test
        print("\n--- Test Case 3: Swedish Text-Heavy Educational ---")
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
            self.analyze_enhanced_response(response, response_time, "Swedish Text-Heavy", 6, "text-heavy")
        else:
            self.log_test("Enhanced Slides - Text-Heavy Test", "FAIL", 
                        f"HTTP {status}: {response.get('detail', response)}", response_time)
    
    def analyze_enhanced_response(self, response: Dict, response_time: float, test_name: str, expected_slides: int, verbosity: str):
        """Analyze enhanced slide generation response"""
        
        # Check basic structure
        required_fields = ["presentation_title", "slides", "slide_count", "source"]
        if not all(key in response for key in required_fields):
            missing_fields = [f for f in required_fields if f not in response]
            self.log_test(f"{test_name} - Basic Structure", "FAIL", 
                        f"Missing fields: {missing_fields}", response_time)
            return
        
        slides = response.get("slides", [])
        if len(slides) != expected_slides:
            self.log_test(f"{test_name} - Slide Count", "FAIL", 
                        f"Expected {expected_slides} slides, got {len(slides)}", response_time)
            return
        
        # Check source field
        if response.get("source") == "internal-ai-enhanced":
            self.log_test(f"{test_name} - Enhanced Source", "PASS", 
                        "Source correctly shows 'internal-ai-enhanced'", response_time)
        else:
            self.log_test(f"{test_name} - Enhanced Source", "FAIL", 
                        f"Expected 'internal-ai-enhanced', got '{response.get('source')}'", response_time)
        
        # Analyze enhanced features
        layout_variety = []
        has_key_takeaways = True
        has_action_verbs = True
        has_specific_images = True
        speaker_notes_valid = True
        title_length_valid = True
        consecutive_layout_issues = []
        
        for i, slide in enumerate(slides):
            # Check enhanced fields
            enhanced_fields = ["slide_number", "title", "content", "speaker_notes", "layout", "suggested_image_query", "key_takeaway"]
            if not all(key in slide for key in enhanced_fields):
                self.log_test(f"{test_name} - Enhanced Fields", "FAIL", 
                            f"Slide {i+1} missing enhanced fields", response_time)
                return
            
            # Check layout variety
            layout = slide.get("layout")
            layout_variety.append(layout)
            if i > 0 and layout == layout_variety[i-1]:
                consecutive_layout_issues.append(f"Slides {i} and {i+1}: {layout}")
            
            # Check key takeaways
            if not slide.get("key_takeaway"):
                has_key_takeaways = False
            
            # Check title length (max 8 words for professional Swedish)
            title = slide.get("title", "")
            title_words = len(title.split())
            if verbosity == "concise" and title_words > 6:
                title_length_valid = False
            elif verbosity == "standard" and title_words > 8:
                title_length_valid = False
            elif verbosity == "text-heavy" and title_words > 10:
                title_length_valid = False
            
            # Check bullet points for action verbs (if present)
            bullet_points = slide.get("bullet_points", [])
            if bullet_points:
                action_verbs_sv = ["implementera", "analysera", "skapa", "utveckla", "förbättra", "optimera", "planera", "genomföra"]
                action_verbs_en = ["implement", "analyze", "create", "develop", "improve", "optimize", "plan", "execute"]
                action_verbs = action_verbs_sv + action_verbs_en
                
                for bullet in bullet_points:
                    if not any(bullet.lower().startswith(verb) for verb in action_verbs):
                        has_action_verbs = False
            
            # Check image queries are specific (not generic)
            image_query = slide.get("suggested_image_query", "")
            generic_terms = ["business", "technology", "teamwork", "success", "work", "office"]
            if any(term in image_query.lower() for term in generic_terms):
                has_specific_images = False
            
            # Check speaker notes length based on verbosity
            speaker_notes = slide.get("speaker_notes", "")
            word_count = len(speaker_notes.split())
            
            if verbosity == "concise" and (word_count < 50 or word_count > 100):
                speaker_notes_valid = False
            elif verbosity == "standard" and (word_count < 100 or word_count > 150):
                speaker_notes_valid = False
            elif verbosity == "text-heavy" and (word_count < 150 or word_count > 200):
                speaker_notes_valid = False
        
        # Report results
        self.log_test(f"{test_name} - Basic Structure", "PASS", 
                    f"Generated {len(slides)} slides with enhanced structure", response_time)
        
        if has_key_takeaways:
            self.log_test(f"{test_name} - Key Takeaways", "PASS", 
                        "All slides have key takeaways", response_time)
        else:
            self.log_test(f"{test_name} - Key Takeaways", "FAIL", 
                        "Some slides missing key takeaways", response_time)
        
        if not consecutive_layout_issues:
            unique_layouts = len(set(layout_variety))
            self.log_test(f"{test_name} - Layout Variety", "PASS", 
                        f"No consecutive same layouts, {unique_layouts} different layouts used", response_time)
        else:
            self.log_test(f"{test_name} - Layout Variety", "FAIL", 
                        f"Consecutive same layouts: {', '.join(consecutive_layout_issues)}", response_time)
        
        if has_specific_images:
            self.log_test(f"{test_name} - Specific Images", "PASS", 
                        "Image queries are specific and descriptive", response_time)
        else:
            self.log_test(f"{test_name} - Specific Images", "FAIL", 
                        "Some image queries are too generic", response_time)
        
        if speaker_notes_valid:
            self.log_test(f"{test_name} - Speaker Notes", "PASS", 
                        f"Speaker notes follow {verbosity} verbosity guidelines", response_time)
        else:
            self.log_test(f"{test_name} - Speaker Notes", "WARN", 
                        f"Some speaker notes outside {verbosity} verbosity range", response_time)
        
        if title_length_valid:
            self.log_test(f"{test_name} - Title Length", "PASS", 
                        f"Titles follow {verbosity} length guidelines", response_time)
        else:
            self.log_test(f"{test_name} - Title Length", "WARN", 
                        f"Some titles exceed {verbosity} length guidelines", response_time)
        
        # Print sample slide for verification
        if slides:
            sample_slide = slides[0]
            print(f"\n    Sample Slide from {test_name}:")
            print(f"    Title: {sample_slide.get('title')}")
            print(f"    Layout: {sample_slide.get('layout')}")
            print(f"    Key Takeaway: {sample_slide.get('key_takeaway')}")
            print(f"    Image Query: {sample_slide.get('suggested_image_query')}")
            print(f"    Speaker Notes Words: {len(sample_slide.get('speaker_notes', '').split())}")
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("ENHANCED SLIDE GENERATION TEST SUMMARY")
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
    """Run enhanced slide generation tests"""
    print("Testing Enhanced Internal AI Slide Generator")
    print(f"Testing against: {BACKEND_URL}")
    print("="*60)
    
    async with SlideAPITester() as tester:
        await tester.test_enhanced_slide_generation()
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