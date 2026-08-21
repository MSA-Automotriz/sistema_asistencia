import { ok } from '../common/http/response.js';
import { AppError } from '../common/errors/app-error.js';
export class CrudController {
    delegate;
    label;
    constructor(delegate, label) {
        this.delegate = delegate;
        this.label = label;
    }
    get model() {
        return this.delegate;
    }
    list = async (request, response) => {
        const page = Math.max(Number(request.query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
        const [items, total] = await Promise.all([
            this.model.findMany({ skip: (page - 1) * limit, take: limit }),
            this.model.count()
        ]);
        return ok(response, `${this.label} obtenidos correctamente`, {
            items,
            pagination: { page, limit, total }
        });
    };
    get = async (request, response, next) => {
        const id = String(request.params.id);
        const item = await this.model.findUnique({ where: { id } });
        if (!item)
            return next(new AppError(404, `${this.label} no encontrado`));
        return ok(response, `${this.label} obtenido correctamente`, item);
    };
    create = async (request, response) => {
        try {
            return ok(response, `${this.label} registrado correctamente`, await this.model.create({ data: request.body }), 201);
        }
        catch (error) {
            if (typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'P2002') {
                throw new AppError(409, `Ya existe un registro en ${this.label} con ese nombre`);
            }
            throw error;
        }
    };
    update = async (request, response) => {
        try {
            return ok(response, `${this.label} actualizado correctamente`, await this.model.update({ where: { id: String(request.params.id) }, data: request.body }));
        }
        catch (error) {
            if (typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'P2002') {
                throw new AppError(409, `Ya existe un registro en ${this.label} con ese nombre`);
            }
            throw error;
        }
    };
    remove = async (request, response) => {
        await this.model.delete({ where: { id: String(request.params.id) } });
        return response.status(204).send();
    };
}
//# sourceMappingURL=crud-controller.js.map