"""Crisis detection engine with tiered response system."""

import re
from dataclasses import dataclass


@dataclass
class CrisisResult:
    is_crisis: bool
    tier: int  # 0 = no crisis, 1 = immediate, 2 = high distress, 3 = moderate concern
    matched_patterns: list[str]
    response_message: str
    emergency_resources: list[dict] | None


# ─── Emergency Resources ──────────────────────────────────

EMERGENCY_RESOURCES = [
    {
        "name": "Kiran Mental Health Helpline",
        "number": "1800-599-0019",
        "details": "Government of India, 24/7, Toll-Free",
        "region": "India",
    },
    {
        "name": "National Commission for Women Helpline",
        "number": "7827-170-170",
        "details": "Government of India, Women's Safety",
        "region": "India",
    },
    {
        "name": "CHILDLINE India",
        "number": "1098",
        "details": "Government of India, Child Protection, 24/7",
        "region": "India",
    },
    {
        "name": "988 Suicide and Crisis Lifeline",
        "number": "988",
        "details": "Call or text, 24/7, Free & Confidential",
        "region": "US",
    },
    {
        "name": "Crisis Text Line",
        "number": "Text HOME to 741741",
        "details": "Free, 24/7 text-based support",
        "region": "International",
    },
]


# ─── Crisis Patterns (Weighted) ───────────────────────────

# Tier 1: Immediate danger — suicidal ideation, self-harm, violence
TIER_1_PATTERNS = [
    (r"\b(want|going|plan(?:ning)?|think(?:ing)?(?:\s+about)?)\s+(to\s+)?(kill\s+my\s*self|die|end\s+(?:it|my\s+life)|commit\s+suicide)\b", 10),
    (r"\b(sui?cid(?:e|al)|self[- ]?harm|cut(?:ting)?\s+my\s*self|hurt(?:ing)?\s+my\s*self)\b", 10),
    (r"\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist|wake\s+up)\b", 9),
    (r"\b(better\s+off\s+dead|no\s+reason\s+to\s+live|everyone.*better.*without\s+me)\b", 9),
    (r"\b(end(?:ing)?\s+(?:it\s+all|everything)|take\s+(?:all\s+)?(?:the\s+)?pills)\b", 10),
    (r"\b(kill|murder|hurt|harm)\s+(someone|(?:him|her|them|people))\b", 8),
    (r"\b(being\s+abused|rape[d]?|assault(?:ed)?|domestic\s+violence|(?:he|she|they)\s+(?:hit|beat|chok)(?:s|ed|ing)?\s+me)\b", 9),
]

# Tier 2: High distress — panic, severe anxiety, intense emotional pain
TIER_2_PATTERNS = [
    (r"\b(can'?t\s+(breathe|stop\s+(?:crying|shaking)|take\s+(?:it|this)\s+anymore))\b", 6),
    (r"\b(panic\s+attack|having\s+a\s+panic|feel(?:ing)?\s+like\s+(?:i'?m\s+)?dying)\b", 6),
    (r"\b(completely|totally)\s+(hopeless|helpless|alone|broken|lost)\b", 5),
    (r"\b(out\s+of\s+control|losing\s+(?:my\s+)?mind|going\s+crazy)\b", 5),
    (r"\b(can'?t\s+(?:go\s+on|do\s+this|function|cope|stop\s+the\s+pain))\b", 6),
    (r"\b(unbearable|excruciating)\s+(pain|suffering|agony)\b", 5),
]

# Tier 3: Moderate concern — persistent sadness, hopelessness
TIER_3_PATTERNS = [
    (r"\b(feel(?:ing)?|i(?:'m|'?m)\s+(?:so\s+)?)(worthless|empty|numb|hopeless|trapped)\b", 3),
    (r"\b(no\s+(?:one\s+)?(?:cares|understands)|all\s+alone|nobody\s+loves)\b", 3),
    (r"\b(what'?s\s+the\s+point|nothing\s+matters|nothing\s+(?:ever\s+)?gets\s+better)\b", 4),
    (r"\b(hate\s+my\s*self|i(?:'m|'?m)\s+a\s+(?:burden|failure|waste|mistake))\b", 4),
    (r"\b(can'?t\s+sleep|haven'?t\s+(?:slept|eaten)|not\s+eating)\s+(?:for|in)\s+(?:days|weeks)\b", 3),
]

# ─── Response Messages ────────────────────────────────────

TIER_1_MESSAGE = (
    "I hear you, and I want you to know that what you're feeling right now matters deeply. "
    "I'm an AI companion, and right now, what you need is a real person who can truly be there for you. "
    "Please reach out to one of these helplines — they are trained, compassionate people "
    "available 24/7, and the call is completely free and confidential. "
    "You are not alone in this, even though it might feel that way right now."
)

TIER_2_MESSAGE = (
    "I can hear that you're going through something really intense right now. "
    "Before anything else — let me be here with you for a moment. "
    "If you're open to it, let's try a quick grounding exercise together. "
    "And please know, if things feel too overwhelming, there are people you can talk to "
    "right now who are trained to help. I've shared some resources below."
)

TIER_3_MESSAGE = (
    "What you're sharing sounds really heavy, and I want you to know it takes courage "
    "to put those feelings into words. I'm here to listen and support you. "
    "If you ever feel like you need more support than I can offer, please don't hesitate "
    "to reach out to a professional counsellor. I've included some resources below just in case."
)


def detect_crisis(message: str) -> CrisisResult:
    """
    Analyze a message for crisis indicators.
    Returns a CrisisResult with tier, matched patterns, and response.
    """
    text = message.lower().strip()
    matched = []
    max_score = 0
    tier = 0

    # Check Tier 1 first (most severe)
    for pattern, weight in TIER_1_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            matched.append(pattern)
            if weight > max_score:
                max_score = weight

    if max_score >= 8:
        return CrisisResult(
            is_crisis=True,
            tier=1,
            matched_patterns=matched,
            response_message=TIER_1_MESSAGE,
            emergency_resources=EMERGENCY_RESOURCES,
        )

    # Check Tier 2
    for pattern, weight in TIER_2_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            matched.append(pattern)
            if weight > max_score:
                max_score = weight

    if max_score >= 5:
        return CrisisResult(
            is_crisis=True,
            tier=2,
            matched_patterns=matched,
            response_message=TIER_2_MESSAGE,
            emergency_resources=EMERGENCY_RESOURCES,
        )

    # Check Tier 3
    for pattern, weight in TIER_3_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            matched.append(pattern)
            if weight > max_score:
                max_score = weight

    if max_score >= 3:
        return CrisisResult(
            is_crisis=True,
            tier=3,
            matched_patterns=matched,
            response_message=TIER_3_MESSAGE,
            emergency_resources=EMERGENCY_RESOURCES,
        )

    return CrisisResult(
        is_crisis=False,
        tier=0,
        matched_patterns=[],
        response_message="",
        emergency_resources=None,
    )
