"""Tests for synthetic data generation."""
from src.capabilities.synthetic_data_actions import SimpleDataGenerator


class TestSimpleDataGenerator:
    def setup_method(self):
        self.generator = SimpleDataGenerator()

    def test_generate_strings(self):
        data = self.generator.generate_strings(count=3)
        assert len(data) > 0
        assert "" in data
        assert None in data

    def test_generate_numbers(self):
        data = self.generator.generate_numbers(count=3)
        assert len(data) > 0
        assert 0 in data
        assert -1 in data
        assert None in data

    def test_generate_json(self):
        data = self.generator.generate_json(count=3)
        assert len(data) > 0
        assert {} in data
        assert {"key": None} in data

    def test_generate_dates(self):
        data = self.generator.generate_dates(count=3)
        assert len(data) > 0
        assert "1970-01-01T00:00:00Z" in data

    def test_generate_emails(self):
        data = self.generator.generate_emails(count=3)
        assert len(data) > 0
        assert "" in data
        assert "valid@example.com" in data

    def test_generate_all(self):
        data = self.generator.generate_all()
        assert "strings" in data
        assert "numbers" in data
        assert "json" in data
        assert "dates" in data
        assert "emails" in data
