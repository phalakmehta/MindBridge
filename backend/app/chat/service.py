"""Core chat service — orchestrates RAG, crisis detection, memory, and LLM."""

from groq import Groq
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.config import get_settings
from app.models import Message, ChatSession, User
from app.schemas import ChatMessageResponse
from app.chat.crisis import detect_crisis
from app.chat.memory import (
    get_short_term_memory,
    get_long_term_memory,
    should_update_long_term_memory,
    update_long_term_memory,
)
from app.chat.prompts import (
    SYSTEM_PROMPT,
    LONG_TERM_MEMORY_PREFIX,
    RAG_CONTEXT_PREFIX,
    SESSION_TITLE_PROMPT,
)
from app.rag.pipeline import retrieve, format_context

settings = get_settings()


async def process_message(
    db: AsyncSession,
    user: User,
    message: str,
    session_id: str | None = None,
) -> ChatMessageResponse:
    """
    Main pipeline:
    1. Crisis check
    2. Get/create session
    3. Save user message
    4. RAG retrieval
    5. Build context (system + long-term memory + short-term + RAG + message)
    6. Call Groq LLM
    7. Save assistant response
    8. Update long-term memory if needed
    9. Return response
    """

    # ── 1. Crisis Detection ──────────────────────────────
    crisis = detect_crisis(message)

    # ── 2. Get or Create Session ─────────────────────────
    if session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user.id,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            session = await _create_session(db, user, message)
    else:
        session = await _create_session(db, user, message)

    # ── 3. Save User Message ─────────────────────────────
    user_msg = Message(
        session_id=session.id,
        role="user",
        content=message,
        metadata_json={"crisis_tier": crisis.tier} if crisis.is_crisis else None,
    )
    db.add(user_msg)
    await db.flush()

    # ── Handle Tier 1 Crisis (immediate) ─────────────────
    if crisis.is_crisis and crisis.tier == 1:
        assistant_msg = Message(
            session_id=session.id,
            role="assistant",
            content=crisis.response_message,
            metadata_json={"crisis_tier": 1, "crisis_response": True},
        )
        db.add(assistant_msg)
        await db.flush()

        return ChatMessageResponse(
            session_id=session.id,
            message_id=assistant_msg.id,
            content=crisis.response_message,
            crisis_detected=True,
            crisis_tier=1,
            emergency_resources=[r for r in crisis.emergency_resources],
        )

    # ── 4. RAG Retrieval ─────────────────────────────────
    rag_chunks = retrieve(message, n_results=4)
    rag_context = format_context(rag_chunks)
    technique_used = rag_chunks[0]["technique"] if rag_chunks else None

    # ── 5. Build LLM Context ────────────────────────────
    # Always include the user's name so the LLM doesn't hallucinate one
    user_context_parts = [
        f"## Patient Information\nThe person you are talking to is named {user.name}. Use their name naturally."
    ]

    # Long-term memory
    long_term = await get_long_term_memory(db, user.id)

    if long_term:
        user_context_parts.append(
            LONG_TERM_MEMORY_PREFIX.format(
                user_name=user.name, memory_summary=long_term
            )
        )

    if rag_context:
        user_context_parts.append(
            RAG_CONTEXT_PREFIX.format(rag_context=rag_context)
        )

    system_content = SYSTEM_PROMPT.format(
        user_context="\n".join(user_context_parts)
    )

    # Short-term memory (conversation context)
    short_term = await get_short_term_memory(db, session.id)

    # Build messages array for Groq
    llm_messages = [{"role": "system", "content": system_content}]
    llm_messages.extend(short_term)

    # Add crisis context if tier 2 or 3
    if crisis.is_crisis and crisis.tier in (2, 3):
        llm_messages.append({
            "role": "system",
            "content": (
                f"IMPORTANT: The user's message has triggered a Tier {crisis.tier} concern. "
                f"{'They appear to be in high distress. Prioritize grounding and calming.' if crisis.tier == 2 else 'They appear to be experiencing moderate emotional distress.'} "
                "Be extra gentle, validate their feelings, and naturally mention that professional support is available if they need it. "
                "Include the helpline information at the end of your response in a caring way."
            ),
        })

    # ── 6. Call Groq LLM ────────────────────────────────
    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        completion = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=llm_messages,
            temperature=0.75,
            max_tokens=800,
            top_p=0.9,
        )
        response_content = completion.choices[0].message.content.strip()
    except Exception as e:
        response_content = (
            f"I'm having a moment of difficulty connecting right now. "
            f"Could you try sharing that with me again? I'm here and I want to listen. "
            f"(Technical note: {str(e)[:100]})"
        )

    # Add emergency resources to Tier 2/3 responses
    if crisis.is_crisis and crisis.tier in (2, 3):
        resource_lines = ["\n\n---\n*If you need immediate support:*"]
        for r in EMERGENCY_RESOURCES_SUBSET:
            resource_lines.append(f"• **{r['name']}**: {r['number']} ({r['details']})")
        response_content += "\n".join(resource_lines)

    # ── 7. Save Assistant Response ───────────────────────
    assistant_msg = Message(
        session_id=session.id,
        role="assistant",
        content=response_content,
        metadata_json={
            "technique_used": technique_used,
            "crisis_tier": crisis.tier if crisis.is_crisis else None,
            "rag_sources": [c["source"] for c in rag_chunks] if rag_chunks else [],
        },
    )
    db.add(assistant_msg)
    await db.flush()

    # ── 8. Update Long-term Memory (async, non-blocking) ─
    if await should_update_long_term_memory(db, session.id):
        await update_long_term_memory(db, user.id, session.id)

    # ── 9. Return Response ───────────────────────────────
    return ChatMessageResponse(
        session_id=session.id,
        message_id=assistant_msg.id,
        content=response_content,
        crisis_detected=crisis.is_crisis,
        crisis_tier=crisis.tier if crisis.is_crisis else None,
        technique_used=technique_used,
        emergency_resources=(
            [r for r in crisis.emergency_resources]
            if crisis.is_crisis and crisis.tier <= 2
            else None
        ),
    )


