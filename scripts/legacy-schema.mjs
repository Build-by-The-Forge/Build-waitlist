const TABLES = {
  signups: [
    ["id", "bigint", false, "nextval('waitlist.signups_id_seq'::regclass)"],
    ["email", "text", false, null],
    ["email_normalized", "text", false, null],
    ["source", "text", true, null],
    ["created_at", "timestamp with time zone", false, "now()"],
    ["verification_status", "text", false, "'pending'::text"],
    ["verified_at", "timestamp with time zone", true, null],
    ["verification_token_hash", "text", true, null],
    ["verification_token_expires_at", "timestamp with time zone", true, null],
    ["verification_sent_at", "timestamp with time zone", true, null],
    ["verification_send_count", "integer", false, "0"],
    ["verification_window_start", "timestamp with time zone", true, null],
    ["updated_at", "timestamp with time zone", false, "now()"],
  ],
  admin_users: [
    ["id", "bigint", false, "nextval('waitlist.admin_users_id_seq'::regclass)"],
    ["email", "text", false, null],
    ["provider", "text", false, "'google'::text"],
    ["provider_subject", "text", true, null],
    ["role", "text", false, "'admin'::text"],
    ["status", "text", false, "'active'::text"],
    ["created_at", "timestamp with time zone", false, "now()"],
    ["last_login_at", "timestamp with time zone", true, null],
  ],
  admin_audit: [
    ["id", "bigint", false, "nextval('waitlist.admin_audit_id_seq'::regclass)"],
    ["admin_id", "bigint", true, null],
    ["action", "text", false, null],
    ["detail", "jsonb", false, "'{}'::jsonb"],
    ["created_at", "timestamp with time zone", false, "now()"],
  ],
  rate_limits: [
    ["bucket", "text", false, null],
    ["window_start", "timestamp with time zone", false, null],
    ["hits", "integer", false, "0"],
  ],
  email_deliveries: [
    ["id", "bigint", false, "nextval('waitlist.email_deliveries_id_seq'::regclass)"],
    ["message_id", "uuid", false, null],
    ["signup_id", "bigint", true, null],
    ["message_type", "text", false, null],
    ["provider", "text", false, null],
    ["status", "text", false, null],
    ["failure_class", "text", true, null],
    ["error_code", "text", true, null],
    ["provider_message_id", "text", true, null],
    ["created_at", "timestamp with time zone", false, "now()"],
  ],
};

const CONSTRAINTS = {
  signups: {
    signups_pkey: "primary key(id)",
    signups_email_normalized_key: "unique(email_normalized)",
    signups_email_length: "check((char_length(email)<=254))",
    signups_source_length: "check(((sourceisnull)or(char_length(source)<=64)))",
    signups_verification_status_check: "check((verification_status=any(array[pending,verified])))",
    signups_verified_at_consistent: "check(((verification_status=verified)=(verified_atisnotnull)))",
    signups_token_only_when_pending: "check(((verification_status=pending)or((verification_token_hashisnull)and(verification_token_expires_atisnull))))",
  },
  admin_users: {
    admin_users_pkey: "primary key(id)",
    admin_users_email_key: "unique(email)",
    admin_users_subject_key: "unique(provider,provider_subject)",
    admin_users_email_lower: "check((email=lower(email)))",
    admin_users_role_check: "check((role=admin))",
    admin_users_status_check: "check((status=any(array[active,disabled])))",
  },
  admin_audit: {
    admin_audit_pkey: "primary key(id)",
    admin_audit_admin_id_fkey: "foreign key(admin_id)referenceswaitlist.admin_users(id)",
  },
  rate_limits: { rate_limits_pkey: "primary key(bucket,window_start)" },
  email_deliveries: {
    email_deliveries_pkey: "primary key(id)",
    email_deliveries_message_provider_key: "unique(message_id,provider)",
    email_deliveries_signup_id_fkey: "foreign key(signup_id)referenceswaitlist.signups(id)ondeletecascade",
    email_deliveries_status_check: "check((status=any(array[sent,failed])))",
    email_deliveries_failure_check: "check((((status=sent)and(failure_classisnull))or((status=failed)and(failure_class=any(array[transient,unknown,permanent,configuration])))))",
  },
};

