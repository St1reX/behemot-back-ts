import { prisma } from '../../../config/database';
import { RoleRepository } from '../../../modules/role/repositories/roleRepository';
import { PRIVILEGES } from '../../../shared/constants/privileges';
import { expandPrivileges, RoleSeedConfig, rolesToSeed } from './rolePrivilegesSeedConfig';

async function main() {
    await seedRoles(rolesToSeed);
    await seedPrivileges(PRIVILEGES);
    await seedRolesPrivileges(rolesToSeed);
}

async function seedRoles(roles: RoleSeedConfig[]) {
    for (const role of roles) {
        const existingRole = await RoleRepository.findByName(role.name);

        if (!existingRole) {
            await RoleRepository.create({ name: role.name });
        }

        console.log(`Role: ${role.name} added...`);
    }

    console.log('All roles created successfully');
}

async function seedPrivileges(privileges: typeof PRIVILEGES) {
    for (const privilege of Object.values(privileges)) {
        await RoleRepository.upsertPrivilege(privilege);

        console.log(`Privilege: ${privilege} added...`);
    }

    console.log('All privileges created successfully');
}

async function seedRolesPrivileges(seedConfig: RoleSeedConfig[]) {
    for (const role of seedConfig) {
        const rolePrivileges = expandPrivileges(role.privileges);
        const activeRole = await RoleRepository.findByNameOrThrow(role.name);

        await RoleRepository.replacePrivileges(activeRole.id, rolePrivileges);

        console.log(`Privileges for role ${role.name} updated`);
    }

    console.log('All roles privileges updated successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
