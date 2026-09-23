import { Router, Response, IRouter } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import {
    createCommentSchema,
    createThoughtSchema,
    thoughtsFeedQuerySchema,
    uuidSchema,
} from '../utils/validators';
import * as thoughts from '../services/thoughts.service';

const router: IRouter = Router();

router.use(authenticate);

router.get(
    '/',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const query = thoughtsFeedQuerySchema.parse(req.query);
        const data = await thoughts.listThoughts(req.userId!, query.feed, query.limit, query.before);
        res.json({ success: true, data });
    })
);

router.post(
    '/',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const input = createThoughtSchema.parse(req.body);
        const data = await thoughts.createThought(req.userId!, input.body);
        res.status(201).json({ success: true, data });
    })
);

router.delete(
    '/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const id = uuidSchema.parse(req.params.id);
        await thoughts.deleteThought(req.userId!, id);
        res.json({ success: true });
    })
);

router.get(
    '/:id/comments',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const id = uuidSchema.parse(req.params.id);
        const data = await thoughts.listComments(req.userId!, id);
        res.json({ success: true, data });
    })
);

router.post(
    '/:id/comments',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const id = uuidSchema.parse(req.params.id);
        const input = createCommentSchema.parse(req.body);
        const data = await thoughts.addComment(req.userId!, id, input.body);
        res.status(201).json({ success: true, data });
    })
);

router.delete(
    '/:id/comments/:commentId',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const id = uuidSchema.parse(req.params.id);
        const commentId = uuidSchema.parse(req.params.commentId);
        await thoughts.deleteComment(req.userId!, id, commentId);
        res.json({ success: true });
    })
);

router.post(
    '/:id/like',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const id = uuidSchema.parse(req.params.id);
        const data = await thoughts.likeThought(req.userId!, id);
        res.json({ success: true, data });
    })
);

router.delete(
    '/:id/like',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const id = uuidSchema.parse(req.params.id);
        const data = await thoughts.unlikeThought(req.userId!, id);
        res.json({ success: true, data });
    })
);

router.post(
    '/:id/share',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const id = uuidSchema.parse(req.params.id);
        const data = await thoughts.shareThought(req.userId!, id);
        res.status(201).json({ success: true, data });
    })
);

router.delete(
    '/:id/share',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const id = uuidSchema.parse(req.params.id);
        await thoughts.unshareThought(req.userId!, id);
        res.json({ success: true });
    })
);

router.post(
    '/follow/:userId',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const targetId = uuidSchema.parse(req.params.userId);
        await thoughts.followUser(req.userId!, targetId);
        res.json({ success: true });
    })
);

router.delete(
    '/follow/:userId',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const targetId = uuidSchema.parse(req.params.userId);
        await thoughts.unfollowUser(req.userId!, targetId);
        res.json({ success: true });
    })
);

export default router;
