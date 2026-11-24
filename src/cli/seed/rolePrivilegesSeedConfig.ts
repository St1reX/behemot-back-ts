import { ROLES, RoleName } from '../../shared/constants/roles';
import { PRIVILEGES, PrivilegesValue } from '../../shared/constants/privileges';
import { ENTITIES, Entity } from '../../shared/constants/entities';

// Wartości const do mapy uprawnień
const EntitiesValuesArray = Object.values(ENTITIES);

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
        name: ROLES.SUPERADMIN,
        privileges: null,
    },
    {
        name: ROLES.ADMIN,
        privileges: PRIVILEGES.filter(
            (privilege) =>
                !privilege.startsWith(`${ENTITIES.ROLE}:`) &&
                !privilege.startsWith(`${ENTITIES.USER}:`),
        ),
    },
    {
        name: ROLES.USER,
        privileges: [],
    },
];

// Funkcja rozwijająca privileges z encji na wszystkie uprawnienia
export function expandPrivileges(input: Array<PrivilegesValue | Entity> | null): PrivilegesValue[] {
    if (input === null) {
        // null oznacza *wszystkie uprawnienia*
        return [...PRIVILEGES];
    }

    const expanded = new Set<PrivilegesValue>();

    for (const item of input) {
        if (EntitiesValuesArray.includes(item as Entity)) {
            // Jeśli item jest encją, dodaj wszystkie uprawnienia dla niej
            PRIVILEGES.filter((privilege) => privilege.startsWith(`${item}:`)).forEach((privilege) =>
                expanded.add(privilege),
            );
        } else {
            // Jeśli to pojedyncze uprawnienie, dodaj bez zmian
            if (PRIVILEGES.includes(item as PrivilegesValue)) expanded.add(item as PrivilegesValue);
        }
    }

    return Array.from(expanded);
}
