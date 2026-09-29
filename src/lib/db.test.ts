import { describe, expect, it } from "vitest";
import { connectionOptions } from "./db";

const pooler = (port: number) => `postgresql://app.ref:pw@aws-1-eu-west-1.pooler.supabase.com:${port}/postgres`;

describe("connectionOptions", () => {
  it("disables prepared statements on the Supabase transaction pooler (6543)", () => {
    expect(connectionOptions(pooler(6543), {})).toMatchObject({ prepare: false });
  });

  it("keeps prepared statements for session mode / direct connections", () => {
    expect(connectionOptions(pooler(5432), {})).not.toHaveProperty("prepare");
    expect(connectionOptions("postgres://u:p@localhost:5432/db", {})).not.toHaveProperty("prepare");
  });

  it("DATABASE_PREPARE=false forces it for other transaction poolers", () => {
    expect(connectionOptions("postgres://u:p@pgbouncer:6432/db", { DATABASE_PREPARE: "false" })).toMatchObject({ prepare: false });
  });
});
