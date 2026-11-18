"""Pydantic schemas for application settings endpoints."""
from pydantic import BaseModel
from typing import Optional, Dict, Any


class SettingItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    category: Optional[str] = "general"

    model_config = {"from_attributes": True}


class SettingUpdate(BaseModel):
    value: str


class SettingsMap(BaseModel):
    settings: Dict[str, str]
