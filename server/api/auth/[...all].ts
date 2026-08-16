import { auth } from "~~/server/utils/auth";

export default defineEventHandler(event => auth.handler(toWebRequest(event)));
