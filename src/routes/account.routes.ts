import { Router } from "express";
import AccountController from "../controllers/account.controller";

const router = Router();

router.post("/", AccountController.create);
router.get("/:accountId/balance", AccountController.getBalance);

export default router;
