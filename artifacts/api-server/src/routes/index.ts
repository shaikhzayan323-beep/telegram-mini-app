import { Router, type IRouter, type Request } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

function verifyTelegramInitData(initData: string) {
  const botToken = process.env["TELEGRAM_BOT_TOKEN"];

  if (!botToken || !initData) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash");

    if (!receivedHash) {
      return null;
    }

    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const received = Buffer.from(receivedHash, "hex");
    const calculated = Buffer.from(calculatedHash, "hex");

    if (
      received.length !== calculated.length ||
      !timingSafeEqual(received, calculated)
    ) {
      return null;
    }

    const userJson = params.get("user");

    if (!userJson) {
      return null;
    }

    const user = JSON.parse(userJson) as {
      id?: number;
      first_name?: string;
    };

    if (!user.id) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

router.post("/admin/verify", (req: Request, res) => {
  const initData = req.body?.initData;

  if (typeof initData !== "string") {
    return res.status(400).json({
      admin: false,
      error: "Telegram initData is required",
    });
  }

  const user = verifyTelegramInitData(initData);

  if (!user) {
    return res.status(401).json({
      admin: false,
      error: "Invalid Telegram authentication",
    });
  }

  const adminId = process.env["ADMIN_TELEGRAM_ID"];

  if (!adminId) {
    return res.status(500).json({
      admin: false,
      error: "Admin ID is not configured",
    });
  }

  const isAdmin = String(user.id) === String(adminId);

  if (!isAdmin) {
    return res.status(403).json({
      admin: false,
      error: "Admin access denied",
    });
  }

  return res.json({
    admin: true,
    userId: String(user.id),
    firstName: user.first_name ?? "Admin",
  });
});

export default router;