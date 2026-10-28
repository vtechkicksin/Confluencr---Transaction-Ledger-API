import { Router } from "express";
import accountRoutes from "./account.routes";
import transactionRoutes from "./transaction.routes";
import transferRoutes from "./transfer.routes";

const router = Router();

router.use("/accounts", accountRoutes);
router.use("/accounts/:accountId/transactions", transactionRoutes);
router.use("/transfers", transferRoutes);

export default router;
