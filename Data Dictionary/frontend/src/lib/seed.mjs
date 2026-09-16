// seed.js
import pkg from 'pg';
const { Client } = pkg;
import { faker } from '@faker-js/faker';

const connectionString = 'postgresql://datai_user:jul@localhost:5432/datai_db';

async function createDatabase() {
  const client = new Client({ connectionString });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS db_tool_user (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      date_joined TIMESTAMPTZ NOT NULL,
      first_name TEXT,
      last_name TEXT,
      date_of_birth TIMESTAMPTZ,
      address TEXT
    );
    
    CREATE TABLE IF NOT EXISTS db_tool_article (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC(10,2),
      sku TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS db_tool_purchase (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES db_tool_user(id),
      article_id INTEGER REFERENCES db_tool_article(id),
      quantity INTEGER,
      total_price NUMERIC(10,2),
      purchase_date TIMESTAMPTZ NOT NULL
    );
  `);

  for (let i = 0; i < 10; i++) {
    const username = faker.internet.userName();
    const email = faker.internet.email();
    const date_joined = faker.date.past(2).toISOString();
    const first_name = faker.person.firstName();
    const last_name = faker.person.lastName();
    const date_of_birth = faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString();
    const address = faker.location.streetAddress();

    await client.query(
      `INSERT INTO db_tool_user (username, email, date_joined, first_name, last_name, date_of_birth, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [username, email, date_joined, first_name, last_name, date_of_birth, address]
    );
  }

  for (let i = 0; i < 10; i++) {
    const name = faker.commerce.productName();
    const description = faker.commerce.productDescription();
    const price = faker.commerce.price();
    const sku = faker.number.int({ min: 100000, max: 999999 }).toString();
    const now = new Date().toISOString();

    await client.query(
      `INSERT INTO db_tool_article (name, description, price, sku, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, description, price, sku, now, now]
    );
  }

  for (let i = 0; i < 20; i++) {
    const user_id = faker.number.int({ min: 1, max: 10 });
    const article_id = faker.number.int({ min: 1, max: 10 });
    const quantity = faker.number.int({ min: 1, max: 5 });
    const total_price = (Number(faker.commerce.price()) * quantity).toFixed(2);
    const purchase_date = faker.date.recent(30).toISOString();

    await client.query(
      `INSERT INTO db_tool_purchase (user_id, article_id, quantity, total_price, purchase_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, article_id, quantity, total_price, purchase_date]
    );
  }

  console.log('Database PostgreSQL seedée avec succès !');
  await client.end();
}

createDatabase().catch(console.error);