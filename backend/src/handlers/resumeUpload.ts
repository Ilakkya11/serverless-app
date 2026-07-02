import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { badRequest, ok, serverError } from "../shared/response.js";
import { parseBody } from "../shared/request.js";

const s3 = new S3Client({});
const schema = z.object({
  fileName: z.string().endsWith(".pdf"),
  contentType: z.string().default("application/pdf")
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (process.env.LOCAL_DEV === "true" && event.httpMethod === "PUT") {
      const uploadKey = event.pathParameters?.key;
      if (!uploadKey || !event.body) {
        return badRequest("Missing upload key or body");
      }
      const uploadsDir = path.join(process.cwd(), ".local-uploads");
      mkdirSync(uploadsDir, { recursive: true });
      writeFileSync(path.join(uploadsDir, uploadKey.replace(/[\\/]/g, "_")), event.body, "binary");
      return ok({ key: uploadKey }, "Local upload stored");
    }

    const payload = schema.safeParse(parseBody(event));
    if (!payload.success) {
      return badRequest(payload.error.message);
    }

    const key = `resumes/${Date.now()}-${payload.data.fileName}`;
    if (process.env.LOCAL_DEV === "true") {
      const encodedKey = encodeURIComponent(key);
      return ok({ key, uploadUrl: `http://127.0.0.1:3000/local-upload/${encodedKey}` }, "Upload URL generated");
    }

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: process.env.RESUME_BUCKET_NAME!,
        Key: key,
        ContentType: payload.data.contentType
      }),
      { expiresIn: 300 }
    );

    return ok({ key, uploadUrl }, "Upload URL generated");
  } catch (error) {
    return serverError(error);
  }
};
