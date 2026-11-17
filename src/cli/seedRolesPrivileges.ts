import { prisma } from '../config/database';
import { ROLES } from '../shared/constants/roles';
import { PRIVILEGES } from '../shared/constants/privileges';
import { expandPrivileges, RoleSeedConfig, rolesToSeed } from './rolePrivilegesSeedConfig';

async function main() {
   await seedRoles(ROLES);
   await seedPrivileges(PRIVILEGES);
   await seedRolesPrivileges(rolesToSeed);
}

async function seedRoles(roles: typeof ROLES) {
   for (const role of Object.values(ROLES)) {
      const existingRole = await prisma.role.findFirst({
         where: {
            name: role,
            deletedAt: null,
         },
         select: {
            id: true,
         },
      });

      if (!existingRole) {
         await prisma.role.create({
            data: {
               name: role,
            },
         });
      }

      console.log(`Role: ${role} added...`);
   }

   console.log('All roles created successfully');
}

async function seedPrivileges(privileges: typeof PRIVILEGES) {
   for (const privilege of Object.values(PRIVILEGES)) {
      await prisma.privilege.upsert({
         where: { name: privilege },
         update: { deletedAt: null },
         create: { name: privilege },
      });

      console.log(`Privilege: ${privilege} added...`);
   }

   console.log('All privileges created successfully');
}

async function seedRolesPrivileges(seedConfig: RoleSeedConfig[]) {
   for (const role of seedConfig) {
      const rolePrivileges = expandPrivileges(role.privileges);
      const activeRole = await prisma.role.findFirstOrThrow({
         where: {
            name: role.name,
            deletedAt: null,
         },
         select: {
            id: true,
         },
      });

      await prisma.role.update({
         where: {
            id: activeRole.id,
            deletedAt: null,
         },
         data: {
            privileges: {
               set: [],
               connect: rolePrivileges.map((name) => ({ name })),
            },
         },
      });

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