# Subset for inline mentions in responses
EMERGENCY_RESOURCES_SUBSET = [
    {"name": "Kiran Helpline", "number": "1800-599-0019", "details": "24/7, Free"},
    {"name": "988 Lifeline (US)", "number": "988", "details": "24/7, Free"},
]


async def _create_session(db: AsyncSession, user: User, first_message: str) -> ChatSession:
    """Create a new chat session with an auto-generated title."""
    # Generate title using Groq
    title = "New Conversation"
    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Fast model for title generation
            messages=[
                {"role": "user", "content": SESSION_TITLE_PROMPT.format(message=first_message)}
            ],
            temperature=0.7,
            max_tokens=20,
        )
        title = completion.choices[0].message.content.strip()[:100]
    except Exception:
        pass

    session = ChatSession(user_id=user.id, title=title)
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def get_user_sessions(db: AsyncSession, user_id: str) -> list[dict]:
    """Get all sessions for a user with message counts."""
    result = await db.execute(
        select(
            ChatSession,
            func.count(Message.id).label("message_count"),
        )
        .outerjoin(Message, Message.session_id == ChatSession.id)
        .where(ChatSession.user_id == user_id)
        .group_by(ChatSession.id)
        .order_by(ChatSession.updated_at.desc())
    )

    sessions = []
    for row in result.all():
        session = row[0]
        count = row[1]
        sessions.append({
            "id": session.id,
            "title": session.title,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": count,
        })

    return sessions


async def get_session_messages(
    db: AsyncSession, session_id: str, user_id: str
) -> list[Message]:
    """Get all messages in a session (with ownership check)."""
    # Verify ownership
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        return []

    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
    )
    return result.scalars().all()
