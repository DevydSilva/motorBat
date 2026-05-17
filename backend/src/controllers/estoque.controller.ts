/**
 * Consulta do **estoque atual** saldo por matéria-prima (`GET /estoque-atual`).
 * Delega em `estoque.service`; sem escrita neste controller.
 */
import type { Request, Response } from "express";
import * as svc from "../services/estoque.service";

/** Lista agregada com `materia` populada (ou órfão se a matéria foi apagada). */
export async function list(_req: Request, res: Response) {
  const rows = await svc.listEstoqueAtual();
  return res.status(200).json(rows);
}
