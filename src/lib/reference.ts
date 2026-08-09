import { prisma } from "./db";

export const getBeliefs = () =>
  prisma.referenceDocument.findMany({ where: { type: "FUNDAMENTAL_BELIEF" }, orderBy: { sortOrder: "asc" } });

export const getManualRoots = () =>
  prisma.referenceDocument.findMany({
    where: { type: "CHURCH_MANUAL", parentId: null },
    orderBy: { sortOrder: "asc" },
    include: { children: { orderBy: { sortOrder: "asc" } } },
  });

export const getReferenceBySlug = (slug: string) =>
  prisma.referenceDocument.findUnique({ where: { slug } });
