"""Short-term and long-term memory manager."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from groq import Groq
from app.models import Message, UserMemory, ChatSession
from app.config import get_settings
from app.chat.prompts import SUMMARY_PROMPT

settings = get_settings()


async def get_short_term_memory(
    db: AsyncSession, session_id: str, limit: int | None = None
) -> list[dict]:
    """
    Retrieve the last N messages from the current session.
    Returns list of {'role': ..., 'content': ...} for LLM context.
    """
    if limit is None:
        limit = settings.SHORT_TERM_MEMORY_SIZE

    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()

    # Reverse to get chronological order
    return [
        {"role": msg.role, "content": msg.content}
        for msg in reversed(messages)
    ]


async def get_long_term_memory(db: AsyncSession, user_id: str) -> str:
    """
    Retrieve all long-term memory entries for a user.
    Returns a formatted string summary.
    """
    result = await db.execute(
        select(UserMemory)
        .where(UserMemory.user_id == user_id)
        .order_by(UserMemory.updated_at.desc())
    )
    memories = result.scalars().all()

    if not memories:
        return ""

    parts = []
    for mem in memories:
        parts.append(f"- {mem.key}: {mem.value}")

    return "\n".join(parts)


async def get_session_message_count(db: AsyncSession, session_id: str) -> int:
    """Get the number of messages in a session."""
    result = await db.execute(
        select(func.count(Message.id)).where(Message.session_id == session_id)
    )
    return result.scalar() or 0


async def should_update_long_term_memory(db: AsyncSession, session_id: str) -> bool:
    """Check if we should run a long-term memory update (every N messages)."""
    count = await get_session_message_count(db, session_id)
    return count > 0 and count % settings.LONG_TERM_SUMMARY_INTERVAL == 0


async def update_long_term_memory(
    db: AsyncSession, user_id: str, session_id: str
):
    """
    Summarize recent conversation and update long-term memory.
    Uses Groq LLM to generate the summary.
    """
    # Get recent messages
    messages = await get_short_term_memory(db, session_id, limit=10)
    if len(messages) < 3:
        return

    # Format conversation for summarization
    conversation = "\n".join(
        f"{msg['role'].capitalize()}: {msg['content']}" for msg in messages
    )

    # Call Groq for summarization
    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        completion = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "user", "content": SUMMARY_PROMPT.format(conversation=conversation)}
            ],
            temperature=0.3,
            max_tokens=300,
        )
        summary = completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating memory summary: {e}")
        return

    # Upsert the memory entry for this session
    key = f"session_summary_{session_id[:8]}"
    result = await db.execute(
        select(UserMemory).where(
            UserMemory.user_id == user_id,
            UserMemory.key == key,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.value = summary
    else:
        memory = UserMemory(user_id=user_id, key=key, value=summary)
        db.add(memory)

    await db.flush()
