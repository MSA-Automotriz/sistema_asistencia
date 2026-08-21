export const validate = (schema) => (request, _response, next) => {
    const result = schema.safeParse({
        body: request.body,
        params: request.params,
        query: request.query
    });
    if (!result.success)
        return next(result.error);
    request.body = result.data.body;
    next();
};
//# sourceMappingURL=validate.js.map