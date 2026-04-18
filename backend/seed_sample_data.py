"""
seed_sample_data.py
────────────────────
Populates the database with 5 sample books (no scraping required).
Useful for testing the Q&A / RAG pipeline without running a full scrape.

Usage:
    cd backend
    python seed_sample_data.py
"""

import sys
import os

# Make sure the app package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.database import create_tables, SessionLocal
from app.models.models import Book, BookInsight
from app.services import vector_store

SAMPLE_BOOKS = [
    {
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "rating": 3.9,
        "num_reviews": 4200,
        "description": (
            "Set in the Jazz Age on Long Island, the novel depicts narrator Nick Carraway's "
            "interactions with mysterious millionaire Jay Gatsby and Gatsby's obsession to reunite "
            "with his former lover, Daisy Buchanan. A story of decadence, idealism, social upheaval, "
            "and excess."
        ),
        "book_url": "https://en.wikipedia.org/wiki/The_Great_Gatsby",
        "cover_image_url": None,
        "genre": "Fiction",
        "price": "£7.99",
        "availability": "In Stock",
    },
    {
        "title": "1984",
        "author": "George Orwell",
        "rating": 4.7,
        "num_reviews": 8900,
        "description": (
            "A dystopian social science fiction novel set in Airstrip One, a province of the superstate "
            "Oceania in a world of perpetual war, omnipresent government surveillance and propaganda. "
            "The story follows Winston Smith and his forbidden love affair while he secretly hates the Party."
        ),
        "book_url": "https://en.wikipedia.org/wiki/Nineteen_Eighty-Four",
        "cover_image_url": None,
        "genre": "Science Fiction",
        "price": "£8.99",
        "availability": "In Stock",
    },
    {
        "title": "To Kill a Mockingbird",
        "author": "Harper Lee",
        "rating": 4.8,
        "num_reviews": 5600,
        "description": (
            "The story of young Scout Finch, her brother Jem, and their father Atticus Finch, "
            "a lawyer who defends a Black man accused of raping a white woman in Depression-era Alabama. "
            "A story of racial injustice and moral growth."
        ),
        "book_url": "https://en.wikipedia.org/wiki/To_Kill_a_Mockingbird",
        "cover_image_url": None,
        "genre": "Fiction",
        "price": "£9.49",
        "availability": "In Stock",
    },
    {
        "title": "Dune",
        "author": "Frank Herbert",
        "rating": 4.6,
        "num_reviews": 6100,
        "description": (
            "Set in the distant future, Dune tells the story of young Paul Atreides whose family "
            "accepts control of the desert planet Arrakis, the only source of the 'spice' melange. "
            "A sweeping tale of politics, religion, ecology, technology, and human emotion."
        ),
        "book_url": "https://en.wikipedia.org/wiki/Dune_(novel)",
        "cover_image_url": None,
        "genre": "Science Fiction",
        "price": "£11.99",
        "availability": "In Stock",
    },
    {
        "title": "The Name of the Wind",
        "author": "Patrick Rothfuss",
        "rating": 4.5,
        "num_reviews": 3400,
        "description": (
            "The story follows Kvothe, a legendary wizard and musician, as he recounts his life story "
            "from his childhood in a troupe of travelling players through his years as a near-starving "
            "student at the University where he learns the art of naming."
        ),
        "book_url": "https://en.wikipedia.org/wiki/The_Name_of_the_Wind",
        "cover_image_url": None,
        "genre": "Fantasy",
        "price": "£10.99",
        "availability": "In Stock",
    },
]