const INDEXES = {
  signups: {
    signups_pkey: "createuniqueindexsignups_pkeyonwaitlist.signupsusingbtree(id)",
    signups_email_normalized_key: "createuniqueindexsignups_email_normalized_keyonwaitlist.signupsusingbtree(email_normalized)",
    signups_created_at_idx: "createindexsignups_created_at_idxonwaitlist.signupsusingbtree(created_atdesc)",
    signups_verification_token_hash_key: "createuniqueindexsignups_verification_token_hash_keyonwaitlist.signupsusingbtree(verification_token_hash)where(verification_token_hashisnotnull)",
    signups_verification_status_idx: "createindexsignups_verification_status_idxonwaitlist.signupsusingbtree(verification_status,created_atdesc)",
  },
  admin_users: {
    admin_users_pkey: "createuniqueindexadmin_users_pkeyonwaitlist.admin_usersusingbtree(id)",
    admin_users_email_key: "createuniqueindexadmin_users_email_keyonwaitlist.admin_usersusingbtree(email)",
    admin_users_subject_key: "createuniqueindexadmin_users_subject_keyonwaitlist.admin_usersusingbtree(provider,provider_subject)",
    admin_users_single_active: "createuniqueindexadmin_users_single_activeonwaitlist.admin_usersusingbtree(status)where(status=active)",
  },
  admin_audit: {
    admin_audit_pkey: "createuniqueindexadmin_audit_pkeyonwaitlist.admin_auditusingbtree(id)",
  },
  rate_limits: {
    rate_limits_pkey: "createuniqueindexrate_limits_pkeyonwaitlist.rate_limitsusingbtree(bucket,window_start)",
    rate_limits_window_start_idx: "createindexrate_limits_window_start_idxonwaitlist.rate_limitsusingbtree(window_start)",
  },
  email_deliveries: {
    email_deliveries_pkey: "createuniqueindexemail_deliveries_pkeyonwaitlist.email_deliveriesusingbtree(id)",
    email_deliveries_message_provider_key: "createuniqueindexemail_deliveries_message_provider_keyonwaitlist.email_deliveriesusingbtree(message_id,provider)",
    email_deliveries_signup_idx: "createindexemail_deliveries_signup_idxonwaitlist.email_deliveriesusingbtree(signup_id)",
    email_deliveries_created_at_idx: "createindexemail_deliveries_created_at_idxonwaitlist.email_deliveriesusingbtree(created_at)",
  },
};

const canonical = (value) => value
  .toLowerCase()
  .replaceAll('"', "")
  .replaceAll("'", "")
  .replace(/::(?:text|regclass|jsonb|character varying|timestamp with time zone|integer|bigint)/g, "")
  .replace(/\s+/g, "");

