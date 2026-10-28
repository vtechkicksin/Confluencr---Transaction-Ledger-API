import { Router } from "express";
import TransactionController from "../controllers/transaction.controller";

// Mounted at /api/accounts/:accountId/transactions
const router = Router({ mergeParams: true });

router.post("/", TransactionController.create);
router.get("/", TransactionController.list);
router.get("/:transactionId", TransactionController.getById);

// No update or delete endpoints exist: transactions are immutable.
router.all("/", TransactionController.immutable);
router.all("/:transactionId", TransactionController.immutable);

export default router;
