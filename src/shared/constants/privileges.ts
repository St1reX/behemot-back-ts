import { ENTITIES, Entity } from './entities';
import { ACTIONS, Action } from './actions';

const EntitiesValuesArray = Object.values(ENTITIES);
const ActionsValuesArray = Object.values(ACTIONS);

export const PRIVILEGES: `${Entity}:${Action}`[] = (EntitiesValuesArray as Entity[]).flatMap(
    (entity) =>
        (entity === ENTITIES.AUDIT_LOG ? [ACTIONS.READ] : ActionsValuesArray as Action[]).map(
            (action) => `${entity}:${action}` as `${keyof typeof ENTITIES}:${keyof typeof ACTIONS}`,
        ),
);

export type PrivilegesValue = (typeof PRIVILEGES)[number];