SAMPLE_INSIGHTS = {
    "The Great Gatsby": {
        "summary": (
            "A masterpiece of the Jazz Age, The Great Gatsby explores themes of wealth, love, and the "
            "elusive American Dream through the eyes of Nick Carraway. Fitzgerald's lyrical prose "
            "captures the glittering excess of the 1920s while exposing its hollow core."
        ),
        "genre": "Fiction",
        "sentiment": (
            "The tone is elegiac and melancholic, suffused with longing and disillusionment. "
            "The novel evokes a bittersweet nostalgia, making it ideal for readers who enjoy "
            "reflective, literary fiction."
        ),
    },
    "1984": {
        "summary": (
            "Orwell's chilling vision of a totalitarian future remains as relevant as ever. "
            "Through Winston Smith's desperate search for truth and love, the novel explores the "
            "terrifying power of propaganda, surveillance, and psychological manipulation."
        ),
        "genre": "Science Fiction",
        "sentiment": (
            "Deeply unsettling and oppressive in tone, yet shot through with defiant hope. "
            "The emotional register moves from despair to brief joy to crushing defeat. "
            "Best suited for readers who can handle dark, thought-provoking narratives."
        ),
    },
    "To Kill a Mockingbird": {
        "summary": (
            "Harper Lee's Pulitzer Prize-winning novel is a profound exploration of racial injustice "
            "and moral courage in the American South. Seen through the innocent eyes of young Scout "
            "Finch, it remains one of the most powerful indictments of prejudice ever written."
        ),
        "genre": "Fiction",
        "sentiment": (
            "The tone balances warmth and innocence with deep moral outrage. The coming-of-age "
            "narrative carries an undercurrent of sorrow and injustice, yet ultimately affirms "
            "human decency. Suitable for readers who appreciate emotionally rich literary fiction."
        ),
    },
    "Dune": {
        "summary": (
            "Frank Herbert's epic science fiction saga follows Paul Atreides on the desert planet "
            "Arrakis, the sole source of the universe's most valuable substance. Blending politics, "
            "religion, ecology, and prophecy, Dune is widely regarded as the greatest science "
            "fiction novel ever written."
        ),
        "genre": "Science Fiction",
        "sentiment": (
            "Grand, mythic, and contemplative in tone. The novel builds a sense of vast destiny "
            "and ecological dread, with moments of intense action and political intrigue. "
            "Best suited for readers who enjoy world-building and philosophical depth."
        ),
    },
    "The Name of the Wind": {
        "summary": (
            "Patrick Rothfuss's debut novel follows Kvothe — legendary wizard, musician, and "
            "warrior — as he narrates his extraordinary life story. Celebrated for its beautiful "
            "prose and intricate magic system, it is the first volume of the Kingkiller Chronicle."
        ),
        "genre": "Fantasy",
        "sentiment": (
            "Lyrical, immersive, and bittersweet. The framing narrative carries a melancholy weight "
            "of lost greatness, while the inner story brims with youthful ambition and wonder. "
            "Ideal for readers who love character-driven fantasy with exceptional writing."
        ),
    },
}


def main():
    print("Creating database tables …")
    create_tables()

    db = SessionLocal()
    seeded = 0

    try:
        for data in SAMPLE_BOOKS:
            existing = db.query(Book).filter(Book.book_url == data["book_url"]).first()
            if existing:
                print(f"  SKIP (exists): {data['title']}")
                continue

            book = Book(**data)
            db.add(book)
            db.flush()

            # Add insights if available
            insights = SAMPLE_INSIGHTS.get(data["title"], {})
            for itype, content in insights.items():
                db.add(BookInsight(book_id=book.id, insight_type=itype, content=content))

            db.commit()
            db.refresh(book)

            # Vector index
            text = " ".join(filter(None, [book.title, book.author, book.description]))
            try:
                vector_store.index_book(book.id, book.title, text)
                print(f"  OK (indexed): {book.title}")
            except Exception as e:
                print(f"  WARNING: Vector indexing failed for '{book.title}': {e}")

            seeded += 1

    finally:
        db.close()

    print(f"\nDone! Seeded {seeded} sample books.")
    print("You can now test the RAG pipeline with questions like:")
    print("  - 'What books do you have about dystopian futures?'")
    print("  - 'Which books are rated above 4.5?'")
    print("  - 'Tell me about science fiction books in the collection.'")


if __name__ == "__main__":
    main()