export async function verifyLegacySchema(sql) {
  const errors = [];
  const schema = await sql`SELECT 1 FROM pg_namespace WHERE nspname = 'waitlist'`;
  if (!schema.length) throw new Error("Baseline validation failed: schema waitlist is missing");

  const actualTables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'waitlist' AND table_type = 'BASE TABLE'`;
  const actualTableNames = new Set(actualTables.map((row) => row.table_name));
  const allColumns = await sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns WHERE table_schema = 'waitlist'`;
  const columnsByTable = new Map();
  for (const column of allColumns) {
    if (!columnsByTable.has(column.table_name)) columnsByTable.set(column.table_name, []);
    columnsByTable.get(column.table_name).push(column);
  }

  const constraints = await sql`
    SELECT t.relname AS table_name, c.conname, pg_get_constraintdef(c.oid) AS definition, c.confdeltype
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'waitlist'`;
  const constraintsByTable = new Map();
  for (const constraint of constraints) {
    if (!constraintsByTable.has(constraint.table_name)) constraintsByTable.set(constraint.table_name, new Map());
    constraintsByTable.get(constraint.table_name).set(constraint.conname, constraint);
  }

  const indexes = await sql`
    SELECT tablename AS table_name, indexname, indexdef
    FROM pg_indexes WHERE schemaname = 'waitlist'`;
  const indexesByTable = new Map();
  for (const index of indexes) {
    if (!indexesByTable.has(index.table_name)) indexesByTable.set(index.table_name, new Map());
    indexesByTable.get(index.table_name).set(index.indexname, index.indexdef);
  }

  for (const [table, expectedColumns] of Object.entries(TABLES)) {
    if (!actualTableNames.has(table)) {
      errors.push(`waitlist.${table} is missing`);
      continue;
    }
    const actualColumns = columnsByTable.get(table) ?? [];
    const actualNames = actualColumns.map((column) => column.column_name);
    const expectedNames = expectedColumns.map(([name]) => name);
    for (const name of expectedNames.filter((name) => !actualNames.includes(name))) errors.push(`waitlist.${table}.${name} is missing`);
    for (const name of actualNames.filter((name) => !expectedNames.includes(name))) errors.push(`waitlist.${table}.${name} is unexpected for the 001–005 legacy schema`);

    for (const [name, type, nullable, defaultValue] of expectedColumns) {
      const column = actualColumns.find((candidate) => candidate.column_name === name);
      if (!column) continue;
      if (column.data_type !== type) errors.push(`waitlist.${table}.${name} expected ${type}, found ${column.data_type}`);
      const foundNullable = column.is_nullable === "YES";
      if (foundNullable !== nullable) errors.push(`waitlist.${table}.${name} expected ${nullable ? "NULL" : "NOT NULL"}, found ${foundNullable ? "nullable" : "NOT NULL"}`);
      if (defaultValue !== null && canonical(column.column_default ?? "") !== canonical(defaultValue)) {
        errors.push(`waitlist.${table}.${name} expected default ${defaultValue}, found ${column.column_default ?? "no default"}`);
      }
      if (defaultValue === null && column.column_default !== null) errors.push(`waitlist.${table}.${name} expected no default, found ${column.column_default}`);
    }
  }

  for (const [table, expectedConstraints] of Object.entries(CONSTRAINTS)) {
    const actual = constraintsByTable.get(table) ?? new Map();
    for (const [name, definition] of Object.entries(expectedConstraints)) {
      const found = actual.get(name);
      if (!found) {
        errors.push(`waitlist.${table} constraint ${name} is missing`);
        continue;
      }
      if (canonical(found.definition) !== canonical(definition)) errors.push(`waitlist.${table} constraint ${name} has an incompatible definition`);
      if (name === "email_deliveries_signup_id_fkey" && found.confdeltype !== "c") errors.push(`waitlist.email_deliveries constraint ${name} must use ON DELETE CASCADE`);
    }
  }

  for (const [table, expectedIndexes] of Object.entries(INDEXES)) {
    const actual = indexesByTable.get(table) ?? new Map();
    for (const [name, definition] of Object.entries(expectedIndexes)) {
      const found = actual.get(name);
      if (!found) {
        errors.push(`waitlist.${table} index ${name} is missing`);
        continue;
      }
      if (canonical(found) !== canonical(definition)) errors.push(`waitlist.${table} index ${name} has an incompatible definition`);
    }
  }

  const sequences = await sql`
    SELECT c.relname, format_type(s.seqtypid, NULL) AS data_type,
           s.seqstart, s.seqincrement, s.seqcycle
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_sequence s ON s.seqrelid = c.oid
    WHERE n.nspname = 'waitlist' AND c.relkind = 'S'`;
  const sequencesByName = new Map(sequences.map((sequence) => [sequence.relname, sequence]));
  for (const [table, idColumn] of [["signups", "id"], ["admin_users", "id"], ["admin_audit", "id"], ["email_deliveries", "id"]]) {
    const name = `${table}_id_seq`;
    const [owned] = await sql`SELECT pg_get_serial_sequence(${`waitlist.${table}`}, ${idColumn}) AS sequence`;
    const sequence = sequencesByName.get(name);
    if (!sequence || canonical(owned?.sequence ?? "") !== canonical(`waitlist.${name}`)) {
      errors.push(`waitlist.${name} is missing or is not owned by ${table}.${idColumn}`);
    } else if (sequence.data_type !== "bigint" || Number(sequence.seqstart) !== 1 || Number(sequence.seqincrement) !== 1 || sequence.seqcycle) {
      errors.push(`waitlist.${name} has an incompatible sequence definition`);
    }
  }

  if (errors.length) throw new Error(`Baseline validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}