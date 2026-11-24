import { prisma } from '../../config/database';
import { RoleRepository } from '../../modules/role/repositories/roleRepository';
import { selectOption } from '../shared/selectOption';

async function main() {
    const [users, roles] = await Promise.all([
        prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                username: true,
                email: true,
                isActive: true,
                roleId: true,
                role: { select: { name: true } },
            },
            orderBy: { username: 'asc' },
        }),
        RoleRepository.findAll(),
    ]);

    if (users.length === 0 || roles.length === 0) {
        throw new Error('Brak kont lub ról. Utwórz konto i uruchom npm run db-seed.');
    }

    const user = await selectOption('Wybierz konto:', users.map((user) => ({
        label: `${user.username} (${user.email}) — ${user.role.name}${user.isActive ? '' : ' [nieaktywne]'}`,
        value: user,
    })));
    if (!user) return;

    const role = await selectOption('Wybierz nową rolę:', roles.map((role) => ({
        label: `${role.name}${role.id === user.roleId ? ' [obecna]' : ''}`,
        value: role,
    })));
    if (!role) return;

    if (role.id === user.roleId) {
        console.log('Konto ma już wybraną rolę. Bez zmian.');
        return;
    }

    await prisma.$transaction(async (tx) => {
        await tx.role.findFirstOrThrow({ where: { id: role.id, deletedAt: null }, select: { id: true } });
        await tx.user.update({
            where: { id: user.id, deletedAt: null },
            data: { roleId: role.id },
        });
    });

    console.log(`Nadano rolę „${role.name}” kontu „${user.username}”.`);
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
