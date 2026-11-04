import re
import threading
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException

from app.security import require_page_access

router = APIRouter(tags=["fine-rates"])

SOURCE_URL = "https://www.htp.gov.in/road_rules.html"
REFRESH_INTERVAL = timedelta(hours=6)

OFFENCES = {
    "nohelmet": {
        "name": "No Helmet",
        "aliases": ("nohelmet", "helmetviolation", "withouthelmet",
                    "notwearinghelmet"),
    },
    "tripleriding": {
        "name": "Triple Riding",
        "aliases": ("tripleriding", "triplepersonriding",
                    "morethantwopersons"),
    },
    "signaljumping": {
        "name": "Signal Jumping",
        "aliases": ("signaljumping", "redlightjumping",
                    "violationsignaljumping"),
    },
}

_cache = None
_cache_lock = threading.Lock()


def _normalise(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


class _TableParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == "tr":
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        elif tag == "tr" and self.row is not None:
            if self.row:
                self.rows.append(self.row)
            self.row = None
            self.cell = None


def _fetch_rates():
    request = Request(
        SOURCE_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; TrafficFineSummary/1.0)"},
    )
    with urlopen(request, timeout=15) as response:
        if response.status != 200:
            raise ValueError(f"Official page returned HTTP {response.status}")
        html = response.read().decode("utf-8", errors="replace")

    parser = _TableParser()
    parser.feed(html)

    rates = {}
    for row in parser.rows:
        if len(row) < 3:
            continue

        offence_text = _normalise(row[0])
        section = row[1].strip()
        penalty_text = row[2]

        key = None
        for candidate, details in OFFENCES.items():
            if any(alias in offence_text for alias in details["aliases"]):
                key = candidate
                break

        # Match the official wording, including "Regarding wearing of helmet".
        if key is None and "helmet" in offence_text and "wearing" in offence_text:
            key = "nohelmet"
        if key is None and "triple" in offence_text and "riding" in offence_text:
            key = "tripleriding"
        if key is None and "signal" in offence_text and "jump" in offence_text:
            key = "signaljumping"

        if key is None:
            continue

        amount_match = re.search(
            r"(?:rs\.?|₹)\s*([\d,]+)", penalty_text, flags=re.IGNORECASE
        )
        if not amount_match:
            continue

        rates[key] = {
            "key": key,
            "name": OFFENCES[key]["name"],
            "section": section,
            "amount": int(amount_match.group(1).replace(",", "")),
        }

    missing = set(OFFENCES) - set(rates)
    if missing:
        raise ValueError(
            "Could not parse all expected offence rates from the official page: "
            + ", ".join(sorted(missing))
        )

    return rates


def _get_rates():
    global _cache

    with _cache_lock:
        now = datetime.now(timezone.utc)
        cache_is_fresh = (
            _cache is not None
            and now - _cache["fetched_at"] < REFRESH_INTERVAL
        )

        if cache_is_fresh:
            return _cache

        try:
            rates = _fetch_rates()
            _cache = {
                "rates": rates,
                "fetched_at": datetime.now(timezone.utc),
                "stale": False,
                "refresh_error": None,
            }
        except Exception as exc:
            if _cache is None:
                raise HTTPException(
                    status_code=503,
                    detail=f"Fine rates are not yet available; official source refresh failed: {exc}",
                ) from exc

            # Keep the last successful values rather than inventing new rates.
            _cache = {
                **_cache,
                "stale": True,
                "refresh_error": str(exc),
            }

        return _cache


@router.get("/fine-rates")
def get_fine_rates(
    _auth=Depends(require_page_access("violations")),
):
    cached = _get_rates()
    return {
        "source_url": SOURCE_URL,
        "fetched_at": cached["fetched_at"].isoformat(),
        "stale": cached["stale"],
        "refresh_error": cached["refresh_error"],
        "rates": list(cached["rates"].values()),
    }
