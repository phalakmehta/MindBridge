"""Mood tracking API routes."""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from groq import Groq
from app.database import get_db
from app.models import User, MoodEntry
from app.schemas import MoodLogRequest, MoodEntryResponse, MoodInsightResponse
from app.auth.dependencies import get_current_user
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/mood", tags=["mood"])


@router.post("/log", response_model=MoodEntryResponse, status_code=201)
async def log_mood(
    body: MoodLogRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a mood entry (score 1-5 with optional note)."""
    entry = MoodEntry(
        user_id=current_user.id,
        score=body.score,
        note=body.note,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return MoodEntryResponse.model_validate(entry)


@router.get("/history", response_model=list[MoodEntryResponse])
async def mood_history(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get mood history for the specified number of days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.user_id == current_user.id, MoodEntry.created_at >= since)
        .order_by(MoodEntry.created_at.asc())
    )
    entries = result.scalars().all()
    return [MoodEntryResponse.model_validate(e) for e in entries]


@router.get("/insights", response_model=MoodInsightResponse)
async def mood_insights(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-generated mood insights based on recent entries."""
    # Get all mood entries
    result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.user_id == current_user.id)
        .order_by(MoodEntry.created_at.asc())
    )
    entries = result.scalars().all()

    if len(entries) < 3:
        return MoodInsightResponse(
            insight="I need a few more mood entries to see patterns. Keep logging daily, and I'll share insights once I have more data.",
            average_mood=sum(e.score for e in entries) / max(len(entries), 1),
            total_entries=len(entries),
            trend="stable",
        )

    # Calculate stats
    scores = [e.score for e in entries]
    average_mood = sum(scores) / len(scores)

    # Determine trend from recent vs older entries
    midpoint = len(scores) // 2
    older_avg = sum(scores[:midpoint]) / max(midpoint, 1)
    recent_avg = sum(scores[midpoint:]) / max(len(scores) - midpoint, 1)

    if recent_avg - older_avg > 0.3:
        trend = "improving"
    elif older_avg - recent_avg > 0.3:
        trend = "declining"
    else:
        trend = "stable"

    # Generate AI insight
    mood_data = "\n".join(
        f"- {e.created_at.strftime('%Y-%m-%d')}: Score {e.score}/5"
        + (f" — Note: {e.note}" if e.note else "")
        for e in entries[-20:]  # Last 20 entries
    )

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        completion = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a warm, supportive mood analysis companion. "
                        "Based on the mood data, provide a brief, encouraging 2-3 sentence insight. "
                        "Notice patterns, validate feelings, and offer a gentle observation. "
                        "Don't be clinical. Be warm and human."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Here are my recent mood entries:\n{mood_data}\n\nAverage: {average_mood:.1f}/5, Trend: {trend}",
                },
            ],
            temperature=0.7,
            max_tokens=200,
        )
        insight = completion.choices[0].message.content.strip()
    except Exception:
        insight = f"Your average mood over {len(entries)} entries is {average_mood:.1f}/5 with a {trend} trend."

    return MoodInsightResponse(
        insight=insight,
        average_mood=round(average_mood, 2),
        total_entries=len(entries),
        trend=trend,
    )
