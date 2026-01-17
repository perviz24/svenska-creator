"""
Canva Connect API Integration Service

Provides integration with Canva's Connect APIs for:
- OAuth 2.0 authentication with PKCE
- Creating designs/presentations
- Autofilling templates with structured data
- Exporting designs
- Fetching brand templates

Documentation: https://www.canva.dev/docs/connect/
"""

import os
import httpx
import hashlib
import secrets
import base64
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime, timedelta


# =================================================================
# Configuration
# =================================================================

CANVA_BASE_URL = "https://api.canva.com/rest/v1"
CANVA_AUTH_URL = "https://www.canva.com/api/oauth/authorize"
CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token"

# Get from environment variables
CANVA_CLIENT_ID = os.getenv("CANVA_CLIENT_ID", "")
CANVA_CLIENT_SECRET = os.getenv("CANVA_CLIENT_SECRET", "")
CANVA_REDIRECT_URI = os.getenv("CANVA_REDIRECT_URI", "http://localhost:8000/api/canva/callback")


# =================================================================
# Models
# =================================================================

class CanvaTokens(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "Bearer"
    expires_at: Optional[datetime] = None


class CanvaDesign(BaseModel):
    id: str
    edit_url: str
    view_url: str
    title: Optional[str] = None


class CanvaTemplate(BaseModel):
    id: str
    name: str
    thumbnail_url: Optional[str] = None
    brand_id: Optional[str] = None


class SlideData(BaseModel):
    title: str
    body: Optional[str] = None
    bullet_points: Optional[List[str]] = None
    image_url: Optional[str] = None
    background_color: Optional[str] = None


class AutofillRequest(BaseModel):
    template_id: str
    title: str
    slides: List[SlideData]


# =================================================================
# PKCE Helper Functions
# =================================================================

def generate_code_verifier() -> str:
    """Generate a code verifier for PKCE (43-128 characters)"""
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')


def generate_code_challenge(verifier: str) -> str:
    """Generate a code challenge from verifier using SHA-256"""
    digest = hashlib.sha256(verifier.encode('utf-8')).digest()
    return base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')


def generate_state() -> str:
    """Generate a random state parameter for OAuth"""
    return secrets.token_urlsafe(32)


# =================================================================
# Canva Service
# =================================================================

class CanvaService:
    """Service for interacting with Canva Connect APIs"""

    def __init__(self):
        self.client_id = CANVA_CLIENT_ID
        self.client_secret = CANVA_CLIENT_SECRET
        self.redirect_uri = CANVA_REDIRECT_URI
        self.base_url = CANVA_BASE_URL

    # =========================================
    # OAuth 2.0 Flow
    # =========================================

    def get_authorization_url(
        self,
        state: Optional[str] = None,
        code_verifier: Optional[str] = None
    ) -> tuple[str, str, str]:
        """
        Generate OAuth authorization URL with PKCE

        Returns:
            (auth_url, state, code_verifier)
        """
        if not state:
            state = generate_state()

        if not code_verifier:
            code_verifier = generate_code_verifier()

        code_challenge = generate_code_challenge(code_verifier)

        # Required scopes for our integration
        scopes = [
            "design:content:write",       # Create and edit designs
            "design:content:read",        # Read design content
            "asset:write",                # Upload assets
            "asset:read",                 # Read assets
            "brandtemplate:content:read", # Read brand template content
            "folder:read"                 # Read folders
        ]

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256"
        }

        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        auth_url = f"{CANVA_AUTH_URL}?{query_string}"

        return auth_url, state, code_verifier

    async def exchange_code_for_tokens(
        self,
        authorization_code: str,
        code_verifier: str
    ) -> CanvaTokens:
        """
        Exchange authorization code for access and refresh tokens

        Args:
            authorization_code: Code received from OAuth callback
            code_verifier: PKCE code verifier used in authorization

        Returns:
            CanvaTokens with access_token, refresh_token, and expiry
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                CANVA_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": authorization_code,
                    "redirect_uri": self.redirect_uri,
                    "code_verifier": code_verifier,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            if not response.is_success:
                raise ValueError(f"Token exchange failed: {response.status_code} - {response.text}")

            data = response.json()
            tokens = CanvaTokens(**data)

            # Calculate expiration time
            tokens.expires_at = datetime.now() + timedelta(seconds=tokens.expires_in)

            return tokens

    async def refresh_access_token(self, refresh_token: str) -> CanvaTokens:
        """
        Refresh an expired access token

        Args:
            refresh_token: The refresh token from previous authentication

        Returns:
            CanvaTokens with new access_token and refresh_token
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                CANVA_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            if not response.is_success:
                raise ValueError(f"Token refresh failed: {response.status_code} - {response.text}")

            data = response.json()
            tokens = CanvaTokens(**data)
            tokens.expires_at = datetime.now() + timedelta(seconds=tokens.expires_in)

            return tokens

    # =========================================
    # Design Creation
    # =========================================

    async def create_design(
        self,
        access_token: str,
        title: str,
        design_type: str = "Presentation",
        template_id: Optional[str] = None
    ) -> CanvaDesign:
        """
        Create a new Canva design

        Args:
            access_token: Valid OAuth access token
            title: Title for the design
            design_type: Type of design (Presentation, Document, etc.)
            template_id: Optional brand template ID to use

        Returns:
            CanvaDesign with id, edit_url, and view_url
        """
        async with httpx.AsyncClient() as client:
            payload = {
                "design_type": design_type,
                "title": title
            }

            if template_id:
                payload["asset_id"] = template_id

            response = await client.post(
                f"{self.base_url}/designs",
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )

            if not response.is_success:
                raise ValueError(f"Create design failed: {response.status_code} - {response.text}")

            data = response.json()
            design_data = data.get("design", {})

            return CanvaDesign(
                id=design_data["id"],
                edit_url=design_data["urls"]["edit_url"],
                view_url=design_data["urls"]["view_url"],
                title=title
            )

    # =========================================
    # Autofill API (Key Feature!)
    # =========================================

    async def autofill_template(
        self,
        access_token: str,
        template_id: str,
        title: str,
        slides: List[SlideData]
    ) -> CanvaDesign:
        """
        Create a design by autofilling a template with structured data

        This is the key API for our use case - populates a Canva template
        with our generated slides data.

        Args:
            access_token: Valid OAuth access token
            template_id: Brand template ID to autofill
            title: Title for the created design
            slides: List of slide data to populate

        Returns:
            CanvaDesign ready for editing in Canva
        """
        # Transform slides to Canva autofill format
        autofill_data = {
            "type": "presentation",  # Required: data schema type
            "title": title,
            "slides": []
        }

        for i, slide in enumerate(slides):
            slide_data = {"title": slide.title}

            if slide.bullet_points:
                # Use bullet points if available
                slide_data["body"] = "\n".join([f"• {point}" for point in slide.bullet_points])
            elif slide.body:
                slide_data["body"] = slide.body

            if slide.image_url:
                slide_data["image"] = {"url": slide.image_url}

            if slide.background_color:
                slide_data["background_color"] = slide.background_color

            autofill_data["slides"].append(slide_data)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/autofills",
                json={
                    "brand_template_id": template_id,
                    "title": title,
                    "data": autofill_data
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )

            if not response.is_success:
                raise ValueError(f"Autofill failed: {response.status_code} - {response.text}")

            data = response.json()

            # Autofill is async, may need to poll for completion
            # For now, return the design info immediately
            design_data = data.get("design", {})

            return CanvaDesign(
                id=design_data["id"],
                edit_url=design_data["urls"]["edit_url"],
                view_url=design_data["urls"]["view_url"],
                title=title
            )

    # =========================================
    # Brand Templates
    # =========================================

    async def get_brand_templates(
        self,
        access_token: str,
        limit: int = 20
    ) -> List[CanvaTemplate]:
        """
        Fetch user's brand templates

        Args:
            access_token: Valid OAuth access token
            limit: Maximum number of templates to return (default: 20)

        Returns:
            List of CanvaTemplate objects
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/brand-templates",
                params={"limit": limit},
                headers={
                    "Authorization": f"Bearer {access_token}"
                }
            )

            if not response.is_success:
                raise ValueError(f"Fetch templates failed: {response.status_code} - {response.text}")

            data = response.json()
            templates = []

            for item in data.get("items", []):
                templates.append(CanvaTemplate(
                    id=item["id"],
                    name=item.get("name", "Untitled Template"),
                    thumbnail_url=item.get("thumbnail", {}).get("url"),
                    brand_id=item.get("brand_id")
                ))

            return templates

    # =========================================
    # Export
    # =========================================

    async def export_design(
        self,
        access_token: str,
        design_id: str,
        format_type: str = "pptx"
    ) -> str:
        """
        Export a Canva design to PPTX, PDF, etc.

        Note: Export is asynchronous. This returns a job ID.
        You'll need to poll the job status to get the download URL.

        Args:
            access_token: Valid OAuth access token
            design_id: Canva design ID to export
            format_type: Export format (pptx, pdf, png, jpg)

        Returns:
            Job ID for polling export status
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/exports",
                json={
                    "design_id": design_id,
                    "format": {"type": format_type}
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )

            if not response.is_success:
                raise ValueError(f"Export failed: {response.status_code} - {response.text}")

            data = response.json()
            return data.get("job", {}).get("id")

    async def get_export_status(
        self,
        access_token: str,
        job_id: str
    ) -> Dict[str, Any]:
        """
        Check the status of an export job

        Args:
            access_token: Valid OAuth access token
            job_id: Export job ID from export_design()

        Returns:
            Job status dict with 'status' and optional 'url' for download
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/exports/{job_id}",
                headers={
                    "Authorization": f"Bearer {access_token}"
                }
            )

            if not response.is_success:
                raise ValueError(f"Get export status failed: {response.status_code} - {response.text}")

            return response.json().get("job", {})


# =================================================================
# Singleton Instance
# =================================================================

canva_service = CanvaService()
