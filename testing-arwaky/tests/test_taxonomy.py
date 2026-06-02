from src.taxonomy import (
    AgenticTestingError,
    InfrastructureError,
    AnalysisError,
    GenerationError,
)






def test_exception_hierarchy():
    assert issubclass(InfrastructureError, AgenticTestingError)
    assert issubclass(AnalysisError, AgenticTestingError)
    assert issubclass(GenerationError, AgenticTestingError)
    assert issubclass(AgenticTestingError, Exception)


def test_raise_errors():
    import pytest

    with pytest.raises(InfrastructureError):
        raise InfrastructureError("Process failed")
    with pytest.raises(AnalysisError):
        raise AnalysisError("Parse failed")
    with pytest.raises(GenerationError):
        raise GenerationError("Bounds exceeded")
