import z from "zod";
import { THEME_PREFERENCE } from "../constants";

export const themePreferenceSchema = z.enum(THEME_PREFERENCE);
