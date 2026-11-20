import pg from "pg";

const adminUrl = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
const url = new URL(adminUrl);
url.pathname = `/${process.env.TEST_DB_NAME ?? "maison_test"}`;

export const pool = new pg.Pool({ connectionString: url.toString(), max: 4 });

/** Run SQL as the database owner (bypasses RLS) — test fixtures only. */
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}

export async function createUser(email: string, fullName = ""): Promise<string> {
  const { rows } = await sql<{ id: string }>(
    `insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('full_name', $2::text)) returning id`,
    [email, fullName],
  );
  return rows[0]!.id;
}

type Actor = string | "anon" | "service_role";

/**
 * Run `fn` exactly as PostgREST would for the given actor: inside a
 * transaction, with the role switched and JWT claims set. Rolled back unless
 * `commit` is true, so tests don't leak state.
 */
export async function as<T>(actor: Actor, fn: (c: pg.PoolClient) => Promise<T>, commit = false): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const role = actor === "anon" || actor === "service_role" ? actor : "authenticated";
    const claims = role === "authenticated" ? { sub: actor, role } : { role };
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    await client.query(`set local role ${role}`);
    const result = await fn(client);
    await client.query(commit ? "commit" : "rollback");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Assert that a query is rejected by the database, optionally with a SQLSTATE / message. */
export async function expectDenied(p: Promise<unknown>, match?: { code?: string; message?: RegExp }) {
  try {
    await p;
  } catch (err) {
    const e = err as { code?: string; message: string };
    if (match?.code && e.code !== match.code) {
      throw new Error(`expected SQLSTATE ${match.code}, got ${e.code}: ${e.message}`);
    }
    if (match?.message && !match.message.test(e.message)) {
      throw new Error(`expected message ${match.message}, got: ${e.message}`);
    }
    return e;
  }
  throw new Error("expected the database to reject this operation, but it succeeded");
}
