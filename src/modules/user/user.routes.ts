import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePrivilege } from '../../middlewares/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { UserController } from './user.controller';

const router = Router();
router.use(requireAuth);
router.get('/', requirePrivilege(`${ENTITIES.USER}:${ACTIONS.READ}`), UserController.getUsers);
router.get('/form-options', requirePrivilege([
    `${ENTITIES.USER}:${ACTIONS.CREATE}`, `${ENTITIES.USER}:${ACTIONS.UPDATE}`,
]), UserController.getFormOptions);
router.get('/:id', requirePrivilege(`${ENTITIES.USER}:${ACTIONS.READ}`), UserController.getUser);
router.post('/', requirePrivilege(`${ENTITIES.USER}:${ACTIONS.CREATE}`), UserController.createUser);
router.put('/:id', requirePrivilege(`${ENTITIES.USER}:${ACTIONS.UPDATE}`), UserController.updateUser);
router.delete('/:id', requirePrivilege(`${ENTITIES.USER}:${ACTIONS.DELETE}`), UserController.deleteUser);

export default router;
