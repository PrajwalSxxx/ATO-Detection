"""Custom exception hierarchy and global exception handlers."""
import uuid
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class ATOBaseException(Exception):
    """Base exception for all ATO platform errors."""
    code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred"
    http_status: int = 500

    def __init__(self, message: str = None, code: str = None):
        self.message = message or self.__class__.message
        self.code = code or self.__class__.code
        super().__init__(self.message)


class AuthenticationError(ATOBaseException):
    code = "AUTHENTICATION_FAILED"
    message = "Authentication failed"
    http_status = 401


class InvalidCredentialsError(AuthenticationError):
    code = "INVALID_CREDENTIALS"
    message = "Invalid email or password"
    http_status = 401


class TokenExpiredError(AuthenticationError):
    code = "TOKEN_EXPIRED"
    message = "Access token has expired"
    http_status = 401


class TokenInvalidError(AuthenticationError):
    code = "TOKEN_INVALID"
    message = "Access token is invalid"
    http_status = 401


class AccountLockedError(AuthenticationError):
    code = "ACCOUNT_LOCKED"
    message = "Account is temporarily locked due to too many failed attempts"
    http_status = 423


class AccountDisabledError(AuthenticationError):
    code = "ACCOUNT_DISABLED"
    message = "Account has been disabled"
    http_status = 403


class MFARequiredError(ATOBaseException):
    code = "MFA_REQUIRED"
    message = "Multi-factor authentication is required"
    http_status = 403


class MFAInvalidError(ATOBaseException):
    code = "MFA_INVALID"
    message = "Invalid or expired OTP"
    http_status = 400


class MFACooldownError(ATOBaseException):
    code = "MFA_COOLDOWN"
    message = "Please wait before requesting another OTP"
    http_status = 429


class PermissionDeniedError(ATOBaseException):
    code = "PERMISSION_DENIED"
    message = "You do not have permission to perform this action"
    http_status = 403


class ResourceNotFoundError(ATOBaseException):
    code = "NOT_FOUND"
    message = "The requested resource was not found"
    http_status = 404


class UserNotFoundError(ResourceNotFoundError):
    code = "USER_NOT_FOUND"
    message = "User not found"


class AlertNotFoundError(ResourceNotFoundError):
    code = "ALERT_NOT_FOUND"
    message = "Alert not found"


class DeviceNotFoundError(ResourceNotFoundError):
    code = "DEVICE_NOT_FOUND"
    message = "Device not found"


class ConflictError(ATOBaseException):
    code = "CONFLICT"
    message = "Resource already exists"
    http_status = 409


class UserAlreadyExistsError(ConflictError):
    code = "USER_ALREADY_EXISTS"
    message = "A user with this email already exists"


class ValidationError(ATOBaseException):
    code = "VALIDATION_ERROR"
    message = "Request validation failed"
    http_status = 422


class RateLimitError(ATOBaseException):
    code = "RATE_LIMIT_EXCEEDED"
    message = "Too many requests. Please slow down."
    http_status = 429


class ModelNotLoadedError(ATOBaseException):
    code = "MODEL_NOT_LOADED"
    message = "ML model is not loaded"
    http_status = 503


def _make_error_response(code: str, message: str, request_id: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "request_id": request_id,
            }
        },
    )


def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ATOBaseException)
    async def ato_exception_handler(request: Request, exc: ATOBaseException):
        request_id = str(request.headers.get("X-Request-ID", uuid.uuid4()))
        return _make_error_response(exc.code, exc.message, request_id, exc.http_status)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = str(request.headers.get("X-Request-ID", uuid.uuid4()))
        details = "; ".join(
            f"{'.'.join(str(l) for l in e['loc'])}: {e['msg']}"
            for e in exc.errors()
        )
        return _make_error_response("VALIDATION_ERROR", details, request_id, 422)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        request_id = str(request.headers.get("X-Request-ID", uuid.uuid4()))
        code_map = {
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            500: "INTERNAL_ERROR",
        }
        code = code_map.get(exc.status_code, "HTTP_ERROR")
        return _make_error_response(code, exc.detail or str(exc.status_code), request_id, exc.status_code)

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        request_id = str(request.headers.get("X-Request-ID", uuid.uuid4()))
        return _make_error_response("INTERNAL_ERROR", "An unexpected error occurred", request_id, 500)
