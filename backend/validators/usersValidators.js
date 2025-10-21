import { z } from "zod";
import { respondValidationError } from "../utils/errors.js";

const roleSchema = z.enum(["Administrator", "Projektleder", "Teammedlem"], {
  required_error: "role is required.",
  invalid_type_error: "role must be a string.",
});

const paramsSchema = z.object({
  id: z.string({ required_error: "User id is required." }).uuid("User id must be a valid UUID."),
});

const bodySchema = z.object({
  role: roleSchema,
});

export const validateUserRoleChange = (req, res, next) => {
  const paramsParsed = paramsSchema.safeParse(req.params ?? {});
  if (!paramsParsed.success) {
    return respondValidationError(res, "Invalid user identifier.", paramsParsed.error.issues);
  }

  const bodyParsed = bodySchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    return respondValidationError(res, "Invalid role payload.", bodyParsed.error.issues);
  }

  req.validatedParams = paramsParsed.data;
  req.validatedBody = bodyParsed.data;
  return next();
};
