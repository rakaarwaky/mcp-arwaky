import random
import string
from datetime import datetime, timedelta
from typing import Any


class SimpleDataGenerator:
    """Generator for synthetic test data (Capability)."""

    def generate_strings(self, count: int = 5) -> list[str | None]:
        data: list[str | None] = ["", None, "   ", "🔥", "\n\t", "a" * 1000]
        for _ in range(count):
            s = "".join(random.choices(string.ascii_letters + string.digits, k=10))
            data.append(s)
        return data

    def generate_numbers(self, count: int = 5) -> list[int | float | None]:
        data: list[int | float | None] = [
            0,
            -1,
            1,
            -2147483648,  # INT_MIN
            2147483647,  # INT_MAX
            3.14159,
            float("inf"),
            float("-inf"),
            None,
        ]
        for _ in range(count):
            data.append(random.randint(-100, 100))
        return data

    def generate_json(self, count: int = 5) -> list[dict[str, Any]]:
        data: list[dict[str, Any]] = [
            {},
            {"key": None},
            {"nested": {"deep": {"value": 1}}},
            {"array": [1, 2, 3]},
            {"unicode": "日本語テスト"},
        ]
        for i in range(count):
            data.append(
                {
                    "id": i,
                    "name": f"item_{i}",
                    "value": random.random(),
                }
            )
        return data

    def generate_dates(self, count: int = 5) -> list[str]:
        now = datetime.now()
        data: list[str] = [
            "1970-01-01T00:00:00Z",  # Unix epoch
            "2099-12-31T23:59:59Z",  # Far future
            now.isoformat(),
            (now - timedelta(days=365)).isoformat(),
        ]
        for i in range(count):
            delta = timedelta(days=random.randint(-1000, 1000))
            data.append((now + delta).isoformat())
        return data

    def generate_emails(self, count: int = 5) -> list[str]:
        data: list[str] = [
            "",
            "invalid",
            "@nodomain.com",
            "no@tld",
            "valid@example.com",
            "test+tag@gmail.com",
            "very.long.email.address.that.is.valid@subdomain.example.co.uk",
        ]
        domains = ["test.com", "example.org", "mail.io"]
        for i in range(count):
            name = f"user{i}"
            domain = random.choice(domains)
            data.append(f"{name}@{domain}")
        return data

    def generate_all(self) -> dict[str, list[Any]]:
        return {
            "strings": self.generate_strings(),
            "numbers": self.generate_numbers(),
            "json": self.generate_json(),
            "dates": self.generate_dates(),
            "emails": self.generate_emails(),
        }
