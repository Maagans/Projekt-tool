import { z } from "zod";
import { respondValidationError } from "../utils/errors.js";

const setupBodySchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .min(1, "Email is required.")
    .max(320, "Email must be at most 320 characters.")
    .email("Email must be valid."),
  name: z
    .string({ required_error: "Name is required." })
    .trim()
    .min(1, "Name is required.")
    .max(200, "Name must be at most 200 characters."),
  password: z
    .string({ required_error: "Password is required." })
    .min(6, "Password must be at least 6 characters long.")
    .max(256, "Password must be at most 256 characters."),
});

export const validateInitialAdminPayload = (req, res, next) => {
  const parsed = setupBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return respondValidationError(res, "Invalid administrator payload.", parsed.error.issues);
  }

  req.validatedBody = parsed.data;
  return next();
};
