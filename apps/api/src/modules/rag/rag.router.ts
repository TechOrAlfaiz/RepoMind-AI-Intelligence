import { Router } from "express";
import { ragController } from "./rag.controller.js";
import { requireAuth, requireRepoAccess } from "../../middlewares/auth.middleware.js";

const router = Router({ mergeParams: true });

// All RAG endpoints require authenticated user session and repo access
router.use(requireAuth);

// Streaming / batch chat
router.post("/:repoId/chat", requireRepoAccess("viewer"), (req, res) =>
  ragController.chat(req, res),
);

// Conversations management
router.get("/:repoId/conversations", requireRepoAccess("viewer"), (req, res) =>
  ragController.listConversations(req, res),
);

router.get("/:repoId/conversations/:convoId/messages", requireRepoAccess("viewer"), (req, res) =>
  ragController.getMessages(req, res),
);

export const ragRouter = router;
