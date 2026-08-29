import { z } from "zod";

export const winnieNameSchema = z.string().trim().min(1, "Name is required").max(30, "Name is too long");
