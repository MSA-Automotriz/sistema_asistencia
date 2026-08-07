import type { Request, Response, NextFunction } from 'express';
import { ok } from '../common/http/response.js';
import { AppError } from '../common/errors/app-error.js';

type CrudDelegate = {
  findMany: (args: { skip: number; take: number }) => Promise<unknown[]>;
  count: () => Promise<number>;
  findUnique: (args: { where: { id: string } }) => Promise<unknown>;
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

export class CrudController {
  constructor(
    private readonly delegate: unknown,
    private readonly label: string
  ) {}
  private get model() {
    return this.delegate as CrudDelegate;
  }
  list = async (request: Request, response: Response) => {
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
  get = async (request: Request, response: Response, next: NextFunction) => {
    const id = String(request.params.id);
    const item = await this.model.findUnique({ where: { id } });
    if (!item) return next(new AppError(404, `${this.label} no encontrado`));
    return ok(response, `${this.label} obtenido correctamente`, item);
  };
  create = async (request: Request, response: Response) =>
    ok(
      response,
      `${this.label} registrado correctamente`,
      await this.model.create({ data: request.body }),
      201
    );
  update = async (request: Request, response: Response) =>
    ok(
      response,
      `${this.label} actualizado correctamente`,
      await this.model.update({ where: { id: String(request.params.id) }, data: request.body })
    );
  remove = async (request: Request, response: Response) => {
    await this.model.delete({ where: { id: String(request.params.id) } });
    return response.status(204).send();
  };
}
