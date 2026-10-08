export class AppError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Not authenticated") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Not allowed") {
    super(message, 403);
  }
}

export class TooManyAttemptsError extends AppError {
  constructor(message = "Too many attempts. Try again in a few minutes.") {
    super(message, 429);
  }
}
