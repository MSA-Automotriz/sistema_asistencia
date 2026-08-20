import { Router } from 'express';
import { prisma } from '../database/prisma.js';
import { mountCrud, type CrudDelegate } from './helpers.js';

export const crudRouter = Router();

const resourceDefinitions: [string, string, CrudDelegate, string][] = [
  ['/roles', 'Roles', prisma.role, 'roles'],
  ['/permissions', 'Permisos', prisma.permission, 'permissions'],
  ['/companies', 'Empresas', prisma.company, 'companies'],
  ['/sites', 'Sedes', prisma.site, 'sites'],
  ['/departments', 'Áreas', prisma.department, 'departments'],
  ['/positions', 'Cargos', prisma.position, 'positions'],
  ['/schedules', 'Horarios', prisma.schedule, 'schedules'],
  ['/site-schedules', 'Horarios por sede', prisma.siteSchedule, 'site-schedules'],
  ['/employees', 'Empleados', prisma.employee, 'employees'],
  ['/vacations', 'Vacaciones', prisma.vacation, 'vacations'],
  ['/work-permissions', 'Permisos laborales', prisma.workPermission, 'work-permissions'],
  ['/overtime-requests', 'Solicitudes de horas extra', prisma.overtimeRequest, 'overtime-requests'],
  ['/licenses', 'Licencias', prisma.license, 'licenses'],
  ['/holidays', 'Feriados', prisma.holiday, 'holidays'],
  ['/settings', 'Configuraciones', prisma.setting, 'settings'],
  ['/notifications', 'Notificaciones', prisma.notification, 'notifications'],
  ['/attendances', 'Asistencias', prisma.attendance, 'attendances']
];

resourceDefinitions.forEach(([path, label, delegate, resource]) =>
  mountCrud(crudRouter, path, label, delegate, resource)
);
