import { PrismaService } from '../prisma/prisma.service';

const MAX_ROWS = 200;

// Blocks schema/data mutation outright. The Copilot only ever runs through
// the app's normal Prisma connection (there is no separate read-only DB
// role provisioned for it — see README), so this validator plus the
// passwordHash redaction below are the actual safety boundary, not just a
// nicety on top of a read-only connection.
const FORBIDDEN_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE|GRANT|REVOKE|COPY|VACUUM|REINDEX|EXECUTE|CALL)\b/i;

function validateQuery(rawSql: string): string {
  if (typeof rawSql !== 'string' || !rawSql.trim()) {
    throw new Error('Query must be a non-empty string.');
  }

  const sql = rawSql.trim().replace(/;\s*$/, '');

  if (sql.includes(';')) {
    throw new Error('Multiple statements are not allowed — submit one SELECT statement.');
  }

  if (FORBIDDEN_KEYWORDS.test(sql)) {
    throw new Error('Only read-only SELECT queries are allowed.');
  }

  if (!/^\s*(SELECT|WITH)\b/i.test(sql)) {
    throw new Error('Query must start with SELECT (or WITH ... SELECT for CTEs).');
  }

  if (/passwordHash/i.test(sql)) {
    throw new Error('The passwordHash column cannot be selected.');
  }

  return sql;
}

/**
 * Strips passwordHash from result rows regardless of how they were selected
 * (e.g. SELECT *), and converts BigInt values (Postgres returns COUNT(*) and
 * other aggregates as bigint, which Prisma surfaces as native JS BigInt) to
 * Number — BigInt isn't JSON-serializable, and the Gemini SDK JSON.stringifies
 * the whole request body, so an un-converted BigInt anywhere in a tool result
 * would crash the next call in the loop.
 */
function sanitize(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === 'passwordHash') continue;
      clean[key] = typeof value === 'bigint' ? Number(value) : value;
    }
    return clean;
  });
}

export interface QueryResult {
  success: boolean;
  sql: string;
  rowCount?: number;
  truncated?: boolean;
  rows?: Record<string, unknown>[];
  error?: string;
}

export async function executeQuery(prisma: PrismaService, rawSql: string): Promise<QueryResult> {
  try {
    const sql = validateQuery(rawSql);
    const rows = sanitize(await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql));
    const truncated = rows.length > MAX_ROWS;

    return {
      success: true,
      sql,
      rowCount: rows.length,
      truncated,
      rows: truncated ? rows.slice(0, MAX_ROWS) : rows,
    };
  } catch (err) {
    return {
      success: false,
      sql: rawSql,
      error: err instanceof Error ? err.message : 'Query failed.',
    };
  }
}
