import { Router } from "express";
import TransactionController from "../controllers/transaction.controller";

const router = Router({ mergeParams: true });

router.post("/", TransactionController.create);
router.get("/", TransactionController.list);
router.get("/:transactionId", TransactionController.getById);

router.all("/", TransactionController.immutable);
router.all("/:transactionId", TransactionController.immutable);

export default router;
