import time
from fastapi import HTTPException, Request, status

class RateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        """
        In-memory sliding window rate limiter.
        Default: Max 10 requests per 60 seconds per IP.
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = {} # Dictionary mapping ip string -> list of timestamps

    def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Initialize list if first request
        if client_ip not in self.requests:
            self.requests[client_ip] = []

        # Filter out timestamps outside the sliding window
        self.requests[client_ip] = [
            t for t in self.requests[client_ip]
            if now - t < self.window_seconds
        ]

        # Check if limit exceeded
        if len(self.requests[client_ip]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Too many requests. Please try again later."
            )

        # Record this request timestamp
        self.requests[client_ip].append(now)
