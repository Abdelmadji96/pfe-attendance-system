from __future__ import annotations

import time
from dataclasses import dataclass


@dataclass
class Timer:
    elapsed: float = 0.0
    _start: float = 0.0

    def __enter__(self) -> "Timer":
        self._start = time.time()
        return self

    def __exit__(self, *_args) -> None:
        self.elapsed = time.time() - self._start
