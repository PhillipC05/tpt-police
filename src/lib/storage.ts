import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type StorageProvider = "r2" | "wasabi";

function getClient(provider: StorageProvider): S3Client {
  if (provider === "r2") {
    return new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return new S3Client({
    region: process.env.WASABI_REGION ?? "us-east-1",
    endpoint: process.env.WASABI_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.WASABI_ACCESS_KEY_ID!,
      secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY!,
    },
  });
}

function getBucket(provider: StorageProvider): string {
  return provider === "r2"
    ? process.env.R2_BUCKET!
    : process.env.WASABI_BUCKET!;
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  provider: StorageProvider = "r2"
): Promise<string> {
  const client = getClient(provider);
  const bucket = getBucket(provider);

  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );

  return key;
}

export async function getSignedDownloadUrl(
  key: string,
  provider: StorageProvider = "r2",
  expiresIn = 3600
): Promise<string> {
  const client = getClient(provider);
  const bucket = getBucket(provider);

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );
}

export async function deleteFile(key: string, provider: StorageProvider = "r2"): Promise<void> {
  const client = getClient(provider);
  const bucket = getBucket(provider);
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
