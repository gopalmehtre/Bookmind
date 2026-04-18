"""
AI service – wraps Anthropic Claude, OpenAI, and LM Studio.
Provides:
  - generate_summary()
  - classify_genre()
  - analyze_sentiment()
  - generate_recommendations()
  - answer_question()  (RAG)
"""
import json
import logging
from typing import Optional, List, Dict, Any

from app.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Provider helpers
# ─────────────────────────────────────────────────────────────────────────────

def _call_llm(system_prompt: str, user_prompt: str, max_tokens: int = 800) -> str:
    """
    Route the LLM call to the configured provider.
    Returns the text response or raises RuntimeError.
    """
    provider = settings.AI_PROVIDER.lower()

    if provider == "anthropic":
        return _call_anthropic(system_prompt, user_prompt, max_tokens)
    elif provider == "openai":
        return _call_openai(system_prompt, user_prompt, max_tokens)
    elif provider == "lmstudio":
        return _call_lmstudio(system_prompt, user_prompt, max_tokens)
    elif provider == "gemini":
        return _call_gemini(system_prompt, user_prompt, max_tokens)
    else:
        raise RuntimeError(f"Unknown AI_PROVIDER: {provider}")


def _call_anthropic(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return message.content[0].text


def _call_openai(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return resp.choices[0].message.content


def _call_lmstudio(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    """Use the OpenAI-compatible endpoint exposed by LM Studio."""
    from openai import OpenAI
    client = OpenAI(base_url=settings.LM_STUDIO_URL, api_key="lm-studio")
    resp = client.chat.completions.create(
        model=settings.LM_STUDIO_MODEL,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return resp.choices[0].message.content


def _call_gemini(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    from openai import OpenAI
    client = OpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=settings.GEMINI_API_KEY,
    )
    resp = client.chat.completions.create(
        model="gemini-1.5-flash",
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return resp.choices[0].message.content

def generate_summary(title: str, description: Optional[str], genre: Optional[str]) -> str:
    """Generate a concise book summary."""
    system = (
        "You are a literary expert. Given a book title, genre, and description, "
        "write a compelling 3-4 sentence summary. Be informative and engaging."
    )
    user = (
        f"Title: {title}\n"
        f"Genre: {genre or 'Unknown'}\n"
        f"Description: {description or 'Not available'}\n\n"
        "Write a concise summary of this book."
    )
    return _call_llm(system, user, max_tokens=300)


def classify_genre(title: str, description: Optional[str]) -> str:
    """Predict the genre of a book from its title and description."""
    system = (
        "You are a book genre classifier. Given a title and description, "
        "respond with ONLY the most fitting genre label from this list: "
        "Fiction, Non-Fiction, Mystery, Thriller, Romance, Science Fiction, "
        "Fantasy, Horror, Biography, History, Self-Help, Children, Young Adult, "
        "Poetry, Philosophy, Science, Travel, Cookbooks, Business, Art. "
        "Respond with just the genre name, nothing else."
    )
    user = f"Title: {title}\nDescription: {description or 'Not available'}"
    return _call_llm(system, user, max_tokens=20).strip()


def analyze_sentiment(description: Optional[str], title: str) -> str:
    """Analyse the tone/sentiment of a book description."""
    system = (
        "You are a sentiment analyst specialising in literary works. "
        "Analyse the tone and sentiment of the provided book description. "
        "Comment on: overall tone (positive/negative/neutral/mixed), emotional themes, "
        "and what kind of reader mood the book suits. Keep it to 2-3 sentences."
    )
    user = f"Title: {title}\nDescription: {description or 'Not available'}"
    return _call_llm(system, user, max_tokens=200)


def generate_book_recommendations(
    source_title: str,
    source_genre: Optional[str],
    source_description: Optional[str],
    candidate_books: List[Dict],
) -> List[Dict]:
    """
    Given a source book and a list of candidate books, return top-3 recommendations
    with reasoning. Returns list of {book_id, reason}.
    """
    if not candidate_books:
        return []

    candidates_text = "\n".join(
        f"- ID {b['id']}: '{b['title']}' by {b.get('author','Unknown')} "
        f"[Genre: {b.get('genre','?')}]"
        for b in candidate_books[:30]   # limit context length
    )

    system = (
        "You are a book recommendation engine. "
        "Given a source book and a list of candidates, recommend the top 3 most similar books. "
        "Respond ONLY with valid JSON: "
        '[{"book_id": <int>, "reason": "<one sentence>"}, ...]'
    )
    user = (
        f"Source book: '{source_title}' | Genre: {source_genre or 'Unknown'}\n"
        f"Description: {source_description or 'Not available'}\n\n"
        f"Candidates:\n{candidates_text}\n\n"
        "Return JSON array of top 3 recommendations."
    )

    raw = _call_llm(system, user, max_tokens=400)
    try:
        # Strip markdown fences if present
        clean = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        logger.warning("Failed to parse recommendations JSON: %s", raw)
        return []


def generate_rag_answer(question: str, context_chunks: List[Dict]) -> str:
    """
    Given a user question and a list of retrieved context chunks,
    generate a grounded answer with source citations.

    context_chunks: [{"book_title": str, "content": str, "book_id": int}]
    """
    context_text = "\n\n".join(
        f"[Source: '{c['book_title']}' (ID {c['book_id']})]\n{c['content']}"
        for c in context_chunks
    )

    system = (
        "You are a knowledgeable book assistant. Answer the user's question using ONLY "
        "the provided context passages. Cite sources by mentioning the book title. "
        "If the context does not contain enough information, say so honestly. "
        "Be concise, accurate, and helpful."
    )
    user = (
        f"Context:\n{context_text}\n\n"
        f"Question: {question}\n\n"
        "Answer (cite book titles where relevant):"
    )
    return _call_llm(system, user, max_tokens=600)
