"""
Book scraper – scrapes books.toscrape.com using requests + BeautifulSoup.
Also supports Selenium-based scraping for JS-heavy sites.
"""
import logging
import re
import time
from typing import List, Dict, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}

RATING_MAP = {
    "One": 1.0,
    "Two": 2.0,
    "Three": 3.0,
    "Four": 4.0,
    "Five": 5.0,
}


def _get_soup(url: str) -> Optional[BeautifulSoup]:
    """Fetch a URL and return a BeautifulSoup object, or None on failure."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")
    except Exception as exc:
        logger.warning("Failed to fetch %s: %s", url, exc)
        return None


def _parse_book_detail(detail_url: str) -> Dict:
    """
    Visit an individual book page and extract full details.
    Returns a dict with description, genre, cover_image_url, num_reviews.
    """
    soup = _get_soup(detail_url)
    if soup is None:
        return {}

    data: Dict = {}

    # Description – sits right after the <div id="product_description"> heading
    desc_tag = soup.find("div", id="product_description")
    if desc_tag and desc_tag.find_next_sibling("p"):
        data["description"] = desc_tag.find_next_sibling("p").get_text(strip=True)

    # Genre – second breadcrumb item (Home > Category > Book)
    breadcrumbs = soup.select("ul.breadcrumb li")
    if len(breadcrumbs) >= 3:
        data["genre"] = breadcrumbs[-2].get_text(strip=True)

    # Cover image
    img_tag = soup.find("div", class_="item active")
    if img_tag:
        img = img_tag.find("img")
        if img:
            src = img.get("src", "")
            data["cover_image_url"] = urljoin(detail_url, src)

    # Number of reviews from the product information table
    table = soup.find("table", class_="table-striped")
    if table:
        for row in table.find_all("tr"):
            th = row.find("th")
            td = row.find("td")
            if th and td:
                header = th.get_text(strip=True).lower()
                if "reviews" in header:
                    try:
                        data["num_reviews"] = int(td.get_text(strip=True))
                    except ValueError:
                        pass

    return data


def scrape_books(base_url: str = "https://books.toscrape.com", max_pages: int = 3) -> List[Dict]:
    """
    Scrape books from books.toscrape.com.

    Args:
        base_url: Root URL of the catalogue.
        max_pages: How many listing pages to crawl.

    Returns:
        List of book dicts ready to be stored.
    """
    books: List[Dict] = []
    current_url = base_url

    for page_num in range(1, max_pages + 1):
        logger.info("Scraping listing page %d: %s", page_num, current_url)
        soup = _get_soup(current_url)
        if soup is None:
            break

        articles = soup.select("article.product_pod")
        logger.info("Found %d books on page %d", len(articles), page_num)

        for article in articles:
            try:
                title_tag = article.find("h3").find("a")
                title = title_tag.get("title", title_tag.get_text(strip=True))

                relative_href = title_tag["href"]
                # Listing hrefs are like "catalogue/book-title_123/index.html"
                if relative_href.startswith("catalogue/"):
                    detail_url = urljoin(base_url + "/", relative_href)
                else:
                    detail_url = urljoin(current_url, relative_href)

                # Rating class name encodes the word-form rating
                rating_class = article.find("p", class_="star-rating")
                rating_word = rating_class["class"][1] if rating_class else "One"
                rating = RATING_MAP.get(rating_word, 0.0)

                price_tag = article.find("p", class_="price_color")
                price = price_tag.get_text(strip=True) if price_tag else None

                avail_tag = article.find("p", class_="instock")
                availability = avail_tag.get_text(strip=True) if avail_tag else "Unknown"

                # ── Detailed page data ──────────────────────────────
                time.sleep(0.3)   # polite crawl delay
                detail_data = _parse_book_detail(detail_url)

                book = {
                    "title": title,
                    "author": "Unknown",    # books.toscrape doesn't expose authors on listing
                    "rating": rating,
                    "num_reviews": detail_data.get("num_reviews", 0),
                    "description": detail_data.get("description"),
                    "book_url": detail_url,
                    "cover_image_url": detail_data.get("cover_image_url"),
                    "genre": detail_data.get("genre"),
                    "price": price,
                    "availability": availability,
                }
                books.append(book)

            except Exception as exc:
                logger.warning("Error parsing book article: %s", exc)
                continue

        next_btn = soup.find("li", class_="next")
        if not next_btn:
            logger.info("No next page found – stopping after page %d", page_num)
            break
        next_href = next_btn.find("a")["href"]
        if page_num == 1:
            current_url = urljoin(base_url + "/", next_href)
        else:
            current_url = urljoin(current_url, next_href)

    logger.info("Scraping complete. Total books collected: %d", len(books))
    return books

# Selenium-based scraper (used when JS rendering is required)

def scrape_books_selenium(base_url: str, max_pages: int = 2) -> List[Dict]:
    """
    Selenium-based fallback for JavaScript-heavy sites.
    Falls back gracefully if Selenium/Chrome is not installed.
    """
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from webdriver_manager.chrome import ChromeDriverManager
    except ImportError:
        logger.warning("Selenium not available – falling back to requests scraper")
        return scrape_books(base_url, max_pages)

    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument(f"user-agent={HEADERS['User-Agent']}")

    books: List[Dict] = []
    driver = None

    try:
        driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options,
        )
        driver.get(base_url)
        wait = WebDriverWait(driver, 10)

        for page_num in range(1, max_pages + 1):
            logger.info("Selenium scraping page %d", page_num)
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "article.product_pod")))

            soup = BeautifulSoup(driver.page_source, "lxml")
            # Re-use the same parsing logic
            for article in soup.select("article.product_pod"):
                try:
                    title_tag = article.find("h3").find("a")
                    title = title_tag.get("title", title_tag.get_text(strip=True))
                    relative_href = title_tag["href"]
                    detail_url = urljoin(base_url + "/", relative_href.lstrip("../"))

                    rating_class = article.find("p", class_="star-rating")
                    rating_word = rating_class["class"][1] if rating_class else "One"
                    rating = RATING_MAP.get(rating_word, 0.0)

                    price_tag = article.find("p", class_="price_color")
                    price = price_tag.get_text(strip=True) if price_tag else None

                    books.append({
                        "title": title,
                        "author": "Unknown",
                        "rating": rating,
                        "num_reviews": 0,
                        "description": None,
                        "book_url": detail_url,
                        "cover_image_url": None,
                        "genre": None,
                        "price": price,
                        "availability": "In Stock",
                    })
                except Exception as exc:
                    logger.warning("Selenium parse error: %s", exc)

            # Navigate to next page
            try:
                next_btn = driver.find_element(By.CSS_SELECTOR, "li.next a")
                next_btn.click()
                time.sleep(1)
            except Exception:
                break

    except Exception as exc:
        logger.error("Selenium scraping failed: %s", exc)
    finally:
        if driver:
            driver.quit()

    return books
