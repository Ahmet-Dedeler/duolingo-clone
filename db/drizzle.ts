import { createDb } from "./client";

const db = createDb(process.env.DATABASE_URL);

export default db;
