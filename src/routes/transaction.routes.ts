import { Router } from "express";
import TransactionController from "../controllers/transaction.controller";

const router = Router({ mergeParams: true });

router.post("/", TransactionController.create);
router.get("/", TransactionController.list);

export default router;
