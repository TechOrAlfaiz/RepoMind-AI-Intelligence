import { Router } from "express";
import { authController } from "./auth.controller.js";

const router = Router();

router.get("/github", (req, res) => authController.initiateGitHubOAuth(req, res));
router.get("/github/callback", (req, res) => authController.handleGitHubCallback(req, res));
router.get("/me", (req, res) => authController.getCurrentUser(req, res));
router.post("/logout", (req, res) => authController.logout(req, res));
router.post("/dev-login", (req, res) => authController.devLogin(req, res));

export const authRouter = router;
