import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isSamLocal() {
  return Boolean(process.env.AWS_SAM_LOCAL);
}

function isLocalDev() {
  return process.env.LOCAL_DEV === "true" || isSamLocal();
}
const localDbPath =
  process.env.LOCAL_DB_PATH ??
  path.resolve(process.cwd(), ".local-db", "data.json");

function ensureLocalDb() {
  const directory = path.dirname(localDbPath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
  if (!existsSync(localDbPath)) {
    writeFileSync(localDbPath, JSON.stringify({}), "utf8");
  }
  if (isLocalDev()) {
    const debugInfo = {
      localDbPath,
      cwd: process.cwd(),
      tmpdir: os.tmpdir(),
      isSamLocal: process.env.AWS_SAM_LOCAL,
      envLocalDbPath: process.env.LOCAL_DB_PATH
    };
    console.error("[LOCAL_DB DEBUG]", JSON.stringify(debugInfo));
  }
}

function readLocalDb(): Record<string, Array<Record<string, unknown>>> {
  ensureLocalDb();

  const raw = readFileSync(localDbPath, "utf8");
  console.log("RAW FILE:", raw);

  return JSON.parse(raw) as Record<string, Array<Record<string, unknown>>>;
}
function writeLocalDb(data: Record<string, Array<Record<string, unknown>>>) {
  ensureLocalDb();

  const raw = JSON.stringify(data, null, 2);
  console.log("WRITING FILE:", raw);

  writeFileSync(localDbPath, raw, "utf8");
}

export async function putItem(tableName: string,
  item: Record<string, any>) {
    if (isLocalDev()) {
        const db = readLocalDb();
        const table = db[tableName] ?? [];

        const nextTable = [
            ...table.filter((entry: Record<string, any>) => !(entry.pk === item.pk && entry.sk === item.sk)),
            item
        ];

        db[tableName] = nextTable;
        writeLocalDb(db);

        console.log("PUT TABLE:", tableName);
        console.log("PUT DB:", JSON.stringify(db, null, 2));

        return;
    }

    await client.send(new PutCommand({ TableName: tableName, Item: item }));
}

export async function getItem( tableName: string,
  pk: string,
  sk: string) {
    if (isLocalDev()) {
        const db = readLocalDb();

        console.log("GET TABLE:", tableName);
        console.log("GET DB:", JSON.stringify(db, null, 2));

        return (db[tableName] ?? []).find(
            (item: Record<string, any>) => item.pk === pk && item.sk === sk
        );
    }

    const result = await client.send(
        new GetCommand({ TableName: tableName, Key: { pk, sk } })
    );

    return result.Item;
}
export async function listItems(tableName: string, pk: string, beginsWith?: string) {
  if (isLocalDev()) {
    return (readLocalDb()[tableName] ?? []).filter((item) => item.pk === pk && (!beginsWith || String(item.sk).startsWith(beginsWith)));
  }
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ...(beginsWith
        ? {
            FilterExpression: "begins_with(sk, :sk)",
            ExpressionAttributeValues: {
              ":pk": pk,
              ":sk": beginsWith
            }
          }
        : {
            ExpressionAttributeValues: {
              ":pk": pk
            }
          }),
    })
  );
  return result.Items ?? [];
}

export async function updateItem(
  tableName: string,
  pk: string,
  sk: string,
  attributes: Record<string, unknown>
) {
  if (isLocalDev()) {
    const db = readLocalDb();
    db[tableName] = (db[tableName] ?? []).map((item) => (item.pk === pk && item.sk === sk ? { ...item, ...attributes } : item));
    writeLocalDb(db);
    return;
  }
  const entries = Object.entries(attributes);
  const names = Object.fromEntries(entries.map(([key]) => [`#${key}`, key]));
  const values = Object.fromEntries(entries.map(([key, value]) => [`:${key}`, value]));
  const expression = `SET ${entries.map(([key]) => `#${key} = :${key}`).join(", ")}`;

  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk, sk },
      UpdateExpression: expression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values
    })
  );
}

export async function deleteItem(tableName: string, pk: string, sk: string) {
  if (isLocalDev()) {
    const db = readLocalDb();
    db[tableName] = (db[tableName] ?? []).filter((item) => !(item.pk === pk && item.sk === sk));
    writeLocalDb(db);
    return;
  }
  await client.send(new DeleteCommand({ TableName: tableName, Key: { pk, sk } }));
}

export async function scanItems(tableName: string) {
  if (isLocalDev()) {
    return readLocalDb()[tableName] ?? [];
  }
  const result = await client.send(new ScanCommand({ TableName: tableName }));
  return result.Items ?? [];
}
