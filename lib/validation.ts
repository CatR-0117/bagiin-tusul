import { z } from "zod";
import { MAX_SOURCE_IMAGE_BYTES } from "@/lib/config";

export const imageMimeToExtension = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type SourceImageMime = keyof typeof imageMimeToExtension;

const fileExtension = z.enum(["jpg", "jpeg", "png", "webp"]);

export const uploadUrlSchema = z
  .object({
    projectId: z.uuid(),
    fileName: z.string().min(1).max(255),
    fileType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    fileSize: z.number().int().positive().max(MAX_SOURCE_IMAGE_BYTES),
  })
  .superRefine((value, context) => {
    const extension = value.fileName.split(".").pop()?.toLowerCase();
    const parsedExtension = fileExtension.safeParse(extension);
    const expected = imageMimeToExtension[value.fileType];
    const normalized = extension === "jpeg" ? "jpg" : extension;
    if (!parsedExtension.success || normalized !== expected) {
      context.addIssue({
        code: "custom",
        path: ["fileName"],
        message: "The file extension does not match its image type.",
      });
    }
  });

export const projectIdSchema = z.object({ projectId: z.uuid() });

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

export function firstZodMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid request.";
}

