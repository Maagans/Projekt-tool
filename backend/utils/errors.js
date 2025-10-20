export const createAppError = (message, status = 500, cause) => {
    const error = new Error(message);
    error.status = status;
    error.userMessage = message;
    if (cause) {
        error.cause = cause;
    }
    if (status < 500) {
        error.expose = true;
    }
    return error;
};

export const formatZodIssues = (issues) =>
    issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
        message: issue.message,
    }));

export const respondValidationError = (res, message, issues) =>
    res.status(400).json({
        success: false,
        message,
        errors: formatZodIssues(issues),
    });
