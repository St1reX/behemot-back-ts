import { ROLES, RoleName } from '../shared/constants/roles';
import { PrivilegesValue } from '../shared/constants/privileges';
import { ENTITIES, Entity } from '../shared/constants/entities';
import { ACTIONS } from '../shared/constants/actions';

// Wartości const do mapy uprawnień
const EntitiesValuesArray = Object.values(ENTITIES);
const ActionsValuesArray = Object.values(ACTIONS);

// Typ konfiguracji roli:
// privileges może być null (wszystkie prawa),
// albo tablicą, gdzie element to cała encja (np. "USER")
// lub pojedyncze uprawnienie (np. "USER:READ")
export type RoleSeedConfig = {
    name: RoleName;
    privileges: Array<PrivilegesValue | Entity> | null;
};

export const rolesToSeed: RoleSeedConfig[] = [
    {
        name: ROLES.ADMIN,
        privileges: null, // null = wszystkie uprawnienia
    },
];

// Funkcja rozwijająca privileges z encji na wszystkie uprawnienia
export function expandPrivileges(input: Array<PrivilegesValue | Entity> | null): PrivilegesValue[] {
    if (input === null) {
        // null oznacza *wszystkie uprawnienia*
        return EntitiesValuesArray.flatMap((entity) =>
            ActionsValuesArray.map((action) => `${entity}:${action}` as PrivilegesValue),
        );
    }

    const expanded = new Set<PrivilegesValue>();

    for (const item of input) {
        if (EntitiesValuesArray.includes(item as Entity)) {
            // Jeśli item jest encją, dodaj wszystkie uprawnienia dla niej
            ActionsValuesArray.forEach((action) =>
                expanded.add(`${item}:${action}` as PrivilegesValue),
            );
        } else {
            // Jeśli to pojedyncze uprawnienie, dodaj bez zmian
            expanded.add(item as PrivilegesValue);
        }
    }

    return Array.from(expanded);
}
