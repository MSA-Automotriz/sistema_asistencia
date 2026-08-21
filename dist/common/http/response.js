export const ok = (response, message, data, statusCode = 200) => response.status(statusCode).json({ success: true, message, data });
//# sourceMappingURL=response.js.map