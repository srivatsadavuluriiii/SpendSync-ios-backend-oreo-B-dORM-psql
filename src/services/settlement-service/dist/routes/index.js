import { Router } from 'express';
const router = Router();
// Basic health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Settlement routes are working'
    });
});
export const settlementRoutes = router;
//# sourceMappingURL=index.js.map