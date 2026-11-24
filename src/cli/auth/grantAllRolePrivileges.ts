import { prisma } from '../../config/database';
import { RoleRepository } from '../../modules/role/repositories/roleRepository';
import { PRIVILEGES } from '../../shared/constants/privileges';
import { selectOption } from '../shared/selectOption';

async function main() {
    const roles = await RoleRepository.findAll();
    if (roles.length === 0) {
        throw new Error('Brak ról. Najpierw uruchom npm run db-seed.');
    }

    console.log('Skrypt nada wybranej roli wszystkie uprawnienia, w tym zarządzanie rolami i użytkownikami.');
    const role = await selectOption('Wybierz rolę:', roles.map((role) => ({ label: role.name, value: role })));
    if (!role) return;

    await prisma.$transaction(async (tx) => {
        await tx.role.findFirstOrThrow({ where: { id: role.id, deletedAt: null }, select: { id: true } });

        for (const name of PRIVILEGES) {
            await tx.privilege.upsert({
                where: { name },
                update: { deletedAt: null },
                create: { name },
            });
        }

        await tx.role.update({
            where: { id: role.id, deletedAt: null },
            data: {
                privileges: { connect: PRIVILEGES.map((name) => ({ name })) },
            },
        });
    }, { timeout: 30_000 });

    console.log(`Nadano roli „${role.name}” wszystkie ${PRIVILEGES.length} uprawnień z konfiguracji aplikacji.`);
    console.log('Uruchomienie npm run db-seed przywróci uprawnienia ról systemowych zgodnie z konfiguracją seedera.');
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
